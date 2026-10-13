param(
  # The raw Suno download, e.g. "C:\Users\<user>\Downloads\Ashen River Rite.mp3".
  # A relative path is resolved against the directory you are standing in, not the repo.
  [string]$Source,
  # Which of the fifteen slots this track fills. The list is READ from the generation
  # prompts document rather than written here, so it cannot drift from it. Omit it to
  # print the list and stop.
  [string]$Slot,
  # Report what would be produced, and produce nothing. The measurement pass still runs
  # (it writes no file), so a dry run tells you the real before-loudness and the exact
  # second-pass command line.
  [switch]$DryRun,
  # Overwrite an existing asset. Without this a slot that already has a file is refused.
  [switch]$Force,
  # Explicit tool paths, for a machine where neither PATH nor the WinGet shim is right.
  [string]$FfmpegPath,
  [string]$FfprobePath
)

$ErrorActionPreference = "Stop"

<#
  SUNO DOWNLOAD -> GAME-READY MUSIC ASSET.

  One track in, one file in `apps/web/public/audio/music/` out, plus the exact registry row
  to paste. `docs/superpowers/specs/2026-08-04-music-pipeline.md` is the runbook and carries
  the reasoning; this header only records what the script does differently from the obvious
  version, and why.

  ## THE THREE THINGS IT DOES TO THE AUDIO

   1. TWO-PASS LOUDNESS NORMALISATION, never single-pass. Single-pass `loudnorm` is a
      DYNAMIC normaliser: it rides the gain as it goes, and on a bed with 1.7 LU of
      loudness range that is audible pumping over a whole study session. The measure-then-
      apply form with `linear=true` applies one static gain instead, and the script reports
      which of the two ffmpeg actually used, because loudnorm silently falls back to
      dynamic when the linear gain cannot meet the true-peak ceiling.
   2. THE COVER ART IS DROPPED. Suno embeds an MJPEG stream; `-map 0:a:0 -vn` takes the
      audio stream and nothing else, and `-map_metadata -1` means no ID3 frame can smuggle
      it back in as a tag. Provenance lives in `public/audio/CREDITS.md`, which is where the
      repository's licence rule requires it anyway.
   3. OGG VORBIS OUT. MP3 cannot loop seamlessly: the format's encoder delay and padding
      are baked into the decoded PCM, so `loop = true` has a gap every time round. The
      pipeline doc defends the choice against Opus and WAV.

  ## IT RUNS FROM ANY DIRECTORY, WHICH IS NOT FREE

  `tools/generate-winter-crisis-references.ps1` had to be fixed twice for this, so:

   - Every repository path is built with `Join-Path $repo ...` from `$PSScriptRoot`, and
     nothing is relative to the caller's location.
   - `[Environment]::CurrentDirectory` is set explicitly. PowerShell's location and .NET's
     working directory are DIFFERENT things, and every .NET path API — including the one
     that resolves a relative `-Source` below — reads the second, which in a fresh session
     is wherever the process started rather than where you are standing.
   - Both tools are resolved from PATH and then from WinGet's shim directory, rather than
     assuming a shell startup file has run.
   - ffmpeg is invoked through `System.Diagnostics.Process` with stderr redirected, not
     through the pipeline. Under `$ErrorActionPreference = "Stop"`, Windows PowerShell 5.1
     turns a native command's stderr into terminating errors — and ffmpeg writes ALL of its
     progress and its loudnorm report to stderr, so the pipeline form dies on a successful
     run. The argument string is quoted by hand for the same portability reason:
     `ProcessStartInfo.ArgumentList` does not exist on .NET Framework.
#>

# ---------------------------------------------------------------------------------------------
# The dials. Every number the conversion turns on is here, and nowhere else.
# ---------------------------------------------------------------------------------------------

<#
  -20 LUFS INTEGRATED, and the reason is arithmetic rather than convention.

  The track arrives at -13.1 LUFS, which is a foreground-listening level: streaming
  services normalise to about -14, and this is hotter than that. It has to sit under sound
  effects and advisor dialogue instead, so it needs to lose ground, and -20 LUFS is the
  usual place a game music bed sits — roughly 7 dB down from where Suno hands it over.

  What makes it the right number HERE rather than merely a conventional one is that the
  runtime already scales music by `MUSIC_VOLUME_SCALE` (0.33 in `audioPrefs.ts`, about
  -9.6 dB) against the effects, and the six shipped effects are deliberately trimmed timid
  on top of that. So the asset is not the whole story and must not try to be: normalising
  to -20 makes the FILE consistent from track to track, which is the thing a per-slot mix
  cannot fix later, and leaves the balance against effects where the code already sets it.

  Change this and every track has to be re-converted, or era two will be louder than era
  one. That is the real cost of the number, and it is why it is a parameter rather than a
  literal inside a filter string.
#>
$TargetLufs = -20.0

# -1.5 dBTP. Lossy re-encoding can overshoot a sample-peak ceiling by a fraction of a dB,
# so the asset keeps headroom rather than clipping in the decoder.
$TargetTruePeakDb = -1.5

# loudnorm's own default. It is only reachable in the dynamic fallback; with `linear=true`
# on a 1.7 LU source the range passes through untouched, which is the intent.
$TargetLoudnessRange = 7.0

# libvorbis VBR quality. 4 is about 128 kbps stereo, which is transparent enough for a
# sustained bed and roughly 40% smaller than the 194 kbps Suno hands over.
$VorbisQuality = 4

# ---------------------------------------------------------------------------------------------
# Paths, resolved from the script's own location and never from the caller's.
# ---------------------------------------------------------------------------------------------

$repo = Split-Path -Parent $PSScriptRoot

# PowerShell's location and .NET's working directory are not the same variable, and every
# .NET path API reads the second. Pinning it to where the caller is standing is what makes
# a relative -Source mean what the caller meant.
[Environment]::CurrentDirectory = (Get-Location -PSProvider FileSystem).ProviderPath

$musicDir = Join-Path $repo "apps/web/public/audio/music"
$registryPath = Join-Path $repo "apps/web/src/audio/musicRegistry.ts"
$creditsPath = Join-Path $repo "apps/web/public/audio/CREDITS.md"
$promptsPath = Join-Path $repo "docs/superpowers/specs/2026-08-03-era-and-crisis-music-generation-prompts.md"

# ---------------------------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------------------------

function Resolve-Tool {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [string]$Explicit
  )

  if ($Explicit) {
    if (-not (Test-Path -LiteralPath $Explicit)) {
      throw "$Name was given as '$Explicit', which does not exist."
    }
    return (Resolve-Path -LiteralPath $Explicit).ProviderPath
  }

  $onPath = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue
  if ($onPath) {
    return @($onPath)[0].Source
  }

  # WinGet installs a shim here and adds it to the USER PATH, which a process started
  # before the install — or a shell that never reads a startup file — will not have.
  $candidates = @()
  if ($env:LOCALAPPDATA) {
    $candidates += (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\$Name.exe")
  }
  if ($env:ProgramFiles) {
    $candidates += (Join-Path $env:ProgramFiles "WinGet\Links\$Name.exe")
  }
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).ProviderPath
    }
  }

  throw "$Name is not on PATH and is not in WinGet's Links directory. Install it with `winget install Gyan.FFmpeg`, or pass -$($Name)Path."
}

function Format-Argument {
  param([string]$Value)
  if ($Value -eq "" -or $Value -match '[\s"]') {
    return '"' + ($Value -replace '"', '\"') + '"'
  }
  return $Value
}

function Format-CommandLine {
  param([string]$FilePath, [string[]]$Arguments)
  return ((@($FilePath) + $Arguments) | ForEach-Object { Format-Argument $_ }) -join " "
}

function Invoke-Tool {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $FilePath
  $startInfo.Arguments = (($Arguments | ForEach-Object { Format-Argument $_ }) -join " ")
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.WorkingDirectory = $repo

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $startInfo
  [void]$process.Start()
  # Read both before waiting: a full pipe buffer deadlocks a process that is still writing,
  # and ffmpeg is verbose enough on stderr to fill one.
  $out = $process.StandardOutput.ReadToEnd()
  $err = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  return [pscustomobject]@{
    ExitCode = $process.ExitCode
    StdOut   = $out
    StdErr   = $err
  }
}

# ---------------------------------------------------------------------------------------------
# The fifteen slots, read from the generation prompts rather than copied into this file
# ---------------------------------------------------------------------------------------------

function Get-Slots {
  if (-not (Test-Path -LiteralPath $promptsPath)) {
    throw "The generation prompts are missing at $promptsPath, so the slot list cannot be read."
  }
  $text = Get-Content -LiteralPath $promptsPath -Raw
  $found = [regex]::Matches($text, '(?m)^### `((?:era|crisis|ceremony)-[a-z_]+)`') |
    ForEach-Object { $_.Groups[1].Value } |
    Select-Object -Unique
  if ($found.Count -lt 15) {
    throw "Read only $($found.Count) slot headings from $promptsPath; expected the fifteen. Has its heading format changed?"
  }
  return $found
}

# ---------------------------------------------------------------------------------------------
# Loudness
# ---------------------------------------------------------------------------------------------

$loudnormTarget = "I=$TargetLufs`:TP=$TargetTruePeakDb`:LRA=$TargetLoudnessRange"

function Measure-Loudness {
  param([Parameter(Mandatory = $true)][string]$Path)

  $arguments = @(
    "-hide_banner", "-nostats",
    "-i", $Path,
    "-map", "0:a:0",
    "-af", "loudnorm=$loudnormTarget`:print_format=json",
    "-f", "null", "-"
  )
  $result = Invoke-Tool -FilePath $ffmpeg -Arguments $arguments
  if ($result.ExitCode -ne 0) {
    throw "ffmpeg could not analyse '$Path' (exit $($result.ExitCode)):`n$($result.StdErr)"
  }

  # loudnorm prints its report as the last JSON object on stderr, after the log lines.
  $blocks = [regex]::Matches($result.StdErr, '(?s)\{[^{}]*\}')
  if ($blocks.Count -lt 1) {
    throw "ffmpeg produced no loudnorm report for '$Path':`n$($result.StdErr)"
  }
  return ($blocks[$blocks.Count - 1].Value | ConvertFrom-Json)
}

function Show-Loudness {
  param([string]$Label, $Report)
  Write-Host ("  {0,-8} I {1,8} LUFS   TP {2,7} dBTP   LRA {3,6} LU" -f `
      $Label, $Report.input_i, $Report.input_tp, $Report.input_lra)
}

# ---------------------------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------------------------

$slots = Get-Slots

if (-not $Slot) {
  Write-Host "The fifteen slots, read from ${promptsPath}:"
  foreach ($name in $slots) { Write-Host "  $name" }
  Write-Host ""
  Write-Host "Usage: pwsh tools/convert-suno-track.ps1 -Source '<download>.mp3' -Slot <slot> [-DryRun]"
  return
}

if ($slots -notcontains $Slot) {
  throw "'$Slot' is not one of the fifteen slots. Run without -Slot to see them."
}
if (-not $Source) {
  throw "-Source is required. Give it the raw Suno download."
}

$ffmpeg = Resolve-Tool -Name "ffmpeg" -Explicit $FfmpegPath
$ffprobe = Resolve-Tool -Name "ffprobe" -Explicit $FfprobePath

# [System.IO.Path] reads [Environment]::CurrentDirectory, pinned above, so a relative
# -Source resolves against the caller's directory rather than against the repository.
$sourcePath = [System.IO.Path]::GetFullPath($Source)
$outputPath = Join-Path $musicDir "$Slot.ogg"

Write-Host "Repository : $repo"
Write-Host "ffmpeg     : $ffmpeg"
Write-Host "Source     : $sourcePath"
Write-Host "Slot       : $Slot"
Write-Host "Output     : $outputPath"
Write-Host ""

if (-not (Test-Path -LiteralPath $sourcePath)) {
  if ($DryRun) {
    Write-Warning "The source does not exist, so the measurement pass is skipped. Everything above is still what would be used."
    return
  }
  throw "The source does not exist: $sourcePath"
}
if ((Test-Path -LiteralPath $outputPath) -and -not $Force -and -not $DryRun) {
  throw "$outputPath already exists. Pass -Force to replace it."
}
if (-not (Test-Path -LiteralPath $musicDir)) {
  throw "The music directory is missing at $musicDir. Is this the right repository?"
}

# What arrived, including the streams that are about to be dropped.
$probe = Invoke-Tool -FilePath $ffprobe -Arguments @(
  "-hide_banner", "-v", "error",
  "-show_entries", "format=duration,bit_rate:stream=index,codec_type,codec_name,sample_rate,channels",
  "-of", "default=noprint_wrappers=1",
  $sourcePath
)
if ($probe.ExitCode -ne 0) {
  throw "ffprobe could not read '$sourcePath':`n$($probe.StdErr)"
}
Write-Host "Source streams and format:"
foreach ($line in ($probe.StdOut -split "`r?`n" | Where-Object { $_ })) { Write-Host "  $line" }
$videoStreams = ([regex]::Matches($probe.StdOut, "codec_type=video")).Count
if ($videoStreams -gt 0) {
  Write-Host "  -> $videoStreams non-audio stream(s) (the embedded cover art); these are dropped."
}
Write-Host ""

$sourceSeconds = [double]([regex]::Match($probe.StdOut, "duration=([0-9.]+)").Groups[1].Value)

# PASS ONE: measure. Writes nothing, which is why a dry run still runs it.
Write-Host "Pass 1 of 2: measuring..."
$measured = Measure-Loudness -Path $sourcePath

$applyArguments = @(
  "-hide_banner", "-nostats", "-y",
  "-i", $sourcePath,
  # The audio stream and nothing else: no cover art, and no ID3 frame carried across.
  "-map", "0:a:0", "-vn", "-map_metadata", "-1",
  "-af", ("loudnorm=$loudnormTarget" +
    ":measured_I=$($measured.input_i)" +
    ":measured_TP=$($measured.input_tp)" +
    ":measured_LRA=$($measured.input_lra)" +
    ":measured_thresh=$($measured.input_thresh)" +
    ":offset=$($measured.target_offset)" +
    ":linear=true:print_format=summary"),
  # loudnorm runs at 192 kHz internally, so the output rate is stated rather than
  # inherited from whatever the filter graph last resampled to.
  "-ar", "48000",
  "-c:a", "libvorbis", "-q:a", "$VorbisQuality",
  $outputPath
)

Write-Host ""
Write-Host "Pass 2 of 2 command line:"
Write-Host "  $(Format-CommandLine -FilePath $ffmpeg -Arguments $applyArguments)"
Write-Host ""

if ($DryRun) {
  Write-Host "Loudness now, and where pass 2 would put it:"
  Show-Loudness -Label "before" -Report $measured
  Write-Host ("  {0,-8} I {1,8} LUFS   TP {2,7} dBTP" -f "target", $TargetLufs, $TargetTruePeakDb)
  Write-Host ""
  Write-Host "Dry run: nothing was written."
  return
}

$applied = Invoke-Tool -FilePath $ffmpeg -Arguments $applyArguments
if ($applied.ExitCode -ne 0) {
  throw "ffmpeg could not convert '$sourcePath' (exit $($applied.ExitCode)):`n$($applied.StdErr)"
}

# Which normalisation loudnorm actually performed. `dynamic` means the linear gain could
# not meet the true-peak ceiling and it rode the gain instead, which is the pumping this
# whole two-pass arrangement exists to avoid — so it is reported rather than assumed.
$normalisation = [regex]::Match($applied.StdErr, "Normalization Type:\s*(\w+)")
$normalisationType = if ($normalisation.Success) { $normalisation.Groups[1].Value } else { "unreported" }

$verified = Measure-Loudness -Path $outputPath
$bytes = (Get-Item -LiteralPath $outputPath).Length
$seconds = [int][Math]::Round($sourceSeconds)

Write-Host ""
Write-Host "Loudness:"
Show-Loudness -Label "before" -Report $measured
Show-Loudness -Label "after" -Report $verified
Write-Host "  normalisation: $normalisationType (linear is what this pipeline wants)"
if ($normalisationType -eq "dynamic") {
  Write-Warning "loudnorm fell back to DYNAMIC normalisation, which rides the gain and can pump on a sustained bed. Lower -TargetLufs or raise the true-peak ceiling and re-run."
}

Write-Host ""
Write-Host "Wrote $outputPath ($([Math]::Round($bytes / 1MB, 2)) MB, $seconds s)"
Write-Host ""
Write-Host "Add this row to MUSIC_TRACKS in $registryPath :"
Write-Host ""
Write-Host "  {"
Write-Host "    id: `"$Slot`","
Write-Host "    title: `"<learner-facing name>`","
Write-Host "    file: `"music/$Slot.ogg`","
Write-Host "    author: `"Suno`","
Write-Host "    license: `"<the tier's terms - see the pipeline doc's licensing section>`","
Write-Host "    source: `"<the Suno generation URL>`","
Write-Host "    seconds: $seconds,"
Write-Host "    bytes: $bytes,"
Write-Host "    note: `"<why this take>`","
Write-Host "  },"
Write-Host ""
Write-Host "Then add its row to $creditsPath, which is not optional."

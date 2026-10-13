# Fire a crisis scene sheet, pass by pass, sending each row through the call its
# role actually needs.
#
#   .\tools\run-crisis-imagegen.ps1 plague -DryRun
#   .\tools\run-crisis-imagegen.ps1 plague
#   .\tools\run-crisis-imagegen.ps1 plague -VariantsOnly
#
# ---------------------------------------------------------------------------
# WHY THIS IS NOT ONE generate-batch CALL, which is what it used to be
#
# The run sheets carry `role`, `anchor` and `input` fields, and seventeen of the
# twenty-nine crisis frames are meant to be image-to-image from an anchor so a
# comparison sheet can show ONE object in several states.
#
# `generate-batch` does not read `input`. Measured against the generator: it
# understands model, n, size, quality, background, output_compression, prompt
# and the structured `fields` block, and nothing else. `images.edit` is reachable
# only from the separate `edit` subcommand. So a variant row sent to
# generate-batch is generated TEXT-TO-IMAGE and the anchor is silently ignored -
# no error, no warning, a plausible picture of a different object.
#
# That is exactly what happened on era six's first run. `barrier-one-band` came
# back a squat cube on a wide panel and `barrier-two-bands` a tall rounded pillar
# on a small one, from a prompt that said "one object in two states rather than
# two objects" and "HOLD THE ANCHOR'S FRAMING" in capitals. The prompt was never
# the problem; the call was.
#
# So: anchors and scene frames go through `generate-batch` (they are independent
# by design and batching is faster), and variants go through `edit` one at a
# time with --image. No fidelity flag is passed: gpt-image-2 rejects
# --input-fidelity outright, because image inputs on that model are always high
# fidelity, which is the behaviour this pipeline wanted anyway.
#
# Passes still run in order, because a variant can derive from another variant -
# era six's frames 7, 8 and 9 all condition on frame 6, which is itself a variant
# of the anchor.
#
# -VariantsOnly re-runs only the image-to-image rows, for when the anchors are
# already good and only the conditioning failed. Generation costs money.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('plague', 'intrusion')]
    [string]$Crisis,

    [switch]$DryRun,
    [switch]$VariantsOnly,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

# Set-Location moves PowerShell's provider location but NOT the .NET process
# working directory, so every path here is absolute.
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo
[Environment]::CurrentDirectory = $repo

$dir = switch ($Crisis) {
    'plague'    { Join-Path $repo 'output/imagegen/era-06-plague-crisis-scenes' }
    'intrusion' { Join-Path $repo 'output/imagegen/era-09-intrusion-crisis-scenes' }
}

$sheet = Join-Path $dir 'imagegen-run-sheet.jsonl'
$gen = Join-Path $HOME '.codex/skills/.system/imagegen/scripts/image_gen.py'

if (-not (Test-Path $sheet)) { throw "No run sheet at $sheet" }
if (-not $DryRun -and -not (Test-Path $gen)) {
    throw "imagegen not found at $gen. It lives in the agent-harness skill directory, not in this repo."
}

# Prefer the real interpreter over the Microsoft Store alias: `python3` resolves
# to WindowsApps\python3.exe here, a different install from C:\Python314.
$python = 'python'
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { $python = 'python3' }

# A running process never picks up a newly set user environment variable, which
# is a confusing way to be told a key you definitely set is missing.
if (-not $DryRun -and -not $env:OPENAI_API_KEY) {
    $persisted = [Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'User')
    if ($persisted) {
        $env:OPENAI_API_KEY = $persisted
        Write-Host '  (took OPENAI_API_KEY from the User scope; this shell started before it was set)' -ForegroundColor DarkGray
    } else {
        throw "OPENAI_API_KEY is set in neither this session nor the User scope. Set it, then open a new shell."
    }
}

# The key is a TrueFoundry gateway key, so calls go to the gateway rather than to
# api.openai.com. The generator sets no base URL; the OpenAI SDK reads this from
# the environment, so setting it here is enough.
if (-not $DryRun) {
    if (-not $env:OPENAI_BASE_URL) {
        $env:OPENAI_BASE_URL = [Environment]::GetEnvironmentVariable('OPENAI_BASE_URL', 'User')
    }
    if (-not $env:OPENAI_BASE_URL) {
        $env:OPENAI_BASE_URL = 'https://tfy.promptlens.trilogy.com'
    }
    Write-Host ('  endpoint: ' + $env:OPENAI_BASE_URL) -ForegroundColor DarkGray
}

$rows = Get-Content $sheet -Encoding UTF8 |
    Where-Object { $_.Trim() } |
    ForEach-Object { $_ | ConvertFrom-Json }

$passes = $rows | Select-Object -ExpandProperty pass -Unique
$variants = @($rows | Where-Object { $_.role -eq 'variant' }).Count

Write-Host ("{0}: {1} frames over {2} passes, {3} of them image-to-image" -f `
    $Crisis, $rows.Count, $passes.Count, $variants) -ForegroundColor Cyan
if ($VariantsOnly) { Write-Host '  variants only: anchors and scene frames will not be regenerated' -ForegroundColor DarkGray }
Write-Host ''

foreach ($p in $passes) {
    $inPass = $rows | Where-Object { $_.pass -eq $p }
    $batch = @($inPass | Where-Object { $_.role -ne 'variant' })
    $edits = @($inPass | Where-Object { $_.role -eq 'variant' })

    if ($VariantsOnly) { $batch = @() }

    # A frame already on disk is not regenerated, so a run resumes where it
    # stopped and deleting one frame regenerates exactly that frame. Without
    # this the batch path dies on the first existing output — `edit` already
    # passes --force, `generate-batch` does not, so the two halves disagreed.
    if (-not $Force) {
        $onDisk = { Test-Path (Join-Path $dir (Split-Path -Leaf $args[0])) }
        $skipped = @($batch | Where-Object { & $onDisk $_.out }).Count +
                   @($edits | Where-Object { & $onDisk $_.out }).Count
        $batch = @($batch | Where-Object { -not (& $onDisk $_.out) })
        $edits = @($edits | Where-Object { -not (& $onDisk $_.out) })
        if ($skipped -gt 0) {
            Write-Host ("  pass {0}: {1} already on disk, skipped (-Force to redo)" -f $p, $skipped) -ForegroundColor DarkGray
        }
    }

    if ($batch.Count -gt 0) {
        $split = Join-Path $dir ".pass-$p.jsonl"
        if ($DryRun) {
            Write-Host ("  pass {0}: {1} generated (dry run)" -f $p, $batch.Count)
        } else {
            $lines = $batch | ForEach-Object { $_ | ConvertTo-Json -Compress -Depth 10 }
            [System.IO.File]::WriteAllLines($split, $lines, (New-Object System.Text.UTF8Encoding $false))
            Write-Host ("  pass {0}: {1} generated" -f $p, $batch.Count) -ForegroundColor Yellow
            & $python $gen generate-batch --input $split --out-dir $dir --concurrency 3
            $code = $LASTEXITCODE
            Remove-Item $split -ErrorAction SilentlyContinue
            if ($code -ne 0) { throw "pass $p failed generating with exit $code. Later passes read this pass's images, so stopping here." }
        }
    }

    foreach ($e in $edits) {
        $name = Split-Path -Leaf $e.out
        $from = Split-Path -Leaf $e.input

        if ($DryRun) {
            Write-Host ("  pass {0}: edit {1} <- {2} (dry run)" -f $p, $name, $from)
            continue
        }

        if (-not (Test-Path $e.input)) {
            throw "pass $p : $name conditions on $from, which does not exist. Its anchor has to be generated first."
        }

        # --prompt-file, not --prompt: these prompts run to several hundred words
        # and a command line is the wrong place for them.
        $pf = Join-Path $dir ".prompt.txt"
        [System.IO.File]::WriteAllText($pf, $e.prompt, (New-Object System.Text.UTF8Encoding $false))

        # No --input-fidelity: gpt-image-2 rejects it, because image inputs on
        # that model are always high fidelity. Passing it is an error rather
        # than a no-op, and it is exactly the behaviour this pipeline wants.
        Write-Host ("  pass {0}: edit {1} <- {2}" -f $p, $name, $from) -ForegroundColor Yellow
        & $python $gen edit `
            --image $e.input `
            --prompt-file $pf `
            --out $e.out `
            --size $e.size `
            --quality high `
            --use-case stylized-concept `
            --force
        $code = $LASTEXITCODE
        Remove-Item $pf -ErrorAction SilentlyContinue
        if ($code -ne 0) { throw "pass $p : $name failed with exit $code. Later frames may condition on it, so stopping here." }
    }

    Write-Host ("  pass {0} done" -f $p) -ForegroundColor Green
    Write-Host ''
}

Write-Host ("{0} complete. Frames are in {1}" -f $Crisis, $dir) -ForegroundColor Cyan

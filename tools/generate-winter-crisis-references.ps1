param(
  # Which pack to write. "all" writes every pack, which is the default and the reviewable case.
  [ValidateSet("all", "hard-winter", "succession", "plague", "intrusion")]
  [string]$Pack = "all",
  # Skip the PNG pass. Set automatically when System.Drawing is unavailable.
  [switch]$SkipRaster
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$packRoot = Join-Path $repoRoot "docs/superpowers/specs/crisis-reference-packs"
$outputDir = Join-Path $packRoot "hard-winter"

<#
  THE FOUR CRISIS REFERENCE PACKS, FROM ONE SET OF PRIMITIVES.

  This script drew era one's six plates first and was parameterised afterwards to draw eras
  four, six and nine as well. The reason for one script rather than four is the reason the
  packs have to agree: ground, camera, shadow direction and the three-tone face model are
  properties of the RENDERER, not of a crisis, and three separate scripts would have drifted
  on all four within a week.

  ## Era one's output is byte-identical to what it was before the parameterisation

  Asserted by regenerating over the committed files and diffing. That property is worth more
  than it looks: it is what lets a reviewer read this diff as "three packs added" rather than
  as "four packs rewritten".

  ## THE WRITER IS EXPLICIT ABOUT ITS BYTES, AND THAT IS A FIX

  Era one's plates were written with `Set-Content -Encoding UTF8`, whose meaning MOVED between
  Windows PowerShell 5.1 (UTF-8 with a BOM, CRLF terminator) and PowerShell 7 (no BOM, LF).
  So the committed plates reproduced byte-for-byte on Windows and on no other platform:
  measured, every one of the six differs on a Linux re-run, in the BOM and the final
  terminator and in nothing else. `Write-Utf8BomCrlfTerminated` writes those bytes explicitly
  instead of inheriting them from the host, so regeneration is now byte-stable everywhere, and
  it reproduces the committed files rather than replacing them.

  ## THE RASTERISER IS THE WEAK HALF AND IT IS NOT SILENT ABOUT IT

  `System.Drawing` is Windows-only from .NET 6, so the PNG pass cannot run on Linux or macOS
  at all. It warns and skips rather than throwing, and names the fallback
  (`tools/rasterise-crisis-references.mjs`, which drives the repository's own Playwright
  Chromium). Two consequences a reader needs:

   - **The SVG is the source of truth and the PNG is a convenience.** Where the two disagree,
     the SVG is right, because `index.html` loads the SVG.
   - **The two rasterisers disagree wherever a `<polygon>` carries a stroke.** SVG closes a
     polygon's outline; `Graphics.DrawLines` does not. Era one's smoke column is the measured
     instance: the committed `05-fire-smoke-column.png` is an open zigzag ribbon and the same
     file in a browser is a closed leaf-shaped column. **Nothing added here uses that
     construct**, since every stroke in the new packs is a filled polygon, so the new plates
     render the same under both.
#>

# ---------------------------------------------------------------------------------------------
# Shared: bytes, colour, and the three-tone face model
# ---------------------------------------------------------------------------------------------

function Write-Utf8BomCrlfTerminated {
  param(
    [string]$Path,
    [string]$Text
  )

  $bytes = New-Object System.Collections.Generic.List[byte]
  $bytes.AddRange([byte[]]@(0xEF, 0xBB, 0xBF))
  $bytes.AddRange([System.Text.Encoding]::UTF8.GetBytes($Text))
  $bytes.AddRange([System.Text.Encoding]::UTF8.GetBytes("`r`n"))
  [System.IO.File]::WriteAllBytes($Path, $bytes.ToArray())
}

<#
  `City_Art_Bible.md` section 2 and `apps/web/src/city/palette.ts`'s `faceTones` fix the model
  every mass in every plate is shaded by: top = lighten(hue, 0.26), left = hue,
  right = darken(hue, 0.28). It is reproduced here rather than approximated by eye, so a plate
  cannot promise a shading relationship the renderer does not produce. `faceTones` itself is
  called by nothing but its own test (measured), and that is a fact about the RUNTIME, not
  about the art direction: the direction is authored and these plates draw it.
#>
function Lighten {
  param([string]$Hex, [double]$Amount)
  return (MixHex -Hex $Hex -Toward "#ffffff" -Amount $Amount)
}

function Darken {
  param([string]$Hex, [double]$Amount)
  return (MixHex -Hex $Hex -Toward "#000000" -Amount $Amount)
}

function MixHex {
  param(
    [string]$Hex,
    [string]$Toward,
    [double]$Amount
  )

  $a = $Hex.TrimStart("#")
  $b = $Toward.TrimStart("#")
  $out = "#"
  for ($channel = 0; $channel -lt 3; $channel++) {
    $from = [Convert]::ToInt32($a.Substring($channel * 2, 2), 16)
    $to = [Convert]::ToInt32($b.Substring($channel * 2, 2), 16)
    $mixed = [int][Math]::Round($from + ($to - $from) * $Amount)
    $out += ("{0:x2}" -f [Math]::Max(0, [Math]::Min(255, $mixed)))
  }
  return $out
}

function FaceTop { param([string]$Hex) return (Lighten -Hex $Hex -Amount 0.26) }
function FaceLeft { param([string]$Hex) return $Hex }
function FaceRight { param([string]$Hex) return (Darken -Hex $Hex -Amount 0.28) }

# ---------------------------------------------------------------------------------------------
# Era one: the winter primitives, unchanged
# ---------------------------------------------------------------------------------------------

function Snowfall {
  param(
    [int]$Density = 90,
    [int]$SeedOffset = 0
  )

  $flakes = New-Object System.Collections.Generic.List[string]
  for ($flakeIndex = 0; $flakeIndex -lt $Density; $flakeIndex++) {
    $seed = $flakeIndex + $SeedOffset
    $x = (37 * $seed + 83) % 1380 + 10
    $y = (61 * $seed + 29) % 860 + 15
    $size = 2 + (($seed * 7) % 5)
    $opacity = 0.42 + ((($seed * 11) % 34) / 100)
    $flakes.Add("<circle cx=""$x"" cy=""$y"" r=""$size"" fill=""#f8fbfb"" opacity=""$opacity""/>")
  }
  return ($flakes -join "`n  ")
}

function AmbientWorld {
  return @"
  <rect width="1400" height="900" fill="#e8ecea"/>
  <polygon points="-120,510 210,472 555,450 872,462 1212,505 1520,575 1520,940 -120,940" fill="#77aeb0"/>
  <polygon points="-120,438 178,410 542,392 903,404 1272,452 1520,510 1520,720 1240,656 922,610 568,594 210,612 -120,660" fill="#dce5e5" opacity="0.44"/>
  <polygon points="-120,390 164,366 520,350 886,360 1268,406 1520,456 1520,584 1206,528 884,492 520,480 156,500 -120,540" fill="#eef2f1" opacity="0.52"/>
  <rect width="1400" height="900" fill="#edf1f0" opacity="0.18"/>
"@
}

function IslandGround {
  param(
    [string]$Variant = "wide"
  )

  if ($Variant -eq "wide") {
    return @"
  <polygon points="124,588 298,522 548,490 828,502 1092,558 1258,650 1204,744 954,810 610,828 294,784 112,672" fill="#d6e1e1"/>
  <polygon points="170,608 338,550 560,524 810,532 1032,580 1160,650 1114,724 916,772 616,790 342,752 162,658" fill="#cbd7d8"/>
  <polygon points="202,622 376,574 580,554 790,560 982,602 1086,664 1036,714 858,746 620,760 392,728 222,666" fill="#b98f57"/>
  <polygon points="216,606 388,566 584,550 786,558 972,596 1060,652 1024,696 852,728 622,742 404,710 236,656" fill="#e9eeee"/>
  <polygon points="248,612 424,580 606,570 784,578 942,612 1018,656 982,686 832,710 628,722 432,696 268,650" fill="#eff4f3"/>
  <polygon points="318,672 470,634 662,632 842,662 792,694 622,694 452,714" fill="#746758" opacity="0.50"/>
  <polygon points="304,654 468,622 662,622 852,652 996,710 940,736 780,686 618,668 454,682 332,706" fill="#9a8874"/>
  <polygon points="286,646 468,610 666,612 864,642 1010,702 972,724 818,676 628,654 454,668 310,694" fill="#807268" opacity="0.34"/>
"@
  }

  return @"
  <polygon points="-80,566 184,512 484,486 780,498 1076,560 1480,688 1480,940 -80,940" fill="#d6e1e1"/>
  <polygon points="-60,594 214,536 494,514 772,526 1036,584 1456,718 1456,940 -60,940" fill="#cbd7d8"/>
  <polygon points="-20,626 230,570 504,548 770,560 1016,616 1420,754 1420,940 -20,940" fill="#b98f57"/>
  <polygon points="-28,602 230,554 506,536 768,548 1010,600 1432,742 1432,940 -28,940" fill="#e9eeee"/>
  <polygon points="42,646 256,606 510,598 764,628 1012,704 1302,824 1216,884 918,788 736,724 512,682 292,680 78,720" fill="#77685a" opacity="0.50"/>
  <polygon points="50,630 260,592 512,590 772,620 1026,694 1316,814 1266,848 1000,746 760,676 512,638 286,646 80,688" fill="#9a8874"/>
  <polygon points="34,610 260,578 516,580 786,610 1042,684 1326,804 1298,824 1038,724 776,654 514,620 278,628 62,668" fill="#807268" opacity="0.33"/>
"@
}

function DirectionalShadow {
  param(
    [int]$X,
    [int]$Y,
    [int]$W,
    [int]$H,
    [double]$Opacity = 0.22
  )

  $x2 = $X - 42
  $y2 = $Y + 34
  $x3 = $X + $W + 22
  $y3 = $Y + $H + 50
  $x4 = $X + $W + 66
  $y4 = $Y + $H + 28
  return @"
  <polygon points="$X,$Y $($X + $W),$($Y - 10) $x4,$y4 $x3,$y3 $x2,$y2" fill="#4f504c" opacity="$Opacity"/>
  <polygon points="$($X + 4),$($Y + 18) $($X + $W - 8),$($Y + 6) $($X + $W + 20),$($Y + 30) $($X + $W - 26),$($Y + 58) $($X - 24),$($Y + 42)" fill="#3e403d" opacity="0.18"/>
"@
}

function House {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    [string]$State = "plain"
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  $snowRoof = if ($State -eq "plain") { "#d9ccb2" } else { "#eef5f4" }
  $snowBand = if ($State -eq "plain") { "" } else {
    @"
  <polygon points="$(& $p 2 77) $(& $p 100 130) $(& $p 100 160) $(& $p 2 105)" fill="#d9e3e2"/>
  <polygon points="$(& $p 100 130) $(& $p 198 76) $(& $p 198 106) $(& $p 100 160)" fill="#d9e3e2"/>
"@
  }

  return @"
$(DirectionalShadow -X $X -Y ($Y + [int](118 * $s)) -W ([int](190 * $s)) -H ([int](48 * $s)) -Opacity 0.24)
  <polygon points="$(& $p 0 54) $(& $p 100 0) $(& $p 200 55) $(& $p 100 116)" fill="#b08968"/>
  <polygon points="$(& $p 0 54) $(& $p 100 116) $(& $p 100 190) $(& $p 0 132)" fill="#8d6648"/>
  <polygon points="$(& $p 100 116) $(& $p 200 55) $(& $p 202 132) $(& $p 100 190)" fill="#9d7351"/>
  <polygon points="$(& $p -22 42) $(& $p 100 -18) $(& $p 222 58) $(& $p 100 134)" fill="$snowRoof"/>
  $snowBand
"@
}

function StoneBlock {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  return @"
$(DirectionalShadow -X $X -Y ($Y + [int](94 * $s)) -W ([int](155 * $s)) -H ([int](42 * $s)) -Opacity 0.22)
  <polygon points="$(& $p 0 45) $(& $p 82 5) $(& $p 168 47) $(& $p 84 96)" fill="#9b8b76"/>
  <polygon points="$(& $p 0 45) $(& $p 84 96) $(& $p 84 168) $(& $p 0 118)" fill="#857966"/>
  <polygon points="$(& $p 84 96) $(& $p 168 47) $(& $p 170 118) $(& $p 84 168)" fill="#978a75"/>
  <polygon points="$(& $p -14 34) $(& $p 82 -7) $(& $p 184 48) $(& $p 84 110)" fill="#eef4f3"/>
  <polygon points="$(& $p 0 118) $(& $p 84 168) $(& $p 84 198) $(& $p 0 148)" fill="#dce5e4"/>
  <polygon points="$(& $p 84 168) $(& $p 170 118) $(& $p 170 148) $(& $p 84 198)" fill="#dce5e4"/>
"@
}

function SnowPlant {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100
  )

  $s = $Scale / 100.0
  return @"
$(DirectionalShadow -X ($X - [int](14 * $s)) -Y ($Y + [int](48 * $s)) -W ([int](48 * $s)) -H ([int](18 * $s)) -Opacity 0.14)
  <polygon points="$X,$($Y + [int](54 * $s)) $($X + [int](26 * $s)),$($Y + [int](8 * $s)) $($X + [int](56 * $s)),$($Y + [int](58 * $s))" fill="#496f54"/>
  <polygon points="$($X - [int](18 * $s)),$($Y + [int](66 * $s)) $($X + [int](26 * $s)),$Y $($X + [int](74 * $s)),$($Y + [int](72 * $s)) $($X + [int](28 * $s)),$($Y + [int](48 * $s))" fill="#eef5f4"/>
"@
}

function HearthAndSmoke {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  return @"
$(DirectionalShadow -X $X -Y ($Y + [int](98 * $s)) -W ([int](170 * $s)) -H ([int](48 * $s)) -Opacity 0.24)
  <polygon points="$(& $p 24 -44) $(& $p -14 -118) $(& $p 28 -182) $(& $p -10 -250) $(& $p 40 -314) $(& $p 4 -394) $(& $p 58 -468) $(& $p 20 -548) $(& $p 66 -630)" fill="none" stroke="#aeb7b8" stroke-width="$([int](56 * $s))" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
  <polygon points="$(& $p 52 -62) $(& $p 86 -130) $(& $p 48 -196) $(& $p 92 -260) $(& $p 56 -330) $(& $p 104 -400) $(& $p 72 -476) $(& $p 118 -540)" fill="none" stroke="#c1c8c8" stroke-width="$([int](32 * $s))" stroke-linecap="round" stroke-linejoin="round" opacity="0.72"/>
  <polygon points="$(& $p 0 46) $(& $p 86 6) $(& $p 174 48) $(& $p 88 100)" fill="#d9ccb2"/>
  <polygon points="$(& $p 0 46) $(& $p 88 100) $(& $p 86 146) $(& $p 0 94)" fill="#b9ac93"/>
  <polygon points="$(& $p 88 100) $(& $p 174 48) $(& $p 176 94) $(& $p 86 146)" fill="#c9baa0"/>
  <polygon points="$(& $p 34 28) $(& $p 86 6) $(& $p 144 30) $(& $p 88 64)" fill="#eee5d2"/>
  <polygon points="$(& $p 54 22) $(& $p 86 8) $(& $p 124 24) $(& $p 88 48)" fill="#e97431"/>
  <polygon points="$(& $p 72 20) $(& $p 88 -22) $(& $p 112 22) $(& $p 90 44)" fill="#ff9a37"/>
"@
}

function Ruin {
  param(
    [int]$X,
    [int]$Y
  )

  return @"
$(DirectionalShadow -X $X -Y ($Y + 142) -W 250 -H 70 -Opacity 0.27)
  <polygon points="$X,$($Y + 88) $($X + 110),$($Y + 28) $($X + 232),$($Y + 92) $($X + 118),$($Y + 158)" fill="#9d7351"/>
  <polygon points="$X,$($Y + 88) $($X + 118),$($Y + 158) $($X + 116),$($Y + 218) $($X + 6),$($Y + 164)" fill="#7e5d43"/>
  <polygon points="$($X + 118),$($Y + 158) $($X + 232),$($Y + 92) $($X + 220),$($Y + 166) $($X + 116),$($Y + 218)" fill="#8d6648"/>
  <polygon points="$($X - 8),$($Y + 76) $($X + 92),$($Y + 16) $($X + 124),$($Y + 62) $($X + 156),$($Y + 22) $($X + 250),$($Y + 98) $($X + 164),$($Y + 160) $($X + 104),$($Y + 122)" fill="#eef4f3"/>
  <polygon points="$($X + 42),$($Y + 142) $($X + 116),$($Y + 166) $($X + 182),$($Y + 136) $($X + 154),$($Y + 194) $($X + 92),$($Y + 202)" fill="#6f5b4e"/>
  <polygon points="$($X + 72),$($Y + 198) $($X + 118),$($Y + 218) $($X + 176),$($Y + 184) $($X + 206),$($Y + 222) $($X + 110),$($Y + 252)" fill="#d8e1e0"/>
"@
}

# ---------------------------------------------------------------------------------------------
# Era one, added 2026-08-01: the mechanics the brief never designed
# ---------------------------------------------------------------------------------------------

<#
  A cell of ground the fire is holding, and the shape it is NOT.

  `WinterGround.tsx` gives held ground a FEATHERED rim, pulled back and sunk, against the
  frost's hard cell edge, and `winterFireGhost.ts` owns the one definition of what held ground
  looks like so the preview and the fact cannot drift. Both are drawn here: `Ghost` softens the
  fill and drops the hearth's heat, which is the three-channel proposal convention
  (`transparent`, no `depthWrite`, damped emissive) reduced to the one channel a still frame
  has.
#>
function WardedPatch {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    [switch]$Ghost,
    [switch]$FrozenOver
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  $fill = if ($FrozenOver) { "#c6d4dc" } else { "#c98a4b" }
  $inner = if ($FrozenOver) { "#d8e3e9" } else { "#b8793d" }
  $opacity = if ($Ghost) { "0.42" } else { "1" }

  return @"
  <polygon points="$(& $p -132 24) $(& $p -46 -18) $(& $p 46 -30) $(& $p 138 -6) $(& $p 176 28) $(& $p 122 62) $(& $p 34 80) $(& $p -60 70) $(& $p -124 46)" fill="$fill" opacity="$opacity"/>
  <polygon points="$(& $p -96 26) $(& $p -30 -2) $(& $p 44 -12) $(& $p 112 6) $(& $p 138 28) $(& $p 92 50) $(& $p 26 62) $(& $p -44 54) $(& $p -90 38)" fill="$inner" opacity="$(if ($Ghost) { "0.30" } else { "0.55" })"/>
"@
}

<#
  The hearth on its own, at three fuel heights, with the flame scaled to the stack.

  `HARD_WINTER.fire.burn_rounds_by_tier` runs 2 / 2 / 3 and the 3D layer draws NONE of it:
  `WinterFire`'s view carries `rounds_left` and no mesh reads it (measured). So this is the one
  primitive here proposing something unbuilt, and it proposes the cheapest possible version of
  the brief's own recommendation: duration in the fire's own mass, no floating number.
#>
function Hearth {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    # "ghost" = proposed, "unlit" = declared and never caught, "burning", "spent" = burnt out.
    [string]$State = "burning",
    # 3, 2 or 1 rounds of fuel left. Ignored unless the hearth is burning.
    [int]$Fuel = 3,
    [switch]$Smoke
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  $ghost = $State -eq "ghost"
  $stoneTop = if ($State -eq "spent") { "#6a635c" } else { "#d9ccb2" }
  $stoneLeft = if ($State -eq "spent") { "#4e4a45" } else { "#b9ac93" }
  $stoneRight = if ($State -eq "spent") { "#5b564f" } else { "#c9baa0" }
  $stoneOpacity = if ($ghost) { "0.55" } else { "1" }

  # The fuel stack is the duration read. Three rounds stands a full cone; one round is embers.
  $stackRise = switch ($Fuel) { 3 { -30 } 2 { -14 } default { -2 } }
  $flameRise = switch ($Fuel) { 3 { -22 } 2 { -8 } default { 4 } }

  $bed = if ($State -eq "unlit") {
    # Declared and never caught: the fuel is laid and there is no ember in it. The absence is
    # the point, per `winterFire.ts`, so nothing warm is drawn at all.
    @"
  <polygon points="$(& $p 34 28) $(& $p 86 6) $(& $p 144 30) $(& $p 88 64)" fill="#9c8f76"/>
  <polygon points="$(& $p 52 $(22 + $stackRise)) $(& $p 86 8) $(& $p 124 24) $(& $p 88 48)" fill="#8b7f68"/>
"@
  }
  elseif ($State -eq "spent") {
    @"
  <polygon points="$(& $p 34 28) $(& $p 86 6) $(& $p 144 30) $(& $p 88 64)" fill="#4a4844"/>
  <polygon points="$(& $p 58 26) $(& $p 88 14) $(& $p 118 28) $(& $p 88 42)" fill="#383633"/>
"@
  }
  else {
    $emberOpacity = if ($ghost) { "0.55" } else { "1" }
    $coreOpacity = if ($ghost) { "0.5" } else { "1" }
    @"
  <polygon points="$(& $p 34 28) $(& $p 86 6) $(& $p 144 30) $(& $p 88 64)" fill="#eee5d2" opacity="$stoneOpacity"/>
  <polygon points="$(& $p 54 $(22 + $stackRise)) $(& $p 86 8) $(& $p 124 24) $(& $p 88 48)" fill="#e97431" opacity="$emberOpacity"/>
  <polygon points="$(& $p 72 $(20 + $flameRise)) $(& $p 88 $(-22 + $stackRise)) $(& $p 112 $(22 + $flameRise)) $(& $p 90 44)" fill="#ff9a37" opacity="$coreOpacity"/>
"@
  }

  $plume = if ($Smoke) {
    $wisp = if ($State -eq "spent") { 0.34 } else { 0.9 }
    $reach = if ($State -eq "spent") { -190 } else { -600 }
    @"
  <polygon points="$(& $p 44 -30) $(& $p 8 $([int]($reach * 0.22))) $(& $p 46 $([int]($reach * 0.46))) $(& $p 16 $([int]($reach * 0.72))) $(& $p 62 $reach) $(& $p 108 $([int]($reach * 0.74))) $(& $p 78 $([int]($reach * 0.48))) $(& $p 116 $([int]($reach * 0.24))) $(& $p 86 -30)" fill="#aeb7b8" opacity="$wisp"/>
"@
  }
  else { "" }

  return @"
$(if ($ghost) { "" } else { DirectionalShadow -X $X -Y ($Y + [int](98 * $s)) -W ([int](170 * $s)) -H ([int](48 * $s)) -Opacity 0.24 })
  $plume
  <polygon points="$(& $p 0 46) $(& $p 86 6) $(& $p 174 48) $(& $p 88 100)" fill="$stoneTop" opacity="$stoneOpacity"/>
  <polygon points="$(& $p 0 46) $(& $p 88 100) $(& $p 86 146) $(& $p 0 94)" fill="$stoneLeft" opacity="$stoneOpacity"/>
  <polygon points="$(& $p 88 100) $(& $p 174 48) $(& $p 176 94) $(& $p 86 146)" fill="$stoneRight" opacity="$stoneOpacity"/>
  $bed
"@
}

<#
  THE CRISIS BADGE: the mark a building wears in the slot its mastery stars use out of a crisis.

  `apps/web/src/city/three/CrisisStatusMarker.tsx` is the shipped object and this reproduces its
  two marks rather than inventing a plate-only pair. Both are camera-facing BILLBOARDS in the
  scene, so both are drawn here as flat screen-space shapes above the roofline instead of on the
  isometric grid the masses use, and both are built as a dark backing plate 1.24 times the face
  and then the face, which is `MasteryStars`' own construction: a flat shape against a near-white
  overcast sky needs an outline or it dissolves into it.

   - THREATENED is a double chevron driving DOWNWARD, in the ice front's own `#3c7fa0`. The frost
     arrives from outside and comes in, so the mark points the way the harm travels.
   - LOST is a broken cross in the scene's char, plated in its slush dark.

  There is deliberately NO badge for a safe building. The lead ruled on 2026-08-01 that an
  unthreatened building gets nothing added, so `#381`'s stone hexagon came off and the presence of
  a badge means something has happened or is about to.

  AMENDED 2026-08-01: the threatened mark was an amber block standing at the building's front
  corner. Section 5.1a of `2026-08-01-hard-winter-art-brief-addendum.md` carries why the ice
  front's blue is not merely acceptable but correct, and the short form is that the island's warm
  ochre already means "a fire is holding this", so an amber warning lands in the protection family
  and reads as reassurance.
#>
function CrisisBadge {
  param(
    [int]$X,
    [int]$Y,
    # The badge's width in pixels. Its own geometry is authored in fractions of that.
    [double]$Size = 46,
    # "threatened" or "lost"
    [string]$State = "threatened"
  )

  $face = if ($State -eq "lost") { "#3a342c" } else { "#3c7fa0" }
  $edge = if ($State -eq "lost") { "#6f6357" } else { "#3a342c" }

  # One pass over the shapes per layer, so the plate behind and the face in front cannot drift
  # into being two different marks.
  $pass = {
    param([double]$Unit, [string]$Fill)

    # Shape units, with +Y UP as `THREE.Shape` has it, flipped here because SVG's Y runs down.
    $pt = {
      param([double]$Sx, [double]$Sy)
      return "$([int][Math]::Round($X + $Sx * $Unit)),$([int][Math]::Round($Y - $Sy * $Unit))"
    }

    $out = ""
    if ($State -eq "lost") {
      $half = 0.52
      $arm = 0.15
      $gap = 0.09
      foreach ($quarter in 1, 3, 5, 7) {
        $angle = $quarter * [Math]::PI / 4
        $cos = [Math]::Cos($angle)
        $sin = [Math]::Sin($angle)
        $points = @()
        foreach ($corner in @(@($gap, - $arm), @($half, - $arm), @($half, $arm), @($gap, $arm))) {
          $points += (& $pt ($corner[0] * $cos - $corner[1] * $sin) ($corner[0] * $sin + $corner[1] * $cos))
        }
        $out += "  <polygon points=""$($points -join ' ')"" fill=""$Fill""/>`n"
      }
    }
    else {
      $hw = 0.5
      $band = 0.19
      $drop = 0.22
      foreach ($offset in 0.3, -0.08) {
        $points = @(
          (& $pt (-$hw) ($offset + $drop)),
          (& $pt 0 ($offset - $drop)),
          (& $pt $hw ($offset + $drop)),
          (& $pt $hw ($offset + $drop - $band)),
          (& $pt 0 ($offset - $drop - $band)),
          (& $pt (-$hw) ($offset + $drop - $band))
        )
        $out += "  <polygon points=""$($points -join ' ')"" fill=""$Fill""/>`n"
      }
    }
    return $out
  }

  return ((& $pass ($Size * 1.24) $edge) + (& $pass $Size $face)).TrimEnd()
}

<#
  A protected building, a threatened one, and the three neighbours they must not be confused
  with.

  `origin/game/winter-shield-and-threat` decided the shield and this draws WHAT THAT BRANCH
  DECIDED rather than a second answer: a storm roof that OVERSAILS the wall, a ridge standing
  proud, battens serrating the slope, and a berm banked up the visible walls. It is an outline
  change in every channel, which is why it survives being ghosted and survives full zoom-out.
  `SpentShield` is therefore the ORDINARY building, because that branch rules shielded binary
  on screen, and the plate exists to show that the reversion is legible next to a building that
  was never shielded at all.
#>
function WinterBuilding {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    # "plain", "frost", "shield", "shield-ghost", "threatened"
    [string]$State = "frost",
    [int]$FrostStage = 0
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  $snowRoof = if ($State -eq "plain") { "#d9ccb2" } else { "#eef5f4" }

  # Frost climbing the building is `frostStage.ts`'s three damaged appearances. It climbs; it
  # does not tint, because nothing tints a building at runtime.
  $climb = if ($FrostStage -le 0) { "" } else {
    $height = switch ($FrostStage) { 1 { 22 } 2 { 46 } default { 74 } }
    @"
  <polygon points="$(& $p 0 $(132 - $height)) $(& $p 100 $(190 - $height)) $(& $p 100 190) $(& $p 0 132)" fill="#cfe0ea"/>
  <polygon points="$(& $p 100 $(190 - $height)) $(& $p 202 $(132 - $height)) $(& $p 202 132) $(& $p 100 190)" fill="#bcd2e0"/>
"@
  }

  $shield = if ($State -eq "shield" -or $State -eq "shield-ghost") {
    $opacity = if ($State -eq "shield-ghost") { "0.68" } else { "1" }
    $capTop = if ($State -eq "shield-ghost") { "#7d6a52" } else { "#c9b294" }
    $capRight = if ($State -eq "shield-ghost") { "#5f5140" } else { "#a8916f" }
    @"
  <polygon points="$(& $p -46 30) $(& $p 100 -54) $(& $p 246 34) $(& $p 100 122)" fill="$capTop" opacity="$opacity"/>
  <polygon points="$(& $p -46 30) $(& $p 100 122) $(& $p 100 140) $(& $p -46 48)" fill="$capRight" opacity="$opacity"/>
  <polygon points="$(& $p 100 122) $(& $p 246 34) $(& $p 246 52) $(& $p 100 140)" fill="$capRight" opacity="$opacity"/>
  <polygon points="$(& $p 26 -6) $(& $p 100 -50) $(& $p 106 -46) $(& $p 32 -2)" fill="#8d7757" opacity="$opacity"/>
  <polygon points="$(& $p 100 -50) $(& $p 176 -4) $(& $p 170 0) $(& $p 94 -46)" fill="#8d7757" opacity="$opacity"/>
  <polygon points="$(& $p 4 46) $(& $p 100 -8) $(& $p 108 -4) $(& $p 12 50)" fill="#8d7757" opacity="$opacity"/>
  <polygon points="$(& $p -14 126) $(& $p 100 190) $(& $p 100 214) $(& $p -22 148)" fill="#a2907b" opacity="$opacity"/>
  <polygon points="$(& $p 100 190) $(& $p 214 128) $(& $p 222 150) $(& $p 100 214)" fill="#8f7f6c" opacity="$opacity"/>
"@
  }
  else { "" }

  # The threat mark is `CrisisStatusMarker`'s, and it is drawn where that file draws it rather
  # than where this plate first guessed. AMENDED 2026-08-01 on the lead's ruling: it was a
  # standing amber mark at the building's front corner, and the shipped mark is a screen-facing
  # BILLBOARD above the roofline in the ice front's own `#3c7fa0`. The reasoning is in
  # `2026-08-01-hard-winter-art-brief-addendum.md` section 5.1a, and the short form is that the
  # island's warm ochre already means "a fire is holding this", so an amber warning would have
  # landed in the protection family and read as reassurance.
  $threat = if ($State -eq "threatened") {
    (CrisisBadge -X ($X + [int](100 * $s)) -Y ($Y - [int](58 * $s)) -Scale ($Scale * 0.46) -State "threatened")
  }
  else { "" }

  return @"
$(DirectionalShadow -X $X -Y ($Y + [int](118 * $s)) -W ([int](190 * $s)) -H ([int](48 * $s)) -Opacity 0.24)
  <polygon points="$(& $p 0 54) $(& $p 100 0) $(& $p 200 55) $(& $p 100 116)" fill="#b08968"/>
  <polygon points="$(& $p 0 54) $(& $p 100 116) $(& $p 100 190) $(& $p 0 132)" fill="#8d6648"/>
  <polygon points="$(& $p 100 116) $(& $p 200 55) $(& $p 202 132) $(& $p 100 190)" fill="#9d7351"/>
  <polygon points="$(& $p -22 42) $(& $p 100 -18) $(& $p 222 58) $(& $p 100 134)" fill="$snowRoof"/>
  $climb
  $shield
  $threat
"@
}

# ---------------------------------------------------------------------------------------------
# Eras four, six and nine: one massing kit, shaded by the three-tone model
# ---------------------------------------------------------------------------------------------

<#
  The sky, haze and fog for a crisis whose atmosphere is CARRIED BY LIGHT rather than by
  weather.

  Era one's `AmbientWorld` bakes a snow-white overcast into its literals. The three unbuilt
  crises each want a different sky and none of them wants snow, so this takes the two tones as
  parameters. `WINTER_LIGHT` in `apps/web/src/city/three/winterTones.ts` is the shipped shape
  a crisis preset takes and is what these plates are a target for: it is one table, and it
  changes the whole island.
#>
function EraSky {
  param(
    [string]$Sky,
    [string]$Haze,
    [string]$Water
  )

  $hazeSoft = Lighten -Hex $Haze -Amount 0.35
  return @"
  <rect width="1400" height="900" fill="$Sky"/>
  <polygon points="-120,510 210,472 555,450 872,462 1212,505 1520,575 1520,940 -120,940" fill="$Water"/>
  <polygon points="-120,438 178,410 542,392 903,404 1272,452 1520,510 1520,720 1240,656 922,610 568,594 210,612 -120,660" fill="$Haze" opacity="0.40"/>
  <polygon points="-120,392 164,368 520,352 886,362 1268,408 1520,458 1520,586 1206,530 884,494 520,482 156,502 -120,542" fill="$hazeSoft" opacity="0.46"/>
"@
}

<#
  The paved island, in the era's own floor material.

  Every one of eras four, six and nine lays a HARD floor rather than grass, and each era's
  guide is explicit that the crisis may not change it. So the ground here is one continuous
  paved figure and the crisis writes on it with objects: `Joints` draws the joint lines the
  boundary stones and the inlaid link bands both sit on, which is what makes those marks read
  as a claim about the city rather than as a graphic laid over it.
#>
function EraGround {
  param(
    [string]$Floor,
    [string]$FloorDeep,
    [string]$Kerb,
    [string]$Variant = "wide",
    [int]$Joints = 5
  )

  $floorLit = Lighten -Hex $Floor -Amount 0.10
  $jointTone = Darken -Hex $Floor -Amount 0.16

  if ($Variant -eq "wide") {
    $body = @"
  <polygon points="124,588 298,522 548,490 828,502 1092,558 1258,650 1204,744 954,810 610,828 294,784 112,672" fill="$Kerb"/>
  <polygon points="166,600 336,540 560,514 812,526 1036,578 1168,650 1118,730 918,780 616,796 340,754 158,660" fill="$FloorDeep"/>
  <polygon points="196,610 372,558 580,538 792,550 986,598 1092,660 1044,722 862,762 622,772 392,734 214,666" fill="$Floor"/>
  <polygon points="258,618 428,580 606,566 782,578 940,616 1020,662 980,700 830,730 626,738 434,704 274,656" fill="$floorLit"/>
"@
    $jointRows = New-Object System.Collections.Generic.List[string]
    for ($jointIndex = 0; $jointIndex -lt $Joints; $jointIndex++) {
      $y = 618 + $jointIndex * 26
      $inset = $jointIndex * 20
      $left = 232 + $inset
      $right = 1046 - $inset
      $jointRows.Add("<polygon points=""$left,$y $right,$($y + 34) $right,$($y + 38) $left,$($y + 4)"" fill=""$jointTone"" opacity=""0.36""/>")
    }
    return ($body + "`n  " + ($jointRows -join "`n  "))
  }

  $body = @"
  <polygon points="-80,566 184,512 484,486 780,498 1076,560 1480,688 1480,940 -80,940" fill="$Kerb"/>
  <polygon points="-60,592 214,536 494,514 772,526 1036,584 1456,716 1456,940 -60,940" fill="$FloorDeep"/>
  <polygon points="-40,616 224,562 498,540 774,554 1030,612 1440,742 1440,940 -40,940" fill="$Floor"/>
  <polygon points="-20,654 244,602 508,584 780,600 1042,662 1424,786 1424,940 -20,940" fill="$floorLit"/>
"@
  $jointRows = New-Object System.Collections.Generic.List[string]
  for ($jointIndex = 0; $jointIndex -lt $Joints; $jointIndex++) {
    $y = 636 + $jointIndex * 44
    $jointRows.Add("<polygon points=""-40,$y 1400,$($y + 96) 1400,$($y + 102) -40,$($y + 6)"" fill=""$jointTone"" opacity=""0.30""/>")
  }
  return ($body + "`n  " + ($jointRows -join "`n  "))
}

<#
  A mass, shaded by the three-tone model, with a roof the era chooses.

  NO MASS HERE IS A BUILDING DESIGN. The era style guides and the civic catalogues own that,
  and they are not this pack's to write. These are stand-ins with the era's body hue and its
  roof idiom, so a crisis mark has something era-correct to sit on: a pitched terracotta roof
  in era four, a lead dome or a low pitch in era six, a flat parapet in era nine.
#>
function EraMass {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    [string]$Body = "#d2c8aa",
    [string]$Accent = "#b4674a",
    # "pitched", "dome", "flat"
    [string]$Roof = "pitched",
    # A dark element at ground level. Every pale era needs one and each era's is different.
    # "kerb", "rustic", "shadow-gap", "none"
    [string]$Base = "kerb",
    [double]$Height = 1.0
  )

  $s = $Scale / 100.0
  $rise = [int](74 * $Height)
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  $top = FaceTop -Hex $Body
  $left = FaceLeft -Hex $Body
  $right = FaceRight -Hex $Body
  $accentTop = FaceTop -Hex $Accent
  $accentRight = FaceRight -Hex $Accent

  # The dark element at ground level, laid along the BOTTOM edge of each visible wall. Every
  # pale era in the ladder needs one and eras six, eight and nine each arrived at it
  # independently, which is why the era guides record it as a rule rather than a coincidence:
  # the floor cannot separate a pale building from a pale ground for the whole accumulated city,
  # so each era's buildings carry their own dark line where they meet it.
  $foot = 190 + $rise
  $footRight = 132 + $rise
  $baseBand = switch ($Base) {
    "kerb" {
      $kerb = Darken -Hex $Body -Amount 0.46
      $kerbLit = Darken -Hex $Body -Amount 0.34
      @"
  <polygon points="$(& $p 0 $($footRight - 15)) $(& $p 100 $($foot - 15)) $(& $p 100 $foot) $(& $p 0 $footRight)" fill="$kerb"/>
  <polygon points="$(& $p 100 $($foot - 15)) $(& $p 200 $($footRight - 15)) $(& $p 200 $footRight) $(& $p 100 $foot)" fill="$kerbLit"/>
"@
    }
    "rustic" {
      $rustic = Darken -Hex $Body -Amount 0.40
      $rusticDark = Darken -Hex $Body -Amount 0.54
      $channel = Darken -Hex $Body -Amount 0.62
      @"
  <polygon points="$(& $p 0 $($footRight - 40)) $(& $p 100 $($foot - 40)) $(& $p 100 $foot) $(& $p 0 $footRight)" fill="$rustic"/>
  <polygon points="$(& $p 100 $($foot - 40)) $(& $p 200 $($footRight - 40)) $(& $p 200 $footRight) $(& $p 100 $foot)" fill="$rusticDark"/>
  <polygon points="$(& $p 0 $($footRight - 21)) $(& $p 100 $($foot - 21)) $(& $p 100 $($foot - 17)) $(& $p 0 $($footRight - 17))" fill="$channel" opacity="0.6"/>
  <polygon points="$(& $p 100 $($foot - 21)) $(& $p 200 $($footRight - 21)) $(& $p 200 $($footRight - 17)) $(& $p 100 $($foot - 17))" fill="$channel" opacity="0.6"/>
"@
    }
    "shadow-gap" {
      @"
  <polygon points="$(& $p 0 $($footRight - 11)) $(& $p 100 $($foot - 11)) $(& $p 100 $foot) $(& $p 0 $footRight)" fill="#3f474c"/>
  <polygon points="$(& $p 100 $($foot - 11)) $(& $p 200 $($footRight - 11)) $(& $p 200 $footRight) $(& $p 100 $foot)" fill="#333a3f"/>
"@
    }
    default { "" }
  }

  $roofGeometry = switch ($Roof) {
    "pitched" {
      @"
  <polygon points="$(& $p -18 46) $(& $p 100 -14) $(& $p 218 47) $(& $p 100 108)" fill="$accentTop"/>
  <polygon points="$(& $p -18 46) $(& $p 100 108) $(& $p 100 118) $(& $p -18 56)" fill="$accentRight"/>
  <polygon points="$(& $p 100 108) $(& $p 218 47) $(& $p 218 57) $(& $p 100 118)" fill="$accentRight"/>
"@
    }
    "dome" {
      $lead = $Accent
      $leadTop = FaceTop -Hex $lead
      $leadRight = FaceRight -Hex $lead
      @"
  <polygon points="$(& $p 34 26) $(& $p 100 -8) $(& $p 166 27) $(& $p 100 62)" fill="$(Lighten -Hex $Body -Amount 0.16)"/>
  <polygon points="$(& $p 40 -8) $(& $p 100 -40) $(& $p 160 -7) $(& $p 100 26)" fill="$leadTop"/>
  <polygon points="$(& $p 40 -8) $(& $p 100 26) $(& $p 100 34) $(& $p 40 0)" fill="$leadRight"/>
  <polygon points="$(& $p 100 26) $(& $p 160 -7) $(& $p 160 1) $(& $p 100 34)" fill="$leadRight"/>
  <polygon points="$(& $p 84 -40) $(& $p 100 -60) $(& $p 116 -40) $(& $p 100 -28)" fill="$leadTop"/>
"@
    }
    default {
      $parapet = Darken -Hex $Body -Amount 0.12
      @"
  <polygon points="$(& $p -6 51) $(& $p 100 -8) $(& $p 206 52) $(& $p 100 110)" fill="$parapet"/>
  <polygon points="$(& $p 6 54) $(& $p 100 2) $(& $p 194 55) $(& $p 100 106)" fill="$(Lighten -Hex $Body -Amount 0.34)"/>
"@
    }
  }

  return @"
$(DirectionalShadow -X $X -Y ($Y + [int]((118 + $rise) * $s)) -W ([int](190 * $s)) -H ([int](48 * $s)) -Opacity 0.20)
  <polygon points="$(& $p 0 54) $(& $p 100 0) $(& $p 200 55) $(& $p 100 116)" fill="$top"/>
  <polygon points="$(& $p 0 54) $(& $p 100 116) $(& $p 100 $(190 + $rise)) $(& $p 0 $(132 + $rise))" fill="$left"/>
  <polygon points="$(& $p 100 116) $(& $p 200 55) $(& $p 200 $(132 + $rise)) $(& $p 100 $(190 + $rise))" fill="$right"/>
  $baseBand
  $roofGeometry
"@
}

<# A shutter plate over an opening, plus the corner tag that is its second channel. #>
function ShutterPlates {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    [string]$Boarding = "#8f7a5c",
    [string]$Tag = "#5d6a70",
    [double]$Height = 1.0,
    [switch]$BarredDoor
  )

  $s = $Scale / 100.0
  $rise = [int](74 * $Height)
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  $boardDark = Darken -Hex $Boarding -Amount 0.22
  $plates = New-Object System.Collections.Generic.List[string]
  for ($bay = 0; $bay -lt 3; $bay++) {
    $dx = 14 + $bay * 30
    $dy = 84 + $bay * 18
    $plates.Add("<polygon points=""$(& $p $dx $($dy + $rise - 34)) $(& $p ($dx + 22) $($dy + $rise - 22)) $(& $p ($dx + 22) $($dy + $rise + 12)) $(& $p $dx $($dy + $rise)) "" fill=""$Boarding""/>")
    $plates.Add("<polygon points=""$(& $p $dx $($dy + $rise - 24)) $(& $p ($dx + 22) $($dy + $rise - 12)) $(& $p ($dx + 22) $($dy + $rise - 8)) $(& $p $dx $($dy + $rise - 20)) "" fill=""$boardDark""/>")
  }
  for ($bay = 0; $bay -lt 3; $bay++) {
    $dx = 116 + $bay * 30
    $dy = 100 - $bay * 18
    $plates.Add("<polygon points=""$(& $p $dx $($dy + $rise - 22)) $(& $p ($dx + 22) $($dy + $rise - 34)) $(& $p ($dx + 22) $($dy + $rise)) $(& $p $dx $($dy + $rise + 12)) "" fill=""$boardDark""/>")
  }

  $door = if ($BarredDoor) {
    @"
  <polygon points="$(& $p 82 $(140 + $rise)) $(& $p 118 $(158 + $rise)) $(& $p 118 $(172 + $rise)) $(& $p 82 $(154 + $rise))" fill="$Boarding"/>
"@
  }
  else { "" }

  return @"
  $($plates -join "`n  ")
  $door
  <polygon points="$(& $p -4 $(150 + $rise)) $(& $p 22 $(164 + $rise)) $(& $p 22 $(190 + $rise)) $(& $p -4 $(176 + $rise))" fill="$Tag"/>
  <polygon points="$(& $p 2 $(164 + $rise)) $(& $p 16 $(172 + $rise)) $(& $p 16 $(176 + $rise)) $(& $p 2 $(168 + $rise))" fill="$(Lighten -Hex $Tag -Amount 0.5)"/>
"@
}

<# Era four's plinth, and the figure on it that is the whole allegiance read. #>
function Plinth {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    # "bare", "standing", "seated", "hoisted", "ghost-standing"
    [string]$State = "bare",
    [string]$Stone = "#d2c8aa"
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  $top = FaceTop -Hex $Stone
  $left = FaceLeft -Hex $Stone
  $right = FaceRight -Hex $Stone
  $figure = Darken -Hex $Stone -Amount 0.22
  $figureTop = FaceTop -Hex $figure
  $figureRight = FaceRight -Hex $figure
  $ghost = $State -eq "ghost-standing"
  $o = if ($ghost) { "0.55" } else { "1" }

  # The plinth's top-face centre is local (40, 30) and every figure's base sits on it, so a
  # figure is never drawn behind the mass it stands on. The plinth is drawn FIRST for the same
  # reason: painter order is the only depth this format has.
  $pedestal = @"
$(DirectionalShadow -X $X -Y ($Y + [int](96 * $s)) -W ([int](76 * $s)) -H ([int](22 * $s)) -Opacity 0.18)
  <polygon points="$(& $p -8 34) $(& $p 40 6) $(& $p 88 34) $(& $p 40 62)" fill="$(Lighten -Hex $Stone -Amount 0.30)"/>
  <polygon points="$(& $p 0 38) $(& $p 40 15) $(& $p 80 38) $(& $p 40 61)" fill="$top"/>
  <polygon points="$(& $p 0 38) $(& $p 40 61) $(& $p 40 120) $(& $p 0 97)" fill="$left"/>
  <polygon points="$(& $p 40 61) $(& $p 80 38) $(& $p 80 97) $(& $p 40 120)" fill="$right"/>
  <polygon points="$(& $p 0 84) $(& $p 40 107) $(& $p 40 120) $(& $p 0 97)" fill="$(Darken -Hex $Stone -Amount 0.42)"/>
  <polygon points="$(& $p 40 107) $(& $p 80 84) $(& $p 80 97) $(& $p 40 120)" fill="$(Darken -Hex $Stone -Amount 0.32)"/>
"@

  # STANDING against SEATED is the whole allegiance read, so the two are separated on the axis
  # that survives full zoom-out: a tall narrow upright with one arm raised against a wide low
  # mass with a knee thrown forward. Neither carries a colour the other does not.
  $body = switch ($State) {
    { $_ -eq "standing" -or $_ -eq "ghost-standing" } { @"
  <polygon points="$(& $p 28 -60) $(& $p 40 -67) $(& $p 52 -60) $(& $p 40 -53)" fill="$figureTop" opacity="$o"/>
  <polygon points="$(& $p 28 -60) $(& $p 40 -53) $(& $p 40 26) $(& $p 28 19)" fill="$figure" opacity="$o"/>
  <polygon points="$(& $p 40 -53) $(& $p 52 -60) $(& $p 52 19) $(& $p 40 26)" fill="$figureRight" opacity="$o"/>
  <polygon points="$(& $p 34 -78) $(& $p 40 -82) $(& $p 46 -78) $(& $p 40 -74)" fill="$figureTop" opacity="$o"/>
  <polygon points="$(& $p 34 -78) $(& $p 40 -74) $(& $p 40 -62) $(& $p 34 -66)" fill="$figure" opacity="$o"/>
  <polygon points="$(& $p 40 -74) $(& $p 46 -78) $(& $p 46 -66) $(& $p 40 -62)" fill="$figureRight" opacity="$o"/>
  <polygon points="$(& $p 50 -54) $(& $p 72 -96) $(& $p 78 -92) $(& $p 56 -48)" fill="$figure" opacity="$o"/>
  <polygon points="$(& $p 22 28) $(& $p 40 19) $(& $p 58 28) $(& $p 40 37)" fill="$figureTop" opacity="$o"/>
"@ }
    "seated" { @"
  <polygon points="$(& $p 14 -18) $(& $p 40 -31) $(& $p 66 -18) $(& $p 40 -5)" fill="$figureTop"/>
  <polygon points="$(& $p 14 -18) $(& $p 40 -5) $(& $p 40 26) $(& $p 14 13)" fill="$figure"/>
  <polygon points="$(& $p 40 -5) $(& $p 66 -18) $(& $p 66 11) $(& $p 40 26)" fill="$figureRight"/>
  <polygon points="$(& $p 32 -44) $(& $p 40 -48) $(& $p 48 -44) $(& $p 40 -40)" fill="$figureTop"/>
  <polygon points="$(& $p 32 -44) $(& $p 40 -40) $(& $p 40 -22) $(& $p 32 -26)" fill="$figure"/>
  <polygon points="$(& $p 40 -40) $(& $p 48 -44) $(& $p 48 -26) $(& $p 40 -22)" fill="$figureRight"/>
  <polygon points="$(& $p 40 -2) $(& $p 78 16) $(& $p 78 28) $(& $p 40 10)" fill="$figureRight"/>
  <polygon points="$(& $p 40 -2) $(& $p 62 -13) $(& $p 78 16) $(& $p 40 10)" fill="$figureTop"/>
  <polygon points="$(& $p 20 28) $(& $p 40 18) $(& $p 60 28) $(& $p 40 38)" fill="$figureTop"/>
"@ }
    "hoisted" { @"
  <polygon points="$(& $p -20 34) $(& $p 36 -104) $(& $p 42 -102) $(& $p -14 36)" fill="#8f7a5c"/>
  <polygon points="$(& $p 100 34) $(& $p 44 -104) $(& $p 38 -102) $(& $p 94 36)" fill="#7a6749"/>
  <polygon points="$(& $p -4 -6) $(& $p 84 -6) $(& $p 84 -1) $(& $p -4 -1)" fill="#6f5f46"/>
  <polygon points="$(& $p 38 -102) $(& $p 42 -102) $(& $p 42 -58) $(& $p 38 -58)" fill="#6f5f46"/>
  <polygon points="$(& $p 24 -58) $(& $p 40 -66) $(& $p 56 -58) $(& $p 40 -50)" fill="$figureTop"/>
  <polygon points="$(& $p 24 -58) $(& $p 40 -50) $(& $p 40 -6) $(& $p 24 -14)" fill="$figure"/>
  <polygon points="$(& $p 40 -50) $(& $p 56 -58) $(& $p 56 -14) $(& $p 40 -6)" fill="$figureRight"/>
"@ }
    default { "" }
  }

  return @"
$pedestal
  $body
"@
}

<#
  A boundary stone, and the cut mark on its top face that is the allegiance read from anywhere
  in the district.

  Era four's marks are CUT, not coloured: the era's tally descendant is the carved inscription
  panel, and a cut mark on a boundary stone is that at its smallest. `Mark` is "plain",
  "chevron", "ring" or "both" and every one of them is a change of relief.
#>
function BoundaryStone {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    [string]$Mark = "plain",
    [string]$Stone = "#d2c8aa"
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  $top = FaceTop -Hex $Stone
  $left = FaceLeft -Hex $Stone
  $right = FaceRight -Hex $Stone
  $cut = Darken -Hex $Stone -Amount 0.44

  $chevron = @"
  <polygon points="$(& $p 8 20) $(& $p 20 13) $(& $p 32 20) $(& $p 28 22) $(& $p 20 18) $(& $p 12 22)" fill="$cut"/>
"@
  $ring = @"
  <polygon points="$(& $p 12 20) $(& $p 20 15) $(& $p 28 20) $(& $p 20 25)" fill="$cut"/>
  <polygon points="$(& $p 16 20) $(& $p 20 18) $(& $p 24 20) $(& $p 20 22)" fill="$top"/>
"@

  $markGeometry = switch ($Mark) {
    "chevron" { $chevron }
    "ring" { $ring }
    "both" { $chevron + "`n" + @"
  <polygon points="$(& $p 12 26) $(& $p 20 22) $(& $p 28 26) $(& $p 20 30)" fill="$cut"/>
"@ }
    default { "" }
  }

  return @"
$(DirectionalShadow -X $X -Y ($Y + [int](30 * $s)) -W ([int](38 * $s)) -H ([int](10 * $s)) -Opacity 0.14)
  <polygon points="$(& $p 0 18) $(& $p 20 8) $(& $p 40 18) $(& $p 20 28)" fill="$top"/>
  <polygon points="$(& $p 0 18) $(& $p 20 28) $(& $p 20 46) $(& $p 0 36)" fill="$left"/>
  <polygon points="$(& $p 20 28) $(& $p 40 18) $(& $p 40 36) $(& $p 20 46)" fill="$right"/>
  $markGeometry
"@
}

<# The numbered block waiting at a plinth's foot: the drift warning, and the crisis's fairness. #>
function DriftBlock {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    [string]$Mark = "ring",
    [switch]$InSling,
    [string]$Stone = "#d2c8aa"
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  $lift = if ($InSling) { -60 } else { 0 }
  $top = FaceTop -Hex $Stone
  $left = FaceLeft -Hex $Stone
  $right = FaceRight -Hex $Stone
  $cut = Darken -Hex $Stone -Amount 0.44

  $legs = @"
  <polygon points="$(& $p -22 -84) $(& $p 26 -114) $(& $p 30 -110) $(& $p -18 -80)" fill="#8f7a5c"/>
  <polygon points="$(& $p 74 -84) $(& $p 26 -114) $(& $p 22 -110) $(& $p 70 -80)" fill="#7a6749"/>
  <polygon points="$(& $p 24 -110) $(& $p 28 -110) $(& $p 28 $(-30 + $lift)) $(& $p 24 $(-30 + $lift))" fill="#6f5f46"/>
"@

  $markGeometry = if ($Mark -eq "ring") {
    @"
  <polygon points="$(& $p 16 $(6 + $lift)) $(& $p 26 $(1 + $lift)) $(& $p 36 $(6 + $lift)) $(& $p 26 $(11 + $lift))" fill="$cut"/>
  <polygon points="$(& $p 21 $(6 + $lift)) $(& $p 26 $(4 + $lift)) $(& $p 31 $(6 + $lift)) $(& $p 26 $(8 + $lift))" fill="$top"/>
"@
  }
  else {
    @"
  <polygon points="$(& $p 14 $(8 + $lift)) $(& $p 26 $(1 + $lift)) $(& $p 38 $(8 + $lift)) $(& $p 34 $(10 + $lift)) $(& $p 26 $(6 + $lift)) $(& $p 18 $(10 + $lift))" fill="$cut"/>
"@
  }

  return @"
  $legs
$(if ($InSling) { "" } else { DirectionalShadow -X $X -Y ($Y + [int](34 * $s)) -W ([int](50 * $s)) -H ([int](14 * $s)) -Opacity 0.16 })
  <polygon points="$(& $p 0 $(6 + $lift)) $(& $p 26 $(-8 + $lift)) $(& $p 52 $(6 + $lift)) $(& $p 26 $(20 + $lift))" fill="$top"/>
  <polygon points="$(& $p 0 $(6 + $lift)) $(& $p 26 $(20 + $lift)) $(& $p 26 $(44 + $lift)) $(& $p 0 $(30 + $lift))" fill="$left"/>
  <polygon points="$(& $p 26 $(20 + $lift)) $(& $p 52 $(6 + $lift)) $(& $p 52 $(30 + $lift)) $(& $p 26 $(44 + $lift))" fill="$right"/>
  $markGeometry
"@
}

<#
  Era four's counting board: the ruled slab and the counters seated in it.

  The one crisis of the four with a BANKED resource, and the only magnitude any of them draws
  on the island. A ruled grid is countable at a glance, which is what INV-CRISIS-16 wants and
  what a number would not give.
#>
function CountingBoard {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    [int]$Counters = 4,
    [string]$Stone = "#d2c8aa"
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  $top = FaceTop -Hex $Stone
  $left = FaceLeft -Hex $Stone
  $right = FaceRight -Hex $Stone
  $rule = Darken -Hex $Stone -Amount 0.40
  $counterTop = Darken -Hex $Stone -Amount 0.30
  $counterSide = Darken -Hex $Stone -Amount 0.52

  $rules = New-Object System.Collections.Generic.List[string]
  for ($cell = 0; $cell -le 6; $cell++) {
    $dx = 16 + $cell * 26
    $rules.Add("<polygon points=""$(& $p $dx 18) $(& $p ($dx + 22) 30) $(& $p ($dx + 21) 32) $(& $p $dx 20)"" fill=""$rule"" opacity=""0.5""/>")
  }

  $seated = New-Object System.Collections.Generic.List[string]
  for ($counter = 0; $counter -lt $Counters; $counter++) {
    $dx = 24 + ($counter % 6) * 26
    $dy = 20 + ($counter % 6) * 13 + [int]([Math]::Floor($counter / 6) * 22)
    $seated.Add("<polygon points=""$(& $p $dx $dy) $(& $p ($dx + 14) ($dy - 7)) $(& $p ($dx + 28) $dy) $(& $p ($dx + 14) ($dy + 7))"" fill=""$counterTop""/>")
    $seated.Add("<polygon points=""$(& $p $dx $dy) $(& $p ($dx + 14) ($dy + 7)) $(& $p ($dx + 14) ($dy + 13)) $(& $p $dx ($dy + 6))"" fill=""$counterSide""/>")
    $seated.Add("<polygon points=""$(& $p ($dx + 14) ($dy + 7)) $(& $p ($dx + 28) $dy) $(& $p ($dx + 28) ($dy + 6)) $(& $p ($dx + 14) ($dy + 13))"" fill=""$counterSide""/>")
  }

  return @"
$(DirectionalShadow -X $X -Y ($Y + [int](60 * $s)) -W ([int](210 * $s)) -H ([int](24 * $s)) -Opacity 0.16)
  <polygon points="$(& $p 0 22) $(& $p 100 -28) $(& $p 216 30) $(& $p 116 82)" fill="$top"/>
  <polygon points="$(& $p 0 22) $(& $p 116 82) $(& $p 116 96) $(& $p 0 36)" fill="$left"/>
  <polygon points="$(& $p 116 82) $(& $p 216 30) $(& $p 216 44) $(& $p 116 96)" fill="$right"/>
  $($rules -join "`n  ")
  $($seated -join "`n  ")
"@
}

<#
  Era six's link: an inlaid band running across the paving from one door to another.

  IN the floor, flush, on the shared ground-decal ladder. That is the whole separation from era
  seven, whose version of the same primitive is a steam main ON sleepers, and it is why
  `PipeOnSleepers` exists in this file at all: the two have to be seen together once.
#>
function InlaidLink {
  param(
    [int]$X1,
    [int]$Y1,
    [int]$X2,
    [int]$Y2,
    [string]$Inlay = "#8a9199",
    # "open", "suspended", "carrying"
    [string]$State = "open",
    [int]$Bands = 0,
    [int]$Width = 12
  )

  $inlayDark = Darken -Hex $Inlay -Amount 0.34
  $inlayLit = Lighten -Hex $Inlay -Amount 0.20
  # A SUSPENDED band goes matte and recessed along its length, which is the second channel
  # behind the barrier stone: two carriers, neither of them hue alone.
  $band = if ($State -eq "suspended") { Darken -Hex $Inlay -Amount 0.20 } else { $Inlay }

  $dx = $X2 - $X1
  $dy = $Y2 - $Y1
  $length = [Math]::Sqrt($dx * $dx + $dy * $dy)
  $nx = -$dy / $length * $Width
  $ny = $dx / $length * $Width

  $strip = "<polygon points=""$($X1 + [int]$nx),$($Y1 + [int]$ny) $($X2 + [int]$nx),$($Y2 + [int]$ny) $($X2 - [int]$nx),$($Y2 - [int]$ny) $($X1 - [int]$nx),$($Y1 - [int]$ny)"" fill=""$band""/>"
  $seam = "<polygon points=""$($X1 + [int]($nx * 0.34)),$($Y1 + [int]($ny * 0.34)) $($X2 + [int]($nx * 0.34)),$($Y2 + [int]($ny * 0.34)) $($X2 - [int]($nx * 0.34)),$($Y2 - [int]($ny * 0.34)) $($X1 - [int]($nx * 0.34)),$($Y1 - [int]($ny * 0.34))"" fill=""$inlayLit"" opacity=""0.42""/>"

  $notches = ""
  if ($State -eq "carrying") {
    $marks = New-Object System.Collections.Generic.List[string]
    for ($notch = 1; $notch -lt 9; $notch++) {
      $t = $notch / 9.0
      $cx = $X1 + $dx * $t
      $cy = $Y1 + $dy * $t
      $marks.Add("<polygon points=""$([int]($cx + $nx * 1.15)),$([int]($cy + $ny * 1.15)) $([int]($cx + $nx * 1.15 + $dx * 0.018)),$([int]($cy + $ny * 1.15 + $dy * 0.018)) $([int]($cx - $nx * 1.15 + $dx * 0.018)),$([int]($cy - $ny * 1.15 + $dy * 0.018)) $([int]($cx - $nx * 1.15)),$([int]($cy - $ny * 1.15))"" fill=""$inlayDark""/>")
    }
    $notches = ($marks -join "`n  ")
  }

  $stone = ""
  if ($State -eq "suspended") {
    $mx = ($X1 + $X2) / 2
    $my = ($Y1 + $Y2) / 2
    $stone = BarrierStone -X ([int]$mx) -Y ([int]$my) -Bands $Bands -Dx $dx -Dy $dy -Reach ([int]($Width * 2.1))
  }

  return @"
  $strip
  $seam
  $notches
  $stone
"@
}

<#
  The barrier stone across a suspended link, and the bands round it that are the DURATION read.

  Era six's closure is administrative, so the object is a plain dressed stone rather than a
  gate with hinges. `Bands` is 1, 2 or 3 for one cycle, two cycles and until the outbreak ends;
  a stone with NO band is a closure that has expired, which is a different silhouette from a
  stone that was never set.
#>
function BarrierStone {
  param(
    [int]$X,
    [int]$Y,
    [int]$Bands = 1,
    # The band's own screen direction. The stone is laid ACROSS it, and "across" on a ground
    # plane in this projection is the direction's x-conjugate rather than its screen normal:
    # a band running right-and-down is crossed by a member running right-and-UP.
    [double]$Dx = 1,
    [double]$Dy = 0,
    [int]$Reach = 30,
    [string]$Stone = "#c8c3b6"
  )

  $len = [Math]::Sqrt($Dx * $Dx + $Dy * $Dy)
  $ux = $Dx / $len
  $uy = $Dy / $len
  $crossLen = [Math]::Sqrt($Dx * $Dx + $Dy * $Dy)
  $vx = -$Dx / $crossLen
  $vy = $Dy / $crossLen

  $top = FaceTop -Hex $Stone
  $left = FaceLeft -Hex $Stone
  $right = FaceRight -Hex $Stone
  $bandTone = Darken -Hex $Stone -Amount 0.46

  $thick = 8
  $rise = 22

  $corner = {
    param([double]$AlongCross, [double]$AlongBand, [double]$Lift)
    $cx = $X + $vx * $AlongCross + $ux * $AlongBand
    $cy = $Y + $vy * $AlongCross + $uy * $AlongBand - $Lift
    return "$([int]$cx),$([int]$cy)"
  }

  # The band count round the stone is the DURATION read and it is countable: one band for one
  # cycle, two for two, a full collar for "until the outbreak ends". A stone with NO band is a
  # closure that has expired, which is a different silhouette from a stone never set.
  $bandRows = New-Object System.Collections.Generic.List[string]
  for ($band = 0; $band -lt [Math]::Min($Bands, 3); $band++) {
    $lift = 5 + $band * 6
    $bandRows.Add("<polygon points=""$(& $corner $Reach $thick $lift) $(& $corner (-$Reach) $thick $lift) $(& $corner (-$Reach) $thick ($lift - 3)) $(& $corner $Reach $thick ($lift - 3))"" fill=""$bandTone""/>")
  }
  if ($Bands -ge 3) {
    $bandRows.Add("<polygon points=""$(& $corner $Reach $thick $rise) $(& $corner (-$Reach) $thick $rise) $(& $corner (-$Reach) $thick 5) $(& $corner $Reach $thick 5)"" fill=""$bandTone"" opacity=""0.55""/>")
  }

  return @"
  <polygon points="$(& $corner $Reach $thick $rise) $(& $corner $Reach (-$thick) $rise) $(& $corner (-$Reach) (-$thick) $rise) $(& $corner (-$Reach) $thick $rise)" fill="$top"/>
  <polygon points="$(& $corner $Reach $thick $rise) $(& $corner (-$Reach) $thick $rise) $(& $corner (-$Reach) $thick 0) $(& $corner $Reach $thick 0)" fill="$right"/>
  <polygon points="$(& $corner $Reach $thick $rise) $(& $corner $Reach (-$thick) $rise) $(& $corner $Reach (-$thick) 0) $(& $corner $Reach $thick 0)" fill="$left"/>
  $($bandRows -join "`n  ")
"@
}

<# Era seven's version of the same primitive, drawn once so era six can be told apart from it. #>
function PipeOnSleepers {
  param(
    [int]$X1,
    [int]$Y1,
    [int]$X2,
    [int]$Y2,
    [string]$Metal = "#7d6f63"
  )

  $top = FaceTop -Hex $Metal
  $side = FaceRight -Hex $Metal
  $sleeper = "#5f5346"

  $dx = $X2 - $X1
  $dy = $Y2 - $Y1
  $length = [Math]::Sqrt($dx * $dx + $dy * $dy)
  $nx = -$dy / $length * 9
  $ny = $dx / $length * 9

  $sleepers = New-Object System.Collections.Generic.List[string]
  for ($tie = 0; $tie -le 6; $tie++) {
    $t = $tie / 6.0
    $cx = $X1 + $dx * $t
    $cy = $Y1 + $dy * $t
    $sleepers.Add("<polygon points=""$([int]($cx + $nx * 2.3)),$([int]($cy + $ny * 2.3)) $([int]($cx + $nx * 2.3 + 8)),$([int]($cy + $ny * 2.3 + 4)) $([int]($cx - $nx * 2.3 + 8)),$([int]($cy - $ny * 2.3 + 4)) $([int]($cx - $nx * 2.3)),$([int]($cy - $ny * 2.3))"" fill=""$sleeper""/>")
  }

  # The arrowhead is what makes era seven's network DIRECTED, and it is the mark era six must
  # never carry: an undirected hazard the player cuts against a directed supply the player keeps.
  $mx = ($X1 + $X2) / 2
  $my = ($Y1 + $Y2) / 2
  $arrow = "<polygon points=""$([int]($mx + $dx * 0.10)),$([int]($my + $dy * 0.10)) $([int]($mx - $dx * 0.03 + $nx * 1.5)),$([int]($my - $dy * 0.03 + $ny * 1.5)) $([int]($mx - $dx * 0.03 - $nx * 1.5)),$([int]($my - $dy * 0.03 - $ny * 1.5))"" fill=""$(Lighten -Hex $Metal -Amount 0.42)""/>"

  return @"
  $($sleepers -join "`n  ")
  <polygon points="$($X1 + [int]$nx),$($Y1 + [int]$ny - 12) $($X2 + [int]$nx),$($Y2 + [int]$ny - 12) $($X2 - [int]$nx),$($Y2 - [int]$ny - 12) $($X1 - [int]$nx),$($Y1 - [int]$ny - 12)" fill="$top"/>
  <polygon points="$($X1 + [int]$nx),$($Y1 + [int]$ny - 12) $($X2 + [int]$nx),$($Y2 + [int]$ny - 12) $($X2 + [int]$nx),$($Y2 + [int]$ny - 4) $($X1 + [int]$nx),$($Y1 + [int]$ny - 4)" fill="$side"/>
  $arrow
"@
}

<# Era six's infected marker: a pedestal at the threshold with a covered vessel on it. #>
function ThresholdVessel {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    [string]$Stone = "#c8c3b6"
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  $top = FaceTop -Hex $Stone
  $left = FaceLeft -Hex $Stone
  $right = FaceRight -Hex $Stone

  return @"
$(DirectionalShadow -X $X -Y ($Y + [int](44 * $s)) -W ([int](40 * $s)) -H ([int](12 * $s)) -Opacity 0.16)
  <polygon points="$(& $p 4 -14) $(& $p 20 -22) $(& $p 36 -14) $(& $p 20 -6)" fill="#6f6256"/>
  <polygon points="$(& $p 4 -14) $(& $p 20 -6) $(& $p 20 12) $(& $p 4 4)" fill="#5b5145"/>
  <polygon points="$(& $p 20 -6) $(& $p 36 -14) $(& $p 36 4) $(& $p 20 12)" fill="#655a4d"/>
  <polygon points="$(& $p 10 -20) $(& $p 20 -26) $(& $p 30 -20) $(& $p 20 -14)" fill="#7d6f60"/>
  <polygon points="$(& $p 0 14) $(& $p 20 4) $(& $p 40 14) $(& $p 20 24)" fill="$top"/>
  <polygon points="$(& $p 0 14) $(& $p 20 24) $(& $p 20 46) $(& $p 0 36)" fill="$left"/>
  <polygon points="$(& $p 20 24) $(& $p 40 14) $(& $p 40 36) $(& $p 20 46)" fill="$right"/>
"@
}

<#
  Era nine's status panel: a small illuminated matrix panel by a door, and the segment ladder
  that is the whole reading.

  Geometry with an emissive FACE, which is shipped precedent (`MasteryStars` runs 1.35), and
  which lights nothing at all. The segment count is the primary channel because it is countable
  in greyscale; the half-height second segment is what makes "likely" read as hedged without a
  word. `Stale` draws the bar under the segments and halves the panel, which keeps what the
  player learned on screen instead of blanking it.
#>
function StatusPanel {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    # 0 = unread and blank, 1 = clear, 2 = likely compromised, 3 = compromised, -1 = dark
    [int]$Segments = 0,
    [switch]$Stale
  )

  $s = $Scale / 100.0
  # The panel lies ON a wall, so its horizontal axis runs with the right-hand wall plane
  # (one unit across is 0.61 units up) and its vertical axis is straight down. Anything drawn
  # flat to the screen would read as a HUD element pasted over the world, which is the one thing
  # the crisis's readouts must not look like: this is a thing in the town, not a panel over it.
  $q = {
    param([double]$Along, [double]$Down)
    return "$([int]($X + $Along * $s)),$([int]($Y + (-0.61 * $Along + $Down) * $s))"
  }

  $dark = $Segments -lt 0
  $bezel = if ($dark) { "#394045" } else { "#464f55" }
  $face = if ($dark) { "#262b2f" } elseif ($Stale) { "#78878e" } else { "#c3dae3" }
  $rim = if ($dark) { "#2f353a" } else { "#5d686e" }

  $lit = New-Object System.Collections.Generic.List[string]
  if (-not $dark -and $Segments -gt 0) {
    for ($segment = 0; $segment -lt $Segments; $segment++) {
      $a = 9 + $segment * 13
      # The half-height second segment is what makes "likely" read as HEDGED without a word,
      # and it is the only place in the four packs where a magnitude is drawn at all.
      $half = ($Segments -eq 2 -and $segment -eq 1)
      $tall = if ($half) { 10 } else { 21 }
      $tone = if ($Stale) { "#9db0b7" } else { "#f4fdff" }
      $lit.Add("<polygon points=""$(& $q $a 32) $(& $q ($a + 9) 32) $(& $q ($a + 9) $(32 - $tall)) $(& $q $a $(32 - $tall))"" fill=""$tone""/>")
    }
  }

  # A stale reading KEEPS what the player learned and marks it: the segments stay, a bar goes
  # under them, and the face drops to about half. Blanking it would be less informative and less
  # honest about what the mechanic did.
  $bar = if ($Stale) {
    @"
  <polygon points="$(& $q 8 37) $(& $q 44 37) $(& $q 44 41) $(& $q 8 41)" fill="#39423f"/>
"@
  }
  else { "" }

  return @"
  <polygon points="$(& $q -3 -4) $(& $q 55 -4) $(& $q 55 48) $(& $q -3 48)" fill="$rim"/>
  <polygon points="$(& $q 0 0) $(& $q 52 0) $(& $q 52 44) $(& $q 0 44)" fill="$bezel"/>
  <polygon points="$(& $q 4 5) $(& $q 48 5) $(& $q 48 39) $(& $q 4 39)" fill="$face"/>
  $($lit -join "`n  ")
  $bar
"@
}

<#
  An inspection cover, closed and lifted, and the collar on a duct marker beside it.

  Era nine's floor IS the era's premise, and its covers are "part of the pattern rather than
  apologised for". So a lifted cover is the loudest statement available to this crisis, and the
  collar is the same fact carried at a zoom where the panel by the door has disappeared. Two
  carriers at two distances is what makes the board readable at both.

  ## THE BARRIER'S TONE, RULED 2026-08-01 AND MEASURED RATHER THAN PREFERRED

  It was a rust orange, `#b8593a` posts under a `#c9663f` rail, and it was the warmest thing in
  any intrusion plate. Three documents disagreed with it and with each other: era nine's merged
  presentation brief rules the barrier's colour as `none`
  (`crises/era-09-intrusion.md:678`, the non-colour-carriers table) and says of the era's palette
  that "warmth is foreign to it" (the same file, line 142); the art brief asks for the barriers
  "in era nine's own matched-enclosure language" (`2026-08-01-intrusion-crisis-art-brief.md:169`);
  and the pack's own constraint list says "no urgency framing, no alarm, no red".

  The rust orange is not indefensible on its own terms. A high-visibility barrier round a lifted
  floor cover reads as maintenance rather than as alarm, which is the correct register for this
  crisis, so "no colour" was the rule worth testing rather than the plate. WHAT DECIDED IT IS
  WHAT ERA NINE'S PALETTE ALREADY SPENDS ITS TONES ON, measured on blue-minus-red over every tone
  in this pack: era nine's ground family (`Floor`, `Deep`, `Kerb` and every derivative the covers
  and collars are drawn from) runs -15 to -9, and its BUILT family (`Body`, `Glass`, sky, haze,
  water, and all fifteen of the crisis's own marks) runs +6 to +41. Twenty-seven tones, a clean
  split, and it is the era's own ruling: its style guide keeps the paving "warmer or darker than
  the body hue, not cooler", because era nine's wall is already cool. **So in era nine, warm
  means floor.** The two rust barriers sat at -126 and -138, on the wrong side of the era's only
  warm/cool distinction by 111 points, saying "floor" at the one object whose whole job is to say
  "this floor is open here".

  So the barrier is the same clad panel the isolation's blanking plates are (`$ERA9.Clad`), shaded
  by this file's own face model: the rail shows its left face and the posts its right. Measured,
  what that costs and buys: value separation from the floor goes from 0.197 (the rust post) to
  0.229 (the clad post), so the read is WIDER on value and only the chroma is gone, which drops
  from 0.843 to 0.126 against an era ceiling of 0.297 (`Glass`, its own accent). The void stays
  the darkest thing on the paving at 0.031 against the floor's 0.373, so the HOLE is still the
  subject and the barrier no longer competes with it for the eye.
#>
function InspectionCover {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    [switch]$Lifted,
    [string]$Floor = "#a9a49a",
    # Era nine's added clad panel, which is what a temporary barrier is made of. Read from
    # `$ERA9.Clad` so this and `ShutterPlates` cannot drift apart on the one tone they share.
    [string]$Clad = "#8b959c"
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  $cover = Darken -Hex $Floor -Amount 0.14
  $coverLit = Lighten -Hex $Floor -Amount 0.22
  $void = "#2c3236"

  if (-not $Lifted) {
    return @"
  <polygon points="$(& $p 0 20) $(& $p 44 -2) $(& $p 88 20) $(& $p 44 42)" fill="$cover"/>
  <polygon points="$(& $p 10 20) $(& $p 44 3) $(& $p 78 20) $(& $p 44 37)" fill="$coverLit" opacity="0.5"/>
"@
  }

  # The posts are narrow upright slivers and the rail is the long member seen from above, so they
  # take the right and left faces of the panel rather than two invented tones.
  $barrierPost = FaceRight -Hex $Clad
  $barrierRail = FaceLeft -Hex $Clad

  return @"
  <polygon points="$(& $p 0 20) $(& $p 44 -2) $(& $p 88 20) $(& $p 44 42)" fill="$void"/>
  <polygon points="$(& $p 52 16) $(& $p 96 -6) $(& $p 104 -44) $(& $p 60 -22)" fill="$cover"/>
  <polygon points="$(& $p 52 16) $(& $p 60 -22) $(& $p 60 -16) $(& $p 52 22)" fill="$(Darken -Hex $Floor -Amount 0.34)"/>
  <polygon points="$(& $p -18 12) $(& $p -12 9) $(& $p -12 -20) $(& $p -18 -17)" fill="$barrierPost"/>
  <polygon points="$(& $p -18 -17) $(& $p -12 -20) $(& $p 34 4) $(& $p 28 7)" fill="$barrierRail"/>
  <polygon points="$(& $p 104 32) $(& $p 110 29) $(& $p 110 0) $(& $p 104 3)" fill="$barrierPost"/>
"@
}

<# The flush duct marker that is era nine's zoomed-out channel, with its collar state. #>
function DuctMarker {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    # "flush" = clear, "raised" = likely, "doubled" = compromised, "notched" = stale
    [string]$Collar = "flush",
    [string]$Floor = "#a9a49a"
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  $marker = Darken -Hex $Floor -Amount 0.24
  $ring = Darken -Hex $Floor -Amount 0.44
  $ringLit = Lighten -Hex $Floor -Amount 0.30

  $collarGeometry = switch ($Collar) {
    "flush" { @"
  <polygon points="$(& $p 0 14) $(& $p 26 1) $(& $p 52 14) $(& $p 26 27)" fill="$ring"/>
  <polygon points="$(& $p 9 14) $(& $p 26 6) $(& $p 43 14) $(& $p 26 22)" fill="$marker"/>
"@ }
    "raised" { @"
  <polygon points="$(& $p 0 8) $(& $p 26 -5) $(& $p 52 8) $(& $p 26 21)" fill="$ringLit"/>
  <polygon points="$(& $p 0 8) $(& $p 26 21) $(& $p 26 27) $(& $p 0 14)" fill="$ring"/>
  <polygon points="$(& $p 26 21) $(& $p 52 8) $(& $p 52 14) $(& $p 26 27)" fill="$ring"/>
  <polygon points="$(& $p 9 8) $(& $p 26 0) $(& $p 43 8) $(& $p 26 16)" fill="$marker"/>
"@ }
    "doubled" { @"
  <polygon points="$(& $p -2 10) $(& $p 26 -4) $(& $p 54 10) $(& $p 26 24)" fill="$ringLit"/>
  <polygon points="$(& $p -2 10) $(& $p 26 24) $(& $p 26 30) $(& $p -2 16)" fill="$ring"/>
  <polygon points="$(& $p 26 24) $(& $p 54 10) $(& $p 54 16) $(& $p 26 30)" fill="$ring"/>
  <polygon points="$(& $p 2 2) $(& $p 26 -10) $(& $p 50 2) $(& $p 26 14)" fill="$ringLit"/>
  <polygon points="$(& $p 2 2) $(& $p 26 14) $(& $p 26 20) $(& $p 2 8)" fill="$ring"/>
  <polygon points="$(& $p 26 14) $(& $p 50 2) $(& $p 50 8) $(& $p 26 20)" fill="$ring"/>
  <polygon points="$(& $p 11 2) $(& $p 26 -5) $(& $p 41 2) $(& $p 26 9)" fill="$marker"/>
"@ }
    default { @"
  <polygon points="$(& $p 0 8) $(& $p 26 -5) $(& $p 52 8) $(& $p 26 21)" fill="$ringLit"/>
  <polygon points="$(& $p 0 8) $(& $p 26 21) $(& $p 26 27) $(& $p 0 14)" fill="$ring"/>
  <polygon points="$(& $p 26 21) $(& $p 52 8) $(& $p 52 14) $(& $p 26 27)" fill="$ring"/>
  <polygon points="$(& $p 9 8) $(& $p 26 0) $(& $p 43 8) $(& $p 26 16)" fill="$marker"/>
  <polygon points="$(& $p 14 -4) $(& $p 40 10) $(& $p 38 15) $(& $p 12 1)" fill="#3d454a"/>
"@ }
  }

  return $collarGeometry
}

<# Formal clipped planting: era six's parterre, and era nine's looser drifts. #>
function EraPlanting {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    # "clipped" = era six, "drift" = era nine, "limbed" = era four
    [string]$Kind = "clipped"
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  switch ($Kind) {
    "clipped" {
      return @"
$(DirectionalShadow -X $X -Y ($Y + [int](34 * $s)) -W ([int](84 * $s)) -H ([int](14 * $s)) -Opacity 0.12)
  <polygon points="$(& $p 0 24) $(& $p 44 2) $(& $p 88 24) $(& $p 44 46)" fill="#5e7b58"/>
  <polygon points="$(& $p 0 24) $(& $p 44 46) $(& $p 44 58) $(& $p 0 36)" fill="#435c40"/>
  <polygon points="$(& $p 44 46) $(& $p 88 24) $(& $p 88 36) $(& $p 44 58)" fill="#4d6a49"/>
  <polygon points="$(& $p 8 22) $(& $p 44 5) $(& $p 80 22) $(& $p 44 39)" fill="#6d8c66" opacity="0.7"/>
"@
    }
    "drift" {
      return @"
  <polygon points="$(& $p 0 30) $(& $p 30 14) $(& $p 66 20) $(& $p 92 34) $(& $p 58 46) $(& $p 22 44)" fill="#6f8a5e"/>
  <polygon points="$(& $p 14 26) $(& $p 34 14) $(& $p 24 -14) $(& $p 40 12) $(& $p 60 -6) $(& $p 48 18) $(& $p 70 24)" fill="#87a071"/>
  <polygon points="$(& $p 34 20) $(& $p 38 20) $(& $p 40 -30) $(& $p 34 -30)" fill="#5f6f52"/>
  <polygon points="$(& $p 16 -30) $(& $p 40 -54) $(& $p 66 -28) $(& $p 40 -12)" fill="#71906a"/>
"@
    }
    default {
      return @"
$(DirectionalShadow -X $X -Y ($Y + [int](54 * $s)) -W ([int](36 * $s)) -H ([int](12 * $s)) -Opacity 0.12)
  <polygon points="$(& $p 16 54) $(& $p 22 54) $(& $p 22 -6) $(& $p 16 -6)" fill="#6d5c46"/>
  <polygon points="$(& $p -6 -6) $(& $p 19 -34) $(& $p 44 -6) $(& $p 19 12)" fill="#5e7b58"/>
  <polygon points="$(& $p 2 -18) $(& $p 19 -40) $(& $p 36 -18) $(& $p 19 -4)" fill="#6d8c66"/>
"@
    }
  }
}

<# Two or three hulls holding position outside the harbour: the quarantine read from outside. #>
function StandingOffHull {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    [string]$Timber = "#8a7355"
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  $top = FaceTop -Hex $Timber
  $side = FaceRight -Hex $Timber

  return @"
  <polygon points="$(& $p 0 12) $(& $p 30 0) $(& $p 78 4) $(& $p 96 14) $(& $p 60 22) $(& $p 20 20)" fill="$top"/>
  <polygon points="$(& $p 0 12) $(& $p 20 20) $(& $p 60 22) $(& $p 96 14) $(& $p 80 26) $(& $p 24 28)" fill="$side"/>
  <polygon points="$(& $p 42 0) $(& $p 47 0) $(& $p 47 -52) $(& $p 42 -52)" fill="#6f5c44"/>
  <polygon points="$(& $p 47 -50) $(& $p 47 -12) $(& $p 74 -14)" fill="#cfc7b4" opacity="0.75"/>
"@
}

<# A crane stopped mid-lift with a block hanging in its sling: era four's stopped-work image. #>
function StoppedCrane {
  param(
    [int]$X,
    [int]$Y,
    [int]$Scale = 100,
    [string]$Stone = "#d2c8aa"
  )

  $s = $Scale / 100.0
  $p = {
    param([double]$Dx, [double]$Dy)
    return "$([int]($X + $Dx * $s)),$([int]($Y + $Dy * $s))"
  }

  $top = FaceTop -Hex $Stone
  $left = FaceLeft -Hex $Stone
  $right = FaceRight -Hex $Stone

  return @"
  <polygon points="$(& $p -34 8) $(& $p 44 -150) $(& $p 50 -148) $(& $p -28 10)" fill="#8f7a5c"/>
  <polygon points="$(& $p 122 8) $(& $p 44 -150) $(& $p 38 -148) $(& $p 116 10)" fill="#7a6749"/>
  <polygon points="$(& $p -10 -60) $(& $p 98 -60) $(& $p 98 -54) $(& $p -10 -54)" fill="#6f5f46"/>
  <polygon points="$(& $p 42 -148) $(& $p 46 -148) $(& $p 46 -70) $(& $p 42 -70)" fill="#6f5f46"/>
  <polygon points="$(& $p 20 -70) $(& $p 44 -82) $(& $p 68 -70) $(& $p 44 -58)" fill="$top"/>
  <polygon points="$(& $p 20 -70) $(& $p 44 -58) $(& $p 44 -30) $(& $p 20 -42)" fill="$left"/>
  <polygon points="$(& $p 44 -58) $(& $p 68 -70) $(& $p 68 -42) $(& $p 44 -30)" fill="$right"/>
"@
}

# ---------------------------------------------------------------------------------------------
# Writers
# ---------------------------------------------------------------------------------------------

$script:currentOutputDir = $outputDir

function Write-SvgFile {
  param(
    [string]$Name,
    [string]$Body
  )

  $svg = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 900" width="1400" height="900">
  <!-- Engine reference: fixed 49-degree map camera, FOV 32 feel, flat-shaded low-poly, no textures, no glow. -->
$Body
</svg>
"@

  Write-Utf8BomCrlfTerminated -Path (Join-Path $script:currentOutputDir $Name) -Text $svg
}

function Write-ContactSheet {
  param(
    [string]$Title,
    [string]$Blurb,
    [string[]]$Plates
  )

  $sections = New-Object System.Collections.Generic.List[string]
  foreach ($plate in $Plates) {
    $heading = ($plate -replace "^(\d+)-", '$1 ') -replace "-", " "
    $heading = [System.Globalization.CultureInfo]::InvariantCulture.TextInfo.ToTitleCase($heading)
    $sections.Add("    <section><h2>$heading</h2><img src=""$plate.svg"" alt=""$heading reference""></section>")
  }

  $index = @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>$Title</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #f2f3f1; color: #2d3133; }
    main { max-width: 1180px; margin: 0 auto; padding: 32px 24px 48px; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    p { margin: 0 0 24px; color: #596063; }
    section { margin: 0 0 32px; }
    h2 { font-size: 16px; margin: 0 0 10px; }
    img { width: 100%; display: block; border: 1px solid #d6dbda; background: #e8ecea; }
  </style>
</head>
<body>
  <main>
    <h1>$Title</h1>
    <p>$Blurb</p>
$($sections -join "`n")
  </main>
</body>
</html>
"@

  Write-Utf8BomCrlfTerminated -Path (Join-Path $script:currentOutputDir "index.html") -Text $index
}

function Get-SvgAttributes {
  param([string]$TagText)

  $attributes = @{}
  [regex]::Matches($TagText, '([a-zA-Z-]+)="([^"]*)"') | ForEach-Object {
    $attributes[$_.Groups[1].Value] = $_.Groups[2].Value
  }
  return $attributes
}

function Get-AlphaColor {
  param(
    [string]$Hex,
    [double]$Opacity = 1
  )

  if ([string]::IsNullOrWhiteSpace($Hex) -or $Hex -eq "none") {
    return $null
  }

  $cleanHex = $Hex.TrimStart("#")
  $red = [Convert]::ToInt32($cleanHex.Substring(0, 2), 16)
  $green = [Convert]::ToInt32($cleanHex.Substring(2, 2), 16)
  $blue = [Convert]::ToInt32($cleanHex.Substring(4, 2), 16)
  $alpha = [Math]::Max(0, [Math]::Min(255, [int][Math]::Round(255 * $Opacity)))
  return [System.Drawing.Color]::FromArgb($alpha, $red, $green, $blue)
}

function Get-PointList {
  param([string]$PointsText)

  $points = New-Object System.Collections.Generic.List[System.Drawing.PointF]
  foreach ($pairText in ($PointsText -split "\s+")) {
    if ([string]::IsNullOrWhiteSpace($pairText)) {
      continue
    }
    $coordinatePair = $pairText -split ","
    $points.Add([System.Drawing.PointF]::new([float]$coordinatePair[0], [float]$coordinatePair[1]))
  }
  return $points.ToArray()
}

function Export-SvgToPng {
  param(
    [string]$SvgPath,
    [string]$PngPath,
    [string]$Background = "232,236,234"
  )

  Add-Type -AssemblyName System.Drawing
  $backgroundParts = $Background -split ","
  $bitmap = [System.Drawing.Bitmap]::new(1400, 900)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::FromArgb([int]$backgroundParts[0], [int]$backgroundParts[1], [int]$backgroundParts[2]))

  try {
    $svgText = Get-Content -LiteralPath $SvgPath -Raw
    $tagMatches = [regex]::Matches($svgText, '<(rect|polygon|circle)\s+[^>]+/>')
    foreach ($tagMatch in $tagMatches) {
      $tagText = $tagMatch.Value
      $attributes = Get-SvgAttributes -TagText $tagText
      $opacity = 1.0
      if ($attributes.ContainsKey("opacity")) {
        $opacity = [double]$attributes["opacity"]
      }

      if ($tagText.StartsWith("<rect")) {
        $fillColor = Get-AlphaColor -Hex $attributes["fill"] -Opacity $opacity
        if ($null -ne $fillColor) {
          $brush = [System.Drawing.SolidBrush]::new($fillColor)
          $x = if ($attributes.ContainsKey("x")) { [float]$attributes["x"] } else { 0 }
          $y = if ($attributes.ContainsKey("y")) { [float]$attributes["y"] } else { 0 }
          $graphics.FillRectangle($brush, $x, $y, [float]$attributes["width"], [float]$attributes["height"])
          $brush.Dispose()
        }
      }

      if ($tagText.StartsWith("<circle")) {
        $fillColor = Get-AlphaColor -Hex $attributes["fill"] -Opacity $opacity
        if ($null -ne $fillColor) {
          $brush = [System.Drawing.SolidBrush]::new($fillColor)
          $cx = [float]$attributes["cx"]
          $cy = [float]$attributes["cy"]
          $radius = [float]$attributes["r"]
          $graphics.FillEllipse($brush, $cx - $radius, $cy - $radius, $radius * 2, $radius * 2)
          $brush.Dispose()
        }
      }

      if ($tagText.StartsWith("<polygon")) {
        $points = Get-PointList -PointsText $attributes["points"]
        $fillColor = if ($attributes.ContainsKey("fill")) { Get-AlphaColor -Hex $attributes["fill"] -Opacity $opacity } else { $null }
        if ($null -ne $fillColor -and $points.Length -ge 3) {
          $brush = [System.Drawing.SolidBrush]::new($fillColor)
          $graphics.FillPolygon($brush, $points)
          $brush.Dispose()
        }
        if ($attributes.ContainsKey("stroke") -and $attributes["stroke"] -ne "none" -and $points.Length -ge 2) {
          $strokeColor = Get-AlphaColor -Hex $attributes["stroke"] -Opacity $opacity
          $strokeWidth = if ($attributes.ContainsKey("stroke-width")) { [float]$attributes["stroke-width"] } else { 1 }
          $pen = [System.Drawing.Pen]::new($strokeColor, $strokeWidth)
          $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
          $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
          $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
          $graphics.DrawLines($pen, $points)
          $pen.Dispose()
        }
      }
    }

    $bitmap.Save($PngPath, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

# ---------------------------------------------------------------------------------------------
# Pack: era one, the Hard Winter
# ---------------------------------------------------------------------------------------------

function Write-HardWinterPack {
  $script:currentOutputDir = Join-Path $packRoot "hard-winter"
  New-Item -ItemType Directory -Force -Path $script:currentOutputDir | Out-Null

  $wideMaster = @"
$(AmbientWorld)
$(IslandGround -Variant "wide")
$(House -X 430 -Y 512 -Scale 88 -State "frost")
$(House -X 642 -Y 522 -Scale 100 -State "frost")
$(StoneBlock -X 812 -Y 584 -Scale 76)
$(SnowPlant -X 408 -Y 652 -Scale 50)
$(SnowPlant -X 926 -Y 622 -Scale 46)
$(HearthAndSmoke -X 952 -Y 490 -Scale 46)
$(Snowfall -Density 150 -SeedOffset 0)
"@
  Write-SvgFile -Name "01-wide-master.svg" -Body $wideMaster

  $groundTreatment = @"
$(AmbientWorld)
$(IslandGround -Variant "close")
$(House -X 298 -Y 482 -Scale 88 -State "frost")
$(House -X 548 -Y 448 -Scale 104 -State "frost")
$(StoneBlock -X 806 -Y 526 -Scale 84)
$(SnowPlant -X 206 -Y 670 -Scale 80)
$(SnowPlant -X 994 -Y 620 -Scale 82)
$(SnowPlant -X 1084 -Y 758 -Scale 68)
$(Snowfall -Density 110 -SeedOffset 20)
"@
  Write-SvgFile -Name "02-ground-treatment.svg" -Body $groundTreatment

  $frozenWater = @"
$(AmbientWorld)
  <polygon points="92,474 276,432 502,410 732,424 972,486 1192,574 1302,650 1164,708 920,642 692,600 446,586 222,604 82,646" fill="#cbd7d8"/>
  <polygon points="142,458 322,430 512,426 704,452 900,506 1076,580 1194,646 1044,628 840,560 638,514 430,496 250,512" fill="#e7eeee"/>
  <polygon points="322,430 512,426 704,452 560,498" fill="#c5d5d7"/>
  <polygon points="512,426 704,452 900,506 706,526" fill="#dce6e6"/>
  <polygon points="704,452 1076,580 900,506" fill="#bfced1"/>
  <polygon points="250,512 430,496 638,514 446,586" fill="#cddbdd"/>
  <polygon points="430,496 638,514 840,560 692,600" fill="#e5eded"/>
  <polygon points="638,514 900,506 1044,628 840,560" fill="#c6d5d7"/>
  <polygon points="1044,628 1194,646 1302,650 1164,708" fill="#3f7f84"/>
  <polygon points="1194,646 1400,744 1400,900 1164,708" fill="#3f7f84"/>
$(IslandGround -Variant "wide")
$(Snowfall -Density 86 -SeedOffset 40)
"@
  Write-SvgFile -Name "03-frozen-water-boundary.svg" -Body $frozenWater

  $buildingStates = @"
$(AmbientWorld)
$(IslandGround -Variant "close")
$(House -X 118 -Y 472 -Scale 116 -State "plain")
$(House -X 536 -Y 472 -Scale 116 -State "frost")
$(Ruin -X 996 -Y 486)
$(Snowfall -Density 72 -SeedOffset 60)
"@
  Write-SvgFile -Name "04-building-three-states.svg" -Body $buildingStates

  $fire = @"
$(AmbientWorld)
$(IslandGround -Variant "close")
$(House -X 186 -Y 486 -Scale 106 -State "frost")
$(House -X 566 -Y 520 -Scale 88 -State "frost")
$(HearthAndSmoke -X 860 -Y 602 -Scale 100)
$(Snowfall -Density 80 -SeedOffset 80)
"@
  Write-SvgFile -Name "05-fire-smoke-column.svg" -Body $fire

  $fallingSnow = @"
$(AmbientWorld)
$(IslandGround -Variant "close")
$(House -X 118 -Y 506 -Scale 108 -State "frost")
$(StoneBlock -X 524 -Y 498 -Scale 104)
$(House -X 888 -Y 500 -Scale 112 -State "frost")
$(Snowfall -Density 260 -SeedOffset 100)
"@
  Write-SvgFile -Name "06-falling-snow-density.svg" -Body $fallingSnow

  # ADDED 2026-08-01. Plates 07 to 09 answer the mechanic inventory's three unbriefed rows:
  # the fire's own states, its duration, and the protection ladder. See
  # `docs/superpowers/specs/2026-08-01-hard-winter-art-brief-addendum.md`.
  $fireStates = @"
$(AmbientWorld)
$(IslandGround -Variant "close")
$(WardedPatch -X 216 -Y 690 -Scale 92 -Ghost)
$(Hearth -X 152 -Y 604 -Scale 92 -State "ghost" -Fuel 3)
$(Hearth -X 484 -Y 604 -Scale 92 -State "unlit" -Fuel 3)
$(WardedPatch -X 880 -Y 690 -Scale 92)
$(Hearth -X 816 -Y 604 -Scale 92 -State "burning" -Fuel 3 -Smoke)
$(WardedPatch -X 1216 -Y 690 -Scale 92 -FrozenOver)
$(Hearth -X 1152 -Y 604 -Scale 92 -State "spent" -Smoke)
$(Snowfall -Density 72 -SeedOffset 140)
"@
  Write-SvgFile -Name "07-fire-four-states.svg" -Body $fireStates

  $fireDuration = @"
$(AmbientWorld)
$(IslandGround -Variant "close")
$(WardedPatch -X 254 -Y 694 -Scale 96)
$(Hearth -X 186 -Y 604 -Scale 96 -State "burning" -Fuel 3 -Smoke)
$(WardedPatch -X 700 -Y 694 -Scale 96)
$(Hearth -X 632 -Y 604 -Scale 96 -State "burning" -Fuel 2 -Smoke)
$(WardedPatch -X 1146 -Y 694 -Scale 96)
$(Hearth -X 1078 -Y 604 -Scale 96 -State "burning" -Fuel 1 -Smoke)
$(Snowfall -Density 72 -SeedOffset 160)
"@
  Write-SvgFile -Name "08-fire-duration-in-the-fuel.svg" -Body $fireDuration

  $protection = @"
$(AmbientWorld)
$(IslandGround -Variant "close")
$(WinterBuilding -X 60 -Y 470 -Scale 90 -State "threatened")
$(WinterBuilding -X 340 -Y 470 -Scale 90 -State "shield")
$(WinterBuilding -X 620 -Y 470 -Scale 90 -State "shield-ghost")
$(WinterBuilding -X 900 -Y 470 -Scale 90 -State "frost" -FrostStage 2)
$(Ruin -X 1150 -Y 484)
$(CrisisBadge -X 1264 -Y 424 -Size 41 -State "lost")
$(Snowfall -Density 66 -SeedOffset 180)
"@
  Write-SvgFile -Name "09-building-protection-states.svg" -Body $protection

  Write-ContactSheet -Title "Winter Crisis Reference Plates" -Blurb "Flat-shaded SVG references: shared winter ground, fixed 49-degree map camera, directional shadows, no textures or glow." -Plates @(
    "01-wide-master",
    "02-ground-treatment",
    "03-frozen-water-boundary",
    "04-building-three-states",
    "05-fire-smoke-column",
    "06-falling-snow-density",
    "07-fire-four-states",
    "08-fire-duration-in-the-fuel",
    "09-building-protection-states"
  )
}

# ---------------------------------------------------------------------------------------------
# Pack: era four, the Succession
# ---------------------------------------------------------------------------------------------

$ERA4 = @{
  Body  = "#d2c8aa"
  Roof  = "#b4674a"
  Floor = "#ded5c0"
  Deep  = "#c9bfa6"
  Kerb  = "#a89c82"
  Sky   = "#e9e7de"
  Haze  = "#dcd9cd"
  Water = "#8fa9b8"
}

function Write-SuccessionPack {
  $script:currentOutputDir = Join-Path $packRoot "succession"
  New-Item -ItemType Directory -Force -Path $script:currentOutputDir | Out-Null

  $e = $ERA4

  $wideMaster = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(StandingOffHull -X 148 -Y 470 -Scale 82)
$(StandingOffHull -X 1148 -Y 452 -Scale 74)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "wide" -Joints 5)
$(BoundaryStone -X 300 -Y 640 -Scale 82 -Mark "chevron" -Stone $e.Body)
$(BoundaryStone -X 386 -Y 654 -Scale 82 -Mark "chevron" -Stone $e.Body)
$(BoundaryStone -X 472 -Y 668 -Scale 82 -Mark "chevron" -Stone $e.Body)
$(BoundaryStone -X 802 -Y 690 -Scale 82 -Mark "plain" -Stone $e.Body)
$(BoundaryStone -X 888 -Y 704 -Scale 82 -Mark "plain" -Stone $e.Body)
$(EraMass -X 336 -Y 470 -Scale 86 -Body $e.Body -Accent $e.Roof -Roof "pitched" -Base "kerb" -Height 0.5)
$(EraMass -X 596 -Y 452 -Scale 96 -Body $e.Body -Accent $e.Roof -Roof "pitched" -Base "kerb" -Height 0.9)
$(EraMass -X 872 -Y 502 -Scale 78 -Body $e.Body -Accent $e.Roof -Roof "pitched" -Base "kerb" -Height 0.4)
$(Plinth -X 452 -Y 606 -Scale 96 -State "standing" -Stone $e.Body)
$(Plinth -X 726 -Y 640 -Scale 96 -State "seated" -Stone $e.Body)
$(Plinth -X 964 -Y 664 -Scale 96 -State "bare" -Stone $e.Body)
$(DriftBlock -X 1012 -Y 704 -Scale 90 -Mark "ring" -Stone $e.Body)
$(StoppedCrane -X 1084 -Y 588 -Scale 88 -Stone $e.Body)
$(EraPlanting -X 226 -Y 660 -Scale 74 -Kind "limbed")
$(EraPlanting -X 268 -Y 690 -Scale 74 -Kind "limbed")
"@
  Write-SvgFile -Name "01-wide-master.svg" -Body $wideMaster

  $plinths = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "close" -Joints 5)
$(Plinth -X 130 -Y 600 -Scale 190 -State "bare" -Stone $e.Body)
$(Plinth -X 450 -Y 600 -Scale 190 -State "standing" -Stone $e.Body)
$(Plinth -X 770 -Y 600 -Scale 190 -State "seated" -Stone $e.Body)
$(Plinth -X 1090 -Y 600 -Scale 190 -State "hoisted" -Stone $e.Body)
"@
  Write-SvgFile -Name "02-plinth-four-states.svg" -Body $plinths

  $boundary = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "close" -Joints 6)
$(BoundaryStone -X 92 -Y 578 -Scale 220 -Mark "plain" -Stone $e.Body)
$(BoundaryStone -X 420 -Y 610 -Scale 220 -Mark "chevron" -Stone $e.Body)
$(BoundaryStone -X 748 -Y 642 -Scale 220 -Mark "ring" -Stone $e.Body)
$(BoundaryStone -X 1076 -Y 674 -Scale 220 -Mark "both" -Stone $e.Body)
"@
  Write-SvgFile -Name "03-district-boundary-on-paving.svg" -Body $boundary

  $drift = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "close" -Joints 5)
$(Plinth -X 150 -Y 590 -Scale 150 -State "bare" -Stone $e.Body)
$(Plinth -X 570 -Y 620 -Scale 150 -State "bare" -Stone $e.Body)
$(DriftBlock -X 646 -Y 706 -Scale 140 -Mark "ring" -Stone $e.Body)
$(Plinth -X 1000 -Y 650 -Scale 150 -State "bare" -Stone $e.Body)
$(DriftBlock -X 1076 -Y 736 -Scale 140 -Mark "ring" -InSling -Stone $e.Body)
"@
  Write-SvgFile -Name "04-drift-warning.svg" -Body $drift

  $civic = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "close" -Joints 4)
$(EraMass -X 96 -Y 440 -Scale 108 -Body $e.Body -Accent $e.Roof -Roof "pitched" -Base "kerb" -Height 0.7)
$(EraMass -X 528 -Y 468 -Scale 108 -Body $e.Body -Accent $e.Roof -Roof "pitched" -Base "kerb" -Height 0.7)
$(ShutterPlates -X 528 -Y 468 -Scale 108 -Boarding "#9a8564" -Tag "#8c7a5e" -Height 0.7 -BarredDoor)
$(EraMass -X 960 -Y 496 -Scale 108 -Body $e.Body -Accent $e.Roof -Roof "pitched" -Base "kerb" -Height 0.7)
  <polygon points="1092,660 1128,678 1128,712 1092,694" fill="#c2b596"/>
  <polygon points="1098,672 1122,684 1122,690 1098,678" fill="#8a7c5f"/>
  <polygon points="1092,694 1128,712 1128,718 1092,700" fill="#a3977b"/>
"@
  Write-SvgFile -Name "05-civic-building-states.svg" -Body $civic

  $bank = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "close" -Joints 4)
$(CountingBoard -X 90 -Y 560 -Scale 150 -Counters 0 -Stone $e.Body)
$(CountingBoard -X 500 -Y 620 -Scale 150 -Counters 4 -Stone $e.Body)
$(CountingBoard -X 910 -Y 680 -Scale 150 -Counters 9 -Stone $e.Body)
"@
  Write-SvgFile -Name "06-influence-counting-board.svg" -Body $bank

  Write-ContactSheet -Title "Succession Crisis Reference Plates (era four)" -Blurb "Flat-shaded SVG references over era four's paved floor: hard white noon, short shadows, allegiance carried by pose and cut mark and never by colour." -Plates @(
    "01-wide-master",
    "02-plinth-four-states",
    "03-district-boundary-on-paving",
    "04-drift-warning",
    "05-civic-building-states",
    "06-influence-counting-board"
  )
}

# ---------------------------------------------------------------------------------------------
# Pack: era six, the Plague
# ---------------------------------------------------------------------------------------------

$ERA6 = @{
  # Warm buff lime plaster, READ FROM one place rather than decided here: era six's style guide
  # authors it and `apps/web/src/city/three/plague-tones.ts` pins it as `BODY_STUCCO`, with
  # `test/eraSixBodyHue.test.ts` holding this line to that pin in both directions. It supersedes
  # both the pale `#e9c2a1` pass and the later dusty-rose pass. The roof moved darker with it, so
  # every pitched roof, dome and cupola below uses the final slate/sheet-lead accent.
  Body  = "#c7a48e"
  Lead  = "#596675"
  # The inlay is a DARKER CUT OF THE FLOOR, not the era's slate/lead accent. An inlaid band has
  # to read as part of the paving it is set into, and cool metal against pale dressed stone
  # reads as a thing lying on top of the floor, which is exactly era seven's object.
  Inlay = "#9a9890"
  Floor = "#cfcdc4"
  Deep  = "#bab8ae"
  Kerb  = "#9d9b92"
  Sky   = "#dcdedb"
  Haze  = "#d2d5d3"
  Water = "#8aa0ab"
}

function Write-PlaguePack {
  $script:currentOutputDir = Join-Path $packRoot "plague"
  New-Item -ItemType Directory -Force -Path $script:currentOutputDir | Out-Null

  $e = $ERA6

  $wideMaster = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(StandingOffHull -X 1156 -Y 462 -Scale 76)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "wide" -Joints 5)
$(InlaidLink -X1 392 -Y1 660 -X2 700 -Y2 706 -Inlay $e.Inlay -State "carrying" -Width 11)
$(InlaidLink -X1 700 -Y1 706 -X2 968 -Y2 662 -Inlay $e.Inlay -State "suspended" -Bands 2 -Width 11)
$(InlaidLink -X1 392 -Y1 660 -X2 946 -Y2 620 -Inlay $e.Inlay -State "open" -Width 9)
$(EraMass -X 284 -Y 464 -Scale 88 -Body $e.Body -Accent $e.Lead -Roof "dome" -Base "rustic" -Height 0.7)
$(EraMass -X 590 -Y 506 -Scale 84 -Body $e.Body -Accent $e.Lead -Roof "pitched" -Base "rustic" -Height 0.4)
$(EraMass -X 862 -Y 452 -Scale 92 -Body $e.Body -Accent $e.Lead -Roof "dome" -Base "rustic" -Height 0.9)
$(ThresholdVessel -X 388 -Y 640 -Scale 96 -Stone $e.Floor)
$(EraPlanting -X 200 -Y 664 -Scale 78 -Kind "clipped")
$(EraPlanting -X 300 -Y 700 -Scale 78 -Kind "clipped")
$(EraPlanting -X 1040 -Y 676 -Scale 78 -Kind "clipped")
  <polygon points="1104,690 1108,690 1108,628 1104,628" fill="#7d6f60"/>
  <polygon points="1068,628 1122,606 1150,626 1096,648" fill="#a3947f"/>
  <polygon points="1160,700 1164,700 1164,614 1160,614" fill="#7d6f60"/>
"@
  Write-SvgFile -Name "01-wide-master.svg" -Body $wideMaster

  $linkKind = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "close" -Joints 5)
$(InlaidLink -X1 96 -Y1 560 -X2 640 -Y2 636 -Inlay $e.Inlay -State "open" -Width 16)
$(EraMass -X 60 -Y 424 -Scale 76 -Body $e.Body -Accent $e.Lead -Roof "pitched" -Base "rustic" -Height 0.4)
$(EraMass -X 570 -Y 494 -Scale 76 -Body $e.Body -Accent $e.Lead -Roof "pitched" -Base "rustic" -Height 0.4)
$(PipeOnSleepers -X1 760 -Y1 700 -X2 1300 -Y2 776 -Metal "#7d6f63")
$(EraMass -X 724 -Y 560 -Scale 76 -Body "#a2867a" -Accent "#6f6259" -Roof "flat" -Base "kerb" -Height 0.4)
$(EraMass -X 1234 -Y 630 -Scale 76 -Body "#a2867a" -Accent "#6f6259" -Roof "flat" -Base "kerb" -Height 0.4)
"@
  Write-SvgFile -Name "02-link-in-the-floor-against-on-it.svg" -Body $linkKind

  $topology = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "wide" -Joints 5)
$(InlaidLink -X1 300 -Y1 646 -X2 1046 -Y2 704 -Inlay $e.Inlay -State "carrying" -Width 12)
$(EraMass -X 232 -Y 470 -Scale 84 -Body $e.Body -Accent $e.Lead -Roof "dome" -Base "rustic" -Height 0.6)
$(EraMass -X 508 -Y 480 -Scale 84 -Body $e.Body -Accent $e.Lead -Roof "pitched" -Base "rustic" -Height 0.5)
$(EraMass -X 744 -Y 496 -Scale 84 -Body $e.Body -Accent $e.Lead -Roof "pitched" -Base "rustic" -Height 0.5)
$(EraMass -X 976 -Y 524 -Scale 84 -Body $e.Body -Accent $e.Lead -Roof "dome" -Base "rustic" -Height 0.6)
$(ThresholdVessel -X 300 -Y 626 -Scale 92 -Stone $e.Floor)
$(ThresholdVessel -X 1046 -Y 682 -Scale 92 -Stone $e.Floor)
"@
  Write-SvgFile -Name "03-long-link-not-adjacency.svg" -Body $topology

  $linkStates = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "close" -Joints 6)
$(InlaidLink -X1 90 -Y1 560 -X2 470 -Y2 612 -Inlay $e.Inlay -State "open" -Width 15)
$(InlaidLink -X1 90 -Y1 664 -X2 470 -Y2 716 -Inlay $e.Inlay -State "suspended" -Bands 2 -Width 15)
$(InlaidLink -X1 90 -Y1 768 -X2 470 -Y2 820 -Inlay $e.Inlay -State "carrying" -Width 15)
$(InlaidLink -X1 700 -Y1 590 -X2 1080 -Y2 642 -Inlay $e.Inlay -State "suspended" -Bands 1 -Width 15)
$(InlaidLink -X1 700 -Y1 694 -X2 1080 -Y2 746 -Inlay $e.Inlay -State "suspended" -Bands 3 -Width 15)
$(InlaidLink -X1 700 -Y1 798 -X2 1080 -Y2 850 -Inlay $e.Inlay -State "suspended" -Bands 0 -Width 15)
"@
  Write-SvgFile -Name "04-link-three-states.svg" -Body $linkStates

  $closure = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "close" -Joints 5)
$(InlaidLink -X1 60 -Y1 640 -X2 340 -Y2 678 -Inlay $e.Inlay -State "suspended" -Bands 1 -Width 22)
$(InlaidLink -X1 420 -Y1 668 -X2 700 -Y2 706 -Inlay $e.Inlay -State "suspended" -Bands 2 -Width 22)
$(InlaidLink -X1 780 -Y1 696 -X2 1060 -Y2 734 -Inlay $e.Inlay -State "suspended" -Bands 3 -Width 22)
$(InlaidLink -X1 1120 -Y1 724 -X2 1380 -Y2 760 -Inlay $e.Inlay -State "suspended" -Bands 0 -Width 22)
"@
  Write-SvgFile -Name "05-closure-duration-bands.svg" -Body $closure

  $buildings = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "close" -Joints 4)
$(EraMass -X 40 -Y 452 -Scale 84 -Body $e.Body -Accent $e.Lead -Roof "pitched" -Base "rustic" -Height 0.6)
$(EraMass -X 372 -Y 474 -Scale 84 -Body $e.Body -Accent $e.Lead -Roof "pitched" -Base "rustic" -Height 0.6)
$(ThresholdVessel -X 372 -Y 636 -Scale 88 -Stone $e.Floor)
$(EraMass -X 704 -Y 496 -Scale 84 -Body $e.Body -Accent $e.Lead -Roof "pitched" -Base "rustic" -Height 0.6)
$(ShutterPlates -X 704 -Y 496 -Scale 84 -Boarding "#7c6a55" -Tag $e.Lead -Height 0.6 -BarredDoor)
$(EraMass -X 1036 -Y 518 -Scale 84 -Body $e.Body -Accent $e.Lead -Roof "pitched" -Base "rustic" -Height 0.6)
$(ShutterPlates -X 1036 -Y 518 -Scale 84 -Boarding "#7c6a55" -Tag $e.Lead -Height 0.6 -BarredDoor)
$(ThresholdVessel -X 1036 -Y 680 -Scale 88 -Stone $e.Floor)
"@
  Write-SvgFile -Name "06-building-four-states.svg" -Body $buildings

  Write-ContactSheet -Title "Plague Crisis Reference Plates (era six)" -Blurb "Flat-shaded SVG references over era six's geometric paving: flat grey overcast, links inlaid IN the floor, closure as a barrier stone with countable bands." -Plates @(
    "01-wide-master",
    "02-link-in-the-floor-against-on-it",
    "03-long-link-not-adjacency",
    "04-link-three-states",
    "05-closure-duration-bands",
    "06-building-four-states"
  )
}

# ---------------------------------------------------------------------------------------------
# Pack: era nine, the Intrusion
# ---------------------------------------------------------------------------------------------

$ERA9 = @{
  Body  = "#96a1ab"
  Glass = "#7fa0a8"
  Floor = "#a9a49a"
  Deep  = "#948f86"
  Kerb  = "#7d786f"
  Sky   = "#b9bfc2"
  Haze  = "#adb4b8"
  Water = "#7f96a0"
  # ADDED CLAD PANEL: the one material the town puts up during the crisis and takes away after
  # it, in the era's own anodised family a step off `Body`. Two primitives draw it and both read
  # this entry: `ShutterPlates` as the blanking plates over an isolated building's openings
  # (plate 06) and `InspectionCover` as the temporary barrier round a lifted cover (plates 01 and
  # 02). It was a literal at the first of those and a rust orange at the second, which is how one
  # category of object came to have two contradictory tones; see `InspectionCover` for the ruling.
  Clad  = "#8b959c"
}

function Write-IntrusionPack {
  $script:currentOutputDir = Join-Path $packRoot "intrusion"
  New-Item -ItemType Directory -Force -Path $script:currentOutputDir | Out-Null

  $e = $ERA9

  $wideMaster = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "wide" -Joints 5)
$(EraMass -X 268 -Y 458 -Scale 88 -Body $e.Body -Accent $e.Glass -Roof "flat" -Base "shadow-gap" -Height 0.8)
$(EraMass -X 566 -Y 484 -Scale 92 -Body $e.Body -Accent $e.Glass -Roof "flat" -Base "shadow-gap" -Height 0.5)
$(EraMass -X 856 -Y 448 -Scale 88 -Body $e.Body -Accent $e.Glass -Roof "flat" -Base "shadow-gap" -Height 1.0)
$(StatusPanel -X 452 -Y 566 -Scale 76 -Segments 3)
$(StatusPanel -X 748 -Y 600 -Scale 76 -Segments 1)
$(StatusPanel -X 1042 -Y 566 -Scale 76 -Segments 2)
$(InspectionCover -X 358 -Y 686 -Scale 74 -Lifted -Floor $e.Floor -Clad $e.Clad)
$(InspectionCover -X 604 -Y 720 -Scale 74 -Lifted -Floor $e.Floor -Clad $e.Clad)
$(InspectionCover -X 828 -Y 700 -Scale 74 -Floor $e.Floor -Clad $e.Clad)
$(InspectionCover -X 946 -Y 744 -Scale 74 -Lifted -Floor $e.Floor -Clad $e.Clad)
$(DuctMarker -X 486 -Y 748 -Scale 84 -Collar "doubled" -Floor $e.Floor)
$(DuctMarker -X 720 -Y 776 -Scale 84 -Collar "flush" -Floor $e.Floor)
$(DuctMarker -X 1006 -Y 706 -Scale 84 -Collar "raised" -Floor $e.Floor)
$(EraPlanting -X 190 -Y 658 -Scale 76 -Kind "drift")
$(EraPlanting -X 1092 -Y 664 -Scale 76 -Kind "drift")
"@
  Write-SvgFile -Name "01-wide-master.svg" -Body $wideMaster

  $covers = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "close" -Joints 6)
$(InspectionCover -X 120 -Y 600 -Scale 210 -Floor $e.Floor -Clad $e.Clad)
$(InspectionCover -X 620 -Y 660 -Scale 210 -Lifted -Floor $e.Floor -Clad $e.Clad)
"@
  Write-SvgFile -Name "02-lifted-cover-and-barrier.svg" -Body $covers

  $panels = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "close" -Joints 4)
$(EraMass -X 40 -Y 428 -Scale 78 -Body $e.Body -Accent $e.Glass -Roof "flat" -Base "shadow-gap" -Height 0.5)
$(StatusPanel -X 176 -Y 540 -Scale 150 -Segments 0)
$(EraMass -X 368 -Y 452 -Scale 78 -Body $e.Body -Accent $e.Glass -Roof "flat" -Base "shadow-gap" -Height 0.5)
$(StatusPanel -X 504 -Y 564 -Scale 150 -Segments 1)
$(EraMass -X 696 -Y 476 -Scale 78 -Body $e.Body -Accent $e.Glass -Roof "flat" -Base "shadow-gap" -Height 0.5)
$(StatusPanel -X 832 -Y 588 -Scale 150 -Segments 2)
$(EraMass -X 1024 -Y 500 -Scale 78 -Body $e.Body -Accent $e.Glass -Roof "flat" -Base "shadow-gap" -Height 0.5)
$(StatusPanel -X 1160 -Y 612 -Scale 150 -Segments 3)
"@
  Write-SvgFile -Name "03-status-panel-four-readings.svg" -Body $panels

  $distances = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "close" -Joints 5)
$(EraMass -X 96 -Y 420 -Scale 116 -Body $e.Body -Accent $e.Glass -Roof "flat" -Base "shadow-gap" -Height 0.7)
$(StatusPanel -X 300 -Y 588 -Scale 190 -Segments 3)
$(DuctMarker -X 300 -Y 792 -Scale 200 -Collar "doubled" -Floor $e.Floor)
$(EraMass -X 760 -Y 500 -Scale 42 -Body $e.Body -Accent $e.Glass -Roof "flat" -Base "shadow-gap" -Height 0.7)
$(StatusPanel -X 834 -Y 560 -Scale 68 -Segments 3)
$(DuctMarker -X 838 -Y 634 -Scale 72 -Collar "doubled" -Floor $e.Floor)
$(EraMass -X 1032 -Y 528 -Scale 42 -Body $e.Body -Accent $e.Glass -Roof "flat" -Base "shadow-gap" -Height 0.7)
$(StatusPanel -X 1106 -Y 588 -Scale 68 -Segments 1)
$(DuctMarker -X 1110 -Y 662 -Scale 72 -Collar "flush" -Floor $e.Floor)
"@
  Write-SvgFile -Name "04-two-distances.svg" -Body $distances

  $stale = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "close" -Joints 5)
$(EraMass -X 96 -Y 420 -Scale 116 -Body $e.Body -Accent $e.Glass -Roof "flat" -Base "shadow-gap" -Height 0.7)
$(StatusPanel -X 300 -Y 588 -Scale 190 -Segments 3)
$(DuctMarker -X 300 -Y 792 -Scale 200 -Collar "doubled" -Floor $e.Floor)
$(EraMass -X 700 -Y 470 -Scale 116 -Body $e.Body -Accent $e.Glass -Roof "flat" -Base "shadow-gap" -Height 0.7)
$(StatusPanel -X 904 -Y 638 -Scale 190 -Segments 3 -Stale)
$(DuctMarker -X 904 -Y 842 -Scale 200 -Collar "notched" -Floor $e.Floor)
"@
  Write-SvgFile -Name "05-stale-reading.svg" -Body $stale

  $isolation = @"
$(EraSky -Sky $e.Sky -Haze $e.Haze -Water $e.Water)
$(EraGround -Floor $e.Floor -FloorDeep $e.Deep -Kerb $e.Kerb -Variant "close" -Joints 4)
$(EraMass -X 96 -Y 440 -Scale 104 -Body $e.Body -Accent $e.Glass -Roof "flat" -Base "shadow-gap" -Height 0.7)
$(StatusPanel -X 280 -Y 596 -Scale 120 -Segments 1)
$(DuctMarker -X 284 -Y 728 -Scale 130 -Collar "flush" -Floor $e.Floor)
$(EraMass -X 552 -Y 472 -Scale 104 -Body $e.Body -Accent $e.Glass -Roof "flat" -Base "shadow-gap" -Height 0.7)
$(StatusPanel -X 736 -Y 628 -Scale 120 -Segments 3)
$(DuctMarker -X 740 -Y 760 -Scale 130 -Collar "doubled" -Floor $e.Floor)
$(EraMass -X 1008 -Y 504 -Scale 104 -Body $e.Body -Accent $e.Glass -Roof "flat" -Base "shadow-gap" -Height 0.7)
$(ShutterPlates -X 1008 -Y 504 -Scale 104 -Boarding $e.Clad -Tag "#4c565c" -Height 0.7 -BarredDoor)
$(StatusPanel -X 1192 -Y 660 -Scale 120 -Segments -1)
$(DuctMarker -X 1196 -Y 792 -Scale 130 -Collar "doubled" -Floor $e.Floor)
"@
  Write-SvgFile -Name "06-building-states.svg" -Body $isolation

  Write-ContactSheet -Title "Intrusion Crisis Reference Plates (era nine)" -Blurb "Flat-shaded SVG references over era nine's engineered paving: a dimmed flat late afternoon, the floor open in a dozen places, and every reading carried by a countable segment ladder plus a ground collar." -Plates @(
    "01-wide-master",
    "02-lifted-cover-and-barrier",
    "03-status-panel-four-readings",
    "04-two-distances",
    "05-stale-reading",
    "06-building-states"
  )
}

# ---------------------------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------------------------

$packBackgrounds = @{
  "hard-winter" = "232,236,234"
  "succession"  = "233,231,222"
  "plague"      = "220,222,219"
  "intrusion"   = "185,191,194"
}

$packsToWrite = if ($Pack -eq "all") { @("hard-winter", "succession", "plague", "intrusion") } else { @($Pack) }

foreach ($packName in $packsToWrite) {
  switch ($packName) {
    "hard-winter" { Write-HardWinterPack }
    "succession" { Write-SuccessionPack }
    "plague" { Write-PlaguePack }
    "intrusion" { Write-IntrusionPack }
  }
  Write-Host "Wrote $packName SVGs and contact sheet to $(Join-Path $packRoot $packName)"
}

if ($SkipRaster) {
  Write-Host "PNG pass skipped by request."
  return
}

# Probing has to CONSTRUCT a bitmap, not merely load the assembly. `System.Drawing.Common`
# resolves on Linux and then throws from its type initializer at first use, so an `Add-Type`
# that succeeds proves nothing.
try {
  Add-Type -AssemblyName System.Drawing
  $probe = [System.Drawing.Bitmap]::new(1, 1)
  $probe.Dispose()
  $canRaster = $true
}
catch {
  $canRaster = $false
}

if (-not $canRaster) {
  Write-Warning "System.Drawing is unavailable on this platform, so no PNG was written. The SVGs are complete and index.html loads those. To rasterise here, run: node tools/rasterise-crisis-references.mjs"
  return
}

foreach ($packName in $packsToWrite) {
  $packDir = Join-Path $packRoot $packName
  $svgFiles = Get-ChildItem -LiteralPath $packDir -Filter "*.svg"
  foreach ($svgFile in $svgFiles) {
    $pngPath = Join-Path $packDir ($svgFile.BaseName + ".png")
    Export-SvgToPng -SvgPath $svgFile.FullName -PngPath $pngPath -Background $packBackgrounds[$packName]
  }
  Write-Host "Rasterised $packName through System.Drawing"
}

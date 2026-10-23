param(
  [string]$BirdPath = 'public/art/room-v2/blue-quaker-calm-corrected.png',
  [string]$BackgroundPath = 'public/art/room-v2/background.png',
  [string]$OutputPath = 'assets/derived/bird-anchor-measurement.json'
)

Add-Type -AssemblyName System.Drawing
$bird = [System.Drawing.Bitmap]::new([System.Drawing.Image]::FromFile((Resolve-Path $BirdPath).Path))
$alphaMin = 16
$bbox = @{ left = $bird.Width; top = $bird.Height; right = -1; bottom = -1 }
for ($y = 0; $y -lt $bird.Height; $y++) {
  for ($x = 0; $x -lt $bird.Width; $x++) {
    if ($bird.GetPixel($x, $y).A -gt $alphaMin) {
      $bbox.left = [Math]::Min($bbox.left, $x); $bbox.right = [Math]::Max($bbox.right, $x)
      $bbox.top = [Math]::Min($bbox.top, $y); $bbox.bottom = [Math]::Max($bbox.bottom, $y)
    }
  }
}
$bird.Dispose()

$measurement = [ordered]@{
  source = $BirdPath
  background = $BackgroundPath
  sourceSize = @(420, 540)
  alphaThreshold = $alphaMin
  alphaBBoxInclusive = @($bbox.left, $bbox.top, $bbox.right, $bbox.bottom)
  feet = [ordered]@{
    leftLowestVisibleContact = @(184, 353)
    rightLowestVisibleContact = @(231, 348)
    supportFoot = 'bird-left-foot, image-right/rear foot'
    supportAnchor = @(238, 329)
  }
  branchSupport = [ordered]@{ point = @(668, 708); lineFrom = @(638, 713); lineTo = @(668, 708) }
  previousAnchor = @(207.5, 350.5)
  previousContact = @(651, 709)
  method = 'Alpha scan plus 400% foot inspection; support anchor is the rear foot palm/grip center, branch support is the measured sloped top surface.'
}
$parent = Split-Path $OutputPath
New-Item -ItemType Directory -Force $parent | Out-Null
$measurement | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 $OutputPath
Write-Output (Get-Content -Raw $OutputPath)

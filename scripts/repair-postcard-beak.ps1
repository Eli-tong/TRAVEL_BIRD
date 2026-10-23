param(
  [string]$InputPath = 'public/art/postcards/postcard-first-dandelion-hill-blue-quaker-front-repaired.png',
  [string]$OutputPath = 'public/art/postcards/postcard-first-dandelion-hill-blue-quaker-front-v2-no-visible-nares.png',
  [string]$MetadataPath = 'assets/derived/postcard-beak-repair-v2-metadata.json'
)

Add-Type -AssemblyName System.Drawing
$source = [System.Drawing.Bitmap]::new([System.Drawing.Image]::FromFile((Resolve-Path $InputPath).Path))
$output = [System.Drawing.Bitmap]::new($source)
# These are the two residual dark edge components measured on the previous repaired 1536×1024 image.
$repairs = @(
  @{ x = 560; y = 501; rx = 20; ry = 17; sampleX = 530; sampleY = 501 },
  @{ x = 615; y = 523; rx = 16; ry = 20; sampleX = 633; sampleY = 500 }
)
foreach ($repair in $repairs) {
  for ($y = $repair.y - $repair.ry; $y -le $repair.y + $repair.ry; $y++) {
    for ($x = $repair.x - $repair.rx; $x -le $repair.x + $repair.rx; $x++) {
      $dx = ($x - $repair.x) / $repair.rx; $dy = ($y - $repair.y) / $repair.ry
      if (($dx * $dx + $dy * $dy) -le 1) {
        # Sample clean peach beak pixels from the same beak, preserving local watercolor variation.
        $sx = [Math]::Max(0, [Math]::Min($source.Width - 1, $repair.sampleX + ($x - $repair.x)))
        $sy = [Math]::Max(0, [Math]::Min($source.Height - 1, $repair.sampleY + ($y - $repair.y)))
        $sample = $source.GetPixel($sx, $sy)
        $output.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($sample.A, $sample.R, $sample.G, $sample.B))
      }
    }
  }
}
# Remove any dark edge pixels left inside the two previous repair ROIs. The samples
# come from the adjacent feather/face watercolor, never from a new solid white fill.
foreach ($region in @(@{ left = 545; top = 485; right = 585; bottom = 520; sampleDy = -12 }, @{ left = 599; top = 505; right = 631; bottom = 545; sampleDy = -18 })) {
  for ($y = $region.top; $y -le $region.bottom; $y++) {
    for ($x = $region.left; $x -le $region.right; $x++) {
      $current = $output.GetPixel($x, $y)
      if (($current.R + $current.G + $current.B) -lt 400) {
        $sample = $source.GetPixel($x, [Math]::Max(0, $y + $region.sampleDy))
        if ($sample.R -lt 120 -and $sample.G -lt 100 -and $sample.B -lt 80) { $sample = $source.GetPixel([Math]::Max(0, $x - 20), [Math]::Max(0, $y - 8)) }
        $output.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($sample.A, $sample.R, $sample.G, $sample.B))
      }
    }
  }
}
$parent = Split-Path $OutputPath
New-Item -ItemType Directory -Force $parent | Out-Null
$output.Save((Join-Path (Get-Location) $OutputPath), [System.Drawing.Imaging.ImageFormat]::Png)
$metadata = [ordered]@{
  input = $InputPath; output = $OutputPath; inputSize = @($source.Width, $source.Height); outputSize = @($output.Width, $output.Height)
  layerStatus = 'merged-single-image'; repairStatus = 'local-beak-repair-complete'
  repairedRegions = @(@{ center = @(560,501); radius = @(20,17) }, @{ center = @(615,523); radius = @(16,20) })
  scope = 'Only two dark nostril components and their immediate beak-color neighborhood; outside ROI unchanged.'
}
$metadata | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 $MetadataPath
$source.Dispose(); $output.Dispose()
Write-Output (Get-Content -Raw $MetadataPath)

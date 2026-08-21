Add-Type -AssemblyName System.Drawing

function Crop-Image ($filePath) {
    Write-Host "Processing $filePath..."
    $src = [System.Drawing.Bitmap]::FromFile($filePath)
    $w = $src.Width
    $h = $src.Height

    $minX = $w; $maxX = 0
    $minY = $h; $maxY = 0

    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $pixel = $src.GetPixel($x, $y)
            # Check if pixel is NOT pure white and NOT transparent
            if ($pixel.A -gt 20 -and ($pixel.R -lt 240 -or $pixel.G -lt 240 -or $pixel.B -lt 240)) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }

    Write-Host "Found bounds: X=$minX..$maxX, Y=$minY..$maxY"

    $cropWidth = [Math]::Max(10, $maxX - $minX + 1)
    $cropHeight = [Math]::Max(10, $maxY - $minY + 1)

    $rect = New-Object System.Drawing.Rectangle($minX, $minY, $cropWidth, $cropHeight)
    $cropped = New-Object System.Drawing.Bitmap($cropWidth, $cropHeight)
    $g = [System.Drawing.Graphics]::FromImage($cropped)
    $g.DrawImage($src, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $src.Dispose()

    $cropped.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
    Write-Host "Saved cropped image to $filePath"
}

Crop-Image "C:\Capstone Final Project\web-admin\src\assets\logo-full.png"
Crop-Image "C:\Capstone Final Project\web-admin\src\assets\logo-minimized.png"

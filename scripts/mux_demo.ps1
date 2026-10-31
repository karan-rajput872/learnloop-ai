$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

$ffmpeg = Join-Path $rootDir "frontend\node_modules\ffmpeg-static\ffmpeg.exe"
$audioFile = Join-Path $rootDir "demo_assets\full_narration.mp3"
$rawDir = Join-Path $rootDir "demo_assets\raw_video"
$outputFile = Join-Path $rootDir "LearnLoop_AI_Hackathon_Demo.mp4"

if (-not (Test-Path $ffmpeg)) {
    Write-Error "FFmpeg not found at $ffmpeg"
}

if (-not (Test-Path $audioFile)) {
    Write-Error "Audio narration not found at $audioFile"
}

$rawVideos = Get-ChildItem -Path $rawDir -Filter "*.webm" | Sort-Object LastWriteTime -Descending
if ($rawVideos.Count -eq 0) {
    Write-Error "No raw webm recording found in $rawDir"
}

$rawVideo = $rawVideos[0].FullName
Write-Host "Found raw video recording: $rawVideo (Size: $([math]::Round($rawVideos[0].Length / 1MB, 2)) MB)"
Write-Host "Muxing with full narration: $audioFile"
Write-Host "Target output deliverable: $outputFile"

& $ffmpeg -y -i "$rawVideo" -i "$audioFile" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "$outputFile"

if (Test-Path $outputFile) {
    $outItem = Get-Item $outputFile
    Write-Host "`n======================================================================"
    Write-Host "DELIVERABLE EXPORTED SUCCESSFULLY!"
    Write-Host "File Path: $outputFile"
    Write-Host "File Size: $([math]::Round($outItem.Length / 1MB, 2)) MB ($($outItem.Length) bytes)"
    Write-Host "======================================================================`n"

    Write-Host "Verifying stream properties with FFmpeg:"
    & $ffmpeg -i "$outputFile" 2>&1 | Select-String "Duration", "Video:", "Audio:"
} else {
    Write-Error "Muxing completed but output file not found!"
}


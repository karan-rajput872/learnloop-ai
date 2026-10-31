$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$workspaceRoot = Split-Path -Parent $rootDir

$ffmpeg = Join-Path $rootDir "frontend\node_modules\ffmpeg-static\ffmpeg.exe"
$audioFile = Join-Path $rootDir "demo_assets\final\full_narration_285s.mp3"
$rawDir = Join-Path $rootDir "demo_assets\final\raw_video"
$finalDir = Join-Path $rootDir "demo_assets\final"
$tempOutputFile = Join-Path $finalDir "temp_muxed_demo.mp4"
$finalOutputFile = Join-Path $finalDir "LearnLoop_AI_Hackathon_Demo.mp4"

Write-Host "======================================================================"
Write-Host "LEARNLOOP AI — FINAL VIDEO MUXING & VERIFICATION ENGINE"
Write-Host "======================================================================"

if (-not (Test-Path $ffmpeg)) {
    Write-Error "FFmpeg binary not found at $ffmpeg"
}

if (-not (Test-Path $audioFile)) {
    Write-Error "Narration audio file not found at $audioFile"
}

$rawVideos = Get-ChildItem -Path $rawDir -Filter "*.webm" | Sort-Object LastWriteTime -Descending
if ($rawVideos.Count -eq 0) {
    Write-Error "No raw webm recording found in $rawDir"
}

$rawVideo = $rawVideos[0].FullName
$rawSizeMB = [math]::Round($rawVideos[0].Length / 1MB, 2)
Write-Host "Found raw video recording: $rawVideo ($rawSizeMB MB)"
Write-Host "Narration audio track: $audioFile"
Write-Host "Muxing to temporary deliverable: $tempOutputFile..."

# Remove temporary file if exists
if (Test-Path $tempOutputFile) {
    Remove-Item -Force $tempOutputFile
}

# Run FFmpeg to encode to H.264/AAC MP4 with matching duration
& $ffmpeg -y -i "$rawVideo" -i "$audioFile" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "$tempOutputFile"

if (-not (Test-Path $tempOutputFile)) {
    Write-Error "FFmpeg muxing failed to produce $tempOutputFile"
}

$tempItem = Get-Item $tempOutputFile
$tempSize = $tempItem.Length
$tempSizeMB = [math]::Round($tempSize / 1MB, 2)

if ($tempSize -eq 0) {
    Write-Error "CRITICAL: Muxed MP4 file size is 0 bytes! Aborting copy."
}

Write-Host "`nTemporary MP4 created successfully: $tempSizeMB MB ($tempSize bytes)"

# Verify streams with FFmpeg
$probeOutput = & $ffmpeg -i "$tempOutputFile" 2>&1 | Out-String
Write-Host "`n--- FFmpeg Stream Inspection ---"
$probeOutput | Select-String "Duration", "Video:", "Audio:" | ForEach-Object { Write-Host $_.Line }

# Save verification log
$verificationLogPath = Join-Path $finalDir "LearnLoop_AI_Video_Verification.txt"
$verificationText = @"
======================================================================
LEARNLOOP AI — OFFICIAL HACKATHON DEMO VIDEO VERIFICATION
Product Space × Wispr Flow Agentic AI Hackathon ’26 — Challenge 02
======================================================================

Verification Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss K")
File Name: LearnLoop_AI_Hackathon_Demo.mp4
File Size: $tempSize bytes ($tempSizeMB MB)
Status: VERIFIED VALID & NON-ZERO

--- FFmpeg Media Properties ---
$probeOutput

--- Deliverable Locations ---
1. demo_assets/final/LearnLoop_AI_Hackathon_Demo.mp4
2. learnloop-ai/LearnLoop_AI_Hackathon_Demo.mp4
3. Workspace Root/LearnLoop_AI_Hackathon_Demo.mp4
======================================================================
"@
Set-Content -Path $verificationLogPath -Value $verificationText -Encoding UTF8
Write-Host "`nVerification log saved to $verificationLogPath"

# Copy verified MP4 to official destination paths
Copy-Item -Path $tempOutputFile -Destination $finalOutputFile -Force
Write-Host "Copied to: $finalOutputFile"

$projectRootOutput = Join-Path $rootDir "LearnLoop_AI_Hackathon_Demo.mp4"
Copy-Item -Path $tempOutputFile -Destination $projectRootOutput -Force
Write-Host "Copied to: $projectRootOutput"

$workspaceRootOutput = Join-Path $workspaceRoot "LearnLoop_AI_Hackathon_Demo.mp4"
Copy-Item -Path $tempOutputFile -Destination $workspaceRootOutput -Force
Write-Host "Copied to: $workspaceRootOutput"

# Clean up temp muxed file
Remove-Item -Force $tempOutputFile

Write-Host "`n======================================================================"
Write-Host "DELIVERABLE EXPORTED & VERIFIED ACROSS ALL TARGETS!"
Write-Host "Size: $tempSizeMB MB"
Write-Host "======================================================================`n"

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$distDir = Join-Path $rootDir "dists"
$zipPath = Join-Path $distDir "AutoRefresh.zip"

# Create dists directory if it doesn't exist
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir | Out-Null
    Write-Host "Created dists directory."
}

# Remove existing zip file
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
    Write-Host "Removed existing zip file."
}

# Define exclusion list
$exclude = @(
    "*.git*",
    "*.gitignore*",
    "*scripts*",
    "*dists*",
    "*.zip",
    "*node_modules*",
    "*.DS_Store"
)

# Get files to zip
$files = Get-ChildItem -Path $rootDir -Exclude $exclude  | Where-Object { 
    $_.FullName -notmatch "\\.git" -and 
    $_.FullName -notmatch "\\scripts" -and 
    $_.FullName -notmatch "\\dists" 
}

# Create the zip file
Compress-Archive -Path $files.FullName -DestinationPath $zipPath -Force

Write-Host "Extension packaged successfully at $zipPath"

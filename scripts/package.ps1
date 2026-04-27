$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
$projectRoot = Split-Path -Parent $scriptDir
$distsDir = Join-Path $projectRoot "dists"

if (-not (Test-Path $distsDir)) {
    New-Item -ItemType Directory -Path $distsDir | Out-Null
}

$outputFile = Join-Path $distsDir "AutoRefresh.zip"

if (Test-Path $outputFile) {
    Remove-Item $outputFile
}

Push-Location $projectRoot

$files = @(
    "icons", 
    "about-sheentee.js",
    "background.js",  
    "manifest.json",
    "popup.html",
    "popup.js",
    "styles.css"
)

try {
    Compress-Archive -Path $files -DestinationPath $outputFile -Force
    Write-Host "Extension packaged successfully to $outputFile"
}
finally {
    Pop-Location
}
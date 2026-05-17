#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$ViewerRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ViewerRoot

if (-not (Test-Path "node_modules")) {
  Write-Host "npm install ..."
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not (Test-Path "dist\index.html")) {
  Write-Host "npm run build ..."
  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$Port = if ($env:PORT) { $env:PORT } else { 8765 }
$Url = "http://localhost:$Port/gaiku-kijunten-viewer/"

Write-Host "Starting local server on port $Port ..."
Start-Process $Url
node "$PSScriptRoot\serve.mjs" --port $Port

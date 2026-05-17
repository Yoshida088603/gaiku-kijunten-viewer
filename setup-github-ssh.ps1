# One-time: register SSH public key on GitHub
$ErrorActionPreference = "Stop"
$pubKeyPath = "$env:USERPROFILE\.ssh\id_ed25519.pub"
$knownHosts = "$env:USERPROFILE\.ssh\known_hosts"

if (-not (Test-Path $pubKeyPath)) {
    ssh-keygen -t ed25519 -C "gaiku-kijunten-viewer" -f "$env:USERPROFILE\.ssh\id_ed25519" -N '""'
}

# GitHub host key (api.github.com/meta)
$githubHostKey = "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl"
$marker = "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl"
if (-not (Test-Path $knownHosts) -or -not (Select-String -Path $knownHosts -Pattern [regex]::Escape($marker) -Quiet)) {
    Add-Content -Path $knownHosts -Value $githubHostKey -Encoding ascii
}

$pub = (Get-Content $pubKeyPath -Raw).Trim()
Write-Host ""
Write-Host "=== Add this public key to GitHub ===" -ForegroundColor Cyan
Write-Host $pub
Set-Clipboard -Value $pub
Write-Host ""
Write-Host "Copied to clipboard." -ForegroundColor Green

Start-Process "https://github.com/settings/ssh/new"
Write-Host "Opened GitHub SSH settings. Paste the key, save, then press Enter here." -ForegroundColor Yellow

Read-Host "Press Enter after saving on GitHub"
ssh -T git@github.com

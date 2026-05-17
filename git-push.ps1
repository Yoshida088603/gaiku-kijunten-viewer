# add, commit, push
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Message,
    [switch]$All
)
Set-Location $PSScriptRoot

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    $output = & git @Args 2>&1
    if ($LASTEXITCODE -ne 0) {
        if ($output) { $output | Write-Host }
        throw "git $($Args -join ' ') failed (exit $LASTEXITCODE)"
    }
    if ($output) { $output | Write-Host }
}

if ($All) {
    Invoke-Git add -A
} else {
    Invoke-Git add -u
    Invoke-Git add .
}

$status = git status --porcelain
if (-not $status) {
    Write-Host "No changes to commit." -ForegroundColor Yellow
    exit 0
}

Invoke-Git commit -m $Message
$branch = (& git rev-parse --abbrev-ref HEAD 2>$null).Trim()
if (-not $branch) { throw "Could not detect current branch" }
Invoke-Git push -u origin $branch
Write-Host "Pushed to origin/$branch" -ForegroundColor Green

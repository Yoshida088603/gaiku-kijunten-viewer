<#
.SYNOPSIS
  3段グリッド overview PMTiles 生成
#>
[CmdletBinding()]
param(
  [string] $QgisBin = $env:QGIS_BIN,
  [string] $InputDir,
  [string] $OutputDir,
  [switch] $DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-QgisBin {
  param([string] $Dir)
  if (-not (Test-Path -LiteralPath (Join-Path $Dir 'ogr2ogr.exe'))) { return $false }
  foreach ($name in @('python-qgis.bat', 'python-qgis-ltr.bat')) {
    if (Test-Path -LiteralPath (Join-Path $Dir $name)) { return $true }
  }
  return $false
}

function Resolve-QgisPythonBat {
  param([string] $Dir)
  foreach ($name in @('python-qgis.bat', 'python-qgis-ltr.bat')) {
    $bat = Join-Path $Dir $name
    if (Test-Path -LiteralPath $bat) { return $bat }
  }
  throw "python-qgis-ltr.bat がありません: $Dir"
}

function Resolve-QgisBin {
  param([string] $Preferred)
  if (-not [string]::IsNullOrWhiteSpace($Preferred)) {
    if (Test-QgisBin -Dir $Preferred) { return (Resolve-Path -LiteralPath $Preferred).Path }
    throw "QGIS bin が不正です: $Preferred"
  }
  $pf = @('C:\Program Files', 'C:\Program Files (x86)')
  $candidates = @()
  foreach ($base in $pf) {
    if (-not (Test-Path -LiteralPath $base)) { continue }
    Get-ChildItem -LiteralPath $base -Directory -Filter 'QGIS 3.44.*' -ErrorAction SilentlyContinue |
      ForEach-Object {
        $bin = Join-Path $_.FullName 'bin'
        if (Test-QgisBin -Dir $bin) {
          $m = [regex]::Match($_.Name, '3\.44\.(\d+)')
          $patch = if ($m.Success) { [int]$m.Groups[1].Value } else { 0 }
          $candidates += [pscustomobject]@{ Patch = $patch; Path = $bin }
        }
      }
  }
  if ($candidates.Count -gt 0) {
    return ($candidates | Sort-Object Patch -Descending | Select-Object -First 1).Path
  }
  throw "QGIS 3.44 bin が見つかりません。 -QgisBin または QGIS_BIN を設定してください。"
}

$QgisBin = Resolve-QgisBin -Preferred $QgisBin
$bat = Resolve-QgisPythonBat -Dir $QgisBin
$pyScript = Join-Path $PSScriptRoot '75-build-overview.py'

$argsList = @($pyScript)
if ($InputDir) { $argsList += @('-i', $InputDir) }
if ($OutputDir) { $argsList += @('-o', $OutputDir) }
if ($DryRun) { $argsList += '--dry-run' }
$argsList += @('--qgis-bin', $QgisBin)

Write-Host "QGIS bin: $QgisBin"
& $bat @argsList
exit $LASTEXITCODE

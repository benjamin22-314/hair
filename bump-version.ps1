param(
  [Parameter(Mandatory = $true)]
  [string]$Version
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. version.json
$versionJson = "{`n  `"version`": `"$Version`"`n}`n"
Set-Content -Path (Join-Path $root 'version.json') -Value $versionJson -NoNewline -Encoding UTF8

# 2. sw.js
$swPath = Join-Path $root 'sw.js'
$sw = Get-Content -Path $swPath -Raw -Encoding UTF8
$sw = [regex]::Replace($sw, "const CACHE_VERSION = '[^']+';", "const CACHE_VERSION = '$Version';")
Set-Content -Path $swPath -Value $sw -NoNewline -Encoding UTF8

# 3. js/config.js
$cfgPath = Join-Path $root 'js\config.js'
$cfg = Get-Content -Path $cfgPath -Raw -Encoding UTF8
$cfg = [regex]::Replace($cfg, "export const APP_VERSION = '[^']+';", "export const APP_VERSION = '$Version';")
Set-Content -Path $cfgPath -Value $cfg -NoNewline -Encoding UTF8

Write-Host "Updated Hair Salon Party to v$Version in version.json, sw.js, and js/config.js"

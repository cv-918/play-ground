param(
  [string]$BindHost = "127.0.0.1",
  [int]$Port = 47831,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$consoleBat = Join-Path $PSScriptRoot "studio_director_console.bat"
$url = "http://${BindHost}:$Port/"

$listener = Get-NetTCPConnection -LocalAddress $BindHost -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1

if (-not $listener) {
  Start-Process -FilePath "cmd.exe" `
    -ArgumentList @("/c", "`"$consoleBat`" --host $BindHost --port $Port") `
    -WorkingDirectory $repoRoot `
    -WindowStyle Minimized
  Start-Sleep -Milliseconds 1200
}

if (-not $NoBrowser) {
  Start-Process $url
}

Write-Host "AIWorkflow Studio: $url"

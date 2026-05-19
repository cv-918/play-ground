param(
  [string]$BindHost = "127.0.0.1",
  [int]$Port = 47831,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$consoleBat = Join-Path $PSScriptRoot "studio_director_console.bat"

function Test-StudioEndpoint {
  param([string]$Url)
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    return [string]$response.Content -like "*AIWorkflow Studio Director Console*"
  } catch {
    return $false
  }
}

function Test-PortBusy {
  param([string]$HostName, [int]$PortNumber)
  return [bool](Get-NetTCPConnection -LocalAddress $HostName -LocalPort $PortNumber -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1)
}

$targetPort = $Port
$url = "http://${BindHost}:$targetPort/"

if (-not (Test-StudioEndpoint -Url $url)) {
  while (Test-PortBusy -HostName $BindHost -PortNumber $targetPort) {
    $targetPort += 1
    if ($targetPort -gt 65535) {
      throw "No available local port for AIWorkflow Studio."
    }
  }
  $url = "http://${BindHost}:$targetPort/"
  Start-Process -FilePath "cmd.exe" `
    -ArgumentList @("/c", "`"$consoleBat`" --host $BindHost --port $targetPort") `
    -WorkingDirectory $repoRoot `
    -WindowStyle Minimized
  Start-Sleep -Milliseconds 1200
}

if (-not $NoBrowser) {
  Start-Process $url
}

Write-Host "AIWorkflow Studio: $url"

param(
    [Parameter(Mandatory=$true)]
    [string]$ManifestUrl,

    [Parameter(Mandatory=$true)]
    [string]$OutFile,

    [int]$TimeoutSeconds = 15
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

try {
    $outDir = Split-Path -Parent $OutFile
    if (-not [string]::IsNullOrWhiteSpace($outDir)) {
        New-Item -ItemType Directory -Force -Path $outDir | Out-Null
    }

    Invoke-WebRequest -Uri $ManifestUrl -OutFile $OutFile -UseBasicParsing -TimeoutSec $TimeoutSeconds
    exit 0
}
catch {
    Write-Host "[DOWNLOAD_ERROR] Failed to download manifest: $($_.Exception.Message)"
    exit 20
}

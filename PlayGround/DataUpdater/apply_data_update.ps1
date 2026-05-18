param(
    [Parameter(Mandatory=$true)]
    [string]$GameRoot,

    [Parameter(Mandatory=$true)]
    [string]$ManifestPath
)

$ErrorActionPreference = "Stop"

function Exit-WithCode {
    param(
        [int]$Code,
        [string]$Message
    )

    if (-not [string]::IsNullOrWhiteSpace($Message)) {
        Write-Host $Message
    }
    exit $Code
}

function Convert-ManifestPathToRelativeParts {
    param([string]$PathValue)

    $normalized = $PathValue -replace "/", "\"
    $parts = @($normalized -split "\\+" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    foreach ($part in $parts) {
        if ($part -eq "." -or $part -eq ".." -or [System.IO.Path]::IsPathRooted($part)) {
            Exit-WithCode 10 "[CONFIG_ERROR] Invalid preserve path: $PathValue"
        }
    }
    return $parts
}

function Join-Parts {
    param(
        [string]$Root,
        [string[]]$Parts
    )

    $path = $Root
    foreach ($part in $Parts) {
        $path = Join-Path $path $part
    }
    return $path
}

try {
    $root = (Resolve-Path -LiteralPath $GameRoot).Path
    $manifestFile = (Resolve-Path -LiteralPath $ManifestPath).Path
    $manifest = Get-Content -LiteralPath $manifestFile -Raw -Encoding UTF8 | ConvertFrom-Json

    if ($manifest.schema_version -ne 1 -or
        [string]::IsNullOrWhiteSpace([string]$manifest.data_version) -or
        [string]::IsNullOrWhiteSpace([string]$manifest.archive_sha256) -or
        [string]::IsNullOrWhiteSpace([string]$manifest.download_url) -or
        [UInt64]$manifest.archive_size -le 0) {
        Exit-WithCode 10 "[CONFIG_ERROR] Invalid Data update manifest."
    }

    $runtimeRoot = Join-Path $root "_DataUpdate"
    $downloadDir = Join-Path $runtimeRoot "downloads"
    $stagingRoot = Join-Path $runtimeRoot "staging"
    $backupRoot = Join-Path $runtimeRoot "backup"
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $archiveName = if ([string]::IsNullOrWhiteSpace([string]$manifest.archive_name)) { "PlayGround_Data_Latest.zip" } else { [string]$manifest.archive_name }
    $archivePath = Join-Path $downloadDir $archiveName

    New-Item -ItemType Directory -Force -Path $downloadDir, $backupRoot | Out-Null
    if (Test-Path -LiteralPath $stagingRoot) {
        Remove-Item -LiteralPath $stagingRoot -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null

    try {
        Invoke-WebRequest -Uri ([string]$manifest.download_url) -OutFile $archivePath -UseBasicParsing -TimeoutSec 60
    }
    catch {
        Exit-WithCode 20 "[DOWNLOAD_ERROR] Failed to download Data archive: $($_.Exception.Message)"
    }

    $archiveItem = Get-Item -LiteralPath $archivePath
    if ([UInt64]$archiveItem.Length -ne [UInt64]$manifest.archive_size) {
        Exit-WithCode 30 "[CHECKSUM_ERROR] Archive size mismatch. expected=$($manifest.archive_size), actual=$($archiveItem.Length)"
    }

    $hash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($hash -ne ([string]$manifest.archive_sha256).ToLowerInvariant()) {
        Exit-WithCode 30 "[CHECKSUM_ERROR] Archive SHA256 mismatch."
    }

    try {
        Expand-Archive -LiteralPath $archivePath -DestinationPath $stagingRoot -Force
    }
    catch {
        Exit-WithCode 40 "[EXTRACT_ERROR] Failed to extract Data archive: $($_.Exception.Message)"
    }

    $stagedData = Join-Path $stagingRoot "Data"
    if (-not (Test-Path -LiteralPath $stagedData -PathType Container)) {
        Exit-WithCode 40 "[EXTRACT_ERROR] Extracted archive does not contain Data directory."
    }

    $preservePaths = @($manifest.preserve_paths)
    if ($preservePaths.Count -eq 0) {
        $preservePaths = @("Data/UserData.json")
    }

    foreach ($preservePath in $preservePaths) {
        $parts = Convert-ManifestPathToRelativeParts -PathValue ([string]$preservePath)
        if ($parts.Count -eq 0) {
            continue
        }

        $source = Join-Parts -Root $root -Parts $parts
        if (Test-Path -LiteralPath $source -PathType Leaf) {
            $target = Join-Parts -Root $stagingRoot -Parts $parts
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
            Copy-Item -LiteralPath $source -Destination $target -Force
        }
    }

    $dataPath = Join-Path $root "Data"
    $backupPath = Join-Path $backupRoot "Data_$timestamp"
    $movedToBackup = $false

    try {
        if (Test-Path -LiteralPath $dataPath) {
            Move-Item -LiteralPath $dataPath -Destination $backupPath -Force
            $movedToBackup = $true
        }

        Move-Item -LiteralPath $stagedData -Destination $dataPath -Force
        $localManifestPath = Join-Path $dataPath "DataUpdateManifest.json"
        $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $localManifestPath -Encoding UTF8
    }
    catch {
        if ((-not (Test-Path -LiteralPath $dataPath)) -and $movedToBackup -and (Test-Path -LiteralPath $backupPath)) {
            Move-Item -LiteralPath $backupPath -Destination $dataPath -Force
        }
        Exit-WithCode 50 "[APPLY_ERROR] Failed to apply Data update: $($_.Exception.Message)"
    }

    Write-Host "[INFO] Data update applied: $($manifest.data_version)"
    exit 0
}
catch {
    Exit-WithCode 10 "[UNEXPECTED_ERROR] $($_.Exception.Message)"
}

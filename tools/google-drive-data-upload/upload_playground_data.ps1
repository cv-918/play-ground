param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot,

    [string]$Config = "_Local\GoogleDriveDataUpload\config.local.json",

    [switch]$DryRun,

    [switch]$KeepArchive,

    [switch]$PublishTeamData,

    [string]$DataVersion = ""
)

$ErrorActionPreference = "Stop"

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message"
}

function Write-ToolError {
    param(
        [string]$Code,
        [string]$Message
    )
    Write-Host "[$Code] $Message"
}

function Convert-ToRepoRelativePath {
    param(
        [string]$Root,
        [string]$Path
    )

    $rootPath = [System.IO.Path]::GetFullPath($Root).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $rootUri = [System.Uri]::new($rootPath + [System.IO.Path]::DirectorySeparatorChar)
    $pathUri = [System.Uri]::new($fullPath)
    return [System.Uri]::UnescapeDataString($rootUri.MakeRelativeUri($pathUri).ToString()).Replace("/", [System.IO.Path]::DirectorySeparatorChar)
}

function New-ZipSnapshot {
    param(
        [string]$SourcePath,
        [string]$ArchivePath,
        [string[]]$ExcludeEntryNames = @()
    )

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    if (Test-Path $ArchivePath) {
        Remove-Item -LiteralPath $ArchivePath -Force
    }

    $archiveDir = Split-Path -Parent $ArchivePath
    New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null

    $sourceFullPath = [System.IO.Path]::GetFullPath($SourcePath)
    $sourceRoot = $sourceFullPath.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    $sourceUri = [System.Uri]::new($sourceRoot + [System.IO.Path]::DirectorySeparatorChar)
    $files = Get-ChildItem -LiteralPath $sourceFullPath -Recurse -File | Sort-Object FullName
    $excludeSet = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
    foreach ($entryName in $ExcludeEntryNames) {
        if (-not [string]::IsNullOrWhiteSpace($entryName)) {
            $null = $excludeSet.Add(($entryName -replace "\\", "/"))
        }
    }
    $zip = [System.IO.Compression.ZipFile]::Open($ArchivePath, [System.IO.Compression.ZipArchiveMode]::Create)
    $created = 0

    try {
        foreach ($file in $files) {
            $fileUri = [System.Uri]::new($file.FullName)
            $relative = [System.Uri]::UnescapeDataString($sourceUri.MakeRelativeUri($fileUri).ToString())
            $entryName = "Data/$relative"
            if ($excludeSet.Contains($entryName)) {
                continue
            }

            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zip,
                $file.FullName,
                $entryName,
                [System.IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null
            $created++
        }
    }
    finally {
        $zip.Dispose()
    }

    return $created
}

function Get-DefaultDataVersion {
    return Get-Date -Format "yyyy.MM.dd.HHmmss"
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $toolRoot = Join-Path $repo "tools\google-drive-data-upload"
    $configPath = if ([System.IO.Path]::IsPathRooted($Config)) { $Config } else { Join-Path $repo $Config }

    $defaultConfig = [ordered]@{
        drive_folder_id = $null
        source_dir = "PlayGround\Data"
        archive_name_prefix = "PlayGround_Data"
        keep_local_archive = $false
        publish_archive_name = "PlayGround_Data_Latest.zip"
        publish_manifest_name = "PlayGround_Data_Manifest.json"
        preserve_paths = @("Data/UserData.json")
        latest_archive_file_id = $null
        latest_manifest_file_id = $null
    }

    if (Test-Path -LiteralPath $configPath) {
        $rawConfig = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($name in $rawConfig.PSObject.Properties.Name) {
            $defaultConfig[$name] = $rawConfig.$name
        }
    }
    elseif (-not $DryRun) {
        Write-ToolError "CONFIG_ERROR" "Local config not found: $configPath"
        Write-Host "Create it from tools\google-drive-data-upload\config.example.json under _Local\GoogleDriveDataUpload\config.local.json."
        exit 2
    }

    $sourceDir = [string]$defaultConfig["source_dir"]
    if ([string]::IsNullOrWhiteSpace($sourceDir)) {
        $sourceDir = "PlayGround\Data"
    }

    $sourcePath = if ([System.IO.Path]::IsPathRooted($sourceDir)) { $sourceDir } else { Join-Path $repo $sourceDir }
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Container)) {
        Write-ToolError "SOURCE_ERROR" "Data directory not found: $sourcePath"
        exit 3
    }

    $prefix = [string]$defaultConfig["archive_name_prefix"]
    if ([string]::IsNullOrWhiteSpace($prefix)) {
        $prefix = "PlayGround_Data"
    }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $archiveDir = Join-Path $repo "_Temp\GoogleDriveDataUpload\archives"
    $logDir = Join-Path $repo "_Temp\GoogleDriveDataUpload\logs"
    $archiveFileName = if ($PublishTeamData) { [string]$defaultConfig["publish_archive_name"] } else { "$prefix`_$timestamp.zip" }
    if ([string]::IsNullOrWhiteSpace($archiveFileName)) {
        $archiveFileName = if ($PublishTeamData) { "PlayGround_Data_Latest.zip" } else { "$prefix`_$timestamp.zip" }
    }

    $archivePath = Join-Path $archiveDir $archiveFileName
    $fileCount = (Get-ChildItem -LiteralPath $sourcePath -Recurse -File | Measure-Object).Count
    $sourceRelative = Convert-ToRepoRelativePath -Root $repo -Path $sourcePath

    Write-Info "Repository: $repo"
    Write-Info "Source: $sourceRelative"
    Write-Info "Files: $fileCount"
    Write-Info "Archive: $archivePath"

    if ($DryRun) {
        Write-Info "Dry run only. ZIP creation and Google Drive upload were skipped."
        exit 0
    }

    if ([string]::IsNullOrWhiteSpace([string]$defaultConfig["drive_folder_id"])) {
        Write-ToolError "CONFIG_ERROR" "drive_folder_id is required in $configPath"
        exit 2
    }

    try {
        $excludeEntries = @()
        if ($PublishTeamData) {
            $excludeEntries = @($defaultConfig["preserve_paths"])
        }

        $createdCount = New-ZipSnapshot -SourcePath $sourcePath -ArchivePath $archivePath -ExcludeEntryNames $excludeEntries
    }
    catch {
        Write-ToolError "ZIP_ERROR" "Failed to create ZIP snapshot: $($_.Exception.Message)"
        exit 4
    }

    $archiveItem = Get-Item -LiteralPath $archivePath
    Write-Info "ZIP created: $createdCount files, $($archiveItem.Length) bytes"

    New-Item -ItemType Directory -Force -Path $logDir | Out-Null

    $manifestPath = $null
    if ($PublishTeamData) {
        $resolvedDataVersion = if ([string]::IsNullOrWhiteSpace($DataVersion)) { Get-DefaultDataVersion } else { $DataVersion }
        $manifestName = [string]$defaultConfig["publish_manifest_name"]
        if ([string]::IsNullOrWhiteSpace($manifestName)) {
            $manifestName = "PlayGround_Data_Manifest.json"
        }

        $manifestPath = Join-Path $archiveDir $manifestName
        $sha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
        $preservePaths = @($defaultConfig["preserve_paths"])
        if ($preservePaths.Count -eq 0) {
            $preservePaths = @("Data/UserData.json")
        }

        $manifest = [ordered]@{
            schema_version = 1
            data_version = $resolvedDataVersion
            archive_name = $archiveFileName
            archive_size = [UInt64]$archiveItem.Length
            archive_sha256 = $sha256
            download_url = ""
            preserve_paths = $preservePaths
        }
        $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
        Write-Info "Publish manifest prepared: $manifestPath"
    }

    $nodeScript = Join-Path $toolRoot "src\uploadDataSnapshot.js"
    $nodeArgs = @(
        $nodeScript,
        "--repo-root", $repo,
        "--archive", $archivePath,
        "--config", $configPath,
        "--log-dir", $logDir
    )

    if ($PublishTeamData) {
        $nodeArgs += @(
            "--publish",
            "--manifest", $manifestPath,
            "--archive-name", $archiveFileName,
            "--manifest-name", ([string]$defaultConfig["publish_manifest_name"])
        )
    }

    & node @nodeArgs
    $nodeExit = $LASTEXITCODE

    if ($nodeExit -ne 0) {
        exit $nodeExit
    }

    $keepArchiveSetting = [System.Convert]::ToBoolean($defaultConfig["keep_local_archive"])
    if ((-not $KeepArchive) -and (-not $keepArchiveSetting)) {
        Remove-Item -LiteralPath $archivePath -Force
        Write-Info "Local archive removed after successful upload. Use --keep-archive to keep it."
    }
    else {
        Write-Info "Local archive kept: $archivePath"
    }

    exit 0
}
catch {
    Write-ToolError "UNEXPECTED_ERROR" $_.Exception.Message
    exit 1
}

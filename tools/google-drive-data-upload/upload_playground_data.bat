@echo off
setlocal EnableExtensions

REM Google Drive Data Upload Tool
REM Purpose:
REM   Create a ZIP snapshot of PlayGround\Data and upload it to Google Drive.
REM
REM Usage:
REM   tools\google-drive-data-upload\upload_playground_data.bat
REM   tools\google-drive-data-upload\upload_playground_data.bat --dry-run
REM   tools\google-drive-data-upload\upload_playground_data.bat --keep-archive
REM   tools\google-drive-data-upload\upload_playground_data.bat --publish-team-data --data-version 2026.05.15.001
REM   tools\google-drive-data-upload\upload_playground_data.bat --list-backups
REM   tools\google-drive-data-upload\upload_playground_data.bat --rollback --backup-manifest-id DRIVE_FILE_ID
REM   tools\google-drive-data-upload\upload_playground_data.bat --list-archives
REM   tools\google-drive-data-upload\upload_playground_data.bat --cleanup-archive --archive-file-id DRIVE_FILE_ID
REM   tools\google-drive-data-upload\upload_playground_data.bat --config _Local\GoogleDriveDataUpload\config.local.json

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..\..") do set "REPO_ROOT=%%~fI"

set "CONFIG_ARG="
set "DRY_RUN_ARG="
set "KEEP_ARCHIVE_ARG="
set "PUBLISH_ARG="
set "DATA_VERSION_ARG="
set "LIST_BACKUPS_ARG="
set "ROLLBACK_ARG="
set "BACKUP_MANIFEST_ID_ARG="
set "LIST_ARCHIVES_ARG="
set "CLEANUP_ARCHIVE_ARG="
set "ARCHIVE_FILE_ID_ARG="

:parse_args
if "%~1"=="" goto run_tool

if /I "%~1"=="--dry-run" (
    set "DRY_RUN_ARG=-DryRun"
    shift
    goto parse_args
)

if /I "%~1"=="--keep-archive" (
    set "KEEP_ARCHIVE_ARG=-KeepArchive"
    shift
    goto parse_args
)

if /I "%~1"=="--publish-team-data" (
    set "PUBLISH_ARG=-PublishTeamData"
    shift
    goto parse_args
)

if /I "%~1"=="--list-backups" (
    set "LIST_BACKUPS_ARG=-ListBackups"
    shift
    goto parse_args
)

if /I "%~1"=="--rollback" (
    set "ROLLBACK_ARG=-Rollback"
    shift
    goto parse_args
)

if /I "%~1"=="--list-archives" (
    set "LIST_ARCHIVES_ARG=-ListArchives"
    shift
    goto parse_args
)

if /I "%~1"=="--cleanup-archive" (
    set "CLEANUP_ARCHIVE_ARG=-CleanupArchive"
    shift
    goto parse_args
)

if /I "%~1"=="--backup-manifest-id" (
    if "%~2"=="" (
        echo [ARG_ERROR] Missing value for --backup-manifest-id
        exit /b 1
    )
    set "BACKUP_MANIFEST_ID_ARG=-BackupManifestId "%~2""
    shift
    shift
    goto parse_args
)

if /I "%~1"=="--archive-file-id" (
    if "%~2"=="" (
        echo [ARG_ERROR] Missing value for --archive-file-id
        exit /b 1
    )
    set "ARCHIVE_FILE_ID_ARG=-ArchiveFileId "%~2""
    shift
    shift
    goto parse_args
)

if /I "%~1"=="--data-version" (
    if "%~2"=="" (
        echo [ARG_ERROR] Missing value for --data-version
        exit /b 1
    )
    set "DATA_VERSION_ARG=-DataVersion "%~2""
    shift
    shift
    goto parse_args
)

if /I "%~1"=="--config" (
    if "%~2"=="" (
        echo [ARG_ERROR] Missing value for --config
        exit /b 1
    )
    set "CONFIG_ARG=-Config "%~2""
    shift
    shift
    goto parse_args
)

echo [ARG_ERROR] Unknown option: %~1
exit /b 1

:run_tool
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%upload_playground_data.ps1" -RepoRoot "%REPO_ROOT%" %CONFIG_ARG% %DRY_RUN_ARG% %KEEP_ARCHIVE_ARG% %PUBLISH_ARG% %DATA_VERSION_ARG% %LIST_BACKUPS_ARG% %ROLLBACK_ARG% %BACKUP_MANIFEST_ID_ARG% %LIST_ARCHIVES_ARG% %CLEANUP_ARCHIVE_ARG% %ARCHIVE_FILE_ID_ARG%
exit /b %ERRORLEVEL%

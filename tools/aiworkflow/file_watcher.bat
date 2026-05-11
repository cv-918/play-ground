@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow file_watcher.bat
REM Purpose:
REM   Observe changed files, capture git diff snapshots, and link the
REM   observation to EvidenceRecord and ProgressEventLog runtime artifacts.
REM
REM Usage:
REM   tools\aiworkflow\file_watcher.bat status task_id [session_id] [--config path] [--json]
REM   tools\aiworkflow\file_watcher.bat snapshot task_id session_id [evidence_id] [--config path] [--json]
REM   tools\aiworkflow\file_watcher.bat watch task_id session_id [--config path] [--interval-seconds n] [--duration-seconds n] [--max-snapshots n] [--snapshot-on-start] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "TASK_ID="
set "SESSION_ID="
set "EVIDENCE_ID="
set "CONFIG_PATH="
set "INTERVAL_SECONDS=5"
set "DURATION_SECONDS=30"
set "MAX_SNAPSHOTS=20"
set "SNAPSHOT_ON_START="
set "JSON="

if "%COMMAND%"=="" (
    echo [ERROR] Missing command.
    goto :usage
)

if /I not "%COMMAND%"=="status" if /I not "%COMMAND%"=="snapshot" if /I not "%COMMAND%"=="watch" (
    echo [ERROR] Unknown command: %COMMAND%
    goto :usage
)

shift /1

:parse_args
if "%~1"=="" goto :run
if /I "%~1"=="--json" (
    set "JSON=1"
    shift /1
    goto :parse_args
)
if /I "%~1"=="--snapshot-on-start" (
    set "SNAPSHOT_ON_START=1"
    shift /1
    goto :parse_args
)
if /I "%~1"=="--config" (
    if "%~2"=="" (
        echo [ERROR] --config requires a value.
        goto :usage
    )
    set "CONFIG_PATH=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--interval-seconds" (
    if "%~2"=="" (
        echo [ERROR] --interval-seconds requires a value.
        goto :usage
    )
    set "INTERVAL_SECONDS=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--duration-seconds" (
    if "%~2"=="" (
        echo [ERROR] --duration-seconds requires a value.
        goto :usage
    )
    set "DURATION_SECONDS=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--max-snapshots" (
    if "%~2"=="" (
        echo [ERROR] --max-snapshots requires a value.
        goto :usage
    )
    set "MAX_SNAPSHOTS=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if "!TASK_ID!"=="" (
    set "TASK_ID=%~1"
    shift /1
    goto :parse_args
)
if "!SESSION_ID!"=="" (
    set "SESSION_ID=%~1"
    shift /1
    goto :parse_args
)
if /I "%COMMAND%"=="snapshot" if "!EVIDENCE_ID!"=="" (
    set "EVIDENCE_ID=%~1"
    shift /1
    goto :parse_args
)

echo [ERROR] Too many arguments or unknown option: %~1
goto :usage

:run
if "%TASK_ID%"=="" (
    echo [ERROR] task_id is required.
    goto :usage
)

if /I "%COMMAND%"=="snapshot" if "%SESSION_ID%"=="" (
    echo [ERROR] snapshot requires session_id.
    goto :usage
)

if /I "%COMMAND%"=="watch" if "%SESSION_ID%"=="" (
    echo [ERROR] watch requires session_id.
    goto :usage
)

if "%JSON%"=="1" (
    if "%SNAPSHOT_ON_START%"=="1" (
        powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0file_watcher.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -SessionId "!SESSION_ID!" -EvidenceId "!EVIDENCE_ID!" -ConfigPath "!CONFIG_PATH!" -IntervalSeconds "!INTERVAL_SECONDS!" -DurationSeconds "!DURATION_SECONDS!" -MaxSnapshots "!MAX_SNAPSHOTS!" -SnapshotOnStart -Json
        exit /b !ERRORLEVEL!
    )
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0file_watcher.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -SessionId "!SESSION_ID!" -EvidenceId "!EVIDENCE_ID!" -ConfigPath "!CONFIG_PATH!" -IntervalSeconds "!INTERVAL_SECONDS!" -DurationSeconds "!DURATION_SECONDS!" -MaxSnapshots "!MAX_SNAPSHOTS!" -Json
    exit /b !ERRORLEVEL!
)

if "%SNAPSHOT_ON_START%"=="1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0file_watcher.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -SessionId "!SESSION_ID!" -EvidenceId "!EVIDENCE_ID!" -ConfigPath "!CONFIG_PATH!" -IntervalSeconds "!INTERVAL_SECONDS!" -DurationSeconds "!DURATION_SECONDS!" -MaxSnapshots "!MAX_SNAPSHOTS!" -SnapshotOnStart
    exit /b !ERRORLEVEL!
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0file_watcher.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -SessionId "!SESSION_ID!" -EvidenceId "!EVIDENCE_ID!" -ConfigPath "!CONFIG_PATH!" -IntervalSeconds "!INTERVAL_SECONDS!" -DurationSeconds "!DURATION_SECONDS!" -MaxSnapshots "!MAX_SNAPSHOTS!"
exit /b !ERRORLEVEL!

:usage
echo Usage:
echo   tools\aiworkflow\file_watcher.bat status task_id [session_id] [--config path] [--json]
echo   tools\aiworkflow\file_watcher.bat snapshot task_id session_id [evidence_id] [--config path] [--json]
echo   tools\aiworkflow\file_watcher.bat watch task_id session_id [--config path] [--interval-seconds n] [--duration-seconds n] [--max-snapshots n] [--snapshot-on-start] [--json]
exit /b 1

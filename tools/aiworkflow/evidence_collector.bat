@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow evidence_collector.bat
REM Purpose:
REM   Create, read, update, and list EvidenceRecord runtime artifacts.
REM
REM Usage:
REM   tools\aiworkflow\evidence_collector.bat status task_id session_id [--json]
REM   tools\aiworkflow\evidence_collector.bat create task_id session_id [evidence_id] [options] [--json]
REM   tools\aiworkflow\evidence_collector.bat read task_id session_id evidence_id [--json]
REM   tools\aiworkflow\evidence_collector.bat update task_id session_id evidence_id [options] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "TASK_ID="
set "SESSION_ID="
set "EVIDENCE_ID="
set "EXECUTOR="
set "COMMAND_LINE="
set "WORKING_DIRECTORY="
set "STARTED_AT="
set "ENDED_AT="
set "EXIT_CODE="
set "STDOUT_LOG="
set "STDERR_LOG="
set "CHANGED_FILES="
set "DIFF_SNAPSHOT_PATH="
set "JSON="

if "%COMMAND%"=="" (
    echo [ERROR] Missing command.
    goto :usage
)

if /I not "%COMMAND%"=="create" if /I not "%COMMAND%"=="read" if /I not "%COMMAND%"=="update" if /I not "%COMMAND%"=="status" (
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
if /I "%~1"=="--executor" (
    if "%~2"=="" (
        echo [ERROR] --executor requires a value.
        goto :usage
    )
    set "EXECUTOR=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--command-line" (
    if "%~2"=="" (
        echo [ERROR] --command-line requires a value.
        goto :usage
    )
    set "COMMAND_LINE=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--working-directory" (
    if "%~2"=="" (
        echo [ERROR] --working-directory requires a value.
        goto :usage
    )
    set "WORKING_DIRECTORY=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--started-at" (
    if "%~2"=="" (
        echo [ERROR] --started-at requires a value.
        goto :usage
    )
    set "STARTED_AT=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--ended-at" (
    if "%~2"=="" (
        echo [ERROR] --ended-at requires a value.
        goto :usage
    )
    set "ENDED_AT=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--exit-code" (
    if "%~2"=="" (
        echo [ERROR] --exit-code requires a value.
        goto :usage
    )
    set "EXIT_CODE=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--stdout-log" (
    if "%~2"=="" (
        echo [ERROR] --stdout-log requires a value.
        goto :usage
    )
    set "STDOUT_LOG=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--stderr-log" (
    if "%~2"=="" (
        echo [ERROR] --stderr-log requires a value.
        goto :usage
    )
    set "STDERR_LOG=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--changed-files" (
    if "%~2"=="" (
        echo [ERROR] --changed-files requires a value.
        goto :usage
    )
    set "CHANGED_FILES=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--diff-snapshot" (
    if "%~2"=="" (
        echo [ERROR] --diff-snapshot requires a value.
        goto :usage
    )
    set "DIFF_SNAPSHOT_PATH=%~2"
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
if "!EVIDENCE_ID!"=="" (
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

if "%SESSION_ID%"=="" (
    echo [ERROR] session_id is required.
    goto :usage
)

if /I "%COMMAND%"=="read" if "%EVIDENCE_ID%"=="" (
    echo [ERROR] read requires evidence_id.
    goto :usage
)

if /I "%COMMAND%"=="update" if "%EVIDENCE_ID%"=="" (
    echo [ERROR] update requires evidence_id.
    goto :usage
)

if "%JSON%"=="1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0evidence_collector.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -SessionId "!SESSION_ID!" -EvidenceId "!EVIDENCE_ID!" -Executor "!EXECUTOR!" -CommandLine "!COMMAND_LINE!" -WorkingDirectory "!WORKING_DIRECTORY!" -StartedAt "!STARTED_AT!" -EndedAt "!ENDED_AT!" -ExitCode "!EXIT_CODE!" -StdoutLog "!STDOUT_LOG!" -StderrLog "!STDERR_LOG!" -ChangedFiles "!CHANGED_FILES!" -DiffSnapshotPath "!DIFF_SNAPSHOT_PATH!" -Json
    exit /b !ERRORLEVEL!
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0evidence_collector.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -SessionId "!SESSION_ID!" -EvidenceId "!EVIDENCE_ID!" -Executor "!EXECUTOR!" -CommandLine "!COMMAND_LINE!" -WorkingDirectory "!WORKING_DIRECTORY!" -StartedAt "!STARTED_AT!" -EndedAt "!ENDED_AT!" -ExitCode "!EXIT_CODE!" -StdoutLog "!STDOUT_LOG!" -StderrLog "!STDERR_LOG!" -ChangedFiles "!CHANGED_FILES!" -DiffSnapshotPath "!DIFF_SNAPSHOT_PATH!"
exit /b !ERRORLEVEL!

:usage
echo Usage:
echo   tools\aiworkflow\evidence_collector.bat status task_id session_id [--json]
echo   tools\aiworkflow\evidence_collector.bat create task_id session_id [evidence_id] [--executor value] [--command-line text] [--working-directory path] [--started-at iso] [--ended-at iso] [--exit-code n] [--stdout-log path] [--stderr-log path] [--changed-files "a;b"] [--diff-snapshot path] [--json]
echo   tools\aiworkflow\evidence_collector.bat read task_id session_id evidence_id [--json]
echo   tools\aiworkflow\evidence_collector.bat update task_id session_id evidence_id [--executor value] [--command-line text] [--working-directory path] [--started-at iso] [--ended-at iso] [--exit-code n] [--stdout-log path] [--stderr-log path] [--changed-files "a;b"] [--diff-snapshot path] [--json]
exit /b 1

@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow local_cli_adapter.bat
REM Purpose:
REM   Controlled Local CLI execution adapter using allowlisted command_id entries.
REM
REM Usage:
REM   tools\aiworkflow\local_cli_adapter.bat status task_id command_id [--config path] [--json]
REM   tools\aiworkflow\local_cli_adapter.bat dry-run task_id command_id [--config path] [--json]
REM   tools\aiworkflow\local_cli_adapter.bat run task_id command_id --execute [--config path] [--session-id id] [--evidence-id id] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "TASK_ID="
set "COMMAND_ID="
set "CONFIG_PATH="
set "SESSION_ID="
set "EVIDENCE_ID="
set "EXECUTE="
set "JSON="

if "%COMMAND%"=="" (
    echo [ERROR] Missing command.
    goto :usage
)

if /I not "%COMMAND%"=="status" if /I not "%COMMAND%"=="dry-run" if /I not "%COMMAND%"=="run" (
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
if /I "%~1"=="--execute" (
    set "EXECUTE=1"
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
if /I "%~1"=="--session-id" (
    if "%~2"=="" (
        echo [ERROR] --session-id requires a value.
        goto :usage
    )
    set "SESSION_ID=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--evidence-id" (
    if "%~2"=="" (
        echo [ERROR] --evidence-id requires a value.
        goto :usage
    )
    set "EVIDENCE_ID=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if "!TASK_ID!"=="" (
    set "TASK_ID=%~1"
    shift /1
    goto :parse_args
)
if "!COMMAND_ID!"=="" (
    set "COMMAND_ID=%~1"
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
if "%COMMAND_ID%"=="" (
    echo [ERROR] command_id is required.
    goto :usage
)

set "EXTRA="
if "%EXECUTE%"=="1" set "EXTRA=-Execute"

if "%JSON%"=="1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0local_cli_adapter.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -CommandId "!COMMAND_ID!" -ConfigPath "!CONFIG_PATH!" -SessionId "!SESSION_ID!" -EvidenceId "!EVIDENCE_ID!" %EXTRA% -Json
    exit /b !ERRORLEVEL!
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0local_cli_adapter.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -CommandId "!COMMAND_ID!" -ConfigPath "!CONFIG_PATH!" -SessionId "!SESSION_ID!" -EvidenceId "!EVIDENCE_ID!" %EXTRA%
exit /b !ERRORLEVEL!

:usage
echo Usage:
echo   tools\aiworkflow\local_cli_adapter.bat status task_id command_id [--config path] [--json]
echo   tools\aiworkflow\local_cli_adapter.bat dry-run task_id command_id [--config path] [--json]
echo   tools\aiworkflow\local_cli_adapter.bat run task_id command_id --execute [--config path] [--session-id id] [--evidence-id id] [--json]
exit /b 1

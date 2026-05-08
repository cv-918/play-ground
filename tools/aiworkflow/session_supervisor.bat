@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow session_supervisor.bat
REM Purpose:
REM   Create, read, update, and heartbeat runtime SessionState records.
REM
REM Usage:
REM   tools\aiworkflow\session_supervisor.bat status task_id [session_id] [--json]
REM   tools\aiworkflow\session_supervisor.bat create task_id [session_id] [--executor value] [--activity text] [--json]
REM   tools\aiworkflow\session_supervisor.bat read task_id session_id [--json]
REM   tools\aiworkflow\session_supervisor.bat update task_id session_id --status value [--activity text] [--json]
REM   tools\aiworkflow\session_supervisor.bat heartbeat task_id session_id [--status value] [--activity text] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "TASK_ID="
set "SESSION_ID="
set "STATUS_VALUE="
set "ACTIVITY="
set "EXECUTOR_TYPE=manual"
set "JSON="

if "%COMMAND%"=="" (
    echo [ERROR] Missing command.
    goto :usage
)

if /I not "%COMMAND%"=="create" if /I not "%COMMAND%"=="read" if /I not "%COMMAND%"=="update" if /I not "%COMMAND%"=="heartbeat" if /I not "%COMMAND%"=="status" (
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
if /I "%~1"=="--status" (
    if "%~2"=="" (
        echo [ERROR] --status requires a value.
        goto :usage
    )
    set "STATUS_VALUE=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--activity" (
    if "%~2"=="" (
        echo [ERROR] --activity requires a value.
        goto :usage
    )
    set "ACTIVITY=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--executor" (
    if "%~2"=="" (
        echo [ERROR] --executor requires a value.
        goto :usage
    )
    set "EXECUTOR_TYPE=%~2"
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

echo [ERROR] Too many arguments or unknown option: %~1
goto :usage

:run
if "%TASK_ID%"=="" (
    echo [ERROR] task_id is required.
    goto :usage
)

if /I "%COMMAND%"=="read" if "%SESSION_ID%"=="" (
    echo [ERROR] read requires session_id.
    goto :usage
)

if /I "%COMMAND%"=="update" if "%SESSION_ID%"=="" (
    echo [ERROR] update requires session_id.
    goto :usage
)

if /I "%COMMAND%"=="update" if "%STATUS_VALUE%"=="" (
    echo [ERROR] update requires --status.
    goto :usage
)

if /I "%COMMAND%"=="heartbeat" if "%SESSION_ID%"=="" (
    echo [ERROR] heartbeat requires session_id.
    goto :usage
)

if "%JSON%"=="1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0session_supervisor.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -SessionId "!SESSION_ID!" -Status "!STATUS_VALUE!" -Activity "!ACTIVITY!" -ExecutorType "!EXECUTOR_TYPE!" -Json
    exit /b !ERRORLEVEL!
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0session_supervisor.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -SessionId "!SESSION_ID!" -Status "!STATUS_VALUE!" -Activity "!ACTIVITY!" -ExecutorType "!EXECUTOR_TYPE!"
exit /b !ERRORLEVEL!

:usage
echo Usage:
echo   tools\aiworkflow\session_supervisor.bat status task_id [session_id] [--json]
echo   tools\aiworkflow\session_supervisor.bat create task_id [session_id] [--executor value] [--activity text] [--json]
echo   tools\aiworkflow\session_supervisor.bat read task_id session_id [--json]
echo   tools\aiworkflow\session_supervisor.bat update task_id session_id --status value [--activity text] [--json]
echo   tools\aiworkflow\session_supervisor.bat heartbeat task_id session_id [--status value] [--activity text] [--json]
exit /b 1

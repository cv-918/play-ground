@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow result_collector.bat
REM Usage:
REM   tools\aiworkflow\result_collector.bat status task_id [--json]
REM   tools\aiworkflow\result_collector.bat collect task_id [session_id] [result_id] [--json]
REM   tools\aiworkflow\result_collector.bat read task_id [result_id] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
set "SCRIPT_DIR=%~dp0"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "TASK_ID="
set "SESSION_ID="
set "RESULT_ID="
set "JSON="

if "%COMMAND%"=="" (
    echo [ERROR] Missing command.
    goto :usage
)

if /I not "%COMMAND%"=="status" if /I not "%COMMAND%"=="collect" if /I not "%COMMAND%"=="read" (
    echo [ERROR] Unknown command: %COMMAND%
    goto :usage
)

shift

:parse_args
if "%~1"=="" goto :run
if /I "%~1"=="--json" (
    set "JSON=1"
    shift
    goto :parse_args
)

if "!TASK_ID!"=="" (
    set "TASK_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="collect" if "!SESSION_ID!"=="" (
    set "SESSION_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="collect" if "!RESULT_ID!"=="" (
    set "RESULT_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="read" if "!RESULT_ID!"=="" (
    set "RESULT_ID=%~1"
    shift
    goto :parse_args
)

echo [ERROR] Too many arguments or unknown option: %~1
goto :usage

:run
if "%TASK_ID%"=="" (
    echo [ERROR] task_id is required.
    goto :usage
)

if "%JSON%"=="1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%result_collector.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -SessionId "!SESSION_ID!" -ResultId "!RESULT_ID!" -Json
    exit /b !ERRORLEVEL!
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%result_collector.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -SessionId "!SESSION_ID!" -ResultId "!RESULT_ID!"
exit /b !ERRORLEVEL!

:usage
echo Usage:
echo   tools\aiworkflow\result_collector.bat status task_id [--json]
echo   tools\aiworkflow\result_collector.bat collect task_id [session_id] [result_id] [--json]
echo   tools\aiworkflow\result_collector.bat read task_id [result_id] [--json]
exit /b 1

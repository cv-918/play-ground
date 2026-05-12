@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow pc_runner.bat
REM Usage:
REM   tools\aiworkflow\pc_runner.bat status task_id [--json]
REM   tools\aiworkflow\pc_runner.bat plan task_id [--profile profile] [--executor executor] [--json]
REM   tools\aiworkflow\pc_runner.bat start task_id [--profile profile] [--executor executor] [--json]
REM   tools\aiworkflow\pc_runner.bat continue task_id [--runner-run-id id] [--json]
REM   tools\aiworkflow\pc_runner.bat stop task_id [--runner-run-id id] [--json]
REM   tools\aiworkflow\pc_runner.bat read task_id [--runner-run-id id] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
set "SCRIPT_DIR=%~dp0"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "TASK_ID="
set "PROFILE="
set "EXECUTOR="
set "RUNNER_RUN_ID="
set "JSON="

if "%COMMAND%"=="" (
    echo [ERROR] Missing command.
    goto :usage
)

if /I not "%COMMAND%"=="status" if /I not "%COMMAND%"=="plan" if /I not "%COMMAND%"=="start" if /I not "%COMMAND%"=="continue" if /I not "%COMMAND%"=="stop" if /I not "%COMMAND%"=="read" (
    echo [ERROR] Unknown command: %COMMAND%
    goto :usage
)

shift

:parse_args
if "%~1"=="" goto :run
set "ARG=%~1"

if /I "!ARG!"=="--json" (
    set "JSON=-Json"
    shift
    goto :parse_args
)

if /I "!ARG!"=="--profile" (
    goto :parse_profile
)

if /I "!ARG!"=="--executor" (
    goto :parse_executor
)

if /I "!ARG!"=="--runner-run-id" (
    goto :parse_runner_run_id
)

if "%TASK_ID%"=="" (
    set "TASK_ID=%~1"
    shift
    goto :parse_args
)

if /I "!ARG:~0,11!"=="runner-run-" (
    set "RUNNER_RUN_ID=%~1"
    shift
    goto :parse_args
)

echo [ERROR] Unexpected argument: %~1
goto :usage

:parse_profile
shift
if "%~1"=="" (
    echo [ERROR] Missing value for --profile.
    goto :usage
)
set "PROFILE=%~1"
shift
goto :parse_args

:parse_executor
shift
if "%~1"=="" (
    echo [ERROR] Missing value for --executor.
    goto :usage
)
set "EXECUTOR=%~1"
shift
goto :parse_args

:parse_runner_run_id
shift
if "%~1"=="" (
    echo [ERROR] Missing value for --runner-run-id.
    goto :usage
)
set "RUNNER_RUN_ID=%~1"
shift
goto :parse_args

:run
if "%TASK_ID%"=="" (
    echo [ERROR] Missing task_id.
    goto :usage
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%pc_runner.ps1" -Command "%COMMAND%" -TaskId "%TASK_ID%" -Profile "%PROFILE%" -Executor "%EXECUTOR%" -RunnerRunId "%RUNNER_RUN_ID%" -RepoRoot "%REPO_ROOT%" %JSON%
exit /b %ERRORLEVEL%

:usage
echo Usage:
echo   tools\aiworkflow\pc_runner.bat status task_id [--json]
echo   tools\aiworkflow\pc_runner.bat plan task_id [--profile profile] [--executor executor] [--json]
echo   tools\aiworkflow\pc_runner.bat start task_id [--profile profile] [--executor executor] [--json]
echo   tools\aiworkflow\pc_runner.bat continue task_id [--runner-run-id id] [--json]
echo   tools\aiworkflow\pc_runner.bat stop task_id [--runner-run-id id] [--json]
echo   tools\aiworkflow\pc_runner.bat read task_id [--runner-run-id id] [--json]
exit /b 1

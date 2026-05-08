@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow task_workspace_manager.bat
REM Purpose:
REM   Create, read, and inspect task_id-linked runtime workspaces.
REM
REM Usage:
REM   tools\aiworkflow\task_workspace_manager.bat status [task_id] [--json]
REM   tools\aiworkflow\task_workspace_manager.bat create task_id [--json]
REM   tools\aiworkflow\task_workspace_manager.bat read task_id [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "TASK_ID="
set "JSON="

if "%COMMAND%"=="" (
    echo [ERROR] Missing command.
    goto :usage
)

if /I not "%COMMAND%"=="create" if /I not "%COMMAND%"=="read" if /I not "%COMMAND%"=="status" (
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
if not "!TASK_ID!"=="" (
    echo [ERROR] Too many task ids or unknown argument: %~1
    goto :usage
)
set "TASK_ID=%~1"
shift /1
goto :parse_args

:run
if /I "%COMMAND%"=="create" if "%TASK_ID%"=="" (
    echo [ERROR] create requires task_id.
    goto :usage
)

if /I "%COMMAND%"=="read" if "%TASK_ID%"=="" (
    echo [ERROR] read requires task_id.
    goto :usage
)

if "%JSON%"=="1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0task_workspace_manager.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "%TASK_ID%" -Json
    exit /b !ERRORLEVEL!
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0task_workspace_manager.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "%TASK_ID%"
exit /b !ERRORLEVEL!

:usage
echo Usage:
echo   tools\aiworkflow\task_workspace_manager.bat status [task_id] [--json]
echo   tools\aiworkflow\task_workspace_manager.bat create task_id [--json]
echo   tools\aiworkflow\task_workspace_manager.bat read task_id [--json]
exit /b 1

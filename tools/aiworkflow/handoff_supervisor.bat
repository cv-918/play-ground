@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow handoff_supervisor.bat
REM Usage:
REM   tools\aiworkflow\handoff_supervisor.bat status [--json]
REM   tools\aiworkflow\handoff_supervisor.bat scan [--role Role] [--json]
REM   tools\aiworkflow\handoff_supervisor.bat write-docs [--execute] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
set "SCRIPT_DIR=%~dp0"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "ROLE="
set "JSON="
set "EXECUTE="

if "%COMMAND%"=="" (
    echo [ERROR] Missing command.
    goto :usage
)

if /I not "%COMMAND%"=="status" if /I not "%COMMAND%"=="scan" if /I not "%COMMAND%"=="write-docs" (
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

if /I "!ARG!"=="--execute" (
    set "EXECUTE=-Execute"
    shift
    goto :parse_args
)

if /I "!ARG!"=="--role" goto :parse_role

echo [ERROR] Unexpected argument: %~1
goto :usage

:parse_role
shift
if "%~1"=="" (
    echo [ERROR] Missing value for --role.
    goto :usage
)
set "ROLE=%~1"
shift
goto :parse_args

:run
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%handoff_supervisor.ps1" -Command "%COMMAND%" -RepoRoot "%REPO_ROOT%" -Role "%ROLE%" %EXECUTE% %JSON%
exit /b %ERRORLEVEL%

:usage
echo Usage:
echo   tools\aiworkflow\handoff_supervisor.bat status [--json]
echo   tools\aiworkflow\handoff_supervisor.bat scan [--role Role] [--json]
echo   tools\aiworkflow\handoff_supervisor.bat write-docs [--execute] [--json]
exit /b 1

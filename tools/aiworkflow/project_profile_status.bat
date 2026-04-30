@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow project_profile_status.bat
REM Purpose:
REM   Read project profile JSON files and print a safe project summary.
REM
REM Usage:
REM   tools\aiworkflow\project_profile_status.bat
REM   tools\aiworkflow\project_profile_status.bat --project dustland_custom_cpp_prototype
REM   tools\aiworkflow\project_profile_status.bat --project unity_project_template
REM   tools\aiworkflow\project_profile_status.bat --list
REM   tools\aiworkflow\project_profile_status.bat --json
REM   tools\aiworkflow\project_profile_status.bat --project unity_project_template --json
REM
REM Default behavior:
REM   If --project is omitted, the script resolves the active project from:
REM   _Docs\AIWorkflow\ActiveProject.json

set "SCRIPT_DIR=%~dp0"

for %%I in ("%SCRIPT_DIR%..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "PROJECT_ID="
set "JSON_ARG="
set "LIST_ARG="

:parse_args
if "%~1"=="" goto run_script

if /I "%~1"=="--json" (
    set "JSON_ARG=-Json"
    shift
    goto parse_args
)

if /I "%~1"=="--list" (
    set "LIST_ARG=-List"
    shift
    goto parse_args
)

if /I "%~1"=="--project" (
    if "%~2"=="" (
        echo [ERROR] --project requires a project id.
        exit /b 1
    )
    set "PROJECT_ID=%~2"
    shift
    shift
    goto parse_args
)

echo [ERROR] Unknown argument: %~1
echo Usage:
echo   tools\aiworkflow\project_profile_status.bat
echo   tools\aiworkflow\project_profile_status.bat --project dustland_custom_cpp_prototype
echo   tools\aiworkflow\project_profile_status.bat --project unity_project_template
echo   tools\aiworkflow\project_profile_status.bat --list
echo   tools\aiworkflow\project_profile_status.bat --json
exit /b 1

:run_script
if "%PROJECT_ID%"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%project_profile_status.ps1" -RepoRoot "%REPO_ROOT%" %JSON_ARG% %LIST_ARG%
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%project_profile_status.ps1" -RepoRoot "%REPO_ROOT%" -ProjectId "%PROJECT_ID%" %JSON_ARG% %LIST_ARG%
)
exit /b %ERRORLEVEL%

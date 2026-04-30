@echo off
setlocal EnableExtensions

REM AIWorkflow workflow_status.bat
REM Purpose:
REM   Print a read-only workflow summary for local use and future Discord status commands.
REM
REM Usage:
REM   tools\aiworkflow\workflow_status.bat
REM   tools\aiworkflow\workflow_status.bat --json

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

if /I "%~1"=="--json" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0workflow_status.ps1" -RepoRoot "%REPO_ROOT%" -Json
    exit /b %ERRORLEVEL%
)

if not "%~1"=="" (
    echo [ERROR] Unknown argument: %~1
    echo Usage:
    echo   tools\aiworkflow\workflow_status.bat
    echo   tools\aiworkflow\workflow_status.bat --json
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0workflow_status.ps1" -RepoRoot "%REPO_ROOT%"
exit /b %ERRORLEVEL%

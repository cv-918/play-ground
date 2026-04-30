@echo off
setlocal EnableExtensions

REM AIWorkflow json_smoke_check.bat
REM Purpose:
REM   Parse JSON files under PlayGround\Data and report failures.
REM
REM Usage:
REM   tools\aiworkflow\json_smoke_check.bat
REM   tools\aiworkflow\json_smoke_check.bat PlayGround\Data

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "DATA_DIR=PlayGround\Data"
if not "%~1"=="" set "DATA_DIR=%~1"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0json_smoke_check.ps1" -RepoRoot "%REPO_ROOT%" -DataDir "%DATA_DIR%"
exit /b %ERRORLEVEL%

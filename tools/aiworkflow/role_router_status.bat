@echo off
setlocal EnableExtensions

REM AIWorkflow role_router_status.bat
REM Purpose:
REM   Read ActiveTask.md and AIWorkflow policy documents, then recommend roles,
REM   gates, validation checks, and the next manual action.
REM
REM Usage:
REM   tools\aiworkflow\role_router_status.bat
REM   tools\aiworkflow\role_router_status.bat --json

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

if /I "%~1"=="--json" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0role_router_status.ps1" -RepoRoot "%REPO_ROOT%" -Json
    exit /b %ERRORLEVEL%
)

if not "%~1"=="" (
    echo [ERROR] Unknown argument: %~1
    echo Usage:
    echo   tools\aiworkflow\role_router_status.bat
    echo   tools\aiworkflow\role_router_status.bat --json
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0role_router_status.ps1" -RepoRoot "%REPO_ROOT%"
exit /b %ERRORLEVEL%

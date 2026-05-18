@echo off
setlocal EnableExtensions

REM AIWorkflow studio_dashboard_export.bat
REM Purpose:
REM   Export a read-only AIWorkflow Studio dashboard HTML snapshot under _Temp.
REM
REM Usage:
REM   tools\aiworkflow\studio_dashboard_export.bat [--json]
REM   tools\aiworkflow\studio_dashboard_export.bat --output _Temp\AIWorkflowStudio\dashboard\studio_dashboard.html

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0studio_dashboard_export.ps1" -RepoRoot "%REPO_ROOT%" %*
exit /b %ERRORLEVEL%

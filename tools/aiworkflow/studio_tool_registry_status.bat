@echo off
setlocal EnableExtensions

REM AIWorkflow studio_tool_registry_status.bat
REM Purpose:
REM   Inspect and validate AIWorkflow Studio tool adapter registry.
REM
REM Usage:
REM   tools\aiworkflow\studio_tool_registry_status.bat status [--json]
REM   tools\aiworkflow\studio_tool_registry_status.bat validate [--json]
REM   tools\aiworkflow\studio_tool_registry_status.bat list [--json]
REM   tools\aiworkflow\studio_tool_registry_status.bat adapter <adapter_id> [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0studio_tool_registry_status.ps1" -RepoRoot "%REPO_ROOT%" %*
exit /b %ERRORLEVEL%

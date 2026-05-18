@echo off
setlocal EnableExtensions

REM AIWorkflow studio_registry_status.bat
REM Purpose:
REM   Read the AIWorkflow Studio department/staff registries and print a
REM   read-only status, validation summary, or selected registry detail.
REM
REM Usage:
REM   tools\aiworkflow\studio_registry_status.bat
REM   tools\aiworkflow\studio_registry_status.bat status [--json]
REM   tools\aiworkflow\studio_registry_status.bat validate [--json]
REM   tools\aiworkflow\studio_registry_status.bat departments [--json]
REM   tools\aiworkflow\studio_registry_status.bat department <department_id> [--json]
REM   tools\aiworkflow\studio_registry_status.bat staff [--json]
REM   tools\aiworkflow\studio_registry_status.bat staff <agent_id> [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0studio_registry_status.ps1" -RepoRoot "%REPO_ROOT%" %*
exit /b %ERRORLEVEL%

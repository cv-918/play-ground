@echo off
setlocal EnableExtensions

REM AIWorkflow studio_conditional_automation.bat
REM Purpose:
REM   Evaluate, test, replay, and repair-plan Studio conditional automation
REM   policy decisions. Writes require --execute and are limited to _Temp.
REM
REM Usage:
REM   tools\aiworkflow\studio_conditional_automation.bat status [--json]
REM   tools\aiworkflow\studio_conditional_automation.bat validate [cases_json_path] [--json]
REM   tools\aiworkflow\studio_conditional_automation.bat test [cases_json_path] [--execute] [--json]
REM   tools\aiworkflow\studio_conditional_automation.bat replay <evaluation_json_path> [--json]
REM   tools\aiworkflow\studio_conditional_automation.bat repair-plan <evaluation_json_path> [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0studio_conditional_automation.ps1" -RepoRoot "%REPO_ROOT%" %*
exit /b %ERRORLEVEL%

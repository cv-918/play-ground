@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%..\.."

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%game009_schema_field_decision_check.ps1" -RepoRoot "%REPO_ROOT%"
exit /b %ERRORLEVEL%

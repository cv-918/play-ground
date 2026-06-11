@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%..\.."

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%game007c_duplicate_policy_anchor_check.ps1" -RepoRoot "%REPO_ROOT%"
exit /b %ERRORLEVEL%

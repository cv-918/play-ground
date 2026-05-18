@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%studio_staff_prompt_exporter.ps1" -RepoRoot "%SCRIPT_DIR%..\.." %*
exit /b %ERRORLEVEL%

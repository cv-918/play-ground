@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%studio_smoke_check.ps1" %*
exit /b %ERRORLEVEL%

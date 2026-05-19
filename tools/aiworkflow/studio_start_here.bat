@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0studio_start_here.ps1" %*
exit /b %ERRORLEVEL%

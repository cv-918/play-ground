@echo off
setlocal

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install_startup_task.ps1"
exit /b %ERRORLEVEL%

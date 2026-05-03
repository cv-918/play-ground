@echo off
setlocal

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start_bot.ps1"
exit /b %ERRORLEVEL%

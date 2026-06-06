@echo off
setlocal
node "%~dp0studio_safe_smoke_runner.js" %*
exit /b %ERRORLEVEL%

@echo off
setlocal
node "%~dp0studio_execution_request_planner.js" %*
exit /b %ERRORLEVEL%

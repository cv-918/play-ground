@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
node "%SCRIPT_DIR%studio_director_console_server.js" --repo-root "%SCRIPT_DIR%..\.." %*
exit /b %ERRORLEVEL%

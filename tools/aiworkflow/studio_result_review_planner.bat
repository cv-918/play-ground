@echo off
setlocal
node "%~dp0studio_result_review_planner.js" %*
exit /b %ERRORLEVEL%

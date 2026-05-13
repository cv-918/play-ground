@echo off
setlocal EnableExtensions

REM AIWorkflow game_data_loader_readability_check.bat
REM Purpose:
REM   Validate the JSON files expected by GameDataLoader without modifying game source or data.
REM
REM Usage:
REM   tools\aiworkflow\game_data_loader_readability_check.bat
REM   tools\aiworkflow\game_data_loader_readability_check.bat PlayGround\Data

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "DATA_DIR=PlayGround\Data"
if not "%~1"=="" set "DATA_DIR=%~1"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0game_data_loader_readability_check.ps1" -RepoRoot "%REPO_ROOT%" -DataDir "%DATA_DIR%"
exit /b %ERRORLEVEL%

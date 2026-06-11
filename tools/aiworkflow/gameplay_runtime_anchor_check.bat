@echo off
setlocal EnableExtensions

REM AIWorkflow gameplay_runtime_anchor_check.bat
REM Purpose:
REM   Validate VAL-001 gameplay runtime source anchors without booting the game
REM   runtime and without reading or writing PlayGround\Data\UserData.json.
REM
REM Usage:
REM   tools\aiworkflow\gameplay_runtime_anchor_check.bat

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

if not "%~1"=="" (
    echo [ERROR] Unknown argument: %~1
    echo Usage:
    echo   tools\aiworkflow\gameplay_runtime_anchor_check.bat
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gameplay_runtime_anchor_check.ps1" -RepoRoot "%REPO_ROOT%"
exit /b %ERRORLEVEL%

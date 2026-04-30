@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow capture_diff.bat
REM Purpose:
REM   Capture review-ready diff files.
REM
REM Usage:
REM   tools\aiworkflow\capture_diff.bat
REM   tools\aiworkflow\capture_diff.bat --include-untracked
REM   tools\aiworkflow\capture_diff.bat --staged
REM
REM Notes:
REM   - Default mode captures unstaged tracked diff only.
REM   - --include-untracked runs git add -N for all current untracked files
REM     so their contents appear in git diff. This changes index metadata only.
REM   - --staged captures git diff --cached.

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "MODE=default"
if /I "%~1"=="--include-untracked" set "MODE=include-untracked"
if /I "%~1"=="--staged" set "MODE=staged"

if not "%~2"=="" (
    echo [ERROR] Too many arguments.
    echo Usage:
    echo   tools\aiworkflow\capture_diff.bat
    echo   tools\aiworkflow\capture_diff.bat --include-untracked
    echo   tools\aiworkflow\capture_diff.bat --staged
    exit /b 1
)

echo ============================================================
echo AIWorkflow Capture Diff
echo Mode: %MODE%
echo ============================================================
echo.

if "%MODE%"=="include-untracked" (
    echo [INFO] Marking untracked files with intent-to-add so git diff includes file contents.
    echo [INFO] This is equivalent to: git add -N ^<untracked_file^>
    echo.
    for /f "delims=" %%F in ('git ls-files --others --exclude-standard') do (
        echo [ADD-N] %%F
        git add -N -- "%%F"
        if errorlevel 1 (
            echo [ERROR] git add -N failed for: %%F
            exit /b 1
        )
    )
    echo.
)

for /f %%T in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%T"

set "OUT_DIR=_Temp\AIWorkflowDiffs"
if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

set "DIFF_FILE=%OUT_DIR%\review_diff_%TS%.diff"
set "STATUS_FILE=%OUT_DIR%\review_status_%TS%.txt"
set "CHECK_FILE=%OUT_DIR%\review_diff_check_%TS%.txt"

echo [INFO] Writing status to: %STATUS_FILE%
(
    echo AIWorkflow Review Status
    echo Timestamp: %TS%
    echo Mode: %MODE%
    echo.
    echo [Repository Root]
    git rev-parse --show-toplevel
    echo.
    echo [Branch]
    git branch --show-current
    echo.
    echo [git status --short]
    git status --short
    echo.
    echo [git diff --stat]
    git diff --stat
    echo.
    echo [git diff --cached --stat]
    git diff --cached --stat
) > "%STATUS_FILE%"

echo [INFO] Writing diff to: %DIFF_FILE%
if "%MODE%"=="staged" (
    git diff --cached > "%DIFF_FILE%"
) else (
    git diff > "%DIFF_FILE%"
)

echo [INFO] Writing diff check to: %CHECK_FILE%
git diff --check > "%CHECK_FILE%"
if errorlevel 1 (
    echo [WARN] git diff --check reported issues. See: %CHECK_FILE%
) else (
    echo [OK] git diff --check passed.
)

echo.
echo ============================================================
echo Capture complete.
echo Status: %STATUS_FILE%
echo Diff:   %DIFF_FILE%
echo Check:  %CHECK_FILE%
echo ============================================================
echo.
echo [NEXT]
echo Upload the diff file for review or inspect it locally.
exit /b 0

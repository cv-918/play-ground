@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow diff_analyzer.bat
REM Usage:
REM   tools\aiworkflow\diff_analyzer.bat status task_id [--json]
REM   tools\aiworkflow\diff_analyzer.bat analyze task_id [result_id] [analysis_id] [--json]
REM   tools\aiworkflow\diff_analyzer.bat read task_id [analysis_id] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
set "SCRIPT_DIR=%~dp0"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "TASK_ID="
set "RESULT_ID="
set "ANALYSIS_ID="
set "JSON="

if "%COMMAND%"=="" (
    echo [ERROR] Missing command.
    goto :usage
)

if /I not "%COMMAND%"=="status" if /I not "%COMMAND%"=="analyze" if /I not "%COMMAND%"=="read" (
    echo [ERROR] Unknown command: %COMMAND%
    goto :usage
)

shift

:parse_args
if "%~1"=="" goto :run
if /I "%~1"=="--json" (
    set "JSON=1"
    shift
    goto :parse_args
)

if "!TASK_ID!"=="" (
    set "TASK_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="analyze" if "!RESULT_ID!"=="" (
    set "RESULT_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="analyze" if "!ANALYSIS_ID!"=="" (
    set "ANALYSIS_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="read" if "!ANALYSIS_ID!"=="" (
    set "ANALYSIS_ID=%~1"
    shift
    goto :parse_args
)

echo [ERROR] Too many arguments or unknown option: %~1
goto :usage

:run
if "%TASK_ID%"=="" (
    echo [ERROR] task_id is required.
    goto :usage
)

if "%JSON%"=="1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%diff_analyzer.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -ResultId "!RESULT_ID!" -AnalysisId "!ANALYSIS_ID!" -Json
    exit /b !ERRORLEVEL!
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%diff_analyzer.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -ResultId "!RESULT_ID!" -AnalysisId "!ANALYSIS_ID!"
exit /b !ERRORLEVEL!

:usage
echo Usage:
echo   tools\aiworkflow\diff_analyzer.bat status task_id [--json]
echo   tools\aiworkflow\diff_analyzer.bat analyze task_id [result_id] [analysis_id] [--json]
echo   tools\aiworkflow\diff_analyzer.bat read task_id [analysis_id] [--json]
exit /b 1

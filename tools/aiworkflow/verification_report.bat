@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow verification_report.bat
REM Usage:
REM   tools\aiworkflow\verification_report.bat status task_id [--json]
REM   tools\aiworkflow\verification_report.bat generate task_id [--result-id id] [--analysis-id id] [--build-test-id id] [--report-id id] [--json]
REM   tools\aiworkflow\verification_report.bat read task_id [report_id] [--json]

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
set "BUILD_TEST_ID="
set "REPORT_ID="
set "JSON="

if "%COMMAND%"=="" (
    echo [ERROR] Missing command.
    goto :usage
)

if /I not "%COMMAND%"=="status" if /I not "%COMMAND%"=="generate" if /I not "%COMMAND%"=="read" (
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
if /I "%~1"=="--result-id" (
    if "%~2"=="" (
        echo [ERROR] --result-id requires an id.
        goto :usage
    )
    set "RESULT_ID=%~2"
    shift
    shift
    goto :parse_args
)
if /I "%~1"=="--analysis-id" (
    if "%~2"=="" (
        echo [ERROR] --analysis-id requires an id.
        goto :usage
    )
    set "ANALYSIS_ID=%~2"
    shift
    shift
    goto :parse_args
)
if /I "%~1"=="--build-test-id" (
    if "%~2"=="" (
        echo [ERROR] --build-test-id requires an id.
        goto :usage
    )
    set "BUILD_TEST_ID=%~2"
    shift
    shift
    goto :parse_args
)
if /I "%~1"=="--report-id" (
    if "%~2"=="" (
        echo [ERROR] --report-id requires an id.
        goto :usage
    )
    set "REPORT_ID=%~2"
    shift
    shift
    goto :parse_args
)

if "!TASK_ID!"=="" (
    set "TASK_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="read" if "!REPORT_ID!"=="" (
    set "REPORT_ID=%~1"
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

set "JSON_ARG="
if "%JSON%"=="1" set "JSON_ARG=-Json"

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%verification_report.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -ResultId "!RESULT_ID!" -AnalysisId "!ANALYSIS_ID!" -BuildTestId "!BUILD_TEST_ID!" -ReportId "!REPORT_ID!" !JSON_ARG!
exit /b !ERRORLEVEL!

:usage
echo Usage:
echo   tools\aiworkflow\verification_report.bat status task_id [--json]
echo   tools\aiworkflow\verification_report.bat generate task_id [--result-id id] [--analysis-id id] [--build-test-id id] [--report-id id] [--json]
echo   tools\aiworkflow\verification_report.bat read task_id [report_id] [--json]
exit /b 1

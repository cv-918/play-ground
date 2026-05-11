@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow completion_report.bat
REM Usage:
REM   tools\aiworkflow\completion_report.bat status task_id [--json]
REM   tools\aiworkflow\completion_report.bat generate task_id [verification_report_id] [completion_report_id] [--json]
REM   tools\aiworkflow\completion_report.bat read task_id [completion_report_id] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
set "SCRIPT_DIR=%~dp0"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "TASK_ID="
set "VERIFICATION_REPORT_ID="
set "COMPLETION_REPORT_ID="
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
set "ARG=%~1"

if /I "!ARG!"=="--json" (
    set "JSON=-Json"
    shift
    goto :parse_args
)

if /I "!ARG!"=="--verification-report-id" (
    shift
    set "VERIFICATION_REPORT_ID=%~1"
    shift
    goto :parse_args
)

if /I "!ARG!"=="--completion-report-id" (
    shift
    set "COMPLETION_REPORT_ID=%~1"
    shift
    goto :parse_args
)

if "%TASK_ID%"=="" (
    set "TASK_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="generate" if /I "!ARG:~0,13!"=="verification-" (
    set "VERIFICATION_REPORT_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="generate" if /I "!ARG:~0,11!"=="completion-" (
    set "COMPLETION_REPORT_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="read" if /I "!ARG:~0,11!"=="completion-" (
    set "COMPLETION_REPORT_ID=%~1"
    shift
    goto :parse_args
)

if "%COMPLETION_REPORT_ID%"=="" (
    set "COMPLETION_REPORT_ID=%~1"
    shift
    goto :parse_args
)

echo [ERROR] Unexpected argument: %~1
goto :usage

:run
if "%TASK_ID%"=="" (
    echo [ERROR] Missing task_id.
    goto :usage
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%completion_report.ps1" -Command "%COMMAND%" -TaskId "%TASK_ID%" -VerificationReportId "%VERIFICATION_REPORT_ID%" -CompletionReportId "%COMPLETION_REPORT_ID%" -RepoRoot "%REPO_ROOT%" %JSON%
exit /b %ERRORLEVEL%

:usage
echo Usage:
echo   tools\aiworkflow\completion_report.bat status task_id [--json]
echo   tools\aiworkflow\completion_report.bat generate task_id [verification_report_id] [completion_report_id] [--json]
echo   tools\aiworkflow\completion_report.bat read task_id [completion_report_id] [--json]
exit /b 1

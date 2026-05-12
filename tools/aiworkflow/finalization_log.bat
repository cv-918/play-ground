@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow finalization_log.bat
REM Usage:
REM   tools\aiworkflow\finalization_log.bat status task_id [--json]
REM   tools\aiworkflow\finalization_log.bat record task_id decision [completion_report_id] [approval_record_id] [finalization_log_id] [actor] [--json]
REM   tools\aiworkflow\finalization_log.bat read task_id [finalization_log_id] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
set "SCRIPT_DIR=%~dp0"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "TASK_ID="
set "DECISION="
set "COMPLETION_REPORT_ID="
set "APPROVAL_RECORD_ID="
set "FINALIZATION_LOG_ID="
set "DECISION_BY="
set "JSON="

if "%COMMAND%"=="" (
    echo [ERROR] Missing command.
    goto :usage
)

if /I not "%COMMAND%"=="status" if /I not "%COMMAND%"=="record" if /I not "%COMMAND%"=="read" (
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

if "%TASK_ID%"=="" (
    set "TASK_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="record" if "%DECISION%"=="" (
    set "DECISION=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="record" if /I "!ARG:~0,11!"=="completion-" (
    set "COMPLETION_REPORT_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="record" if /I "!ARG:~0,9!"=="approval-" (
    set "APPROVAL_RECORD_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="record" if /I "!ARG:~0,13!"=="finalization-" (
    set "FINALIZATION_LOG_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="record" if /I "!ARG:~0,6!"=="actor_" (
    set "DECISION_BY=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="read" if /I "!ARG:~0,13!"=="finalization-" (
    set "FINALIZATION_LOG_ID=%~1"
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

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%finalization_log.ps1" -Command "%COMMAND%" -TaskId "%TASK_ID%" -Decision "%DECISION%" -CompletionReportId "%COMPLETION_REPORT_ID%" -ApprovalRecordId "%APPROVAL_RECORD_ID%" -FinalizationLogId "%FINALIZATION_LOG_ID%" -DecisionBy "%DECISION_BY%" -RepoRoot "%REPO_ROOT%" %JSON%
exit /b %ERRORLEVEL%

:usage
echo Usage:
echo   tools\aiworkflow\finalization_log.bat status task_id [--json]
echo   tools\aiworkflow\finalization_log.bat record task_id decision [completion_report_id] [approval_record_id] [finalization_log_id] [actor] [--json]
echo   tools\aiworkflow\finalization_log.bat read task_id [finalization_log_id] [--json]
echo Decisions: accept_completion, accept_with_concerns, reject_completion, request_changes, defer_completion
exit /b 1

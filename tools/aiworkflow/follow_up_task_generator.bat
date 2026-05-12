@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow follow_up_task_generator.bat
REM Usage:
REM   tools\aiworkflow\follow_up_task_generator.bat status task_id [--json]
REM   tools\aiworkflow\follow_up_task_generator.bat generate task_id [completion_report_id] [finalization_log_id] [policy_evaluation_id] [follow_up_plan_id] [--json]
REM   tools\aiworkflow\follow_up_task_generator.bat read task_id [follow_up_plan_id] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
set "SCRIPT_DIR=%~dp0"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "TASK_ID="
set "FOLLOW_UP_PLAN_ID="
set "COMPLETION_REPORT_ID="
set "FINALIZATION_LOG_ID="
set "POLICY_EVALUATION_ID="
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

if "%TASK_ID%"=="" (
    set "TASK_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="generate" if /I "!ARG:~0,11!"=="completion-" (
    set "COMPLETION_REPORT_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="generate" if /I "!ARG:~0,13!"=="finalization-" (
    set "FINALIZATION_LOG_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="generate" if /I "!ARG:~0,9!"=="autoeval-" (
    set "POLICY_EVALUATION_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="generate" if /I "!ARG:~0,9!"=="followup-" (
    set "FOLLOW_UP_PLAN_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="read" if /I "!ARG:~0,9!"=="followup-" (
    set "FOLLOW_UP_PLAN_ID=%~1"
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

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%follow_up_task_generator.ps1" -Command "%COMMAND%" -TaskId "%TASK_ID%" -FollowUpPlanId "%FOLLOW_UP_PLAN_ID%" -CompletionReportId "%COMPLETION_REPORT_ID%" -FinalizationLogId "%FINALIZATION_LOG_ID%" -PolicyEvaluationId "%POLICY_EVALUATION_ID%" -RepoRoot "%REPO_ROOT%" %JSON%
exit /b %ERRORLEVEL%

:usage
echo Usage:
echo   tools\aiworkflow\follow_up_task_generator.bat status task_id [--json]
echo   tools\aiworkflow\follow_up_task_generator.bat generate task_id [completion_report_id] [finalization_log_id] [policy_evaluation_id] [follow_up_plan_id] [--json]
echo   tools\aiworkflow\follow_up_task_generator.bat read task_id [follow_up_plan_id] [--json]
exit /b 1

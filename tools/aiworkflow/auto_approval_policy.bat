@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow auto_approval_policy.bat
REM Usage:
REM   tools\aiworkflow\auto_approval_policy.bat status task_id [--json]
REM   tools\aiworkflow\auto_approval_policy.bat evaluate task_id [completion_report_id] [finalization_log_id] [policy_evaluation_id] [--json]
REM   tools\aiworkflow\auto_approval_policy.bat read task_id [policy_evaluation_id] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
set "SCRIPT_DIR=%~dp0"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "TASK_ID="
set "POLICY_EVALUATION_ID="
set "COMPLETION_REPORT_ID="
set "FINALIZATION_LOG_ID="
set "JSON="

if "%COMMAND%"=="" (
    echo [ERROR] Missing command.
    goto :usage
)

if /I not "%COMMAND%"=="status" if /I not "%COMMAND%"=="evaluate" if /I not "%COMMAND%"=="read" (
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

if /I "%COMMAND%"=="evaluate" if /I "!ARG:~0,11!"=="completion-" (
    set "COMPLETION_REPORT_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="evaluate" if /I "!ARG:~0,13!"=="finalization-" (
    set "FINALIZATION_LOG_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="evaluate" if /I "!ARG:~0,9!"=="autoeval-" (
    set "POLICY_EVALUATION_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="read" if /I "!ARG:~0,9!"=="autoeval-" (
    set "POLICY_EVALUATION_ID=%~1"
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

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%auto_approval_policy.ps1" -Command "%COMMAND%" -TaskId "%TASK_ID%" -PolicyEvaluationId "%POLICY_EVALUATION_ID%" -CompletionReportId "%COMPLETION_REPORT_ID%" -FinalizationLogId "%FINALIZATION_LOG_ID%" -RepoRoot "%REPO_ROOT%" %JSON%
exit /b %ERRORLEVEL%

:usage
echo Usage:
echo   tools\aiworkflow\auto_approval_policy.bat status task_id [--json]
echo   tools\aiworkflow\auto_approval_policy.bat evaluate task_id [completion_report_id] [finalization_log_id] [policy_evaluation_id] [--json]
echo   tools\aiworkflow\auto_approval_policy.bat read task_id [policy_evaluation_id] [--json]
exit /b 1

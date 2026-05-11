@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow runtime_control_adapter.bat
REM Usage:
REM   tools\aiworkflow\runtime_control_adapter.bat status task_id [session_id] [--json]
REM   tools\aiworkflow\runtime_control_adapter.bat read task_id [control_id] [--json]
REM   tools\aiworkflow\runtime_control_adapter.bat request task_id action [session_id] --reason text [--json]
REM   tools\aiworkflow\runtime_control_adapter.bat approve task_id control_id [--note text] [--json]
REM   tools\aiworkflow\runtime_control_adapter.bat reject task_id control_id [--note text] [--json]
REM   tools\aiworkflow\runtime_control_adapter.bat apply task_id control_id [--note text] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
set "SCRIPT_DIR=%~dp0"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "TASK_ID="
set "SESSION_ID="
set "CONTROL_ID="
set "ACTION="
set "REASON="
set "NOTE="
set "REQUESTED_BY=Human Director"
set "REQUEST_SOURCE=codex_app"
set "TARGET_EXECUTOR="
set "TARGET_SCOPE="
set "REPLAN_SUMMARY="
set "RETRY_COMMAND_ID="
set "JSON="

if "%COMMAND%"=="" (
    echo [ERROR] Missing command.
    goto :usage
)

if /I not "%COMMAND%"=="status" if /I not "%COMMAND%"=="request" if /I not "%COMMAND%"=="approve" if /I not "%COMMAND%"=="reject" if /I not "%COMMAND%"=="apply" if /I not "%COMMAND%"=="read" (
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
if /I "%~1"=="--reason" (
    if "%~2"=="" (
        echo [ERROR] --reason requires a value.
        goto :usage
    )
    set "REASON=%~2"
    shift
    shift
    goto :parse_args
)
if /I "%~1"=="--note" (
    if "%~2"=="" (
        echo [ERROR] --note requires a value.
        goto :usage
    )
    set "NOTE=%~2"
    shift
    shift
    goto :parse_args
)
if /I "%~1"=="--requested-by" (
    if "%~2"=="" (
        echo [ERROR] --requested-by requires a value.
        goto :usage
    )
    set "REQUESTED_BY=%~2"
    shift
    shift
    goto :parse_args
)
if /I "%~1"=="--request-source" (
    if "%~2"=="" (
        echo [ERROR] --request-source requires a value.
        goto :usage
    )
    set "REQUEST_SOURCE=%~2"
    shift
    shift
    goto :parse_args
)
if /I "%~1"=="--target-executor" (
    if "%~2"=="" (
        echo [ERROR] --target-executor requires a value.
        goto :usage
    )
    set "TARGET_EXECUTOR=%~2"
    shift
    shift
    goto :parse_args
)
if /I "%~1"=="--target-scope" (
    if "%~2"=="" (
        echo [ERROR] --target-scope requires a value.
        goto :usage
    )
    set "TARGET_SCOPE=%~2"
    shift
    shift
    goto :parse_args
)
if /I "%~1"=="--replan-summary" (
    if "%~2"=="" (
        echo [ERROR] --replan-summary requires a value.
        goto :usage
    )
    set "REPLAN_SUMMARY=%~2"
    shift
    shift
    goto :parse_args
)
if /I "%~1"=="--retry-command-id" (
    if "%~2"=="" (
        echo [ERROR] --retry-command-id requires a value.
        goto :usage
    )
    set "RETRY_COMMAND_ID=%~2"
    shift
    shift
    goto :parse_args
)

if "!TASK_ID!"=="" (
    set "TASK_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="request" if "!ACTION!"=="" (
    set "ACTION=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="request" if "!SESSION_ID!"=="" (
    set "SESSION_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="status" if "!SESSION_ID!"=="" (
    set "SESSION_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="read" if "!CONTROL_ID!"=="" (
    set "CONTROL_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="approve" if "!CONTROL_ID!"=="" (
    set "CONTROL_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="reject" if "!CONTROL_ID!"=="" (
    set "CONTROL_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="apply" if "!CONTROL_ID!"=="" (
    set "CONTROL_ID=%~1"
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

if /I "%COMMAND%"=="request" if "%ACTION%"=="" (
    echo [ERROR] request requires action.
    goto :usage
)

if /I "%COMMAND%"=="request" if "%REASON%"=="" (
    echo [ERROR] request requires --reason.
    goto :usage
)

if /I "%COMMAND%"=="approve" if "%CONTROL_ID%"=="" (
    echo [ERROR] approve requires control_id.
    goto :usage
)

if /I "%COMMAND%"=="reject" if "%CONTROL_ID%"=="" (
    echo [ERROR] reject requires control_id.
    goto :usage
)

if /I "%COMMAND%"=="apply" if "%CONTROL_ID%"=="" (
    echo [ERROR] apply requires control_id.
    goto :usage
)

if "%JSON%"=="1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%runtime_control_adapter.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -SessionId "!SESSION_ID!" -ControlId "!CONTROL_ID!" -Action "!ACTION!" -Reason "!REASON!" -Note "!NOTE!" -RequestedBy "!REQUESTED_BY!" -RequestSource "!REQUEST_SOURCE!" -TargetExecutor "!TARGET_EXECUTOR!" -TargetScope "!TARGET_SCOPE!" -ReplanSummary "!REPLAN_SUMMARY!" -RetryCommandId "!RETRY_COMMAND_ID!" -Json
    exit /b !ERRORLEVEL!
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%runtime_control_adapter.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -SessionId "!SESSION_ID!" -ControlId "!CONTROL_ID!" -Action "!ACTION!" -Reason "!REASON!" -Note "!NOTE!" -RequestedBy "!REQUESTED_BY!" -RequestSource "!REQUEST_SOURCE!" -TargetExecutor "!TARGET_EXECUTOR!" -TargetScope "!TARGET_SCOPE!" -ReplanSummary "!REPLAN_SUMMARY!" -RetryCommandId "!RETRY_COMMAND_ID!"
exit /b !ERRORLEVEL!

:usage
echo Usage:
echo   tools\aiworkflow\runtime_control_adapter.bat status task_id [session_id] [--json]
echo   tools\aiworkflow\runtime_control_adapter.bat read task_id [control_id] [--json]
echo   tools\aiworkflow\runtime_control_adapter.bat request task_id action [session_id] --reason text [--json]
echo   tools\aiworkflow\runtime_control_adapter.bat approve task_id control_id [--note text] [--json]
echo   tools\aiworkflow\runtime_control_adapter.bat reject task_id control_id [--note text] [--json]
echo   tools\aiworkflow\runtime_control_adapter.bat apply task_id control_id [--note text] [--json]
exit /b 1

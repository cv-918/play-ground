@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow codex_cli_adapter.bat
REM Purpose:
REM   Controlled Codex CLI execution adapter with runtime session/evidence linkage.
REM
REM Usage:
REM   tools\aiworkflow\codex_cli_adapter.bat status task_id [--config path] [--prompt-file path] [--json]
REM   tools\aiworkflow\codex_cli_adapter.bat dry-run task_id [--config path] [--prompt-file path] [--json]
REM   tools\aiworkflow\codex_cli_adapter.bat run task_id --execute [--config path] [--prompt-file path] [--session-id id] [--evidence-id id] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "TASK_ID="
set "CONFIG_PATH="
set "PROMPT_FILE="
set "SESSION_ID="
set "EVIDENCE_ID="
set "EXECUTE="
set "JSON="

if "%COMMAND%"=="" (
    echo [ERROR] Missing command.
    goto :usage
)

if /I not "%COMMAND%"=="status" if /I not "%COMMAND%"=="dry-run" if /I not "%COMMAND%"=="run" (
    echo [ERROR] Unknown command: %COMMAND%
    goto :usage
)

shift /1

:parse_args
if "%~1"=="" goto :run
if /I "%~1"=="--json" (
    set "JSON=1"
    shift /1
    goto :parse_args
)
if /I "%~1"=="--execute" (
    set "EXECUTE=1"
    shift /1
    goto :parse_args
)
if /I "%~1"=="--config" (
    if "%~2"=="" (
        echo [ERROR] --config requires a value.
        goto :usage
    )
    set "CONFIG_PATH=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--prompt-file" (
    if "%~2"=="" (
        echo [ERROR] --prompt-file requires a value.
        goto :usage
    )
    set "PROMPT_FILE=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--session-id" (
    if "%~2"=="" (
        echo [ERROR] --session-id requires a value.
        goto :usage
    )
    set "SESSION_ID=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if /I "%~1"=="--evidence-id" (
    if "%~2"=="" (
        echo [ERROR] --evidence-id requires a value.
        goto :usage
    )
    set "EVIDENCE_ID=%~2"
    shift /1
    shift /1
    goto :parse_args
)
if "!TASK_ID!"=="" (
    set "TASK_ID=%~1"
    shift /1
    goto :parse_args
)

echo [ERROR] Too many arguments or unknown option: %~1
goto :usage

:run
if "%TASK_ID%"=="" (
    echo [ERROR] task_id is required.
    goto :usage
)

set "EXTRA="
if "%EXECUTE%"=="1" set "EXTRA=-Execute"

if "%JSON%"=="1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0codex_cli_adapter.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -ConfigPath "!CONFIG_PATH!" -PromptFile "!PROMPT_FILE!" -SessionId "!SESSION_ID!" -EvidenceId "!EVIDENCE_ID!" %EXTRA% -Json
    exit /b !ERRORLEVEL!
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0codex_cli_adapter.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -ConfigPath "!CONFIG_PATH!" -PromptFile "!PROMPT_FILE!" -SessionId "!SESSION_ID!" -EvidenceId "!EVIDENCE_ID!" %EXTRA%
exit /b !ERRORLEVEL!

:usage
echo Usage:
echo   tools\aiworkflow\codex_cli_adapter.bat status task_id [--config path] [--prompt-file path] [--json]
echo   tools\aiworkflow\codex_cli_adapter.bat dry-run task_id [--config path] [--prompt-file path] [--json]
echo   tools\aiworkflow\codex_cli_adapter.bat run task_id --execute [--config path] [--prompt-file path] [--session-id id] [--evidence-id id] [--json]
exit /b 1

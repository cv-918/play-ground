@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow build_test_runner.bat
REM Usage:
REM   tools\aiworkflow\build_test_runner.bat status task_id [--config path] [--json]
REM   tools\aiworkflow\build_test_runner.bat list task_id [--config path] [--json]
REM   tools\aiworkflow\build_test_runner.bat dry-run task_id command_id [--config path] [--json]
REM   tools\aiworkflow\build_test_runner.bat run task_id command_id --execute [--approved] [--build-test-id id] [--config path] [--json]
REM   tools\aiworkflow\build_test_runner.bat read task_id [build_test_id] [--config path] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
set "SCRIPT_DIR=%~dp0"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

set "COMMAND=%~1"
set "TASK_ID="
set "COMMAND_ID="
set "BUILD_TEST_ID="
set "CONFIG_PATH=tools\aiworkflow\build_test_runner.example.json"
set "EXECUTE="
set "APPROVED="
set "JSON="

if "%COMMAND%"=="" (
    echo [ERROR] Missing command.
    goto :usage
)

if /I not "%COMMAND%"=="status" if /I not "%COMMAND%"=="list" if /I not "%COMMAND%"=="dry-run" if /I not "%COMMAND%"=="run" if /I not "%COMMAND%"=="read" (
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
if /I "%~1"=="--execute" (
    set "EXECUTE=1"
    shift
    goto :parse_args
)
if /I "%~1"=="--approved" (
    set "APPROVED=1"
    shift
    goto :parse_args
)
if /I "%~1"=="--config" (
    if "%~2"=="" (
        echo [ERROR] --config requires a path.
        goto :usage
    )
    set "CONFIG_PATH=%~2"
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

if "!TASK_ID!"=="" (
    set "TASK_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="dry-run" if "!COMMAND_ID!"=="" (
    set "COMMAND_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="run" if "!COMMAND_ID!"=="" (
    set "COMMAND_ID=%~1"
    shift
    goto :parse_args
)

if /I "%COMMAND%"=="read" if "!BUILD_TEST_ID!"=="" (
    set "BUILD_TEST_ID=%~1"
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

set "EXECUTE_ARG="
set "APPROVED_ARG="
set "JSON_ARG="
if "%EXECUTE%"=="1" set "EXECUTE_ARG=-Execute"
if "%APPROVED%"=="1" set "APPROVED_ARG=-Approved"
if "%JSON%"=="1" set "JSON_ARG=-Json"

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%build_test_runner.ps1" -RepoRoot "%REPO_ROOT%" -Command "%COMMAND%" -TaskId "!TASK_ID!" -CommandId "!COMMAND_ID!" -BuildTestId "!BUILD_TEST_ID!" -ConfigPath "!CONFIG_PATH!" !EXECUTE_ARG! !APPROVED_ARG! !JSON_ARG!
exit /b !ERRORLEVEL!

:usage
echo Usage:
echo   tools\aiworkflow\build_test_runner.bat status task_id [--config path] [--json]
echo   tools\aiworkflow\build_test_runner.bat list task_id [--config path] [--json]
echo   tools\aiworkflow\build_test_runner.bat dry-run task_id command_id [--config path] [--json]
echo   tools\aiworkflow\build_test_runner.bat run task_id command_id --execute [--approved] [--build-test-id id] [--config path] [--json]
echo   tools\aiworkflow\build_test_runner.bat read task_id [build_test_id] [--config path] [--json]
exit /b 1

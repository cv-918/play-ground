@echo off
setlocal EnableExtensions

REM AIWorkflow studio_staff_runtime.bat
REM Purpose:
REM   Plan and record governed Studio RoleRun envelopes from StaffContextPacket
REM   JSON files, and inspect RoleRunOutput JSON files.
REM
REM Usage:
REM   tools\aiworkflow\studio_staff_runtime.bat status [--json]
REM   tools\aiworkflow\studio_staff_runtime.bat validate [--json]
REM   tools\aiworkflow\studio_staff_runtime.bat list [--json]
REM   tools\aiworkflow\studio_staff_runtime.bat read <role_run_id> [--json]
REM   tools\aiworkflow\studio_staff_runtime.bat plan <context_packet_json_path> [--json]
REM   tools\aiworkflow\studio_staff_runtime.bat create <context_packet_json_path> [--execute] [--json]
REM   tools\aiworkflow\studio_staff_runtime.bat inspect-output <role_run_output_json_path> [--json]
REM   tools\aiworkflow\studio_staff_runtime.bat handoff-output <role_run_output_json_path> [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0studio_staff_runtime.ps1" -RepoRoot "%REPO_ROOT%" %*
exit /b %ERRORLEVEL%

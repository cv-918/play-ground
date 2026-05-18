@echo off
setlocal EnableExtensions

REM AIWorkflow studio_meeting_runtime.bat
REM Purpose:
REM   Inspect, validate, summarize, and explicitly create Studio MeetingSession
REM   JSON files. Writes require create --execute.
REM
REM Usage:
REM   tools\aiworkflow\studio_meeting_runtime.bat status [--json]
REM   tools\aiworkflow\studio_meeting_runtime.bat validate [--json]
REM   tools\aiworkflow\studio_meeting_runtime.bat list [--json]
REM   tools\aiworkflow\studio_meeting_runtime.bat read <meeting_id> [--json]
REM   tools\aiworkflow\studio_meeting_runtime.bat inspect <meeting_json_path|meeting_id> [--json]
REM   tools\aiworkflow\studio_meeting_runtime.bat handoff <meeting_json_path|meeting_id> [--json]
REM   tools\aiworkflow\studio_meeting_runtime.bat create <meeting_json_path> [--execute] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0studio_meeting_runtime.ps1" -RepoRoot "%REPO_ROOT%" %*
exit /b %ERRORLEVEL%

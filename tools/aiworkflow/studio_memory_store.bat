@echo off
setlocal EnableExtensions

REM AIWorkflow studio_memory_store.bat
REM Purpose:
REM   Inspect, validate, and explicitly create Studio MemoryRecord JSON files.
REM   Writes require create --execute.
REM
REM Usage:
REM   tools\aiworkflow\studio_memory_store.bat status [--json]
REM   tools\aiworkflow\studio_memory_store.bat validate [--json]
REM   tools\aiworkflow\studio_memory_store.bat list [--status <status>] [--type <type>] [--json]
REM   tools\aiworkflow\studio_memory_store.bat read <memory_id> [--json]
REM   tools\aiworkflow\studio_memory_store.bat create <memory_json_path> [--execute] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0studio_memory_store.ps1" -RepoRoot "%REPO_ROOT%" %*
exit /b %ERRORLEVEL%

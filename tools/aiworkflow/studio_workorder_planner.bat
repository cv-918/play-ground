@echo off
setlocal EnableExtensions

REM AIWorkflow studio_workorder_planner.bat
REM Purpose:
REM   Store/read/list Studio WorkOrders and convert WorkOrder JSON files into
REM   AIWorkflow TaskDraft/Backlog row previews.
REM
REM Usage:
REM   tools\aiworkflow\studio_workorder_planner.bat status [--json]
REM   tools\aiworkflow\studio_workorder_planner.bat list [--json]
REM   tools\aiworkflow\studio_workorder_planner.bat read <work_order_id> [--json]
REM   tools\aiworkflow\studio_workorder_planner.bat store <work_order_json_path> [--execute] [--json]
REM   tools\aiworkflow\studio_workorder_planner.bat plan <work_order_json_path> [--json]
REM   tools\aiworkflow\studio_workorder_planner.bat create <work_order_json_path> [--execute] [--json]

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0studio_workorder_planner.ps1" -RepoRoot "%REPO_ROOT%" %*
exit /b %ERRORLEVEL%

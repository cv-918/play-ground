@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM AIWorkflow status.bat
REM Purpose:
REM   Print read-only repository/workflow status for local use and future Discord read-only integration.

for %%I in ("%~dp0..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%" || (
    echo [ERROR] Failed to enter repository root: %REPO_ROOT%
    exit /b 1
)

echo ============================================================
echo AIWorkflow Status
echo ============================================================
echo.

echo [Repository Root]
git rev-parse --show-toplevel
if errorlevel 1 exit /b 1
echo.

echo [Branch]
git branch --show-current
echo.

echo [Short Status]
git status --short
echo.

echo [Untracked Files]
git ls-files --others --exclude-standard
echo.

echo [Unstaged Diff Stat]
git diff --stat
echo.

echo [Staged Diff Stat]
git diff --cached --stat
echo.

echo [Diff Check]
git diff --check
if errorlevel 1 (
    echo [WARN] git diff --check reported issues.
) else (
    echo [OK] No whitespace/conflict-marker issues found in unstaged diff.
)
echo.

echo [Workflow State Files]
for %%F in (
    "_Docs\AIWorkflow\ProjectStatus.md"
    "_Docs\AIWorkflow\Backlog.md"
    "_Docs\AIWorkflow\ActiveTask.md"
    "_Docs\AIWorkflow\Workflow_Level_Up_Plan.md"
    "_Docs\AIWorkflow\Discord_Orchestrator_Architecture_v1.md"
) do (
    if exist "%%~F" (
        echo [OK] %%~F
    ) else (
        echo [MISSING] %%~F
    )
)
echo.

echo [Core Workflow Entry Files]
for %%F in (
    "AGENTS.md"
    ".github\copilot-instructions.md"
    "_Docs\AIWorkflow\README.md"
) do (
    if exist "%%~F" (
        echo [OK] %%~F
    ) else (
        echo [MISSING] %%~F
    )
)
echo.

echo ============================================================
echo Done.
echo ============================================================
exit /b 0

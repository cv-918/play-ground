# AIWorkflow Local Scripts v1

## Purpose

This folder contains local helper scripts for the AI Orchestrator workflow.

These scripts are designed for safe, human-supervised operation.

They do not edit source code.
They do not commit.
They do not push.
They do not run Copilot.
They do not decide validation pass/fail.

---

## Scripts

```text
status.bat
capture_diff.bat
json_smoke_check.bat
workflow_status.bat
```

---

## status.bat

Read-only repository/workflow status.

```bat
tools\aiworkflow\status.bat
```

---

## capture_diff.bat

Captures review-ready diff files under `_Temp\AIWorkflowDiffs\`.

```bat
tools\aiworkflow\capture_diff.bat
tools\aiworkflow\capture_diff.bat --include-untracked
tools\aiworkflow\capture_diff.bat --staged
```

---

## json_smoke_check.bat

Parses JSON files under `PlayGround\Data`.

```bat
tools\aiworkflow\json_smoke_check.bat
```

Reports are written under `_Temp\AIWorkflowReports\`.

---

## workflow_status.bat

Summarizes workflow state from:

```text
_Docs\AIWorkflow\ProjectStatus.md
_Docs\AIWorkflow\Backlog.md
_Docs\AIWorkflow\ActiveTask.md
git status
```

Human-readable output:

```bat
tools\aiworkflow\workflow_status.bat
```

JSON output for future Discord integration:

```bat
tools\aiworkflow\workflow_status.bat --json
```

This script is read-only.

---

## Recommended Check

From repository root:

```bat
tools\aiworkflow\status.bat
tools\aiworkflow\workflow_status.bat
tools\aiworkflow\workflow_status.bat --json
tools\aiworkflow\capture_diff.bat --include-untracked
tools\aiworkflow\json_smoke_check.bat
```

Do not commit generated `_Temp` outputs.

Recommended `.gitignore` entry:

```text
_Temp/
```

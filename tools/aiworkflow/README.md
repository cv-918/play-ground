# AIWorkflow Local Scripts v1

## Purpose

This package adds the first local helper scripts for moving from Level 2 workflow operation toward Level 3 local semi-automation.

These scripts are designed for safe, human-supervised operation.

They do not edit source code.
They do not commit.
They do not push.
They do not run Copilot.
They do not decide validation pass/fail.

---

## Files

```text
tools/aiworkflow/status.bat
tools/aiworkflow/capture_diff.bat
tools/aiworkflow/json_smoke_check.bat
tools/aiworkflow/json_smoke_check.ps1
tools/aiworkflow/README.md
```

---

## 1. status.bat

Read-only status summary.

```bat
tools\aiworkflow\status.bat
```

Outputs:

```text
repository root
branch
git status --short
untracked files
unstaged diff stat
staged diff stat
git diff --check
workflow state file presence
core workflow entry file presence
```

Use this before starting or resuming an AI workflow task.

---

## 2. capture_diff.bat

Captures review-ready diff files under:

```text
_Temp\AIWorkflowDiffs\
```

Default tracked diff:

```bat
tools\aiworkflow\capture_diff.bat
```

Include untracked new files:

```bat
tools\aiworkflow\capture_diff.bat --include-untracked
```

Staged diff:

```bat
tools\aiworkflow\capture_diff.bat --staged
```

Notes:

```text
--include-untracked runs git add -N for current untracked files.
This changes index metadata only so new file contents appear in git diff.
```

Generated files:

```text
review_status_YYYYMMDD_HHMMSS.txt
review_diff_YYYYMMDD_HHMMSS.diff
review_diff_check_YYYYMMDD_HHMMSS.txt
```

---

## 3. json_smoke_check.bat

Parses JSON files under `PlayGround\Data`.

```bat
tools\aiworkflow\json_smoke_check.bat
```

Optional custom path:

```bat
tools\aiworkflow\json_smoke_check.bat PlayGround\Data
```

Reports are written under:

```text
_Temp\AIWorkflowReports\
```

Exit code:

```text
0 = all JSON files parsed
1 = one or more JSON files failed
2 = data directory missing
```

---

## Recommended First Test

From repository root:

```bat
tools\aiworkflow\status.bat
tools\aiworkflow\capture_diff.bat --include-untracked
tools\aiworkflow\json_smoke_check.bat
```

Do not commit generated `_Temp` outputs unless intentionally needed.

Recommended future `.gitignore` entry:

```text
_Temp/
```

---

## Safety Rule

These scripts are local helpers.

They do not replace:

```text
human approval
diff review
runtime validation
commit decision
```

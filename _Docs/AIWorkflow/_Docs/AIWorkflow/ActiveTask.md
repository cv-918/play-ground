# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-010
title: Implement read-only workflow status summarizer
status: done
workflow_path: local_script_validation
priority: P1
risk_level: low
requested_by: human_director
requested_at: 2026-04-30
last_updated: 2026-04-30
```

---

## Goal

Create a read-only workflow status summarizer that can later become the basis for Discord v1 commands such as:

```text
/ai status
/ai active
/ai backlog
/ai next
```

---

## Approved Scope

Included:

```text
- Read ProjectStatus.md.
- Read Backlog.md.
- Read ActiveTask.md.
- Read git status/diff summaries.
- Print human-readable workflow status.
- Print JSON status for future Discord integration.
```

Excluded:

```text
- Discord bot implementation.
- Source code modification.
- Automatic commit/push.
- Automatic approval.
- Automatic validation judgment.
```

---

## Tool Route

```yaml
chatgpt: generated scripts
codex: not required
copilot: not used
git: user review and commit
validation: local script execution
```

---

## Files In Scope

```text
tools/aiworkflow/workflow_status.bat
tools/aiworkflow/workflow_status.ps1
tools/aiworkflow/README.md
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/Backlog.md
```

---

## Human Action Required

```text
1. Save workflow_status.bat and workflow_status.ps1.
2. Save updated tools/aiworkflow/README.md.
3. Update Backlog.md if needed.
4. Run tools/aiworkflow/workflow_status.bat.
5. Run tools/aiworkflow/workflow_status.bat --json.
6. Review output.
7. Commit if valid.
```

---

## Next Recommended Task

```text
WF-009:
Define project profile schema for multi-project and Unity-ready workflow.
```

Alternative:

```text
GAME-001B:
Runtime validate GameDataLoader after JSON syntax smoke check.
```

---

## Completion Criteria

```text
[ ] workflow_status.bat saved
[ ] workflow_status.ps1 saved
[ ] tools/aiworkflow/README.md updated
[ ] workflow_status.bat tested
[ ] workflow_status.bat --json tested
[ ] Backlog.md updated
[ ] Commit completed or explicitly deferred
```

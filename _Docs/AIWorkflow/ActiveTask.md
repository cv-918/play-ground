# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-020
title: Add Discord Bot always-on operation scripts
status: done
workflow_path: release_a_always_on_bot
priority: P1
risk_level: low
requested_by: human_director
requested_at: 2026-05-03
last_updated: 2026-05-03
```

---

## Goal

Finalize Release A / WF-020 workflow state after Discord Bot always-on operation validation.

---

## Approved Scope

Included:

```text
- Record WF-020 as done.
- Preserve validation evidence for always-on operation scripts.
- Identify the next recommended Discord workflow task.
- Keep changes limited to workflow state documents.
```

Excluded:

```text
- Source code changes.
- Discord bot runtime code changes.
- `_Local/` changes.
- `node_modules/` changes.
- Git commit.
```

---

## Tool Route

```yaml
chatgpt: workflow state update request
codex: workflow document update
copilot: not used
git: status and diff review only
validation: user-provided manual validation evidence
```

---

## Files In Scope

```text
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/README.md
```

---

## Validation Evidence

```text
start_bot.bat: passed
status_bot.bat running: passed
duplicate start prevention: passed
restart_bot.bat: passed
status after restart running: passed
stop_bot.bat: passed
status after stop stopped: passed
log output under _Temp/AIWorkflowDiscordBot/logs: passed
git diff --check: passed
private files not tracked: passed
```

---

## Human Action Required

```text
1. Review workflow state diff.
2. Do not commit yet.
```

---

## Next Recommended Task

```text
Release B / WF-022:
Implement Discord task management commands.
```

Alternative:

```text
WF-021:
Harden Discord bot Node warnings and commandRunner shell usage.
```

---

## Completion Criteria

```text
[x] WF-020 validation evidence recorded
[x] Backlog.md updated
[x] ActiveTask.md updated
[x] README.md checked for always-on guide entry
[x] Commit deferred
```

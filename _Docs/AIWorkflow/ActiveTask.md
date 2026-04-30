# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-018
title: Document Discord Bot v1 operation guide for daily use
status: done
workflow_path: documentation
priority: P2
risk_level: low
requested_by: human_director
requested_at: 2026-04-30
last_updated: 2026-04-30
```

---

## Goal

Document how to operate Discord Read-Only Bot v1 safely in daily workflow.

---

## Approved Scope

Included:

```text
- Discord Bot v1 start procedure.
- Daily status check procedure.
- Project profile check procedure.
- Pre-work and post-work usage.
- Secret handling rules.
- Shutdown procedure.
- Troubleshooting guide.
```

Excluded:

```text
- Bot feature implementation.
- Discord write commands.
- Approval automation.
- Build/test execution.
- Source code modification.
```

---

## Tool Route

```yaml
chatgpt: generated operation guide package
codex: not used
copilot: not used
git: user review and commit
validation: document review
```

---

## Files In Scope

```text
_Docs/AIWorkflow/Discord_Bot_v1_Operation_Guide.md
_Docs/AIWorkflow/Discord_Bot_v1_Troubleshooting.md
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/README.md
AGENTS.md
```

---

## Validation Evidence

```text
Discord Bot v1 validated in previous tasks.
Operation guide documents start, check, safety, shutdown, and troubleshooting procedures.
```

---

## Human Action Required

```text
1. Save operation guide.
2. Save troubleshooting guide.
3. Update Backlog.md WF-018 to done.
4. Add new docs to README.md Document Map.
5. Add operation guide to AGENTS.md Source of Truth if desired.
6. Review diff.
7. Commit.
```

---

## Next Recommended Task

```text
GAME-001B:
Runtime validate GameDataLoader after JSON syntax smoke check.
```

Alternative:

```text
WF-019:
Design Discord approval-note workflow without implementation.
```

---

## Completion Criteria

```text
[x] Operation guide created
[x] Troubleshooting guide created
[ ] Backlog.md updated
[ ] README.md updated
[ ] AGENTS.md updated if desired
[ ] Commit completed
```

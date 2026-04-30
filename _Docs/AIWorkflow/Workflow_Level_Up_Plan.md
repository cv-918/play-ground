# Workflow Level-Up Plan

## Purpose

This document defines the path from the current document-based workflow to a Discord-connected automated AI development workflow.

---

## Long-Term Goal

Build a reusable AI development workflow for solo game projects.

The human role becomes:

```text
Human Director
```

Human focuses on:

```text
direction
priority
approval
risk acceptance
final commit/release decisions
```

---

## Current Maturity

```text
Level 2: repeatable semi-automated workflow
```

Evidence:

```text
- Workflow documents exist.
- Prompt templates exist.
- First real workflow trial completed.
- Codex/Copilot handoff worked.
- Diff review and fix loop worked.
- Dev Log and commit flow worked.
```

Missing for Level 3:

```text
- Durable state files
- Local helper scripts
- JSON/data smoke checks
- Automated status summary
- ActiveTask state transitions
```

---

## Target Levels

| Level | Name | Status |
|---:|---|---|
| 1 | Document-based manual workflow | Complete |
| 2 | Repeatable semi-automated workflow | Current |
| 3 | Local semi-automated orchestrator | Next |
| 4 | Discord-connected orchestrator | Future target |
| 5 | Multi-project AI game development platform | Long-term |

---

## Immediate Roadmap

## Phase 1 — Durable State Layer

Files:

```text
_Docs/AIWorkflow/ProjectStatus.md
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ActiveTask.md
```

Purpose:

```text
Create a single state source that future Discord/orchestrator tools can read.
```

---

## Phase 2 — Read-Only Local Scripts

Candidate scripts:

```text
tools/aiworkflow/status.bat
tools/aiworkflow/capture_diff.bat
tools/aiworkflow/check_diff.bat
tools/aiworkflow/json_smoke_check.bat
```

Constraints:

```text
read-only or report-only first
no automatic code edit
no automatic commit
```

---

## Phase 3 — ActiveTask State Machine

Allowed transition draft:

```text
todo -> analysis
analysis -> awaiting_approval
awaiting_approval -> ready_for_implementation
ready_for_implementation -> in_progress
in_progress -> review
review -> validation
validation -> done
any -> blocked
blocked -> analysis
```

---

## Phase 4 — Discord Read-Only Adapter

First Discord version:

```text
/ai status
/ai active
/ai backlog
/ai blockers
/ai next
/ai docs
```

It should not modify files.

---

## Phase 5 — Discord Approval Adapter

Next Discord version:

```text
/ai approve
/ai reject
/ai block
/ai resume
/ai assign-next
```

Still avoid automatic code edits.

---

## Do Not Automate Yet

```text
source code modification
automatic Copilot execution
automatic commit
automatic push
automatic release
Visual Studio project file editing
runtime validation pass/fail judgment
```

---

## Success Criteria for Level 3

```text
[ ] ProjectStatus.md is maintained.
[ ] Backlog.md is maintained.
[ ] ActiveTask.md is maintained.
[ ] status command can summarize repo/workflow state.
[ ] capture_diff command reliably includes new files.
[ ] JSON smoke check exists.
[ ] task state transitions are explicit.
[ ] human approval gates remain intact.
```

---

## Strategic Summary

```text
Documents
-> Durable state
-> Local read-only scripts
-> Local state machine
-> Discord read-only status
-> Discord approvals
-> controlled execution
-> multi-project support
```

# Super Bot Progress Record Template

Status: Template
Scope: Super Bot Stage 1 progress record while work is in progress

## Purpose

Use this template while a Super Bot Stage 1 task is being executed, especially when the work involves multiple steps, files, tools, decisions, blockers, or scope-change signals.

The progress record should make the working state auditable without claiming completion before verification and self-review are done.

## Template

```md
# Progress Record

## 1. Work ID / Title
- Work ID:
- Title:

## 2. Metadata
- Timestamp/date:
- Author / acting agent:
- Session / channel / execution surface:
- Related WorkOrder / task ID:
- Related intake:
- Related design / plan:

## 3. Current Status
- Status: not started / in progress / blocked / waiting for approval / ready for verification / cancelled
- Short status summary:

## 4. Goal
- User-visible goal:
- Operational goal:

## 5. Approved Scope
- Included files/areas:
- Allowed actions:
- Explicit non-goals:
- Protected actions not approved:

## 6. Progress Timeline
1. [timestamp or step] Action / decision / observation:
2. [timestamp or step] Action / decision / observation:
3. [timestamp or step] Action / decision / observation:

## 7. Tools Used / Not Used
- Tools used:
  - Tool/command:
  - Purpose:
  - Result summary:
- Tools intentionally not used:
  - Tool/command:
  - Reason:

## 8. Files Changed
- Changed files:
  - path:
  - change summary:
- Files inspected only:
  - path:
- Files explicitly not touched:
  - path:

## 9. Blockers
- Current blockers:
- Missing information:
- Human decisions needed:

## 10. Scope-change Signal
- Signal present: yes / no / unclear
- Description:
- Affected scope boundary:
- Required action: continue / ask clarification / request approval / stop

## 11. Next Action
- Immediate next step:
- Owner:
- Required approval before next step:

## 12. Verification / Unverified Items
- Verification already run:
  - command/check:
  - result:
- Verification still planned:
  - command/check:
  - reason:
- Verification not run:
  - command/check:
  - reason not run:
- Claims that remain unverified:
```

## Usage Notes

- Update this record after meaningful decisions, tool runs, file changes, blockers, or scope-change signals.
- Do not use this record as a completion record. Completion, validation summary, remaining risks, and commit recommendation belong in a completion / gap record.
- If a scope-change signal appears, stop or request approval instead of silently expanding the task.
- Separate files changed from files inspected only.
- Separate verification already run from verification planned or not run.

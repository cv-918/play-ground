# 2026-05-05 Role Router Rules v1

## Summary

Implemented WF-033 by creating Role Router Rules v1 for AIWorkflow.

The new document defines how ActiveTask metadata should activate the durable
roles from `Agent_Role_Registry_v1.md` without introducing executable routing
logic, Discord command behavior changes, source modification, automatic
approval, or automatic commit/release behavior.

## Background

WF-032 created Agent Role Registry v1 with the initial durable role set:

- Orchestrator.
- Explorer.
- Technical Architect.
- Gameplay Implementer.
- Reviewer.
- Validator.
- Documentation Keeper.
- Tool/Workflow Engineer.

WF-033 defines the next layer: deterministic routing rules that map task
metadata to those roles.

## Scope

In scope:

- Create `_Docs/AIWorkflow/Role_Router_Rules_v1.md`.
- Link the new document from `_Docs/AIWorkflow/README.md`.
- Record this WorkLog.

Out of scope:

- Game source files.
- Discord command implementation.
- `_Local/`.
- `node_modules/`.
- `_Temp/`.
- Release or deploy scripts.
- `Backlog.md`.
- `ActiveTask.md`.
- Executable router logic.
- External agent execution.

## Files Changed

```text
_Docs/AIWorkflow/Role_Router_Rules_v1.md
_Docs/AIWorkflow/README.md
_DevLog/WorkLog/2026-05-05_Role_Router_Rules_v1.md
```

## Architecture Notes

The router is defined as a policy layer, not an executable system.

The routing sequence is:

1. Start with Orchestrator.
2. Add roles from category.
3. Add roles from kind.
4. Add roles from explicit boolean flags.
5. Apply priority and risk escalation.
6. Add Documentation Keeper when durable records are required.
7. Remove execution roles that are forbidden by workflow path or missing
   approval.

The rules keep approval authority with the Human Director. Role activation does
not grant write permission, approval, commit permission, push permission, or
release permission.

## Implementation Notes

The new document defines:

- Routing inputs.
- Base routing rules.
- Risk and priority escalation rules.
- Category routing matrix.
- Kind routing matrix.
- Human decision gates.
- Role handoff examples.
- Explicit non-goals.
- Follow-up tasks.

## Review Summary

Review should check:

- `Role_Router_Rules_v1.md` exists.
- Routing inputs are defined.
- Base routing rules exist.
- Category routing matrix exists.
- Kind routing matrix exists.
- Risk escalation rules exist.
- Human decision gates are explicit.
- Non-goals prevent executable router behavior and automation shortcuts.
- README links the new document.
- No game source files were modified.

## Validation Summary

Completed validation:

```text
git status --short
  passed: showed the intended new Role Router Rules document, README update,
  and WorkLog. It also showed pre-existing ActiveTask.md and Backlog.md
  modifications from before this Codex run.

git diff --check
  passed: no whitespace errors reported.
  note: Git reported LF-to-CRLF working-copy warnings.

git diff --stat
  passed: showed the new Role Router Rules document, README update, WorkLog,
  and the pre-existing ActiveTask.md/Backlog.md modifications.

Verify no PlayGround source files were modified
  passed: `git diff --name-only -- PlayGround` returned no files.

Verify README links Role_Router_Rules_v1.md
  passed: README contains the Role_Router_Rules_v1.md document map entry.
```

No build or runtime validation was performed because this task is
documentation-only and did not modify game source, data, build settings,
Discord implementation, or runtime behavior.

## Remaining Risks

The routing rules are policy-only. They have not been implemented as an
ActiveTask parser, Discord command, or Codex prompt generator.

Future executable routing must be handled by a separate approved task with
bounded scope, validation criteria, and human decision gates.

## Next Tasks

Recommended follow-up tasks:

1. Review/Validation Verdict Format v1.
2. Path-Scoped Rule Mapping for Dust Land.
3. Small Role Router Prototype.
4. Discord role recommendation command.

## AI Assistance

Codex created the Role Router Rules v1 document and this WorkLog under the
human-provided WF-033 `/goal` instructions. No commit was performed.

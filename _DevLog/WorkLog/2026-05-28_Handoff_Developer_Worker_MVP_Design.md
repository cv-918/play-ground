# Handoff Developer Worker MVP Design

## Summary

Documented Phase 29A for the Handoff v2 Developer Worker MVP.

This phase defines the boundary for a future Developer Worker automation but does not create or activate automation.

## Background

The previous Handoff v2 bundles established:

- scope-based execution approval
- Supervisor scope visibility
- low-risk Role Worker automation as an office-assistant style worker
- safe Packet Results draft authority for document-only work

The missing layer is a Developer Worker that can eventually perform approved implementation work without requiring the human developer to manually orchestrate every Developer task.

## Scope

Changed:

- Added `Developer_Worker_MVP.md`.
- Added `Developer_Worker_MVP_KR.md`.
- Indexed both documents in `_Docs/Handoff/00_Index.md`.

Not changed:

- No recurring automation was created.
- No automation prompt was updated.
- No game source, JSON, assets, build settings, or Packet status behavior was changed.
- No build or runtime test was run.

## Key Decision

Developer Worker is not the same as the existing low-risk Role Worker.

The accepted design split is:

```text
Supervisor = observes and regenerates status surfaces
Low-risk Role Worker = office assistant for document-only queue/report work
Developer Worker = future approved-scope implementation worker
```

The Developer Worker MVP is designed around this rule:

```text
Source edits are allowed inside an approved execution scope.
The worker stops only when work must leave that approved scope or needs separately protected changes.
```

## Recommended Next Phases

- Phase 29B: Developer Worker prompt contract and run report format.
- Phase 30A: Create one PAUSED dry-run Developer Worker automation.
- Phase 30B: Dry-run pilot.
- Phase 31A: Narrow approved-scope implementation pilot.

## Validation

Handoff Supervisor scan:

```text
0 consistency issues, 0 scope drift issues.
```

Diff check:

```text
git diff --check
```

Result:

```text
Passed for the Phase 29A files.
```

## AIWorkflow Guide Update Decision

No update to `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` is needed in this phase.

Reason: Phase 29A only documents a future Handoff Developer Worker design. It does not change current AIWorkflow command names, regular workflow user intervention points, execution routing, completion gates, commit/push behavior, or PC Runner behavior.

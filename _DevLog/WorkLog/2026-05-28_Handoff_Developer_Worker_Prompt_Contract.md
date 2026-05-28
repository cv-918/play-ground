# Handoff Developer Worker Prompt Contract

## Summary

Documented Phase 29B for the future Developer Worker dry-run automation.

This phase defines the exact prompt contract and run report format. It does not create, update, activate, or run recurring automation.

## Background

Phase 29A separated the future Developer Worker from the existing low-risk Role Worker.

Phase 29B turns that design into a concrete dry-run automation contract that can be reviewed before Phase 30A creates the PAUSED automation.

## Scope

Changed:

- Added `Developer_Worker_Prompt_Contract.md`.
- Added `Developer_Worker_Prompt_Contract_KR.md`.
- Indexed both documents in `_Docs/Handoff/00_Index.md`.

Not changed:

- No recurring automation was created.
- No automation prompt was applied to Codex automation.
- No source files were modified.
- No JSON, assets, build settings, generated Supervisor surfaces, manifests, approval evidence, commit, or push behavior changed.
- No build or runtime validation was run.

## Key Decisions

Recommended future automation:

```text
playground-handoff-developer-worker-dry-run
```

Initial state:

```text
PAUSED
```

Initial mode:

```text
approved-scope dry run
```

Dry-run mode may read approved-scope source files and write planning output, but it must not edit source or run build/test commands.

Allowed writes are limited to:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/YYYY-MM-DD_HHMMSS_DeveloperWorkerDryRun.md
_Docs/Handoff/Packets/<handoff-id>/Results/DeveloperDryRunPlan.md
```

## Next Phase

Phase 30A can create the PAUSED recurring automation using the prompt in `Developer_Worker_Prompt_Contract.md`.

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
Passed for Phase 29B files.
```

## AIWorkflow Guide Update Decision

No update to `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` is needed in this phase.

Reason: Phase 29B only records a future Developer Worker prompt contract. It does not change current AIWorkflow command names, user intervention points, execution routing, completion gates, commit/push behavior, or PC Runner behavior.

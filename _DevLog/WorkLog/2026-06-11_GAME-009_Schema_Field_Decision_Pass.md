# GAME-009 Schema Field Decision Pass

Date: 2026-06-11
Status: completed

## Summary

Reviewed the completed GAME-008 unused-schema audit and converted it into field-level decisions without changing gameplay source/data/schema.

Source audit:

```text
_Docs/AIWorkflow/Studio/ResultReviews/2026-06-10_game008_unused_schema_fields_audit.md
```

Decision report:

```text
_Docs/AIWorkflow/Studio/ResultReviews/2026-06-11_game009_schema_field_decision_pass.md
```

## Decisions

```text
AttributeNode.json grade_       -> keep_active
TownNpcPlacement facing         -> keep_reserved_inactive
SpawnPool per-enemy interval    -> keep_reserved_inactive
Skill unlock_type_              -> keep_reserved_inactive
Stage.json grade_               -> remove_later
```

## Rationale

### Keep active

`AttributeNode.json grade_` is used by `AttributeNodeToolTip`, so it remains part of the active data contract.

### Keep reserved/inactive

`facing`, per-enemy `spawn_interval_`, and `unlock_type_` are plausible future design hooks. Implementing them would change visual/gameplay/progression behavior, so they should remain inactive until explicit design intent or manual playtest feedback exists.

### Remove later

`Stage.json grade_` is ignored by `StageJsonInfo`, all current values are `0`, and no design owner is confirmed. The next small data cleanup should remove this stale field unless stage tier design is revived first.

## Tooling Added

```bat
tools\aiworkflow\game009_schema_field_decision_check.bat
```

The check validates:

```text
- decision report contains all expected field decisions
- GAME-008 audit report exists
- Stage.json still contains stale grade_ evidence
- StageJsonInfo still ignores grade_
- AttributeNode tooltip still consumes grade_
- TownNpcPlacement parser still parses facing
- TownNpcPlacementSpawner still does not consume facing
- StageManager still uses the separate global spawn interval
- SkillJsonDataManager still parses unlock_type_
```

## Validation

Command run:

```bat
tools\aiworkflow\game009_schema_field_decision_check.bat
```

Result:

```text
PASS decision document anchors
PASS stage grade decision evidence
PASS reserved field evidence
```

Additional state check:

```bat
tools\aiworkflow\backlog_archive_consistency_check.bat
```

Result:

```text
PASS backlog split structure
PASS active/archive status partition
PASS combined task id integrity
PASS active task reference integrity
PASS active backlog row availability
```

## Follow-up

Recommended next data cleanup task:

```text
GAME-010: Remove stale Stage.json grade_ field
```

This should be a small data-only cleanup with JSON/readability/GAME-009 checks and Debug x64 build validation.

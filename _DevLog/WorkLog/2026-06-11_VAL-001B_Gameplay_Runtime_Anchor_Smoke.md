# VAL-001B - Gameplay Runtime Anchor Smoke Validation

## Summary

Added a source-anchor smoke validation for VAL-001 gameplay runtime paths.

The goal is to reduce the amount of manual playtesting required for VAL-001 by automatically checking that key combat, projectile, dust/reward, result, and restart source paths still exist.

## Scope

- Add local AIWorkflow validation script.
- Do not boot the game runtime.
- Do not read or write `PlayGround/Data/UserData.json`.
- Do not change gameplay source behavior.
- Do not change gameplay JSON schema or data.
- Do not change save/load behavior.

## Files Changed

- `tools/aiworkflow/gameplay_runtime_anchor_check.ps1`
- `tools/aiworkflow/gameplay_runtime_anchor_check.bat`
- `tools/aiworkflow/README.md`
- `_DevLog/WorkLog/2026-06-11_VAL-001B_Gameplay_Runtime_Anchor_Smoke.md`

## Validation Coverage

The new smoke validation checks source anchors for:

- contact attack path
- projectile attack path
- bullet / player projectile hit path
- dust and reward path
- result and restart path

## Validation Commands

```bat
tools\aiworkflow\gameplay_runtime_anchor_check.bat
tools\aiworkflow\run_result_semantics_check.bat
tools\aiworkflow\json_smoke_check.bat
```

## Validation Results

`tools\aiworkflow\gameplay_runtime_anchor_check.bat`:

```text
PASS contact attack anchor
PASS projectile attack anchor
PASS bullet and player projectile anchor
PASS dust and reward anchor
PASS result and restart anchor
```

`tools\aiworkflow\run_result_semantics_check.bat`:

```text
PASS TimeExpired
PASS PlayerDied
PASS StageProgressed
PASS Abandoned
PASS duplicate apply guard
PASS result_apply_eligible_ behavior
PASS stage_progress condition
PASS reward/save eligibility rule
```

`tools\aiworkflow\json_smoke_check.bat`:

```text
Total: 11
Failed: 0
```

## Remaining Risks

This is a source-anchor smoke validation, not a runtime playtest.

It does not prove:

- projectile visual readability
- dust visual readability or collection feel
- contact attack feel or collision tuning
- actual scene timing
- UI readability
- restart / exit button feel
- full runtime player input experience

VAL-001 still needs a short manual smoke pass for visual, input, and feel checks.

## Next Task

Recommended next task:

```text
VAL-001C: Short manual runtime playtest checklist
```

Focus the manual pass only on what automated smoke cannot prove: visuals, input feel, UI readability, and real scene flow.

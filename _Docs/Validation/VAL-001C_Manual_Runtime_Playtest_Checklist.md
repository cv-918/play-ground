# VAL-001C - Short Manual Runtime Playtest Checklist

## Purpose

Validate only the runtime behaviors that VAL-001A/VAL-001B automation cannot prove:

- visual readability
- input feel
- UI readability
- real scene transition flow
- real collision / collection feel

This checklist should stay short. If a failure is found, record evidence and split it into a follow-up bug task instead of expanding this pass into implementation.

## Preconditions

Run these before manual play:

```bat
tools\aiworkflow\gameplay_runtime_anchor_check.bat
tools\aiworkflow\run_result_semantics_check.bat
tools\aiworkflow\json_smoke_check.bat
```

Expected:

```text
PASS contact attack anchor
PASS projectile attack anchor
PASS bullet and player projectile anchor
PASS dust and reward anchor
PASS result and restart anchor
PASS TimeExpired
PASS PlayerDied
PASS StageProgressed
PASS Abandoned
PASS duplicate apply guard
PASS result_apply_eligible_ behavior
PASS stage_progress condition
PASS reward/save eligibility rule
Total: 11
Failed: 0
```

## Manual Smoke Matrix

Use `PASS`, `FAIL`, or `BLOCKED`.

| ID | Area | Check | Result | Evidence / Notes |
|---|---|---|---|---|
| VAL-001C-01 | Startup | Game launches to playable runtime without crash |  |  |
| VAL-001C-02 | Contact attack | Contact enemy can hit player; hit feedback is visible/readable |  |  |
| VAL-001C-03 | Projectile attack | Projectile attack is visible, moves toward target, and can hit |  |  |
| VAL-001C-04 | Player projectile | Player projectile is visible and hit feedback is readable |  |  |
| VAL-001C-05 | Enemy kill reward | Killing enemies increases kill/reward state without obvious UI/runtime break |  |  |
| VAL-001C-06 | Dust spawn | Dust appears after eligible enemy kill when dust unlock condition is satisfied |  |  |
| VAL-001C-07 | Dust collection | Dust moves/collects into player and feels readable |  |  |
| VAL-001C-08 | Result screen | Result screen displays readable end reason and reward values |  |  |
| VAL-001C-09 | Player death result | Death path reaches result screen and death reward reduction is understandable |  |  |
| VAL-001C-10 | Stage progress | Stage progress hold/input can move to next stage when eligible |  |  |
| VAL-001C-11 | Restart flow | Restart / next in-game transition returns to playable runtime |  |  |
| VAL-001C-12 | Exit flow | Exit/result-to-lobby flow returns to OutGame without obvious state break |  |  |

## Pass Criteria

VAL-001C passes if:

- no crash occurs during the smoke path,
- combat hit feedback is readable enough for current prototype stage,
- projectile and dust visuals are present and understandable,
- result screen values are readable,
- restart / next-stage / exit transitions do not obviously break runtime state.

## Fail Handling

For each `FAIL`:

1. Capture short evidence: screenshot, clip, exact observation, or log snippet.
2. Create or update a follow-up bug task.
3. Do not fix during VAL-001C unless the user explicitly approves scope expansion.

## Notes

VAL-001C is intentionally not a balance pass. Do not judge final numbers unless they block basic validation.

VAL-001C is also not a build-system task. If the game cannot be launched because no local executable/build path is available, mark startup as `BLOCKED` and create a build/run instructions follow-up.

Related home-playtest note:

```text
_Docs/VisualTests/Manual_Runtime_Checks_2026-06-11.md
```

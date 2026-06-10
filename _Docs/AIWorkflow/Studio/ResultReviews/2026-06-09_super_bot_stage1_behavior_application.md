# Super Bot Stage 1 Behavior Application Review

Date: 2026-06-09
Status: Completed
Scope: Apply Universal AI Staff Behavior and Super Bot Stage 1 operating rules to Hermes skill and repo harness documents.

## Summary

Applied the Super Bot Stage 1 behavior model in two layers:

1. Hermes layer
   - Created Hermes skill `super-bot-stage1`.
   - Purpose: staff identity, universal behavior, scope-based approval, uncertainty signaling, verification honesty, Discord/runtime habits.

2. Workflow / repo harness layer
   - Created `_Docs/AIWorkflow/Universal_AI_Staff_Behavior.md`.
   - Created `_Docs/AIWorkflow/SuperBot_Stage1_Operating_Charter.md`.
   - Purpose: durable repo-level rules, layer boundaries, document locations, end-to-end flowchart.

## Files Changed

- `C:/Users/kalux/AppData/Local/hermes/skills/autonomous-ai-agents/super-bot-stage1/SKILL.md`
- `C:/Users/kalux/AppData/Local/hermes/config.yaml`
- `AGENTS.md`
- `_Docs/AIWorkflow/Universal_AI_Staff_Behavior.md`
- `_Docs/AIWorkflow/SuperBot_Stage1_Operating_Charter.md`
- `_Docs/AIWorkflow/SuperBot_Stage1_Flowchart.html`
- `_Docs/AIWorkflow/Studio/WorkOrders/2026-06-09_super_bot_stage1_implementation_roadmap.md`
- `_Docs/AIWorkflow/Studio/ResultReviews/2026-06-09_super_bot_stage1_behavior_application.md`

## Behavior / Model Summary

The applied model separates:

- Universal AI Staff Behavior: common rules for Super Bot and future staff.
- Super Bot Stage 1: single end-spec 1:1 employee rules.
- Workflow / repo harness: local project rules, approval gates, document outputs, validation, DevLog.

The Karpathy-inspired methodology was not copied verbatim. It was adapted into:

- Think Before Acting
- Signal Uncertainty
- Simplicity with Maintainability
- Surgical Scope Control
- Goal/Evidence-Driven Execution
- Permission Boundary
- Non-interactive Fallback

## Design vs Completion Gap

Initial intended design:

- Put common staff behavior into Hermes skill.
- Put repo-specific harness rules and flowchart into `_Docs/AIWorkflow/`.
- Keep Super Bot rules separate from future staff role rules.

Actual completion:

- Same as intended.
- Added explicit default document locations.
- Added Mermaid end-to-end flowchart inside the Super Bot charter.
- Added standalone readable HTML flowchart at `_Docs/AIWorkflow/SuperBot_Stage1_Flowchart.html`.
- Added Windows/Discord runtime path notes.
- Added short `AGENTS.md` references to the new AI staff behavior and Super Bot charter documents.
- Configured Discord channel `1499317420148658299` with `channel_skill_bindings` so new sessions in that channel auto-load `super-bot-stage1`.
- Added WorkOrder roadmap splitting Super Bot implementation into Batch 0-6.

Gap:

- Existing Discord sessions may not receive the auto-loaded skill until a new gateway session is created. Use `/reset`, a new thread/session, or an explicit `/skill super-bot-stage1` if immediate confirmation is needed.

## Validation Commands / Checks

Validation performed:

```bash
git -C /c/Users/kalux/workStation/play-ground status --short
test -f /c/Users/kalux/workStation/play-ground/_Docs/AIWorkflow/Universal_AI_Staff_Behavior.md
test -f /c/Users/kalux/workStation/play-ground/_Docs/AIWorkflow/SuperBot_Stage1_Operating_Charter.md
test -f /c/Users/kalux/workStation/play-ground/_Docs/AIWorkflow/Studio/ResultReviews/2026-06-09_super_bot_stage1_behavior_application.md
test -f /c/Users/kalux/workStation/play-ground/_DevLog/WorkLog/2026-06-09_super_bot_stage1_behavior_application.md
hermes config check
hermes gateway restart
hermes gateway status
grep -A7 -B3 'channel_skill_bindings' /c/Users/kalux/AppData/Local/hermes/config.yaml
```

Validation results:

- Hermes skill `super-bot-stage1` was created and loaded successfully with `skill_view`.
- Repo documents exist at the intended paths.
- `AGENTS.md` now references the new Universal AI Staff Behavior and Super Bot Stage 1 charter documents.
- Discord channel `1499317420148658299` now has `channel_skill_bindings` for `super-bot-stage1` in `config.yaml`.
- `hermes config check` passed.
- Gateway restarted and is running after the config change.
- Git status shows the expected workflow/DevLog files plus pre-existing untracked `_Docs/VisualTests/`.
- No game source code or build settings were changed.

## Remaining Risks

- The new Hermes skill affects future sessions only when loaded or selected by the skill router.
- Discord sessions may need `/reset`, `/restart`, or explicit `/skill super-bot-stage1` depending on platform skill loading behavior.
- Repo harness documents are durable, but `AGENTS.md` does not yet point to them explicitly.
- Mermaid rendering depends on the viewer; plain markdown still contains the full flowchart source.

## Human Decisions Needed

- Decide whether to add a short `AGENTS.md` reference to these new documents.
- Decide whether Discord Super Bot should explicitly load `super-bot-stage1` via `/skill` during operation.
- Decide whether to later create role-specific staff documents for Planner / Implementer / Reviewer / Archivist / Researcher.

## Commit Recommendation

Do not commit automatically.

If validation passes and the user accepts the new rules, commit only after user approval.

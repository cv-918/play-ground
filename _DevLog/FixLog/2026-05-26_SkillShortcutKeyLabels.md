# Skill Shortcut Key Labels

## Summary

Changed in-game and out-game skill widget shortcut labels so they use the current input mapping for `Skill1` and `Skill2` instead of fixed `CTRL` and `ALT` text.

## Background

The user identified a bug-fix-like UI issue:

```text
인게임, 아웃게임 스킬 위젯에서 단축키를 표시하는 텍스트를 기존 Ctrl, Alt 표시하는 것에서 매핑된 키를 노출하는 것으로 바꾼다.
```

This was routed through:

```text
_Docs/Handoff/Packets/HANDOFF-20260526-002-skill-shortcut-key-labels/
```

The user approved the DeveloperPlan in chat on 2026-05-26 with:

```text
좋아 그럼 승인할게 진행해봐
```

## Scope

Included:

- `InGamePlayView.cpp`
- `OutGameSkillView.cpp`
- UI label text for `Skill1` and `Skill2`

Excluded:

- Input remapping behavior
- `Skill.json`
- JSON schema
- Skill equip behavior
- Skill activation behavior
- Save/load behavior
- Assets
- Build settings
- Git commit/push

## Files Changed

- `PlayGround/Project/Gameplay/UI/Views/InGamePlayView.cpp`
- `PlayGround/Project/Gameplay/UI/Views/OutGameSkillView.cpp`

## Implementation Notes

Both views now:

- Query `_InputMgr.GetCurrentPreset()`
- Query `_InputMgr.TryGetPrimaryBinding(...)` for `InputAction::Skill1` and `InputAction::Skill2`
- Convert the binding through `InputDisplayText::ToBindingText(...)`
- Use `L"-"` if a primary binding is unavailable
- Refresh labels during view update so visible text can follow preset/remap changes while the view is alive

## Review Summary

Self-review found no scope violations.

The change is limited to source UI label generation and reuses existing input display text behavior.

## Validation Summary

Build command:

```bat
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" PlayGround\PlayGround.sln /t:Build /p:Configuration=Debug /p:Platform=x64 /m /v:minimal
```

Build result:

- Passed.
- Generated `PlayGround/_Bin/Debug/x64/PlayGround.exe`.
- MSBuild reported two `_double` to `_float` conversion warnings in `InGamePlayView.cpp`. These are from existing stage progress ratio calls, not from the new shortcut label helper.

Runtime validation:

- Passed by human developer on 2026-05-27.
- Out-game and in-game skill widgets both displayed `Q` / `E`.
- Skill equip and activation behavior had no observed issue.

## Remaining Risks

- If future UX requires special formatting for long key labels, that should be handled as a separate UI polish task.

## AI Assistance

Implemented by Codex after Handoff DeveloperPlan approval.

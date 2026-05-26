# Planning Brief: Skill Shortcut Key Label Mapping

## Summary

The approved planning direction is to change the shortcut text shown on in-game and out-game skill widgets.

Current visible behavior:

- Skill widget shortcut labels show fixed text such as `CTRL` and `ALT`.

Desired visible behavior:

- Skill widget shortcut labels should show the actual mapped keys for the skill actions.
- For example, if `Skill1` is mapped to `Q`, the first skill slot should show `Q`, not `CTRL`.
- If a preset maps `Skill1` or `Skill2` to mouse buttons, the label should show the mapped mouse input text.

## Korean Summary

이번 기획은 버그 수정에 가까운 UI 표시 개선이다.

인게임/아웃게임 스킬 위젯의 단축키 표시가 현재는 `CTRL`, `ALT`처럼 고정 문구로 보인다. 이 표시를 실제 입력 매핑에 맞춰 `Q`, `E`, `Mouse1`, `Mouse2` 같은 현재 매핑 키로 바꾸는 것이 목표다.

이 기획 방향은 승인되었지만, 실제 코드 수정 승인은 아직 아니다.

## Scope

Included:

- In-game skill slot shortcut labels.
- Out-game equipped skill slot shortcut labels.
- Display text should come from the active input mapping or the same input-display helper used by the input option UI.

Excluded:

- Input remapping behavior changes.
- Skill equip behavior changes.
- Skill data schema changes.
- `Skill.json` content changes.
- Save/load behavior changes.
- Asset or art changes.
- Broad UI redesign.

## User-Facing Intent

The player should see the key they actually need to press for each skill slot.

This reduces confusion when the selected input preset or mapping does not match the old fixed `CTRL` / `ALT` text.

## Risk Notes

This is a small bug-fix-like request, but implementation will still modify source files and visible UI behavior.

The Developer must therefore prepare a plan and wait for explicit user approval before editing source files.

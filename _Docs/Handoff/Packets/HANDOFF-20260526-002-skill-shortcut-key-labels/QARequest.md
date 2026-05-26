# QA Request: Skill Shortcut Key Label Mapping

## Purpose

Verify that the implemented skill shortcut label change is visible in the game UI.

## Korean Summary

QA는 실제 화면에서 스킬 단축키 표시가 고정 `CTRL`, `ALT`가 아니라 현재 입력 매핑 키로 보이는지 확인한다.

확인해야 할 화면:

- 인게임 스킬 위젯
- 아웃게임 장착 스킬 위젯

## What To Check

Check that:

- Slot 1 displays the current mapped key for `Skill1`.
- Slot 2 displays the current mapped key for `Skill2`.
- The labels are not fixed to `CTRL` and `ALT`.
- Skill equip behavior is unchanged.
- Skill activation behavior is unchanged.

Recommended baseline:

- `KeyboardA` should display `Q` and `E` if the default preset is active.
- Mouse-oriented presets should display mouse button text through the existing input display helper.

## Validation Already Performed

Build succeeded:

```bat
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" PlayGround\PlayGround.sln /t:Build /p:Configuration=Debug /p:Platform=x64 /m /v:minimal
```

## Validation Not Performed

Runtime visual validation has not been performed yet.

## QA Result Location

Write the result to:

```text
_Docs/Handoff/Packets/HANDOFF-20260526-002-skill-shortcut-key-labels/Results/QAResult.md
```

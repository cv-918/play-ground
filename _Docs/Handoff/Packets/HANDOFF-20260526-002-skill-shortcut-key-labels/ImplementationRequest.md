# Implementation Request: Skill Shortcut Key Label Mapping

## Request

Update the in-game and out-game skill widget shortcut labels so they show the currently mapped key for `Skill1` and `Skill2` instead of fixed `CTRL` and `ALT` text.

## Korean Summary

Developer는 바로 구현하지 말고 먼저 `Results/DeveloperPlan.md`를 작성해야 한다.

요청 내용은 다음과 같다.

- 인게임 스킬 슬롯 1, 2의 단축키 라벨을 실제 매핑 키로 표시한다.
- 아웃게임 장착 스킬 슬롯 1, 2의 단축키 라벨도 실제 매핑 키로 표시한다.
- 기존처럼 `CTRL`, `ALT`를 고정 표시하지 않는다.
- 입력 매핑 자체, 스킬 장착 로직, JSON 데이터, 저장 구조는 바꾸지 않는다.

## Repository Context Observed

Likely hard-coded labels:

- `PlayGround/Project/Gameplay/UI/Views/InGamePlayView.cpp`
  - `CreateElement<InGameSkillSlot>(0, L"CTRL")`
  - `CreateElement<InGameSkillSlot>(1, L"ALT")`
- `PlayGround/Project/Gameplay/UI/Views/OutGameSkillView.cpp`
  - `CreateElement<OutGameSkillSlot>(0, L"CTRL")`
  - `CreateElement<OutGameSkillSlot>(1, L"ALT")`

Relevant input display helpers:

- `PlayGround/Project/EngineSystems/Input/InputDisplayText.h`
- `PlayGround/Project/EngineSystems/Input/InputDisplayText.cpp`
  - `InputDisplayText::ToKeyCodeText`
  - `InputDisplayText::ToBindingText`

Relevant input mapping API:

- `PlayGround/Project/EngineSystems/Input/InputManager.h`
  - `InputAction::Skill1`
  - `InputAction::Skill2`
  - `TryGetPrimaryBinding`
  - `GetCurrentPreset`

Existing reference usage:

- `PlayGround/Project/Gameplay/UI/Views/OutGameOptionView.cpp`
  - Uses `InputDisplayText::ToBindingText(binding)` for option UI key labels.

## Expected Developer Plan

The DeveloperPlan should explain:

- What visible behavior will change.
- Which source files are expected to change.
- Whether labels are set once during view construction or refreshed when input preset/mapping changes.
- Which files are explicitly not part of the implementation.
- How the change will be validated.

## Non-Goals

- Do not change input remapping rules.
- Do not change action names.
- Do not change `Skill.json`.
- Do not change skill equip or skill activation logic.
- Do not change save/load behavior.
- Do not add new assets.
- Do not redesign the option UI.
- Do not commit or push.

## Approval Boundary

This Packet is planning approval only.

Any source code edit, UI behavior change, build/test execution, DevLog completion claim, commit, or push requires the user's explicit next approval after reviewing `Results/DeveloperPlan.md`.

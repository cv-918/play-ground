# Developer Plan: Skill Shortcut Key Label Mapping

## Approval Required

Yes.

This plan is waiting for user approval. No source code, gameplay JSON, resource file, build setting, commit, or push has been changed for this Packet.

## Korean Summary

네가 해야 할 일은 이 구현 범위를 승인할지, 거절할지, 범위를 줄일지 결정하는 것이다.

이번 변경 제안은 다음과 같다.

- 인게임 스킬 위젯의 `CTRL`, `ALT` 고정 표시를 실제 매핑 키 표시로 바꾼다.
- 아웃게임 스킬 위젯의 `CTRL`, `ALT` 고정 표시도 실제 매핑 키 표시로 바꾼다.
- 예를 들어 현재 프리셋에서 `Skill1 = Q`, `Skill2 = E`라면 스킬 슬롯에는 `CTRL`, `ALT`가 아니라 `Q`, `E`가 보여야 한다.
- 입력 매핑 자체, 스킬 데이터, 스킬 장착 로직, 저장 구조는 바꾸지 않는다.

## What Will Change

The visible shortcut labels on skill slots will be based on the current input binding for:

- `InputAction::Skill1`
- `InputAction::Skill2`

The implementation should reuse the existing input display text path rather than inventing new label names.

Expected helper path:

- Query the current preset from the input manager.
- Query the primary binding for `Skill1` and `Skill2`.
- Convert that binding with `InputDisplayText::ToBindingText`.
- Pass the resulting display text to the skill slot widgets instead of fixed `L"CTRL"` and `L"ALT"`.

## Files Proposed For Modification

Allowed in this approval request:

- `PlayGround/Project/Gameplay/UI/Views/InGamePlayView.cpp`
- `PlayGround/Project/Gameplay/UI/Views/OutGameSkillView.cpp`
- `_DevLog/FixLog/`

## Files Not Approved

Do not modify these without a new approval:

- `PlayGround/Data/`
- `PlayGround/Resources/`
- `PlayGround/Project/EngineSystems/Input/InputManager.*`
- `PlayGround/Project/EngineSystems/Input/InputDisplayText.*`
- Skill equip or activation systems
- Save/load systems
- Build settings

If the implementation needs any of those paths, stop and ask for expanded approval.

## Non-Goals

- Do not change how skills are activated.
- Do not change how input is mapped.
- Do not change `Skill.json`.
- Do not change JSON schema.
- Do not redesign skill widgets.
- Do not add art or resource files.
- Do not commit or push.

## Risks

- The minimal implementation can likely update labels at view creation time.
- If labels must live-refresh after remapping while the same view instance remains open, that may require a wider UI refresh path and should be treated as a separate approval.
- Runtime verification may require launching the game and checking both in-game and out-game skill widgets.

## Validation Plan

If approved:

- Review the source diff to confirm only approved files changed.
- Build the project if the local build command is available and approved.
- Manually check or document inability to check:
  - In-game skill widget labels.
  - Out-game equipped skill widget labels.
  - At least one non-`CTRL` / non-`ALT` mapping case.
- Write a FixLog with validation results or explicit validation deferral.

## User Decision Needed

Choose one:

- Approve: proceed within the listed file scope.
- Reject: delete or archive this Packet.
- Modify scope: specify which files or behavior should change.

Recommended approval wording:

```text
HANDOFF-20260526-002 DeveloperPlan 승인. InGamePlayView.cpp와 OutGameSkillView.cpp만 수정해서 인게임/아웃게임 스킬 위젯 단축키 라벨을 현재 매핑 키로 표시하는 범위로 진행해. 필요하면 빌드 검증까지 실행해.
```

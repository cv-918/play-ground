# Implementation Request: Dry-Run Plan For Outgame Resolution Position Follow-Up

## Target Role

Developer

## Request Type

Dry-run planning only.

## Required Dry-Run Output

The Developer Worker should write:

```text
_Docs/Handoff/Packets/HANDOFF-20260528-008-developer-worker-dry-run-plan-pilot/Results/DeveloperDryRunPlan.md
```

It should also write its normal timestamped automation run report under:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/
```

## Topic

Review the already implemented outgame resolution-change character position fix and propose a future implementation plan only if additional hardening or cleanup appears useful.

## Approved Source Inspection Scope

The dry-run may read:

- `PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp`
- `PlayGround/Project/Gameplay/World/Background.cpp`
- `PlayGround/Project/Gameplay/World/Background.h`

Nearby source may be read only when needed to understand these files.

## Korean Summary

아웃게임 해상도 변경 시 캐릭터 위치 유지 수정이 이미 들어간 영역을 dry-run으로 검토한다.

자동화는 구현 계획만 작성하고, source 수정은 하지 않는다.

## Strict Non-Goals

- No source edits.
- No JSON or schema edits.
- No asset edits.
- No build/test execution.
- No runtime behavior changes.
- No status, manifest, approval evidence, DevLog, commit, or push changes from the automation.

## Expected Plan Contents

`DeveloperDryRunPlan.md` should explain:

- what the current code appears to do
- whether future implementation work seems needed
- which files would be expected to change if implementation were later approved
- validation that would be needed in implementation mode
- stop conditions for implementation mode

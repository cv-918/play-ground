# AI Role Handoff System Phase 7B Skill Shortcut Pilot

## Summary

Created a replacement Planner to Developer pilot Packet for the AI Role Handoff System using the user-approved planning direction:

```text
Show mapped skill keys on in-game and out-game skill widgets instead of fixed CTRL and ALT labels.
```

The pilot verified that the Handoff Supervisor can detect both the initial `Ready` state and the later `WaitingUserApproval` state for a real, accepted, bug-fix-like design request.

## Background

The previous Phase 7B candidate, `HANDOFF-20260526-001-m001-projectile-attack-pilot`, was rejected by the user as an unsuitable simple planning example and removed before commit.

The user then proposed a smaller, practical UI display correction:

```text
인게임, 아웃게임 스킬 위젯에서 단축키를 표시하는 텍스트를 기존 Ctrl, Alt 표시하는 것에서 매핑된 키를 노출하는 것으로 바꾼다.
```

This was treated as planning direction approval only. It was not treated as source implementation approval.

## Scope

- Create a Planner to Developer Handoff Packet.
- Keep all work document-only.
- Inspect relevant source locations to make the DeveloperPlan concrete.
- Do not change source code.
- Do not change gameplay JSON.
- Do not run build or runtime validation.
- Do not approve implementation.
- Do not commit or push.

## Files Changed

- `_Docs/Handoff/Packets/HANDOFF-20260526-002-skill-shortcut-key-labels/manifest.yaml`
- `_Docs/Handoff/Packets/HANDOFF-20260526-002-skill-shortcut-key-labels/PlanningBrief.md`
- `_Docs/Handoff/Packets/HANDOFF-20260526-002-skill-shortcut-key-labels/ImplementationRequest.md`
- `_Docs/Handoff/Packets/HANDOFF-20260526-002-skill-shortcut-key-labels/Results/DeveloperPlan.md`
- `_Docs/Handoff/00_Index.md`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/Developer.md`
- `_Docs/Handoff/Queues/Planner.md`
- `_Docs/Handoff/Queues/Artist.md`
- `_Docs/Handoff/Queues/Reviewer.md`
- `_Docs/Handoff/Queues/QA.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Guide/Handoff_System_User_Guide_KR.html`
- `_Docs/Handoff/Handoff_Supervisor_MVP.md`
- `_Docs/Handoff/Handoff_Supervisor_MVP_KR.md`

## Packet

```text
HANDOFF-20260526-002-skill-shortcut-key-labels
```

Current state:

```yaml
delivery_status: Claimed
execution_status: WaitingUserApproval
risk_level: High
approval_required: true
approval_state: Requested
approval_request_path: Results/DeveloperPlan.md
```

## DeveloperPlan Approval Request

The DeveloperPlan asks the user to approve, reject, or modify this implementation scope:

- Modify only `InGamePlayView.cpp` and `OutGameSkillView.cpp`.
- Change skill shortcut labels from fixed `CTRL` / `ALT` to current mapped key labels.
- Do not modify input remapping rules.
- Do not modify `Skill.json`.
- Do not modify input manager or input display helpers without expanded approval.
- Write a FixLog after implementation if approved.

## Supervisor Validation

With the Packet initially in:

```yaml
delivery_status: Ready
execution_status: NotStarted
```

Supervisor observed:

- `All Packets: 2`
- `Active Packets: 1`
- `Ready Work: 1`
- `Waiting Approval: 0`
- `Consistency Issues: 0`

After `Results/DeveloperPlan.md` was added and the manifest was moved to:

```yaml
delivery_status: Claimed
execution_status: WaitingUserApproval
approval_required: true
approval_state: Requested
approval_request_path: Results/DeveloperPlan.md
```

Supervisor observed:

- `All Packets: 2`
- `Active Packets: 1`
- `Waiting Approval: 1`
- `Ready Work: 0`
- `In Progress: 1`
- `Consistency Issues: 0`

The generated Dashboard and Developer queue now surface the approval request.

## AIWorkflow User Guide Decision

The canonical AIWorkflow user guide was not updated because this pilot does not alter Discord commands, PC Runner behavior, executor routing, task finalization, commit/push steps, or regular AIWorkflow user intervention points.

The Handoff System HTML guide was updated because this work changes the Handoff phase status and user-facing Handoff operation surface.

## Validation Not Performed

- No game source build was run.
- No runtime playtest was run.
- No JSON smoke check was run.
- No source or gameplay JSON was modified.
- No commit or push was performed.

## Remaining Risks

- The actual implementation is still waiting for the user's DeveloperPlan decision.
- Live refresh after input remapping may require expanded approval if the minimal view-construction label change is not enough.
- The Handoff Supervisor still does not schedule itself or wake other role chats.
- The manifest parser remains a simple YAML-like parser.

## Next Tasks

- User approves, rejects, or modifies `Results/DeveloperPlan.md`.
- If approved, proceed only within the approved source file scope.
- After implementation, create a FixLog and run/document validation.

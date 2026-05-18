# Studio Meeting Sessions

This folder is the default durable store for AIWorkflow Studio
`MeetingSession` JSON files.

Meeting sessions are the Studio layer's record of staff discussion, objections,
unresolved questions, Human Director decisions, accepted directions, rejected
directions, and follow-up WorkOrders.

Use the local meeting runtime tool to inspect and validate durable meetings:

```bat
tools\aiworkflow\studio_meeting_runtime.bat status
tools\aiworkflow\studio_meeting_runtime.bat validate
tools\aiworkflow\studio_meeting_runtime.bat list
tools\aiworkflow\studio_meeting_runtime.bat read <meeting_id>
```

Use `inspect` and `handoff` for a meeting JSON file before turning its follow-up
items into WorkOrders:

```bat
tools\aiworkflow\studio_meeting_runtime.bat inspect <meeting_json_path>
tools\aiworkflow\studio_meeting_runtime.bat handoff <meeting_json_path>
```

Writing a meeting record requires an explicit execute flag:

```bat
tools\aiworkflow\studio_meeting_runtime.bat create <meeting_json_path> --execute
```

Lifecycle transitions are explicit and reviewable:

```bat
tools\aiworkflow\studio_meeting_runtime.bat start <meeting_id> --execute
tools\aiworkflow\studio_meeting_runtime.bat add-turn <meeting_id> <speaker_id> <turn_type> "<content>" --execute
tools\aiworkflow\studio_meeting_runtime.bat transition <meeting_id> <status> --execute
tools\aiworkflow\studio_meeting_runtime.bat finalize <meeting_id> --execute
```

`finalize` computes the next safe meeting state:

- unresolved questions without director decisions -> `director_decision_needed`
- follow-up WorkOrders present -> `follow_up_tasking`
- otherwise -> `closed`

Safety rules:

- Meeting consensus is not approval.
- Proposals are not canon.
- Unresolved questions must stay visible.
- Follow-up WorkOrders must go through WorkOrder planning and AIWorkflow task
  governance before execution.
- Meeting writes do not create WorkOrders, tasks, approvals, runners, commits,
  or pushes.

# Studio Handoffs

This folder stores governed `Handoff` records between AI staff agents.

A handoff is a proposed transfer of responsibility from one staff agent to
another. It carries the reason, required input context, expected output,
constraints, and evidence refs.

A handoff does not run the target agent by itself. The next step is to create a
sealed StaffContextPacket and then use the normal RoleRun and approval flow.

Use the local deterministic router to preview or create that context packet:

```bat
tools\aiworkflow\studio_handoff_router.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_to_game_designer_handoff.example.json
tools\aiworkflow\studio_handoff_router.bat create-context _Docs\AIWorkflow\Studio\Examples\scenario_to_game_designer_handoff.example.json --execute
```

The router validates that both staff agents exist and that the source agent is
allowed to hand off to the target agent. If `evidence_refs` points to a
`RoleRunOutput` id such as `RRO-...`, the router tries to include short
evidence summaries in the target context packet. This prevents the next staff
agent from receiving only opaque artifact IDs.

It writes only a StaffContextPacket when `--execute` is explicit. It does not
execute the target staff agent, approve the handoff, write canon, create tasks,
edit source files, commit, or push.

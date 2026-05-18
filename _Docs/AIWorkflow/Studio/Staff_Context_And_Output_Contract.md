# Staff Context And Output Contract

## Purpose

This document turns the StaffAgent runtime idea into two concrete records:

- `StaffContextPacket`
- `RoleRunOutput`

These records keep staff agents from becoming loose roleplay prompts.

## StaffContextPacket

`StaffContextPacket` is the sealed context envelope given to a StaffAgent before
a RoleRun starts.

It answers:

- who is speaking
- which role and department they belong to
- what the director wants
- what scope is approved
- what must stay out
- which memory is canon, approved, proposed, rejected, or evidence
- which tools are allowed
- which tools require approval
- what output must be produced
- when the agent must stop

The schema is:

```text
_Docs/AIWorkflow/Studio/Schemas/StaffContextPacket.schema.json
```

The first local builder is:

```bat
tools\aiworkflow\studio_context_builder.bat plan scenario_director _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json
tools\aiworkflow\studio_context_builder.bat create scenario_director _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json --execute
```

The builder reads the StaffAgent registry, a WorkOrder, and optional matching
MemoryRecord refs. It creates a sealed context packet, not a loose prompt. It
does not run the staff agent or call an LLM.

The first local prompt exporter is:

```bat
tools\aiworkflow\studio_staff_prompt_exporter.bat export _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
```

The exporter turns a sealed context packet into a Codex-ready staff execution
prompt that requires `RoleRunOutput` JSON. It writes only `_Temp` prompt
artifacts and does not call an LLM.

The first local signed-in Codex executor is:

```bat
tools\aiworkflow\studio_staff_executor.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
tools\aiworkflow\studio_staff_executor.bat run _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json --execute
```

The executor uses the signed-in Codex App/CLI route with a read-only sandbox.
It does not use OpenAI API billing by default. Its output is still evidence
until routed through materialization, review, and the normal governance gates.

## RoleRunOutput

`RoleRunOutput` is the structured answer from a StaffAgent.

It may contain:

- proposals
- objections
- questions
- approval items
- handoff requests
- WorkOrder recommendations
- evidence references
- memory write requests

The schema is:

```text
_Docs/AIWorkflow/Studio/Schemas/RoleRunOutput.schema.json
```

The first local materializer is:

```bat
tools\aiworkflow\studio_output_materializer.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
tools\aiworkflow\studio_output_materializer.bat materialize _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json --execute
```

The materializer may create draft/proposed Proposal, MemoryRecord, WorkOrder,
and Handoff records. It does not approve staff output, write canon, create
Backlog tasks, execute implementation, commit, or push.

## Required Behavior

A StaffAgent must not answer only in prose when running as part of Studio
Runtime.

It must produce a `RoleRunOutput` record or a blocked/error output explaining
what context is missing.

## Missing Context Rule

If the context packet lacks required information, the agent must not invent it.

It must return one of:

```text
needs_director_decision
needs_evidence
blocked
failed
```

Examples:

```text
Scenario Director cannot find canon status.
  -> ask a canon question or return blocked.

QA Tester cannot find build/test evidence.
  -> return needs_evidence.

Technical Architect cannot identify approved source scope.
  -> ask for approval scope or return blocked.
```

## Approval Item Rule

Approval requests must be concrete.

They must not say:

```text
Approve work within scope.
```

They must say:

```text
Approve changing UserData.json stage_progress default handling only.
No JSON schema change, no unrelated gameplay tuning, no asset import.
Evidence required: JSON smoke, loader readability check, Debug x64 build.
```

## Safety Rule

`RoleRunOutput.safety` must explicitly say whether the RoleRun changed:

- source files
- task records
- approvals
- canon
- commit or push state

For early read-only Studio slices, every field must remain `false`.

## Relationship To RoleRun

`RoleRun` records the execution session.

`StaffContextPacket` records the input.

`RoleRunOutput` records the result.

```text
RoleRun
  -> context_packet_ref
  -> output_refs
```

This separation makes later auditing possible:

- what the agent knew
- what it was allowed to do
- what it recommended
- what it asked approval for
- what evidence it used

## Examples

Example records are stored under:

```text
_Docs/AIWorkflow/Studio/Examples/
```

Current examples:

```text
scenario_director_context_packet.example.json
scenario_director_role_run_output.example.json
creative_meeting_session.example.json
scenario_pitch_work_order.example.json
scenario_pitch_task_binding.example.json
protagonist_motivation_proposal.example.json
protagonist_motivation_decision.example.json
protagonist_motivation_canon_memory.example.json
protagonist_motivation_rejected_memory.example.json
```

These examples are read-only contract fixtures. They demonstrate how a
Scenario Director receives sealed context, refuses to canonize unsupported
story facts, creates explicit approval items, and recommends a follow-up
WorkOrder without changing source, task state, canon, commit, or push state.

The meeting/work order examples demonstrate the next handoff:

```text
Scenario Director RoleRunOutput
  -> Creative MeetingSession
  -> scenario pitch WorkOrder
  -> proposed AIWorkflow Task binding
```

This shows the Studio layer producing structured follow-up work without
bypassing existing AIWorkflow task approval, runner, completion, or git gates.

The canon examples demonstrate the governance boundary:

```text
proposal
  -> Human Director decision
  -> canon memory
```

Rejected ideas are also recorded as rejected memory so future staff agents do
not repeatedly propose them as if they were new.

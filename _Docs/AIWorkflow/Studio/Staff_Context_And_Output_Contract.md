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

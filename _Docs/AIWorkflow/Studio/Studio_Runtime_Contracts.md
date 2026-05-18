# Studio Runtime Contracts

## Purpose

This document defines the runtime contracts for persistent AI staff agents,
creative meetings, memory access, role runs, tool runs, handoffs, and evidence.

It is a product-level design contract for the Personal AI Development Studio.

It does not implement live autonomous staff execution yet.

## Non-Negotiable Principle

```text
Agent Autonomy within Workflow Governance.
```

Staff agents may reason, propose, object, ask questions, and hand work to other
staff inside their role charter.

They may not directly approve, canonize, implement, import, commit, push, or
release outside governance.

## Staff Agent Runtime Contract

A persistent StaffAgent is not a prompt.

A StaffAgent runtime invocation must be built from:

- StaffAgent registry record
- Department registry record
- role charter
- authority rules
- memory policy
- tool policy
- output contracts
- meeting behavior
- handoff behavior
- evidence responsibility
- quality criteria
- current project profile
- current WorkOrder, MeetingSession, Task, or Director goal
- relevant approved decisions and memory records

The runtime must produce structured output, not only free-form chat.

The concrete input/output contracts are defined in:

```text
_Docs/AIWorkflow/Studio/Staff_Context_And_Output_Contract.md
_Docs/AIWorkflow/Studio/Schemas/StaffContextPacket.schema.json
_Docs/AIWorkflow/Studio/Schemas/RoleRunOutput.schema.json
```

## Staff Context Packet

Every RoleRun must receive a context packet with these fields:

```text
role_run_id
agent_id
department_id
source_type
source_ref
objective
current_project_profile
director_intent
approved_scope
non_goals
relevant_memory_refs
relevant_decision_refs
relevant_evidence_refs
allowed_tools
blocked_tools
approval_required_tools
required_outputs
quality_criteria
stop_conditions
```

If any required field is missing, the agent must ask a question or return a
blocked output instead of inventing missing context.

## RoleRun Lifecycle

```text
created
context_loaded
planning
tool_review
running
handoff_pending
output_ready
needs_director_decision
completed
blocked
failed
cancelled
```

### RoleRun Responsibilities

A RoleRun may:

- inspect allowed context
- search approved memory/document sources
- produce proposals
- object to risks
- ask clarifying questions
- request approval items
- recommend WorkOrders
- hand off to another staff agent

A RoleRun may not:

- write canon directly unless explicitly authorized
- execute source edits directly
- approve its own proposal
- mark tasks done
- claim validation without evidence
- commit or push

## ToolRun Contract

ToolRun is the trace of a tool invocation requested by a RoleRun, Runner, or
Studio API.

ToolRun must record:

- tool_run_id
- requester role_run_id or system actor
- tool_id
- command or adapter name
- input summary
- approval reference when needed
- start/end time
- exit status
- evidence paths
- error summary
- safety flags

ToolRun may produce evidence.

ToolRun cannot decide approval, verification pass/fail, completion, or commit.

## Memory Access Contract

Memory is not a single bucket.

Memory records must be tagged by:

- scope
- status
- source
- owner
- project profile
- related WorkOrder or Task
- evidence refs
- supersedes/superseded_by links when applicable

Allowed memory statuses:

```text
draft
proposed
approved
canon
rejected
deprecated
superseded
evidence
lesson
```

### Memory Read Rules

Staff agents may read memory according to their registry `memory_policy`.

The context loader must distinguish:

- canon facts
- approved decisions
- proposals
- rejected ideas
- lessons
- evidence

Agents must not treat proposals as canon.

### Memory Write Rules

Staff agents may draft memory records only inside their writable scopes.

Writing `approved` or `canon` memory requires governance:

- explicit Human Director decision, or
- deterministic policy decision that is allowed for that memory type

Rejected and superseded memory must remain searchable so agents do not repeat
old mistakes.

## Canon Governance Contract

Canon is the set of approved project facts that future creative, design, art,
and implementation work must respect.

Canon can include:

- worldbuilding facts
- character facts
- tone and art direction
- gameplay identity
- data/schema conventions
- architecture decisions
- project constraints

Canon changes require an ApprovalItem that clearly states:

- what changes
- what does not change
- why the change is needed
- affected documents/files/memory
- rollback or supersession plan
- downstream roles affected

No StaffAgent may silently canonize its own output.

## MeetingSession Runtime Contract

A MeetingSession is a structured work session, not a loose chat transcript.

Every MeetingSession must define:

- meeting_session_id
- topic
- source_ref
- participants
- chair role
- agenda
- known constraints
- director intent
- relevant memory refs
- discussion turns
- proposals
- objections
- unresolved questions
- director decisions
- accepted directions
- rejected directions
- follow-up WorkOrders
- evidence refs
- close state

## Meeting Lifecycle

```text
draft
scheduled
context_loaded
in_progress
director_decision_needed
follow_up_tasking
closed
blocked
cancelled
```

## Meeting Behavior Rules

Participants must speak from their role charter.

They must object when their role charter says they must object.

They must ask when director intent, canon, scope, or evidence is unclear.

They must separate:

- idea
- proposal
- accepted direction
- approved decision
- canon
- WorkOrder
- executable Task

Meeting output is incomplete unless it records:

- what was accepted
- what was rejected
- what remains unresolved
- what requires Human Director approval
- what WorkOrders should be created next

The local meeting runtime tool provides the first deterministic implementation
slice for this contract:

```bat
tools\aiworkflow\studio_meeting_runtime.bat inspect <meeting_json_path>
tools\aiworkflow\studio_meeting_runtime.bat handoff <meeting_json_path>
tools\aiworkflow\studio_meeting_runtime.bat create <meeting_json_path> --execute
```

It validates staff participation, chair membership, discussion turn speakers,
unresolved questions, and follow-up WorkOrder ids. It does not create
WorkOrders or tasks by itself.

## Handoff Contract

Handoff is a structured transfer of responsibility between staff agents or
between Studio layer and AIWorkflow Core.

Every handoff must include:

- source actor
- target actor
- objective
- scope
- non-goals
- context refs
- expected output
- evidence requirements
- approval requirements
- stop conditions

Receiving agents may reject or block a handoff if required context is missing.

## Approval Item Contract

Approval requests must be understandable without hunting through logs.

Every approval item must show:

- why approval is needed
- what will change
- what will not change
- files, memory, canon, assets, tools, or runtime behavior affected
- concrete risks
- evidence required after execution
- rollback or correction path

Bad approval text:

```text
Approve execution within scope.
```

Good approval text:

```text
Approve changing UserData.json stage_progress default handling only.
No JSON schema change, no unrelated gameplay tuning, no asset import.
Evidence required: JSON smoke, loader readability check, Debug x64 build.
```

## Evidence Contract

Evidence must be attached to claims.

Examples:

- proposal claim -> source memory or decision refs
- implementation claim -> diff refs and changed file list
- validation claim -> command, exit code, log path, report id
- completion claim -> CompletionReport and FinalizationLog refs
- canon claim -> approved Decision refs

If evidence is missing, output status must be `needs_evidence`, `blocked`, or
`concerns`, not `pass`.

## Provider Independence

The runtime may use OpenAI, Codex CLI, local models, browser adapters, or future
external AI systems.

Default Studio provider policy:

- Use Codex App/CLI signed-in execution first.
- Do not require OpenAI API keys or API billing by default.
- Use other LLM providers only when the Codex/ChatGPT route cannot meet quality
  requirements.
- Staff runtime planning may prepare a RoleRun envelope without calling any LLM.

The first local staff runtime tool is:

```bat
tools\aiworkflow\studio_staff_runtime.bat plan <context_packet_json_path>
tools\aiworkflow\studio_staff_runtime.bat create <context_packet_json_path> --execute
tools\aiworkflow\studio_staff_runtime.bat inspect-output <role_run_output_json_path>
```

It validates StaffContextPacket boundaries, creates RoleRun envelopes, and
checks RoleRunOutput safety flags. It does not call LLMs, call tools, create
WorkOrders, create tasks, approve work, write canon, modify source files,
commit, or push.

Provider-specific behavior must stay behind adapters.

The core records must remain provider-independent:

- StaffAgent
- RoleRun
- ToolRun
- WorkOrder
- MeetingSession
- Proposal
- Decision
- MemoryRecord
- Evidence
- Approval
- Verification
- Completion
- Finalization

## Current Implementation Status

Current status:

```text
read-only design and registry foundation
```

Implemented now:

- durable StaffAgent/Department registries
- core Studio schemas
- WorkOrder to Task bridge schema and rules
- read-only registry status command

Not implemented yet:

- live RoleRun execution
- LLM staff context loader
- memory database
- MeetingSession runner
- WorkOrder creation command
- Studio UI
- autonomous handoff router

Until those exist, Studio records are design/registry artifacts, not live staff.

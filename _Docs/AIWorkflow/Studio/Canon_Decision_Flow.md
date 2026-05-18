# Canon Decision Flow

## Purpose

This document defines how Studio ideas become decisions and, only when
explicitly approved, canon memory.

The goal is to prevent AI staff agents from treating drafts or proposals as
official project truth.

## Core Flow

```text
RoleRunOutput
  -> Proposal
  -> Human Director Decision
  -> MemoryRecord(status=canon)
```

Optional negative path:

```text
Proposal
  -> Human Director Decision(reject)
  -> MemoryRecord(status=rejected)
```

## Rules

1. Proposal is not approval.
2. Approval is not always canon.
3. Canon requires a `Decision` with `decision_type=canonize`.
4. Rejected ideas stay searchable as rejected memory.
5. A StaffAgent may request canonization but may not canonize its own output.
6. Canon memory must cite the approving Decision.
7. Superseding canon requires another Decision.
8. Memory store writes must be explicit; dry-run previews are not durable
   memory.

## Proposal Requirements

A proposal must explain:

- what is being suggested
- why it is useful
- options and tradeoffs
- risks
- dependencies
- approval items
- evidence refs

## Decision Requirements

A canon decision must explain:

- who made the decision
- what is accepted
- what is rejected
- any conditions
- evidence or proposal refs
- timestamp

## Canon Memory Requirements

A canon memory record must include:

- `status=canon`
- `type=canon`
- Human Director or approved policy source refs
- the decision id that canonized it
- clear content that future staff can cite safely

The local memory store rejects canon memory when no `DEC-*` source reference is
present.

## Rejected Memory Requirements

A rejected memory record must include:

- `status=rejected`
- `type=rejection`
- the reason the idea was rejected
- source refs to the proposal or decision

Rejected memory is valuable. It prevents the studio from repeatedly suggesting
the same rejected idea.

## Local Memory Store

The first local proposal/decision tool is:

```bat
tools\aiworkflow\studio_decision_store.bat
```

It supports:

```bat
status
validate
list-proposals
list-decisions
read-proposal <proposal_id>
read-decision <decision_id>
create-proposal <proposal_json_path> [--execute]
create-decision <decision_json_path> [--execute]
canon-plan <decision_id_or_json_path>
```

`create-proposal` and `create-decision` without `--execute` are dry-runs.
`canon-plan` explains whether the next memory record should be `canon`,
`approved`, or `rejected`, but it does not write memory.

The tool does not call LLMs, create tasks, approve implementation, start
runners, write memory, write canon, mark work done, commit, or push.

The first local memory tool is:

```bat
tools\aiworkflow\studio_memory_store.bat
```

It supports:

```bat
status
validate
list
read <memory_id>
create <memory_json_path> [--execute]
```

`create` without `--execute` is a dry-run. `create --execute` writes one
MemoryRecord JSON file to:

```text
_Docs/AIWorkflow/Studio/MemoryRecords/
```

The tool does not approve proposals, canonize ideas, create tasks, start
runners, mark work done, commit, or push.

## Example Files

```text
_Docs/AIWorkflow/Studio/Examples/protagonist_motivation_proposal.example.json
_Docs/AIWorkflow/Studio/Examples/protagonist_motivation_decision.example.json
_Docs/AIWorkflow/Studio/Examples/protagonist_motivation_canon_memory.example.json
_Docs/AIWorkflow/Studio/Examples/protagonist_motivation_rejected_memory.example.json
```

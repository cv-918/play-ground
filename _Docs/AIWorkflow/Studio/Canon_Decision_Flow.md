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

## Rejected Memory Requirements

A rejected memory record must include:

- `status=rejected`
- `type=rejection`
- the reason the idea was rejected
- source refs to the proposal or decision

Rejected memory is valuable. It prevents the studio from repeatedly suggesting
the same rejected idea.

## Example Files

```text
_Docs/AIWorkflow/Studio/Examples/protagonist_motivation_proposal.example.json
_Docs/AIWorkflow/Studio/Examples/protagonist_motivation_decision.example.json
_Docs/AIWorkflow/Studio/Examples/protagonist_motivation_canon_memory.example.json
_Docs/AIWorkflow/Studio/Examples/protagonist_motivation_rejected_memory.example.json
```

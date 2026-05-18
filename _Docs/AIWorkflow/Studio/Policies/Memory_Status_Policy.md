# Memory Status Policy

## Purpose

This policy prevents AI staff agents from mixing ideas, decisions, and canon.

The core rule is:

```text
proposed setting != approved setting != canon
```

## Status Values

| Status | Meaning | Who Can Create It |
|---|---|---|
| `draft` | Raw or unfinished note. Not reliable. | StaffAgent, MeetingSession, Human Director |
| `proposed` | A candidate idea or recommendation. Not approved. | StaffAgent, MeetingSession |
| `approved` | Human Director accepted the item for a defined scope. | Human Director or deterministic approval policy |
| `canon` | Official project fact, setting, design rule, or product decision. | Human Director or explicit canon policy |
| `rejected` | Explicitly declined idea or direction. Useful as negative memory. | Human Director, MeetingSession finalization |
| `deprecated` | Previously valid memory that should no longer guide new work. | Human Director or governance policy |
| `superseded` | Replaced by a newer approved/canon record. | Human Director or governance policy |
| `evidence` | Evidence-bearing memory that points to reports, logs, diffs, screenshots, or review artifacts. | Evidence collector, QA, Documentation Keeper |
| `lesson` | Reusable lesson learned from completed work, failures, reviews, or retrospectives. | Human Director, QA, Documentation Keeper, approved retrospective |

## Rules

- Draft memory must never be cited as fact.
- Proposed memory must be labeled as a proposal.
- Approved memory is scoped; it may be approved for one WorkOrder but not global
  canon.
- Canon memory requires explicit canon authority.
- Rejected memory should remain searchable so agents do not repeatedly propose
  rejected directions.
- Deprecated and superseded records must point to their replacement or reason
  when possible.
- Evidence memory must point to concrete evidence refs and must not be treated
  as approval by itself.
- Lesson memory may guide future work, but it does not override canon or
  current approval gates.
- Every important memory record must include `source_refs`.
- Agents must not write canon directly unless their role policy explicitly
  allows canon proposal and a separate decision approves it.
- Local memory tools must require an explicit write action for durable memory.
- Canon memory writes must fail when no decision reference is present.
- Rejected memory writes must fail when no rejection reason is present.

## Required UI Behavior

Any Studio UI that displays memory must show:

- status
- source
- owner
- whether it is safe to use as canon
- replacement or rejection reason when available

## Required Agent Behavior

When an agent uses memory, it must distinguish:

- "known canon"
- "approved for this task"
- "proposed but not approved"
- "previously rejected"
- "uncertain or missing"

If the distinction is unclear, the agent must ask or defer.

## Retrieval Behavior

Memory retrieval must return use guidance with the record.

The local retrieval surface is:

```bat
tools\aiworkflow\studio_memory_store.bat canon
tools\aiworkflow\studio_memory_store.bat query <text>
tools\aiworkflow\studio_memory_store.bat query <text> --status canon
```

Retrieval output must preserve these rules:

- canon memory is official only when the record is `status=canon` and
  `type=canon` with an approving decision reference.
- approved memory is scoped and is not automatically global canon.
- proposed memory is an idea only.
- rejected memory is negative memory and should prevent repeated rejected
  suggestions.
- evidence memory supports claims but does not approve work.

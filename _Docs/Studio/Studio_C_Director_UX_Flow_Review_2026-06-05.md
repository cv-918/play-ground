# Studio C Director UX Flow Review

## Date

2026-06-05

## Status

UX flow review completed.

This document reviews the Director-facing flow after the Goal E Worker Execution Integration scope packet. It does not approve implementation of worker execution.

## Review Frame

Studio should remain organized around five Human Director functions:

```text
Conversation
Decision
Execution Request
Result Review
Record Keeping
```

The correct Studio UX is not an operator dashboard. The Director should experience a work narrative:

```text
I said what I want.
AI staff clarified and proposed options.
I made a decision.
That decision became a bounded execution request.
A worker performed only the approved work.
I reviewed the result and evidence.
The important outcome was recorded.
```

## Current Flow Assessment

### 1. Conversation

Current state:

- Studio direction documents correctly define Conversation as intake and clarification.
- Current UI still has many legacy/internal surfaces, but the Director-facing surface now frames work in terms of normalized Director views.

UX risk:

- If Conversation immediately exposes task IDs, runner IDs, or command choices, the user is pushed back into operator mode.

Required UX behavior:

- Conversation should produce candidates, not mutate state silently.
- Candidate cards should show what decision or execution request could be created.
- The user should approve/revise/defer the candidate in Director language.

### 2. Decision

Current state:

- The Action Vocabulary defines approve/defer/reject/request clarification/promote to record.
- Decision records are still plan-only and not implemented.

UX risk:

- A decision approval could be confused with permission to run a worker.

Required UX behavior:

- Decision approval should clearly say whether it is:
  - record-only
  - creates an Execution Request draft
  - approves a bounded Execution Request
- Decision approval alone should not start work unless the card explicitly says it also approves worker dispatch.

### 3. Execution Request

Current state:

- Execution Request is identified as the contract layer.
- Storage, schema, and approval state are not yet approved.
- Goal E should wait for this foundation.

UX risk:

- Worker execution could become a generic "run" button without visible scope, non-goals, or validation plan.

Required UX behavior:

- Execution Request should be the main confirmation card before worker start.
- The card must show:
  - objective
  - scope
  - non-goals
  - allowed/blocked areas
  - risk
  - worker profile/executor
  - validation plan
  - expected return format
- The primary action should be "Mark ready for worker" or "Dispatch approved worker", not "Run command".

### 4. Result Review

Current state:

- Existing AIWorkflow runtime has evidence, result, diff, build/test, verification, completion, and finalization concepts.
- Studio should summarize those concepts, not expose raw machinery by default.

UX risk:

- Result Review can become a log viewer or a raw CompletionReport browser.

Required UX behavior:

- Result Review should answer:
  - What changed?
  - What validation ran?
  - What passed, failed, or remains uncertain?
  - What risk remains?
  - What decision is needed from me?
- The visible choices should be:
  - Accept result
  - Accept with concerns
  - Request changes
  - Reject
  - Defer/archive
  - Prepare commit only after explicit commit-scope confirmation

### 5. Record Keeping

Current state:

- DevLog rules and Studio product docs support durable records.
- Studio action records are not yet implemented.

UX risk:

- The system may over-record transient runtime state or under-record important Director decisions.

Required UX behavior:

- Record Keeping should store durable decisions and outcomes, not every timestamp churn artifact.
- Records should link to evidence instead of dumping raw JSON into the main user view.
- The user should be able to promote an outcome to a durable record explicitly.

## Proposed Director-Facing Page/Section Model

Recommended main flow sections:

```text
Director Desk
  - current conversation / current decision / current result needing attention

Decision Queue
  - choices that need approve/reject/defer/request clarification

Execution Requests
  - draft, ready for worker, dispatched, running, result ready

Result Review
  - result cards needing accept/request changes/reject/defer

Records
  - durable decisions, work logs, project knowledge links
```

Internal/debug sections should remain collapsed or secondary:

```text
Raw runtime artifacts
Runner/session details
Legacy workflow routes
Toolbox internals
Handoff queues
Raw JSON/logs
```

## UX Copy Recommendations

Use Director language:

```text
Approve scope
Revise scope
Mark ready for worker
Dispatch approved worker
Review result
Request changes
Record outcome
Prepare commit decision
```

Avoid default main-surface language:

```text
Run shell
Start session
Call adapter
Open handoff queue
Invoke primitive
Raw JSON
Runner ID
Session ID
```

## Required Confirmation Pattern For Worker Dispatch

Before any worker-triggering action, Studio should show a confirmation summary:

```text
You are approving this worker to act only within this scope.

Objective:
...
Allowed:
...
Blocked:
...
Validation expected:
...
Worker profile:
...
Executor:
...
This will not commit, push, mark done, or release.
```

The confirmation must be explicit and POST-based. A GET or page load must never dispatch a worker.

## Flow Risks Before Goal E Implementation

### Major: Execution Request schema is not approved

Without an approved Execution Request schema, worker dispatch has no stable contract.

Mitigation:

- Implement Goal C before Goal E, or include Goal C as the first subtask of Goal E approval.

### Major: commit/push routes may confuse Director authority

Retained workflow git routes exist. They should not be surfaced as normal Director actions without separate commit/push approval.

Mitigation:

- Keep commit/push in internal/debug area or separate Result Review commit decision flow.

### Minor: internal pages still exist

Internal pages are acceptable if they remain secondary. They become a problem only if the main Studio UX asks the Director to operate them.

Mitigation:

- Keep internal navigation visibly separate from Director-first sections.

## Recommended Next Product Step

The next source-behavior step should not be worker execution yet.

Recommended order:

```text
1. Goal C: Execution Request Draft Creation and schema/storage approval
2. Goal E-0: Worker Dispatch design finalization using approved Execution Request schema
3. Goal E-1: safe dispatch preflight and preview-only UI
4. Goal E-2: one allowlisted safe worker smoke path
5. Goal D/Result Review integration expansion
```

## Acceptance Criteria For A Future UX Implementation

A future implementation should pass these checks:

- User can understand the current item without reading raw IDs.
- User can see what decision is being requested.
- Worker dispatch cannot happen without approved scope.
- Worker dispatch card states what it will not do: no commit, no push, no automatic done.
- Failed validation is visible and not softened into success language.
- Result Review has a clear next Director decision.
- Durable records are created only by explicit record/promote actions.

## Recommendation

Proceed with Goal C-style Execution Request foundation before implementing Goal E worker execution.

If the Human Director wants a faster path, the safest reduced scope is:

```text
Execution Request schema + preview UI + dispatch preflight tests only
```

Do not wire actual worker start until that preflight is reviewed and approved.

# WF-412 Reviewed Concern Finalization Path

## Summary

WF-412 adds an explicit audited path for accepting a CompletionReport that has
reviewed `CONCERNS` but no blockers or failed checks.

This is for cases such as a large expected workflow-tool diff where the runner
correctly asks for human review, but the reviewer decides the concern is
acceptable and wants the PC Runner to continue to post-finalization artifacts.

## Decision Model

Supported acceptance decisions:

```text
accept_completion
accept_with_concerns
```

`accept_completion` remains the clean ready-state acceptance path.

`accept_with_concerns` is allowed only when all of these are true:

- CompletionReport exists.
- `verification_summary.verdict` is `CONCERNS`.
- `completion_state` is `needs_human_decision`.
- `human_decision_required` is true.
- At least one concern exists.
- No blockers exist.
- No failed checks exist.

Blocked, failed, missing, or unrelated completion states are still rejected.

## Runtime Behavior

FinalizationLog records:

- final decision
- finalization state
- source CompletionReport
- reviewed concerns
- blocker and failed-check counts
- invariant that task lifecycle state is unchanged

The new finalization state is:

```text
completion_accepted_with_concerns_pending_task_done
```

PC Runner `continue` now proceeds only after an accepted finalization state:

```text
completion_accepted_pending_task_done
completion_accepted_with_concerns_pending_task_done
```

Reject, request-changes, defer, missing finalization, or malformed finalization
records stop at a human gate and do not continue to Auto Approval Policy or
Follow-up Task generation.

## Discord Surface

Discord finalization commands include:

```text
/ai finalization accept-concerns id:<task_id> completion-report-id:<id>
```

The command maps to:

```text
accept_with_concerns
```

## Safety Boundaries

This path does not:

- mark tasks done
- approve implementation scope
- weaken blockers or failed checks
- commit or push
- create Backlog tasks directly
- bypass Human Director authority

It records an explicit human-reviewed concern decision so the existing runner
can continue through post-finalization evidence generation without treating all
`CONCERNS` reports as unresolvable.

# WF-305/306 CompletionReport and Completion Card

## Purpose

WF-305/306 adds the completion-review layer after WF-304 VerificationReport.

The goal is to give the Human Director a compact, evidence-linked completion
summary before `/ai task done` or commit decisions, without moving lifecycle
state automatically.

---

## Responsibility Boundary

CompletionReport is a runtime report artifact.

It may:

- Read the latest or selected VerificationReport.
- Summarize completion readiness.
- Surface remaining warnings, concerns, blockers, and failed checks.
- List human decisions that still matter.
- Suggest next manual commands.
- Update TaskRunState runtime projection fields.
- Append display-only progress events.

It must not:

- Approve a task.
- Mark a task done.
- Write ApprovalHistory or FinalizationLog.
- Execute auto approval policy.
- Commit, push, release, or deploy.
- Run arbitrary shell commands.

Completion Card is a presentation artifact.

It may:

- Read the latest or selected CompletionReport.
- Generate compact Discord-facing fields.
- Show readiness, verification verdict, remaining issues, and next manual
  commands.
- Update TaskRunState runtime projection fields for display.

It must not change Backlog, ActiveTask, approval, done, finalization, commit,
push, release, or deployment state.

---

## Runtime Storage

CompletionReport artifacts are stored under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/completion/
```

Primary files:

```text
completion_manifest.json
reports/<completion_report_id>.json
cards/completion_card_manifest.json
cards/<completion_card_id>.json
```

Generated `_Temp` files are runtime artifacts and must not be tracked.

---

## Local Commands

```bat
tools\aiworkflow\completion_report.bat status task_id [--json]
tools\aiworkflow\completion_report.bat generate task_id [verification_report_id] [completion_report_id] [--json]
tools\aiworkflow\completion_report.bat read task_id [completion_report_id] [--json]
```

```bat
tools\aiworkflow\completion_card.bat status task_id [--json]
tools\aiworkflow\completion_card.bat generate task_id [completion_report_id] [completion_card_id] [--json]
tools\aiworkflow\completion_card.bat read task_id [completion_card_id] [--json]
```

---

## Discord Commands

```text
/ai completion status id:<task_id>
/ai completion report id:<task_id> [verification-report-id:<id>]
/ai completion card id:<task_id> [completion-report-id:<id>]
```

The Discord card command may create a CompletionReport first when no report is
available, then render a Completion Card. This still does not approve, mark
done, finalize, commit, or push anything.

---

## Readiness Mapping

| VerificationReport verdict | Completion state | Human decision |
|---|---|---|
| PASS | ready_for_human_completion_review | Review, then manual done/commit decision may proceed |
| PASS_WITH_NOTES | ready_for_human_completion_review_with_notes | Review notes, then manual done/commit decision may proceed |
| CONCERNS | needs_human_decision | Human Director may request changes or record reviewed concern acceptance when no blockers or failed checks exist |
| BLOCKED | blocked_by_verification | Missing evidence must be resolved |
| FAIL | failed_verification | Fix or recovery task required |
| Missing VerificationReport | blocked_by_missing_verification | Generate VerificationReport first |

Human review remains required for accepting completion. The report only states
whether the evidence is ready enough for that review.

`PASS_WITH_NOTES` is not a silent auto-completion signal. It means the task may
be acceptable after a human reads and accepts the notes. Auto-approval policy
must treat it as requiring human completion review.

---

## TaskRunState Projection

CompletionReport may update:

```text
task_run_state.completion_report
```

Completion Card may update:

```text
task_run_state.completion_card
```

These fields are runtime projections for display and audit lookup. They are not
task lifecycle state.

---

## Handoff

WF-307 may use CompletionReport/Card outputs as input for ApprovalHistory and
FinalizationLog.

WF-308 may use finalized history later for policy automation, but Completion
Card itself must not decide or apply auto approval.

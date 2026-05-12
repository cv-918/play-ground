# WF-307 ApprovalHistory and FinalizationLog

## Purpose

WF-307 records explicit Human Director completion decisions after
CompletionReport and Completion Card review.

The layer creates durable runtime artifacts for approval history and
finalization state without automatically marking tasks done, changing Backlog
or ActiveTask lifecycle state, committing, or pushing.

---

## Responsibility Boundary

ApprovalHistory records a human decision.

It may:

- Record `accept_completion`, `accept_with_concerns`, `reject_completion`,
  `request_changes`, or `defer_completion`.
- Reference the latest or selected CompletionReport.
- Record the actor, decision time, source report state, and task context.
- Update TaskRunState runtime projection fields.

It must not:

- Approve implementation scope.
- Mark a task done.
- Apply Auto Approval Policy.
- Create follow-up tasks.
- Commit, push, release, or deploy.

FinalizationLog records the finalization state produced from that human
decision.

It may:

- Link to ApprovalHistory.
- Link to CompletionReport.
- Capture git/worktree observation.
- Record whether state files were updated.
- Suggest next manual commands.
- Provide WF-308 handoff data.

It must not update Backlog, ActiveTask, ProjectStatus, commit, push, release, or
deploy by itself.

---

## Runtime Storage

Artifacts are stored under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/finalization/
```

Primary files:

```text
approval_history_manifest.json
approval_history/<approval_record_id>.json
finalization_manifest.json
finalization_logs/<finalization_log_id>.json
```

Generated `_Temp` files are runtime artifacts and must not be tracked.

---

## Local Commands

```bat
tools\aiworkflow\finalization_log.bat status task_id [--json]
tools\aiworkflow\finalization_log.bat record task_id decision [completion_report_id] [approval_record_id] [finalization_log_id] [actor] [--json]
tools\aiworkflow\finalization_log.bat read task_id [finalization_log_id] [--json]
```

Allowed decisions:

```text
accept_completion
accept_with_concerns
reject_completion
request_changes
defer_completion
```

`accept_completion` requires a CompletionReport whose readiness allows manual
done review. `accept_with_concerns` is allowed only for a `CONCERNS`
CompletionReport in `needs_human_decision` state when blockers and failed
checks are absent. Rejection, request-changes, and defer decisions may be
recorded against blocked or incomplete evidence so the user decision remains
auditable.

---

## Discord Commands

```text
/ai finalization status id:<task_id>
/ai finalization accept id:<task_id> [completion-report-id:<id>]
/ai finalization accept-concerns id:<task_id> [completion-report-id:<id>]
/ai finalization request-changes id:<task_id> [completion-report-id:<id>]
/ai finalization reject id:<task_id> [completion-report-id:<id>]
/ai finalization defer id:<task_id> [completion-report-id:<id>]
/ai finalization read id:<task_id> [finalization-log-id:<id>]
```

These commands record or display finalization artifacts only. They do not run
`/ai task done`, commit, push, or apply auto approval.

---

## Finalization State Mapping

| Decision | Finalization state | Next manual action |
|---|---|---|
| accept_completion | completion_accepted_pending_task_done | Human may run `/ai task done` if accepted |
| accept_with_concerns | completion_accepted_with_concerns_pending_task_done | Human may run `/ai task done` after reviewing recorded concerns |
| reject_completion | completion_rejected | Keep task open or block with a reason |
| request_changes | changes_requested | Create or approve a focused fix task |
| defer_completion | completion_deferred | Resume review after more evidence |

---

## TaskRunState Projection

WF-307 may update:

```text
task_run_state.approval_history
task_run_state.finalization_log
```

These fields are runtime projections only. They are not Backlog or ActiveTask
lifecycle state.

---

## Handoff

WF-308 Auto Approval Policy may read ApprovalHistory and FinalizationLog as
historical evidence.

WF-308 must not infer human approval from CompletionReport alone. Human approval
must be explicitly recorded in ApprovalHistory or supplied through a future
deterministic policy rule.

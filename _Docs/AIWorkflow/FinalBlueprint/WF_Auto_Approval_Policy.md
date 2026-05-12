# WF-308 Auto Approval Policy

## Purpose

WF-308 defines the deterministic Auto Approval Policy evaluation layer.

The policy does not approve work by itself. It reads existing runtime evidence
and records whether a task is a candidate for future conditional auto approval.

The Human Director remains the authority for actual approval, task done,
commit, push, release, or deployment decisions unless a later workflow task
explicitly approves an apply layer.

---

## Responsibility Boundary

Auto Approval Policy may:

- Read Backlog task context.
- Read the latest or selected CompletionReport.
- Read the latest or selected FinalizationLog.
- Read linked ApprovalHistory.
- Evaluate deterministic policy rules.
- Write an AutoApprovalPolicy evaluation artifact under `_Temp`.
- Update TaskRunState runtime projection fields.
- Show Discord status/evaluate/read output.

Auto Approval Policy must not:

- Mark a task approved.
- Mark a task done.
- Create a new FinalizationLog.
- Create follow-up tasks.
- Change Backlog, ActiveTask, or ProjectStatus lifecycle state.
- Commit, push, release, or deploy.
- Treat LLM output as an approval authority.

---

## Runtime Storage

Artifacts are stored under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/auto_approval/
```

Primary files:

```text
auto_approval_policy_manifest.json
evaluations/<policy_evaluation_id>.json
```

Generated `_Temp` files are runtime artifacts and must not be tracked.

---

## Local Commands

```bat
tools\aiworkflow\auto_approval_policy.bat status task_id [--json]
tools\aiworkflow\auto_approval_policy.bat evaluate task_id [completion_report_id] [finalization_log_id] [policy_evaluation_id] [--json]
tools\aiworkflow\auto_approval_policy.bat read task_id [policy_evaluation_id] [--json]
```

`evaluate` writes a policy evaluation record only. It does not call any task
approval, done, finalization, commit, or push command.

---

## Discord Commands

```text
/ai auto-approval status id:<task_id>
/ai auto-approval evaluate id:<task_id> [completion-report-id:<id>] [finalization-log-id:<id>]
/ai auto-approval read id:<task_id> [policy-evaluation-id:<id>]
```

These commands expose the same local evaluation layer to Discord. They are
review and audit commands, not lifecycle mutation commands.

---

## Policy Rules

The initial deterministic policy is intentionally strict.

An evaluation is `eligible_candidate` only when all blocking rules pass and no
warning rules fail:

| Rule | Requirement |
|---|---|
| task_found | Backlog row exists |
| low_risk_priority | priority is P2 or P3 |
| safe_kind | kind is documentation, validation, maintenance, automation, or workflow |
| not_blocked_status | status is not blocked or deferred |
| completion_report_ready | CompletionReport allows manual done review |
| completion_without_notes | CompletionReport readiness is READY without notes |
| human_finalization_recorded | FinalizationLog records `accept_completion` |
| approval_history_present | FinalizationLog links to an ApprovalHistory record |

If blocking rules pass but `completion_without_notes` fails, the decision is
`needs_human_review`.

If any blocking rule fails, the decision is `human_approval_required`.

---

## Evaluation Output

Each evaluation records:

- `policy_evaluation_id`
- task context
- CompletionReport source
- FinalizationLog source
- ApprovalHistory source
- deterministic rule results
- blockers and human decisions required
- `eligible_for_conditional_auto_approval`
- `can_auto_approve_now`
- invariant flags

For WF-308, `can_auto_approve_now` is always `false`.

This is deliberate. WF-308 only creates a reviewable policy decision. A future
task must explicitly approve any layer that applies the decision to workflow
state.

---

## TaskRunState Projection

WF-308 may update:

```text
task_run_state.auto_approval_policy
```

This field is a runtime projection only. It is not Backlog or ActiveTask
lifecycle state.

---

## Handoff

WF-309 Follow-up Task Generator may read AutoApprovalPolicy evaluations when it
needs to decide whether a rejected, blocked, or change-requested completion
should create a follow-up candidate.

WF-309 must still preserve the same boundary: follow-up candidates may be
suggested or drafted, but task creation and approval remain controlled by
explicit workflow policy.

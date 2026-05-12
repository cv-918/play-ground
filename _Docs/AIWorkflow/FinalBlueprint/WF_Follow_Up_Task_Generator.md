# WF-309 Follow-up Task Generator

## Purpose

WF-309 defines the Follow-up Task Generator layer.

The generator reads completion, finalization, and policy evidence and produces
reviewable follow-up task candidates. It does not create Backlog tasks.

The Human Director remains responsible for choosing whether a candidate should
be turned into a real task through `/ai intake` or `/ai task create`.

---

## Responsibility Boundary

Follow-up Task Generator may:

- Read Backlog task context.
- Read the latest or selected CompletionReport.
- Read the latest or selected FinalizationLog.
- Read the latest or selected AutoApprovalPolicy evaluation.
- Generate follow-up candidates from failed checks, blockers, concerns,
  deferred completion, rejected completion, requested changes, or policy
  blockers.
- Write a FollowUpPlan artifact under `_Temp`.
- Update TaskRunState runtime projection fields.
- Show Discord status/generate/read output.

Follow-up Task Generator must not:

- Create Backlog tasks.
- Set ActiveTask.
- Approve tasks.
- Mark tasks done.
- Apply Auto Approval Policy.
- Commit, push, release, or deploy.
- Modify game source or data.

---

## Runtime Storage

Artifacts are stored under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/follow_up/
```

Primary files:

```text
follow_up_manifest.json
plans/<follow_up_plan_id>.json
```

Generated `_Temp` files are runtime artifacts and must not be tracked.

---

## Local Commands

```bat
tools\aiworkflow\follow_up_task_generator.bat status task_id [--json]
tools\aiworkflow\follow_up_task_generator.bat generate task_id [completion_report_id] [finalization_log_id] [policy_evaluation_id] [follow_up_plan_id] [--json]
tools\aiworkflow\follow_up_task_generator.bat read task_id [follow_up_plan_id] [--json]
```

`generate` writes a FollowUpPlan only. It does not call intake, task create,
task approval, task done, commit, or push commands.

---

## Discord Commands

```text
/ai follow-up status id:<task_id>
/ai follow-up generate id:<task_id> [completion-report-id:<id>] [finalization-log-id:<id>] [policy-evaluation-id:<id>]
/ai follow-up read id:<task_id> [follow-up-plan-id:<id>]
```

These commands expose candidate generation and review. They do not create
workflow tasks.

---

## Candidate Sources

The generator may create candidates from:

| Source | Candidate intent |
|---|---|
| CompletionReport failed checks | fix failed validation |
| CompletionReport blockers | resolve completion blocker |
| CompletionReport concerns | review completion concern |
| CompletionReport human decisions | resolve human decision |
| CompletionReport blocked state | collect missing verification evidence |
| FinalizationLog `request_changes` | apply requested completion changes |
| FinalizationLog `reject_completion` | rework rejected completion |
| FinalizationLog `defer_completion` | resume deferred completion review |
| AutoApprovalPolicy blockers | review policy blocker |

Candidates are deduplicated inside the generated plan.

---

## FollowUpPlan Output

Each plan records:

- `follow_up_plan_id`
- task context
- CompletionReport source
- FinalizationLog source
- AutoApprovalPolicy source
- `plan_state`
- candidate count
- candidate list
- suggested next manual commands
- invariant flags

Candidate fields include:

- `candidate_id`
- source
- candidate type
- suggested category, priority, risk, kind, and workflow path
- title
- reason
- required validation
- `create_backlog_task = false`
- `requires_human_acceptance = true`

---

## Plan States

| State | Meaning |
|---|---|
| follow_up_recommended | One or more candidates were generated |
| no_follow_up_recommended | Completion is accepted and no follow-up signal exists |
| insufficient_follow_up_signal | Not enough source evidence exists to recommend a candidate |

---

## TaskRunState Projection

WF-309 may update:

```text
task_run_state.follow_up_task_generator
```

This field is a runtime projection only. It is not Backlog or ActiveTask
lifecycle state.

---

## Handoff

After WF-309, Phase 3 has the first complete policy/reporting loop:

```text
Result -> Diff/Build evidence -> VerificationReport -> CompletionReport/Card
-> FinalizationLog -> AutoApprovalPolicy -> FollowUpPlan
```

Future work may add an explicitly approved apply layer, but WF-309 itself only
generates reviewable candidates.

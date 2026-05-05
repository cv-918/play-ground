# Review and Validation Verdict Format v1

## 1. Purpose

Review and Validation Verdict Format v1 defines a consistent way for AIWorkflow
roles to report review, validation, documentation, and workflow-tooling results
to the Orchestrator and Human Director.

The format exists to make outcomes:

- Consistent across roles.
- Easy to compare across tasks.
- Explicit about evidence, missing evidence, and human decisions.
- Safe for commit decisions.
- Traceable in Dev Logs and workflow records.

This document standardizes reporting only. It does not introduce executable
verdict parsing, automatic approval, automatic pass/fail decisions, automatic
commits, or source modification.

---

## 2. Verdict Levels

Use the following verdicts for review, validation, documentation, and
workflow-tooling results.

| Verdict | Meaning | When to use | Work can proceed? | Human Director decision required? | Commit allowed? |
|---|---|---|---|---|---|
| `PASS` | Required checks passed and no blocking issues are known | Required review or validation scope is complete, evidence is present, and no Critical, Major, or unresolved blocking issue remains | Yes | No, except normal commit decision | Yes, if scope and validation are complete |
| `PASS_WITH_NOTES` | Work is acceptable with non-blocking notes or documented residual risk | Minor issues, optional notes, documentation notes, or explicitly non-blocking limitations exist | Yes | Usually no, unless the note changes scope, policy, validation acceptance, or commit risk | Yes, with documented notes |
| `CONCERNS` | Meaningful risk or incomplete evidence exists, but the task is not fully blocked | Major issue, unclear scope, skipped validation, incomplete evidence, or unresolved decision remains | Only after Human Director decision | Yes | Only after Human Director decision |
| `BLOCKED` | The role cannot complete the review, validation, or assessment because required context, files, approval, tools, credentials, or evidence is missing | Required input is unavailable, command cannot run, approval is missing, external setup is missing, or forbidden scope would be needed | No | Yes | No |
| `FAIL` | Required criteria failed | Critical issue, failed build, failed data check, failed runtime check, failed documentation consistency check, or invalid workflow/tool behavior | No, except recovery/fix work | Yes, for recovery path or risk acceptance if applicable | No |

Rules:

- `PASS` must not be used when required validation was skipped.
- `PASS_WITH_NOTES` must list the notes and confirm they are non-blocking.
- `CONCERNS` must identify the human decision needed.
- `BLOCKED` must identify the blocker and the required action to unblock.
- `FAIL` must identify the failed criterion and recommended recovery path.

---

## 3. Review Verdict Format

Reviewer and Technical Architect outputs should use this format when reporting a
review or architecture review result.

```md
## Review Verdict

Role:
Task id:
Verdict:

### Summary

### Critical Issues
- None.

### Major Issues
- None.

### Minor Issues
- None.

### Optional Notes
- None.

### Files or Systems Reviewed
- ...

### Human Decisions Needed
- None.

### Recommended Next Action
- ...
```

Field meanings:

- `Role`: The role producing the verdict, usually `Reviewer` or
  `Technical Architect`.
- `Task id`: Workflow, backlog, validation, or implementation id such as
  `WF-034`, `GAME-012`, or `VAL-003`.
- `Verdict`: One of `PASS`, `PASS_WITH_NOTES`, `CONCERNS`, `BLOCKED`, or
  `FAIL`.
- `Summary`: Short outcome statement.
- `Critical issues`: Issues that must be fixed before proceeding.
- `Major issues`: Issues that must be fixed or explicitly accepted by the Human
  Director.
- `Minor issues`: Non-blocking issues that may be fixed if practical.
- `Optional notes`: Future improvements or non-required observations.
- `Files or systems reviewed`: Files, diffs, systems, documents, or evidence
  reviewed.
- `Human decisions needed`: Explicit decisions required before continuing.
- `Recommended next action`: The next safe workflow step.

Technical Architect may use this format to review whether a design preserves
final-form architecture, responsibility boundaries, lifecycle safety, data
ownership, and reduced-scope consistency.

---

## 4. Validation Verdict Format

Validator output should use this format when reporting validation results.

```md
## Validation Verdict

Role:
Task id:
Verdict:

### Validation Scope
- ...

### Commands Run
- ...

### Results
- ...

### Manual Checks
- ...

### Failed Checks
- None.

### Untested Areas
- None.

### Evidence
- ...

### Human Decisions Needed
- None.

### Recommended Next Action
- ...
```

Field meanings:

- `Role`: The role producing the verdict, usually `Validator`.
- `Task id`: Workflow, backlog, validation, or implementation id.
- `Verdict`: One of the standard verdict levels.
- `Validation scope`: What was intended to be validated.
- `Commands run`: Exact commands run, or `None` if no command was run.
- `Results`: Observed command, build, runtime, data, manual, or semantic
  outcomes.
- `Manual checks`: Manual steps performed and observed results.
- `Failed checks`: Checks that failed, including symptoms.
- `Untested areas`: Required or relevant areas not tested.
- `Evidence`: Logs, command output summaries, screenshots, diffs, file checks,
  or user-provided evidence.
- `Human decisions needed`: Decisions required to accept skipped checks, failed
  checks, residual risk, or changed scope.
- `Recommended next action`: The next safe workflow step.

Validation must distinguish actual evidence from expected behavior. Do not claim
runtime, manual, data-loading, or build validation passed unless it was actually
performed or the Human Director provided the result.

---

## 5. Documentation Verdict Format

Documentation Keeper output should use this format when reporting documentation
completion or documentation readiness.

```md
## Documentation Verdict

Role:
Task id:
Verdict:

### Documents Updated
- ...

### Decisions Recorded
- ...

### Evidence Recorded
- ...

### Missing Documentation
- None.

### Human Decisions Needed
- None.

### Recommended Next Action
- ...
```

Field meanings:

- `Role`: The role producing the verdict, usually `Documentation Keeper`.
- `Task id`: Workflow, backlog, validation, or implementation id.
- `Verdict`: One of the standard verdict levels.
- `Documents updated`: Durable documents or logs changed.
- `Decisions recorded`: Architecture, workflow, approval, validation, or commit
  decisions recorded.
- `Evidence recorded`: Review findings, validation evidence, command results,
  known risks, and deferred checks recorded.
- `Missing documentation`: Documentation still needed before completion.
- `Human decisions needed`: Decisions required for incomplete documentation,
  policy changes, validation deferral, or commit.
- `Recommended next action`: The next safe workflow step.

Documentation verdicts must not invent validation results. If build, runtime,
manual, or data validation was not performed, the documentation verdict must say
so explicitly when that evidence matters.

---

## 6. Tool/Workflow Verdict Format

Tool/Workflow Engineer output should use this format when reporting workflow
tooling, command, automation, prompt, or script work.

```md
## Tool/Workflow Verdict

Role:
Task id:
Verdict:

### Tooling Scope
- ...

### Commands Tested
- ...

### Runtime Behavior
- ...

### Safety Checks
- ...

### Private/Local File Checks
- ...

### Known Risks
- None.

### Human Decisions Needed
- None.

### Recommended Next Action
- ...
```

Field meanings:

- `Role`: The role producing the verdict, usually `Tool/Workflow Engineer`.
- `Task id`: Workflow, tooling, Discord, prompt, or automation id.
- `Verdict`: One of the standard verdict levels.
- `Tooling scope`: Tool, command, script, prompt, or workflow behavior reviewed
  or changed.
- `Commands tested`: Commands run and observed outcomes.
- `Runtime behavior`: Actual runtime behavior observed, or explicitly untested
  behavior.
- `Safety checks`: Approval gates, write boundaries, destructive action checks,
  automation limits, and command side effects reviewed.
- `Private/local file checks`: Checks that secrets, credentials, `_Local/`, and
  local-only files were not exposed or modified.
- `Known risks`: Remaining tooling or workflow risks.
- `Human decisions needed`: Decisions required for tool execution, external
  setup, automation, skipped validation, or release/commit action.
- `Recommended next action`: The next safe workflow step.

Tool/workflow verdicts must preserve human approval gates. A tooling verdict
does not authorize external installs, login, command execution, automatic
approval, automatic commit, push, or release.

---

## 7. Severity Model

Issue severity levels are:

| Severity | Meaning | Effect on verdict |
|---|---|---|
| `Critical` | Must be fixed before continuing; includes build breaks, crash risk, data corruption, unsafe lifetime, severe architecture violation, forbidden file modification, or failed required validation | Usually `FAIL`; may be `BLOCKED` if the issue cannot be evaluated because required evidence is missing |
| `Major` | Should be fixed before completion unless explicitly accepted by the Human Director; includes responsibility leakage, unclear lifecycle assumption, missing validation path, incomplete evidence, or scope concern | Usually `CONCERNS`; may become `PASS_WITH_NOTES` only after explicit acceptance and documentation |
| `Minor` | Non-blocking issue that may be fixed if practical; includes small naming, formatting, readability, or local documentation issue | Usually `PASS_WITH_NOTES`; may still be `PASS` if no action or note is needed |
| `Optional` | Future improvement or non-required suggestion | Does not block; may appear under `PASS` or `PASS_WITH_NOTES` |

Severity affects verdict selection as follows:

- Any unresolved `Critical` issue prevents `PASS`, `PASS_WITH_NOTES`, and
  commit recommendation.
- Any unresolved `Major` issue requires `CONCERNS` unless the Human Director
  explicitly accepts or defers the risk and the risk is documented.
- `Minor` issues do not block progress, but they should be documented when they
  may affect maintainability or review clarity.
- `Optional` notes must remain separate from required fixes.

---

## 8. Commit Recommendation Rules

Commit recommendations must follow these rules.

| Verdict | Commit rule |
|---|---|
| `PASS` | Commit allowed if scope and validation are complete |
| `PASS_WITH_NOTES` | Commit allowed with documented notes |
| `CONCERNS` | Commit requires Human Director decision |
| `BLOCKED` | Commit not allowed |
| `FAIL` | Commit not allowed |

Additional rules:

- The Human Director makes the final commit decision.
- A verdict is not a commit command.
- Commit recommendation must consider scope compliance, validation evidence,
  forbidden file changes, and untracked files.
- Do not recommend commit when unrelated changes are present unless the commit
  boundary is explicitly reviewed and separated.
- Do not recommend commit when required validation was skipped for a non-trivial
  reason unless the Human Director explicitly accepts the deferral.

---

## 9. Human Decision Gates

Human Director decision is required before proceeding when any of the following
conditions apply:

- Scope expansion.
- Schema or save format changes.
- Runtime behavior policy change.
- External tool install.
- Credential, login, or subscription setup.
- Computer-use action.
- Destructive command.
- Automatic commit, push, or release.
- Validation skipped for a non-trivial reason.
- Accepting unresolved Major findings.
- Accepting failed validation.
- Accepting incomplete evidence for runtime, data, save/load, scene, actor, UI,
  or workflow command behavior.
- Changing Discord command behavior, executable workflow tooling, release
  scripts, or automation boundaries.

Human approval applies only to the described scope. If the required scope
changes, the Orchestrator must return to the Human Director.

---

## 10. Examples

### GAME Implementation Review

```md
## Review Verdict

Role: Reviewer
Task id: GAME-012
Verdict: CONCERNS

### Summary
The change mostly follows the approved component boundary, but one lifecycle
assumption needs a Human Director decision before completion.

### Critical Issues
- None.

### Major Issues
- Enemy cleanup depends on scene exit order, but the approved design did not
  define registration cleanup responsibility.

### Minor Issues
- One debug message should include the enemy data id.

### Optional Notes
- A future helper could reduce repeated spawn validation code.

### Files or Systems Reviewed
- Enemy component ownership.
- Scene enter and exit flow.
- Spawn data loading path.

### Human Decisions Needed
- Decide whether to fix cleanup ownership now or defer with documented risk.

### Recommended Next Action
- Fix the lifecycle ownership issue before validation, or explicitly accept the
  risk and document the deferral.
```

### Data Validation Task

```md
## Validation Verdict

Role: Validator
Task id: DATA-006
Verdict: PASS_WITH_NOTES

### Validation Scope
- Validate new enemy JSON optional field defaults and invalid enum handling.

### Commands Run
- `git diff --check`
- Project data validation command provided by the user.

### Results
- Markdown and diff whitespace checks passed.
- Valid data loaded.
- Missing optional field used the documented default.
- Invalid enum produced the expected debug failure message.

### Manual Checks
- None. Runtime gameplay behavior was not changed in this task.

### Failed Checks
- None.

### Untested Areas
- Full gameplay runtime smoke test was not run because this was a data
  validation-only task.

### Evidence
- User-provided data validation output.
- Reviewed changed JSON files and loader notes.

### Human Decisions Needed
- None.

### Recommended Next Action
- Record validation evidence in the Dev Log and proceed to commit decision.
```

### Workflow Tooling Task

```md
## Tool/Workflow Verdict

Role: Tool/Workflow Engineer
Task id: WF-041
Verdict: CONCERNS

### Tooling Scope
- Review proposed Discord role recommendation command behavior.

### Commands Tested
- None. Command implementation was not in scope.

### Runtime Behavior
- Not tested; no executable command was implemented.

### Safety Checks
- Verified the proposed command is recommendation-only.
- Verified it does not execute Codex, Copilot, commits, pushes, or releases.

### Private/Local File Checks
- No `_Local/` or credential files were reviewed or modified.

### Known Risks
- Future implementation must prevent the command from becoming an approval or
  execution path.

### Human Decisions Needed
- Decide whether a later prototype may read ActiveTask metadata directly.

### Recommended Next Action
- Create a separate approved prototype task with read-only scope.
```

### Documentation Task

```md
## Documentation Verdict

Role: Documentation Keeper
Task id: WF-034
Verdict: PASS

### Documents Updated
- `_Docs/AIWorkflow/Review_Validation_Verdict_Format_v1.md`
- `_Docs/AIWorkflow/README.md`
- `_DevLog/WorkLog/2026-05-05_Review_Validation_Verdict_Format_v1.md`

### Decisions Recorded
- Standard verdict levels and role-specific verdict formats are documented.
- Commit recommendation rules and human decision gates are documented.

### Evidence Recorded
- Git status, diff check, diff stat, source-scope check, and README link check.

### Missing Documentation
- None.

### Human Decisions Needed
- Final commit decision.

### Recommended Next Action
- Review the diff and decide whether to commit.
```

### Blocked Validation

```md
## Validation Verdict

Role: Validator
Task id: GAME-018
Verdict: BLOCKED

### Validation Scope
- Build the game and run a target scene smoke test.

### Commands Run
- Build command was not run.

### Results
- Validation could not be completed because the required Visual Studio build
  environment was unavailable in the current session.

### Manual Checks
- None.

### Failed Checks
- None.

### Untested Areas
- Build validation.
- Runtime smoke test.
- Manual gameplay test.

### Evidence
- Tool output showing the build command was unavailable.

### Human Decisions Needed
- Provide build results, approve a different validation route, or accept the
  validation deferral with documented risk.

### Recommended Next Action
- Run the approved build locally and provide the result before commit.
```

---

## 11. Non-goals

Review and Validation Verdict Format v1 does not introduce:

- Executable parser behavior.
- Automatic pass/fail decision.
- Automatic approval.
- Automatic commit, push, or release.
- Source modification.
- Discord command implementation.
- Workflow automation behavior.
- External tool installation.
- New game architecture.
- New JSON schema, save format, or runtime behavior.

---

## 12. Next Tasks

Recommended follow-up tasks:

1. Path-Scoped Rule Mapping for Dust Land.
2. Small Role Router Prototype.
3. Discord role recommendation command.
4. Verdict parser prototype if appropriate later.

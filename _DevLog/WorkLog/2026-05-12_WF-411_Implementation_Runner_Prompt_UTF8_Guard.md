# WF-411 Implementation Runner Prompt UTF-8 Guard

## Summary

Implemented WF-411 hardening for the PC Runner `implementation` profile.

The runner now writes a clearer executor-facing implementation prompt that
separates Codex executor-owned tracked repository changes from PC Runner-owned
runtime validation and evidence/report artifacts. The implementation profile
also runs a text encoding guard after Codex CLI execution and before later
completion artifacts.

## Background

WF-410 proved the controlled implementation runner path end to end, but exposed
two follow-up risks:

- Nested Codex could treat PC Runner-owned runtime validation and `_Temp`
  evidence work as executor responsibility.
- Windows CLI output or Korean companion documents could be captured as
  mojibake without a runner-level stop condition.

## Scope

Approved scope was limited to:

- PC Runner implementation prompt boundary hardening
- text encoding guard implementation
- workflow documentation updates
- local smoke validation
- DevLog creation

No game source/data changes, automatic task approval, task done transition,
Backlog follow-up creation, release, or deploy were implemented.

## Files Changed

- `tools/aiworkflow/pc_runner.ps1`
- `tools/aiworkflow/README.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Controlled_Runner_Implementation_Profile.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Controlled_Runner_Implementation_Profile_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Implementation_Runner_Prompt_And_UTF8_Guard.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Implementation_Runner_Prompt_And_UTF8_Guard_KR.md`
- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_DevLog/WorkLog/2026-05-12_WF-411_Implementation_Runner_Prompt_UTF8_Guard.md`

## Architecture Notes

The implementation preserves the existing responsibility split:

- Codex CLI adapter executes the external executor.
- PC Runner orchestrates the implementation profile.
- Text encoding guard records evidence and blocks continuation only when
  probable mojibake is detected in executor stdout or changed text files.
- Executor stderr findings are retained as warning-only evidence because stderr
  can include shell command echoes and tool output.
- VerificationReport and CompletionReport remain downstream report layers.

The guard does not decide final pass/fail, approve work, mark tasks done, create
Backlog tasks, commit, or push.

## Implementation Notes

`pc_runner.ps1` now:

- tracks a task-scoped `text_encoding_guard_id`
- includes `runner.text_encoding_guard` in implementation profile plans
- records `text_encoding_guard_failed` as an implementation stop condition
- writes implementation prompts with explicit executor/runner ownership and
  UTF-8/readable Korean requirements
- scans executor stdout/stderr logs and changed text files for probable
  mojibake markers
- supplements adapter-reported changed files with current tracked Git worktree
  changed text files
- treats common source, script, Markdown, JSON/YAML, and project/config files as
  text guard candidates
- skips any reported guard source path that resolves outside the repository
- stops before file watcher/result/verification/completion artifacts when
  blocking guard findings exist

## Review Summary

Review focused on runner responsibility boundaries, guard source selection, and
stop behavior.

Findings addressed:

- Added the missing `Resolve-RepoPath` helper used by the new guard source
  scanner.
- Constrained guard source scanning to repository-contained paths.
- Changed Git worktree supplement scanning to tracked changed files only
  (`git diff --name-only` and `git diff --cached --name-only`), avoiding
  unrelated untracked files.
- Prevented Git line-ending warnings from becoming terminating PowerShell errors
  during the guard's read-only worktree scan.
- Added validation-command echo filtering so searches for mojibake markers do
  not become false positive guard findings.
- Changed stderr mojibake findings to warning-only evidence after full runner
  smoke showed Windows shell/tool output can contain mojibake unrelated to
  changed repository text.

## Runtime Evidence

Full implementation-profile runner execution was performed.

Latest full start:

```powershell
tools\aiworkflow\pc_runner.bat start WF-411 --profile implementation --json
```

Observed result:

```text
runner_run_id: runner-run-wf-411-20260512-145256-277
status: stopped
stop_reason: completion_review_required
executor_ok: true
text_encoding_guard_id: textguard-wf-411-20260512-145256-277
text_encoding_guard.status: passed_with_warnings
text_encoding_guard.blocking_finding_count: 0
verification_verdict: CONCERNS
completion_readiness: NEEDS_DECISION
```

The verification concern was `large_file_diff`. No blockers or failed checks
were reported. The large diff concern was reviewed as expected for this runner
and documentation hardening task.

An attempted finalization acceptance was rejected by the existing finalization
policy because `accept_completion` currently requires a ready CompletionReport
state, while this run produced `needs_human_decision` due the large diff
concern. That policy behavior is recorded as a follow-up workflow friction
candidate rather than worked around in WF-411.

Earlier full starts also provided useful evidence:

- First full start launched nested Codex and exposed a missing
  `Resolve-RepoPath` helper in the current runner process.
- Second full start stopped at `text_encoding_guard_failed` from stderr
  mojibake, proving the stop path worked but was too strict for Windows stderr.
- Final full start completed to the completion review gate after stderr was
  moved to warning-only evidence.

## Validation Summary

Commands run:

```powershell
git status --short
$errors=$null; $null=[System.Management.Automation.PSParser]::Tokenize((Get-Content -Raw -Path tools\aiworkflow\pc_runner.ps1), [ref]$errors); if ($errors.Count -gt 0) { exit 1 } else { 'parser_ok' }
tools\aiworkflow\pc_runner.bat plan WF-411 --profile implementation --json
tools\aiworkflow\pc_runner.bat start WF-411 --profile implementation --json
tools\aiworkflow\finalization_log.bat record WF-411 accept_completion completion-wf-411-20260512-145256-277 actor_codex_app --json
source-level prompt template inspection and pure text encoding guard smoke
replacement-character scan for WF-411 Korean docs and DevLog
git diff --check
git status --short -- _Temp _Local node_modules .env *.local.json
git status --short --branch
```

Source-level prompt template inspection checked:

- generated prompt includes `Executor And Runner Ownership`
- generated prompt includes `PC Runner owns runtime validation`
- generated prompt includes `Text And Encoding Requirements`

Pure text encoding guard smoke loaded only helper function definitions without
dispatching `start`, then checked:

- clean Korean text produces 0 mojibake signals
- synthetic replacement-character text produces a mojibake signal
- validation command echo lines are ignored
- existing stderr mojibake evidence is recorded as `passed_with_warnings` with
  `blocking_finding_count: 0`

Observed results:

```text
PowerShell parser check: passed
pc_runner implementation plan: passed, includes runner.text_encoding_guard
full implementation runner start: completed to completion_review_required
text encoding guard: passed_with_warnings, no blocking findings
prompt boundary template inspection: passed
clean Korean signal smoke: passed, 0 signals
synthetic mojibake signal smoke: passed, 1 expected signal
stderr warning-only smoke: passed
WF-411 Korean docs UTF-8 strict read: passed, 0 replacement characters
git diff --check: passed with line-ending warnings only
forbidden tracked path check: passed, no tracked _Temp/_Local/node_modules/.env/*.local.json output
```

## Remaining Risks

- The mojibake marker list is heuristic. It can stop on false positives if a
  legitimate changed text file intentionally contains the same marker
  characters.
- The latest CompletionReport remained `needs_human_decision` because the diff
  analyzer flags large diffs. The current finalization tool cannot record
  `accept_completion` for that state.
- `pc_runner plan` and full runner starts wrote runner-owned artifacts under
  `_Temp/AIWorkflowRuntime/tasks/WF-411/`; no `_Temp` file is tracked.

## Next Tasks

- Consider a follow-up to support explicit reviewed-concern acceptance or
  concern-resolution records when a CompletionReport is `needs_human_decision`
  only because of expected large diff attention signals.
- Continue hardening the regular Discord/PC Runner path before moving routine
  game tasks through it.

## AI Assistance

Codex App implemented the tracked repository changes, ran local smoke
validation, launched full PC Runner implementation-profile validation, reviewed
the generated runtime reports, and prepared the commit within the approved
WF-411 scope.

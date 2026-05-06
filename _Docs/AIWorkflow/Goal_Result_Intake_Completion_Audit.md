# Goal Result Intake Completion Audit

## Purpose

WF-047 adds a read-only Discord command for auditing manually pasted Codex goal
result summaries after a human has executed a generated `/goal` request outside
Discord.

The command helps the Human Director decide whether a task is ready for review,
validation, done marking, or commit consideration. It does not perform any of
those actions automatically.

## Command

```text
/ai result audit id:<task_id> result:<codex_result_summary>
```

The command uses a `result` subcommand group because Discord slash commands
support clear grouping for multi-step workflows:

```text
/ai result audit
```

## Inputs

| Field | Required | Purpose |
|---|---:|---|
| `id` | yes | Backlog task id to audit against |
| `result` | yes | Pasted or summarized Codex result text |

The result text is intentionally treated as untrusted human-provided evidence.
The command audits the content heuristically and does not call external APIs.

## Output Sections

The response includes:

1. Task Summary
2. Result Intake Summary
3. Claimed Files Changed
4. Validation Evidence
5. Missing Evidence
6. Risk Notes
7. Completion Verdict
8. Commit Recommendation
9. Suggested Next Manual Commands
10. Safety Status

## Completion Verdicts

| Verdict | Meaning |
|---|---|
| `READY_TO_MARK_DONE` | Evidence appears sufficient for the Human Director to consider manually marking the task done |
| `NEEDS_REVIEW` | Files changed or result quality requires human review before done/commit decisions |
| `NEEDS_VALIDATION` | Required validation evidence is missing, skipped, or too vague |
| `BLOCKED` | Result reports a blocker or cannot proceed state |
| `FAILED` | Result reports failure, unresolved errors, or failed validation |

## Commit Recommendations

| Recommendation | Meaning |
|---|---|
| `COMMIT_RECOMMENDED` | Evidence is strong and no risk notes were detected; commit may be considered after final human review |
| `COMMIT_AFTER_REVIEW` | Files changed and validation evidence exists, but review is still required |
| `DO_NOT_COMMIT_YET` | Validation, blocker, failure, or evidence quality is insufficient |
| `NO_COMMIT_NEEDED` | No file changes were claimed |

## Audit Rules

The audit is deterministic and text-based.

It checks for:

- claimed implementation, analysis, blocker, failure, and missing-validation language
- explicit no-file-change claims
- file path tokens in the result text
- validation evidence such as `node --check`, `npm run register`, bot restart/status, `git diff --check`, JSON smoke, build/test, or runtime validation
- private/local/secret-like path mentions
- game source, game data, workflow doc, and Dev Log path mentions
- accidental commit wording

If evidence is vague, the command asks for more detail instead of recommending
completion.

## Safety Boundaries

`/ai result audit` is read-only.

It does not:

- modify `Backlog.md`
- modify `ActiveTask.md`
- approve tasks
- mark tasks done
- execute Codex CLI
- execute agents
- run validation commands
- commit
- push
- modify source files

Suggested next commands are advisory only. The Human Director must manually run
any follow-up command.

## Validation Expectations

Validate WF-047 with:

```text
node --check tools/discord-orchestrator/src/commands/ai.js
node --check tools/discord-orchestrator/src/services/resultAuditService.js
node --check tools/discord-orchestrator/src/services/responseFormatter.js
npm --prefix tools\discord-orchestrator run register
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\status_bot.bat
git diff --check
```

Mock or Discord tests should cover:

- successful implementation result with changed files and validation evidence
- missing-validation result
- analysis-only result with no file changes
- unknown task id


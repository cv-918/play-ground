# 2026-05-11 Codex CLI-assisted Intake GPT-5.5

## Summary

Implemented the no-paste `/ai intake` direction for the Discord AIWorkflow
orchestrator. The intake path now uses local `codex exec` through the signed-in
Codex CLI with default model `gpt-5.5`, validates the returned TaskDraft JSON
locally, compares it against the rule-based baseline, and creates one Backlog
task from `/ai intake text:<request>`.

## Background

The previous intake command accepted natural-language text but only used local
keyword/rule classification. An intermediate OpenAI API design was explored, but
ChatGPT Pro/Codex App usage should not require separate API billing or user
copy-paste. The final direction uses Codex CLI as the local LLM intake backend.

## Scope

- Add `llm_intake` config for `codex_cli`, default model `gpt-5.5`, read-only
  sandbox, no approval prompts, and `_Temp` output artifacts.
- Add TaskDraft JSON Schema and local validator.
- Add Codex CLI intake service using `codex exec --output-schema` and
  `--output-last-message`.
- Change `/ai intake` to create a Backlog task from a validated TaskDraft.
- Add `/ai intake-preview` for read-only draft inspection.
- Keep `/ai intake-create` as a compatibility alias for `/ai intake`.
- Add `/ai intake-engine status` diagnostics.
- Add `/ai bot status` and `/ai bot restart` for managed bot process checks and
  restart through the existing local restart script.
- Localize newly added Discord slash command metadata descriptions in Korean.
- Shorten Discord intake validation summaries while preserving detailed
  TaskDraft output and Backlog validation traceability.
- Add `/ai intake-test` so the intake task-created response format can be
  checked without creating Backlog tasks or running Codex CLI.
- Update user-facing and source-of-truth workflow documents.

## Files Changed

- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/Discord_Task_Intake_Command.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/09_Operational_Playbook.md`
- `_Docs/AIWorkflow/AIWorkflow_Overview_KR.md`
- `_Docs/AIWorkflow/AIWorkflow_Flowchart_KR.md`
- `_Docs/AIWorkflow/AIWorkflow_Korean_Guide_Glossary.md`
- `tools/discord-orchestrator/README.md`
- `tools/discord-orchestrator/config.example.json`
- `tools/discord-orchestrator/package.json`
- `tools/discord-orchestrator/src/config.js`
- `tools/discord-orchestrator/src/commands/ai.js`
- `tools/discord-orchestrator/src/services/codexCliIntakeService.js`
- `tools/discord-orchestrator/src/services/botControlService.js`
- `tools/discord-orchestrator/src/services/taskDraftSchema.js`
- `tools/discord-orchestrator/src/services/taskIntakeService.js`
- `tools/discord-orchestrator/src/services/intakeTaskCreationService.js`
- `tools/discord-orchestrator/src/services/responseFormatter.js`

## Implementation Notes

The LLM layer produces only a TaskDraft candidate. Local code validates the
schema, merges/normalizes role and validation guidance through the existing role
router, and exposes rule-based mismatches to the human. `/ai intake` writes only
Backlog plus `_Temp` diagnostics/backups. It does not update ActiveTask, approve
work, execute implementation Codex, execute agents, mark done, commit, or push.

`/ai intake-preview` preserves a read-only inspection path. `/ai intake-create`
is retained as a compatibility alias for `/ai intake`.

`/ai bot restart` is intentionally limited to the managed `start_bot.bat`
runtime. It checks that the state file PID matches the current bot process before
scheduling `restart_bot.ps1`, then replies before the restart begins.

Discord intake responses show only the first few required validation items.
Long validation detail remains available through the TaskDraft output artifact,
and the Backlog validation note records the validation item count and output
path when available.

`/ai intake-test` uses sample task data only. It is intended for Discord response
format checks and reports safety flags showing no Backlog write, no ActiveTask
write, no approval, and no Codex intake execution.

Intake-family Discord output labels were reviewed and further localized in
Korean, including intake failure headers, LLM intake status labels, rule-based
cross-check labels, intake engine diagnostics, and intake-test response titles.

Intake-family Discord responses were converted to compact embed payloads for
`/ai intake`, `/ai intake-preview`, `/ai intake-test`, and `/ai intake-engine
status` so summary, validation, next action, and safety state render as separate
Discord fields instead of one long text block.

`/ai task review-intake` was also converted to a compact embed payload. The
source wording now says intake-family command instead of intake-create, activation
readiness uses a Korean label, validation detail is summarized to three items,
and verdict guidance is localized.

## Validation Summary

- `node --check` passed for changed JS files.
- Mock Codex CLI success smoke passed: validated TaskDraft created exactly one
  Backlog row in a temporary smoke repository.
- Mock invalid-schema smoke passed: invalid TaskDraft did not write Backlog.
- Live Codex CLI intake smoke passed with `codex exec`, model `gpt-5.5`, and
  TaskDraft schema/output files under `_Temp/AIWorkflowDiscordBot/intake-live-smoke`.
- `npm --prefix tools\discord-orchestrator run register` passed.
- Bot control service status and refused-restart smoke passed for an unmanaged
  local test process.
- Newly added slash command descriptions were localized in Korean and command
  registration passed.
- Intake response formatting smoke passed: long required-validation lists now
  show three items plus a TaskDraft/Backlog detail pointer instead of a large
  hidden-count suffix.
- `/ai intake-test` command schema smoke passed and command registration passed.
- Intake-family Korean output smoke passed for suggestion, task-created/test,
  engine status, and review formatting labels.
- Intake embed payload smoke passed for task-created/test, preview, and engine
  status responses, including Discord field length checks.
- Review-intake embed payload smoke passed with compact validation, Korean
  activation readiness, localized verdict guidance, and Discord field length
  checks.
- Current review-intake translation and active-task smoke passed after approving
  and selecting `WF-20260511-145547`; the review now detects intake-family
  source from `tool_route`, omits redundant set-active guidance for the current
  ActiveTask, and avoids the old English high-risk gate sentence.
- Managed bot restart passed after the response formatting change; the bot
  came back online with a new PID and no new stderr output.
- `npm --prefix tools\discord-orchestrator audit --audit-level=moderate` passed
  with 0 vulnerabilities.
- `git diff --check` passed with line-ending warnings only.

## Remaining Risks

- Live Discord smoke tests require the local private Discord channel and running
  bot.
- Codex CLI must be installed and authenticated in the bot runtime environment.
- The configured `gpt-5.5` model name must be accepted by the installed Codex CLI.

## Next Tasks

- Run local validation commands.
- Restart/register the bot and run `/ai intake-engine status`.
- Run one Discord `/ai intake text:<request>` smoke test before relying on the
  automation for daily use.

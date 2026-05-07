# Discord Korean Output Localization WorkLog

## Summary

WF-050 localizes user-facing Discord Orchestrator responses into Korean while
preserving command names, ids, paths, raw status values, and mode/context
values.

## Background

WF-049 added Korean overview, flowchart, and glossary documents. The remaining
adoption issue was that live Discord responses still used mostly English
headings and operational prose.

## Scope

Included:

- Korean response titles and section headers
- Korean safety notes and next-action prose
- Korean status meanings next to raw status values
- centralized fixed Korean output helper
- user-facing error wrapper localization
- follow-up localization for remaining live output labels such as Status, Path,
  Reason, Excerpt, validation evidence, risk notes, and path reminders
- documentation of the localization policy

Excluded:

- new commands
- command schema changes
- task state semantic changes
- Backlog/ActiveTask write behavior changes
- workflow tool behavior changes
- game source/data changes
- Codex/agent execution
- auto-approval, auto-done, auto-commit

## Files Changed

Expected implementation and documentation files:

- `tools/discord-orchestrator/src/services/koreanOutput.js`
- `tools/discord-orchestrator/src/services/responseFormatter.js`
- `tools/discord-orchestrator/src/commands/ai.js`
- `tools/discord-orchestrator/README.md`
- `_Docs/AIWorkflow/Discord_Korean_Output_Localization.md`
- `_Docs/AIWorkflow/README.md`
- `_DevLog/WorkLog/2026-05-07_Discord_Korean_Output_Localization.md`

Existing unrelated task-state changes may already be present in:

- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/Backlog.md`

## Architecture Notes

The implementation uses a small `koreanOutput.js` helper instead of a full i18n
framework. This centralizes status labels, boolean labels, and common prose
translations while keeping response formatting in `responseFormatter.js`.

## Validation Summary

Observed validation:

```text
node --check tools/discord-orchestrator/src/services/koreanOutput.js: passed
node --check tools/discord-orchestrator/src/services/responseFormatter.js: passed
node --check tools/discord-orchestrator/src/commands/ai.js: passed
npm --prefix tools/discord-orchestrator run register: passed
tools/discord-orchestrator/restart_bot.bat: failed; recorded PID 52004 could not be stopped, restart aborted
tools/discord-orchestrator/status_bot.bat: passed; bot state reported running at PID 52004
local formatter smoke sample for status/set-active/prepare-goal: passed, Korean headings/prose shown with raw ids/status/mode/path preserved
2026-05-07 continuation:
node --check tools/discord-orchestrator/src/services/koreanOutput.js: passed
node --check tools/discord-orchestrator/src/services/responseFormatter.js: passed
node --check tools/discord-orchestrator/src/commands/ai.js: passed
npm --prefix tools/discord-orchestrator run register: passed
tools/discord-orchestrator/restart_bot.bat: first retry failed at PID 30832, elevated retry passed
tools/discord-orchestrator/status_bot.bat: passed; bot state reported running at PID 47236
local formatter smoke sample for status/active/prepare-goal/result-audit: passed, remaining English limited to preserved raw identifiers, raw values, paths, filenames, commands, and source excerpts
2026-05-07 continuation 2:
node --check tools/discord-orchestrator/src/services/koreanOutput.js: passed
node --check tools/discord-orchestrator/src/services/responseFormatter.js: passed
node --check tools/discord-orchestrator/src/services/resultAuditService.js: passed
node --check tools/discord-orchestrator/src/commands/ai.js: passed
tools/discord-orchestrator/restart_bot.bat: first retry failed at PID 47236, elevated retry passed
tools/discord-orchestrator/status_bot.bat: passed; bot state reported running at PID 42940
local formatter smoke sample for prepare-goal/result-audit: passed; combined execution readiness prose and general validation evidence display in Korean
git status --short: reviewed
git diff --check: passed with CRLF conversion warnings only
git diff --stat: reviewed
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json": no tracked matches
forbidden path status check for PlayGround source/data, tools/aiworkflow, _Local, node_modules: no matches
```

Discord slash-command smoke tests still require manual execution in the private
Discord channel because this terminal cannot invoke Discord interactions.

## Remaining Risks

- Some raw service-generated validation strings may remain English when they are
  technical evidence or role/path guidance.
- Pasted user/Codex excerpts remain source text by policy and are not translated.
- Full Discord smoke tests require manual execution in the private Discord
  channel.
- If future commands add new formatter output, they must use the Korean helper
  or explicitly document why the output remains English.

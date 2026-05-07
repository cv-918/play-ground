# Slash Command Metadata Korean Localization WorkLog

## Summary

WF-051 localizes Discord slash command metadata descriptions into Korean while
preserving command names, option names, choice raw values, command schemas, and
workflow behavior.

## Background

WF-050 localized live Discord response output. The remaining Korean onboarding
gap was Discord slash command search/autocomplete metadata still showing English
descriptions.

## Scope

Included:

- top-level `/ai` command description
- subcommand descriptions
- subcommand group descriptions
- option descriptions
- metadata policy documentation

Excluded:

- new commands
- command, group, subcommand, or option renames
- choice value changes
- handler or service behavior changes
- task state semantic changes
- Backlog/ActiveTask write behavior changes
- game source/data changes
- Codex/agent execution
- auto-approval, auto-done, auto-commit

## Files Changed

- `tools/discord-orchestrator/src/commands/ai.js`
- `tools/discord-orchestrator/README.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/Discord_Korean_Output_Localization.md`
- `_Docs/AIWorkflow/Slash_Command_Metadata_Korean_Localization.md`
- `_DevLog/WorkLog/2026-05-07_Slash_Command_Metadata_Korean_Localization.md`

Existing unrelated task-state changes may already be present in:

- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/Backlog.md`

## Architecture Notes

The implementation changes only `.setDescription(...)` values in the existing
Discord command builder. Command names, option names, choices, dispatch logic,
service calls, and task mutation behavior are unchanged.

## Validation Summary

Observed validation:

```text
command JSON metadata length check: passed; no descriptions exceed Discord 100-character limit
command/group/subcommand/option name listing: reviewed; names remained unchanged
node --check tools/discord-orchestrator/src/commands/ai.js: passed
npm --prefix tools/discord-orchestrator run register: passed
tools/discord-orchestrator/restart_bot.bat: first retry failed at PID 42940, elevated retry passed
tools/discord-orchestrator/status_bot.bat: passed; bot state reported running at PID 44940
Discord UI slash-command metadata smoke: not run from terminal; requires private Discord UI confirmation
git status --short: reviewed
git diff --check: passed with CRLF conversion warnings only
git diff --stat: reviewed
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json": returned `_Localization` documentation filename false positives
strict private/local tracked-path regex check: no matches
```

## Remaining Risks

- Discord UI metadata visibility must be confirmed in the private Discord
  server after command registration.
- Discord may cache slash command metadata briefly after registration.

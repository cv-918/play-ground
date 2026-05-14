# Slash Command Metadata Korean Localization

## Purpose

WF-051 localizes Discord slash command metadata descriptions into Korean for
real-use Human Director operation.

This is metadata localization only. It does not add commands, remove commands,
rename commands, rename options, change choices, change task state semantics,
change Backlog/ActiveTask write behavior, execute Codex, execute agents,
auto-approve, auto-done, auto-commit, or modify game source/data files.

---

## Localization Scope

Translate user-facing Discord command UI metadata:

- top-level `/ai` command description
- subcommand group descriptions
- subcommand descriptions
- option descriptions

Preserve raw schema values:

- `/ai` command name
- subcommand names
- subcommand group names
- option names such as `id`, `text`, `mode`, `context`, `note`, `result`
- choice values such as `analysis`, `implementation`, `review`, `compact`, `standard`
- task semantics and workflow behavior

---

## Implementation Shape

Metadata is defined in:

```text
tools/discord-orchestrator/src/commands/ai.js
```

WF-051 changes only `.setDescription(...)` text. The command builder structure,
names, choices, handlers, service calls, and state mutations remain unchanged.

No full i18n framework is introduced. Fixed Korean metadata v1 is sufficient
until runtime locale selection becomes useful.

When adding new Discord slash commands, subcommand groups, subcommands, or
options, write their `.setDescription(...)` text in Korean in the same change.
Preserve raw command names, option names, and choice values, but do not leave
new Discord search/help descriptions in English unless the user explicitly asks
for English metadata.

---

## Expected Discord UI Behavior

Discord slash command search should show Korean descriptions only for the
public Human Director command surface:

```text
/ai intake
/ai ask
/ai intake-engine status
/ai bot status
/ai bot restart
/ai task review-intake
/ai task approve-runner
/ai runner status
/ai runner read
/ai completion card
/ai git commit
/ai git push
/ai git commit-push
/ai status
/ai docs
```

Command names and option names remain English/raw, while their visible
descriptions are Korean.

Advanced/debug/recovery paths such as `intake-preview`, `intake-test`,
`set-active`, `approve`, `runner start`, `accept-completion`, `finalization`,
`auto-approval`, `follow-up`, `prepare goal`, and `result audit` may remain in
code for button handlers or internal recovery, but they should not be registered
in the normal Discord slash autocomplete surface.

---

## Validation Expectations

Required local validation:

```text
node --check tools/discord-orchestrator/src/commands/ai.js
npm --prefix tools/discord-orchestrator run register
tools/discord-orchestrator/restart_bot.bat
tools/discord-orchestrator/status_bot.bat
git status --short
git diff --check
git diff --stat
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json"
```

Discord UI smoke:

```text
Search /ai in Discord and confirm command descriptions are Korean.
Confirm command names and option names remain unchanged.
Confirm command behavior is unchanged.
```

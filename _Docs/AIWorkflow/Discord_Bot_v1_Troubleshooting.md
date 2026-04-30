# Discord Bot v1 Troubleshooting

## 1. Bot Token Problems

## Symptom

```text
401: Unauthorized
```

## Likely Causes

```text
invalid bot token
old token still in current CMD session
token reset but CMD not restarted
wrong application/token pair
```

## Fix

```bat
set AIWORKFLOW_DISCORD_BOT_TOKEN=NEW_TOKEN_FOR_CURRENT_CMD
setx AIWORKFLOW_DISCORD_BOT_TOKEN "NEW_TOKEN_FOR_FUTURE_CMD"
```

Then open a new CMD and restart.

---

## 2. Environment Variable Name Mistake

## Symptom

```text
Missing Discord bot token environment variable: <actual token text>
```

## Cause

`discord_bot.local.json` has the token value where the environment variable name should be.

Wrong:

```json
"discord_token_env": "ACTUAL_TOKEN"
```

Correct:

```json
"discord_token_env": "AIWORKFLOW_DISCORD_BOT_TOKEN"
```

---

## 3. Slash Command Not Visible

## Fix

```bat
cd /d C:\Users\kalux\workStation\play-ground\tools\discord-orchestrator
npm run register
```

Then restart Discord client or wait briefly.

---

## 4. Bot Starts but Command Fails

Run local scripts first:

```bat
cd /d C:\Users\kalux\workStation\play-ground
tools\aiworkflow\workflow_status.bat --json
tools\aiworkflow\active_project_status.bat --json
tools\aiworkflow\project_profile_status.bat --json
```

If these fail, fix local scripts before debugging Discord.

---

## 5. Active Project Source Is Wrong

Expected:

```text
/ai project profile
Source: ActiveProject.json
```

If it shows:

```text
Source: explicit project id
```

then check:

```text
tools/discord-orchestrator/src/commands/ai.js
tools/discord-orchestrator/src/services/projectProfileService.js
```

The command handler must not inject `config.defaultProjectId` when the user omits `id`.

---

## 6. Git Shows Private Files

Run:

```bat
git status --short
```

These must not appear:

```text
_Local/
node_modules/
.env
.env.local
discord_bot.local.json
```

If they appear, update `.gitignore` and unstage/remove as needed.

---

## 7. File Placement Problems

Expected folders:

```text
tools/aiworkflow/
tools/discord-orchestrator/
_Docs/AIWorkflow/
_Docs/AIWorkflow/ProjectProfiles/
```

Search misplaced files:

```bat
where /r . workflow_status.bat
where /r . project_profile_status.bat
where /r . active_project_status.bat
where /r . package.json
```

---

## 8. State Looks Old in Discord

The bot reports state files.

Check:

```text
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ProjectStatus.md
```

If Discord says old task IDs, update the state files.

---

## 9. Safe Recovery Order

Use this order:

```text
1. Stop bot.
2. Validate local scripts.
3. Validate ActiveProject.json.
4. Validate project profile status.
5. Restart bot.
6. Test /ai status.
7. Test /ai project profile.
8. Check git status.
```

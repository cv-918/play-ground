# Discord Read-Only Bot v1 Setup Checklist

## 1. Discord Developer Portal

```text
[ ] Create Discord application.
[ ] Create bot user.
[ ] Copy bot token into local environment variable only.
[ ] Enable required bot permissions.
[ ] Create invite URL.
[ ] Invite bot to private test server.
[ ] Record client_id.
[ ] Record guild_id.
```

Do not commit the bot token.

---

## 2. Local Environment

```text
[ ] Node.js installed.
[ ] Repository path confirmed.
[ ] _Local/AIWorkflow/discord_bot.local.json created.
[ ] AIWORKFLOW_DISCORD_BOT_TOKEN environment variable set.
[ ] allowed_user_ids filled.
[ ] allowed_channel_ids filled.
```

---

## 3. Pre-Bot Script Validation

Run from repository root:

```bat
tools\aiworkflow\workflow_status.bat --json
tools\aiworkflow\project_profile_status.bat --list
tools\aiworkflow\project_profile_status.bat --project dustland_custom_cpp_prototype --json
tools\aiworkflow\project_profile_status.bat --project unity_project_template --json
```

All must pass before connecting Discord.

---

## 4. Bot v1 Validation

```text
[ ] Bot starts.
[ ] /ai status works.
[ ] /ai active works.
[ ] /ai backlog works.
[ ] /ai next works.
[ ] /ai project list works.
[ ] /ai project profile works.
[ ] Unauthorized user is rejected.
[ ] Unauthorized channel is rejected.
[ ] Git status unchanged after commands.
```

---

## 5. Commit Safety

Before commit:

```bat
git status
git diff --stat
git diff --check
```

Confirm:

```text
[ ] No token file staged.
[ ] No _Local/ file staged.
[ ] No node_modules staged.
[ ] Only intended bot source/docs files staged.
```

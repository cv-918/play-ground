# Discord Read-Only Bot v1 Validation Result

## 1. Purpose

This document records the validation result for Discord Read-Only Bot v1.

This validation confirms that Discord can now be used as a read-only remote status interface for the AIWorkflow system.

---

## 2. Validation Summary

```yaml
task_id: WF-014
validated_at: 2026-04-30
result: passed
workflow_stage: Discord Read-Only Bot v1
permission_level: read_only
```

Verdict:

```text
Discord Read-Only Bot v1 is operational.
```

---

## 3. Commands Validated

| Command | Result | Notes |
|---|---|---|
| `/ai status` | passed | Returned workflow level, active task, backlog summary, git dirty state |
| `/ai active` | passed | Returned active task summary |
| `/ai backlog` | passed | Returned top backlog items |
| `/ai next` | passed | Returned next recommended task/action |
| `/ai project list` | passed | Listed `dustland_custom_cpp_prototype` and `unity_project_template` |
| `/ai project profile` | passed | Returned Dust Land custom C++ prototype profile |
| `/ai project profile id:unity_project_template` | passed | Returned Unity project template profile |

---

## 4. Local Environment Validated

```text
node --version: passed
npm --version: passed
npm install: passed
npm run register: passed
npm start: passed
```

Known environment:

```yaml
node_version: v24.15.0
npm_version: 11.12.1
```

---

## 5. Issues Found and Fixed

### 5.1 Bot Token Configuration Mistake

Issue:

```text
The bot token was accidentally placed where the environment variable name should be.
```

Resolution:

```text
Bot token was reset.
discord_bot.local.json uses AIWORKFLOW_DISCORD_BOT_TOKEN as the environment variable name.
Actual token is stored only in the local environment variable.
```

Safety rule reinforced:

```text
Never place Discord bot tokens in committed files or chat messages.
```

### 5.2 CMD Session Environment Issue

Issue:

```text
setx was used, but the current CMD session was not restarted.
npm run register still saw stale/missing token state.
```

Resolution:

```text
CMD was restarted and registration succeeded.
```

### 5.3 File Placement Issue

Issue:

```text
Some extracted files were placed under the wrong folder during ZIP extraction.
```

Resolution:

```text
File placement was manually checked and corrected.
```

### 5.4 Batch Script Invocation Issue

Issue:

```text
Discord Bot could reach the local script layer, but .bat invocation from Node was unstable.
```

Resolution:

```text
commandRunner.js was adjusted to execute AIWorkflow batch scripts through a shell-backed invocation.
```

### 5.5 workflow_status.ps1 PowerShell Compatibility Issue

Issue:

```text
workflow_status.ps1 failed under the local Windows PowerShell environment with a null method call.
```

Root cause:

```text
ProcessStartInfo.ArgumentList was not safe for the current PowerShell/.NET environment.
```

Resolution:

```text
workflow_status.ps1 now invokes git through PowerShell's call operator instead of ProcessStartInfo.ArgumentList.
```

---

## 6. Safety Validation

Confirmed design constraints:

```text
Discord Bot v1 is read-only.
Discord Bot v1 does not write source files.
Discord Bot v1 does not write workflow documents.
Discord Bot v1 does not run Copilot.
Discord Bot v1 does not run builds.
Discord Bot v1 does not commit, push, or release.
```

Local private data rules:

```text
_Local/ must not be committed.
node_modules/ must not be committed.
.env and .env.local must not be committed.
Discord bot token must not be committed.
```

---

## 7. Current Capability

Discord can now be used to check:

```text
current workflow status
active task
backlog summary
next action
available project profiles
Dust Land profile
Unity project template profile
```

This satisfies the first practical layer of remote workflow visibility.

---

## 8. Known Limitations

v1 does not support:

```text
approvals from Discord
document updates from Discord
active project switching
running validation from Discord
diff capture from Discord
build/test execution
coding-agent routing
commit/push/release actions
```

---

## 9. Recommended Next Work

Recommended next task:

```text
WF-012:
Define active project selector/config convention
```

Reason:

```text
Discord now reads project profiles, but there is no durable active project selector yet.
```

---

## 10. Final Verdict

```text
WF-014: done
Discord Read-Only Bot v1: passed
```

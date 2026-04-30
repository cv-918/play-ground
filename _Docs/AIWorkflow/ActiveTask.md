# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-014
title: Implement Discord Read-Only Bot v1 skeleton
status: done
workflow_path: full_path
priority: P2
risk_level: medium
requested_by: human_director
requested_at: 2026-04-30
last_updated: 2026-04-30
```

---

## Goal

Implement and validate Discord Read-Only Bot v1 skeleton for AIWorkflow remote status access.

---

## Approved Scope

Included:

```text
- Node.js + discord.js skeleton.
- /ai slash command with read-only subcommands.
- Local config loading.
- Environment-variable token handling.
- User/channel authorization.
- Calls to read-only local scripts.
- Discord response formatting.
```

Excluded:

```text
- Discord token committed to repository.
- Source code modification outside bot/tooling scope.
- Workflow document writes from Discord.
- Build/test execution.
- Copilot execution.
- Git commit/push/release automation.
```

---

## Tool Route

```yaml
chatgpt: generated bot skeleton and fix packages
codex: not used
copilot: not used
git: user review and commit
validation: local npm install, slash command registration, Discord command test
```

---

## Files In Scope

```text
tools/discord-orchestrator/
tools/aiworkflow/workflow_status.ps1
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/Backlog.md
.gitignore
```

---

## Validation Evidence

```text
node --version: passed
npm --version: passed
npm install: passed
npm run register: passed
npm start: passed

/ai status: passed
/ai active: passed
/ai backlog: passed
/ai next: passed
/ai project list: passed
/ai project profile: passed
/ai project profile id:unity_project_template: passed
```

---

## Known Notes

```text
- Discord Bot v1 is read-only.
- Bot token is stored through AIWORKFLOW_DISCORD_BOT_TOKEN environment variable.
- Local config is stored under _Local/AIWorkflow/ and must not be committed.
- node_modules/ must not be committed.
- ActiveTask previously showed WF-010 because state docs had not yet been updated.
```

---

## Human Action Required

```text
1. Confirm unauthorized channel test if possible.
2. Confirm git status does not include _Local/, node_modules/, .env, or token files.
3. Update Backlog.md:
   - WF-005 -> done
   - WF-014 -> done
4. Review diff.
5. Commit.
```

---

## Next Recommended Task

```text
WF-015:
Document Discord Bot v1 validation result and update workflow state.
```

Alternative:

```text
WF-012:
Define active project selector/config convention.
```

---

## Completion Criteria

```text
[x] Bot skeleton files saved
[x] Local config created but not committed
[x] Token env var set but not committed
[x] Slash commands registered
[x] Bot starts
[x] Read-only commands tested
[ ] Unauthorized channel/user test completed or explicitly skipped
[ ] No secret files staged
[ ] No node_modules staged
[ ] Backlog.md updated
[ ] Commit completed
```

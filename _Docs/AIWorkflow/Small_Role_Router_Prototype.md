# Small Role Router Prototype

## 1. Purpose

Small Role Router Prototype defines the first read-only executable helper for
AIWorkflow role recommendations.

The prototype reads the current active workflow task and durable policy
documents, then recommends:

- Active task summary.
- Recommended roles.
- Role rationale.
- Human decision gates.
- Required validation checks.
- Suggested execution route.
- Verdict format reminder.
- Next manual action.

This prototype is advisory only. It does not execute agents, approve tasks,
modify source files, change Discord command behavior, mark tasks done, commit,
push, release, or enforce workflow policy automatically.

---

## 2. Command

Default text output:

```bat
tools\aiworkflow\role_router_status.bat
```

Optional JSON output:

```bat
tools\aiworkflow\role_router_status.bat --json
```

The command is intended to be run from the repository root. The batch wrapper
resolves the repository root from the script location and then invokes the
PowerShell script.

---

## 3. Files

```text
tools/aiworkflow/role_router_status.bat
tools/aiworkflow/role_router_status.ps1
```

Supporting documentation:

```text
tools/aiworkflow/README.md
_Docs/AIWorkflow/Small_Role_Router_Prototype.md
_DevLog/WorkLog/2026-05-05_Small_Role_Router_Prototype.md
```

---

## 4. Inputs

The prototype checks that these files exist and uses them as read-only inputs:

```text
_Docs/AIWorkflow/Agent_Role_Registry_v1.md
_Docs/AIWorkflow/Role_Router_Rules_v1.md
_Docs/AIWorkflow/Review_Validation_Verdict_Format_v1.md
_Docs/AIWorkflow/Path_Scoped_Rule_Mapping_DustLand_v1.md
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/Backlog.md
```

The current implementation parses:

- ActiveTask metadata scalars such as `task_id`, `title`, `status`,
  `workflow_path`, `priority`, `risk_level`, `requested_at`, and
  `last_updated`.
- ActiveTask sections such as Files In Scope, Validation Plan, Human Action
  Required, and Latest Status Note.
- The matching Backlog row for the active task id when available.

The policy documents are referenced as the durable source documents for the
recommendation. The prototype does not attempt to fully interpret every policy
paragraph.

---

## 5. Routing Behavior

The prototype applies the reduced-scope routing rules below:

| Trigger | Recommended roles |
|---|---|
| Every task | Orchestrator |
| Documentation task or documentation path | Documentation Keeper, Reviewer |
| Automation or workflow tool task | Tool/Workflow Engineer, Reviewer, Validator |
| Gameplay implementation task | Explorer, Technical Architect, Gameplay Implementer, Reviewer, Validator |
| Data or JSON validation task | Explorer, Technical Architect, Validator, Reviewer |

P0, P1, or high-risk tasks add a Human Director gate before implementation and
before accepting validation deferral.

Tasks that actually touch schema, save/load behavior, runtime behavior,
external tools, computer-use, or destructive commands add an explicit human
decision gate.

Path-specific validation hints are added for:

- Discord command behavior changes.
- `PlayGround/Data` or JSON/schema changes.
- Gameplay runtime behavior changes.
- Documentation/index updates.
- AIWorkflow tool changes.

---

## 6. Output Contract

Text output includes these sections:

1. Active Task
2. Recommended Roles
3. Role Rationale
4. Human Decision Gates
5. Required Validation
6. Suggested Execution Route
7. Verdict Format
8. Next Manual Action

JSON output includes:

```json
{
  "ok": true,
  "task": {},
  "recommended_roles": [],
  "human_gates": [],
  "required_validation": [],
  "execution_route": [],
  "next_manual_action": ""
}
```

The JSON mode may include additional fields such as `role_rationale`,
`verdict_format`, and `policy_documents`.

---

## 7. Safety Rules

The prototype must not:

- Execute Codex subagents.
- Execute OpenClaw.
- Execute Claude.
- Execute computer-use.
- Modify game source files.
- Modify `_Local/`.
- Modify `node_modules/`.
- Modify `_Temp/`.
- Execute Discord commands.
- Change Discord command behavior.
- Automatically approve tasks.
- Automatically mark tasks done.
- Commit.
- Push.

The script reads files and writes output to stdout only.

---

## 8. Validation

Required validation for this prototype:

```bat
tools\aiworkflow\role_router_status.bat
tools\aiworkflow\role_router_status.bat --json
git status --short
git diff --check
git diff --stat
```

Additional checks:

```text
Verify no PlayGround source files were modified.
Verify tools/aiworkflow/README.md documents the new command.
Verify JSON output is valid JSON.
```

Debug x64 build, JSON smoke, bot register/restart/status, and manual runtime
validation are not required unless this prototype expands into game source,
data, Discord command behavior, or runtime behavior changes.

---

## 9. Known Limitations

This is a small deterministic prototype, not a complete policy interpreter.

Limitations:

- It uses ActiveTask metadata, the matching Backlog row, path hints, and
  conservative keyword matching.
- It does not fully parse markdown tables from every policy document.
- It does not know whether a future task truly modifies a path unless that path
  or behavior is represented in ActiveTask or Backlog text.
- It does not validate runtime behavior.
- It does not enforce decisions.

If a recommendation is incomplete or unclear, the Human Director should update
ActiveTask with explicit category, kind, path scope, validation expectations,
and non-goals before execution.

---

## 10. Next Tasks

Recommended follow-up tasks:

1. Add explicit `category`, `kind`, `path_scope`, and boolean routing fields to
   future ActiveTask templates if approved.
2. Add a Discord read-only role recommendation command as a separate approved
   Discord task.
3. Consider table-driven routing only after the document-based prototype proves
   useful.

# Active Project Selector

## 1. Purpose

This document defines how AIWorkflow selects the active project profile.

The workflow now supports multiple project profiles, including:

```text
dustland_custom_cpp_prototype
unity_project_template
```

Discord Read-Only Bot v1 can read project profiles, but the workflow still needs a durable way to know which project is currently active.

---

## 2. Core Principle

Active project selection must be:

```text
explicit
file-based
reviewable
machine-readable
safe
override-friendly
```

Do not hardcode active project selection inside Discord command handlers.

---

## 3. Final Architecture

```text
Discord Bot
  ↓
Orchestrator Core / Local Script Layer
  ↓
Active Project Resolver
  ↓
ActiveProject.json
  ↓
ProjectProfiles/<project_id>.json
```

The Discord bot should eventually ask the active project resolver:

```text
Which project is active?
Which profile should be used?
Which commands are allowed?
Which validation profiles exist?
```

---

## 4. Active Project Source

Primary committed source:

```text
_Docs/AIWorkflow/ActiveProject.json
```

This file is safe to commit because it contains only workflow state, not secrets.

Example:

```json
{
  "schema_version": "1.0",
  "active_project_id": "dustland_custom_cpp_prototype",
  "profile_path": "_Docs/AIWorkflow/ProjectProfiles/dustland_custom_cpp_prototype.json",
  "updated_at": "2026-04-30",
  "updated_by": "human_director",
  "reason": "Current Dust Land custom C++ prototype is the active workflow testbed."
}
```

---

## 5. Optional Local Override

Future optional local override:

```text
_Local/AIWorkflow/active_project.local.json
```

This is not required for v1.

If introduced later, it must not be committed.

Suggested resolution order:

```text
1. Explicit CLI/Discord command argument
2. _Local/AIWorkflow/active_project.local.json
3. _Docs/AIWorkflow/ActiveProject.json
4. Discord bot local config default_project_id
```

For now, use only:

```text
_Docs/AIWorkflow/ActiveProject.json
```

---

## 6. ActiveProject.json Schema

Required fields:

```json
{
  "schema_version": "1.0",
  "active_project_id": "",
  "profile_path": "",
  "updated_at": "",
  "updated_by": "",
  "reason": ""
}
```

Field definitions:

| Field | Meaning |
|---|---|
| `schema_version` | Active project selector schema version |
| `active_project_id` | Project profile ID to use by default |
| `profile_path` | Path to the selected project profile JSON |
| `updated_at` | Date of latest selector update |
| `updated_by` | Human or tool that changed the selector |
| `reason` | Human-readable reason for current selection |

---

## 7. Validation Rules

The active project selector is valid only if:

```text
[ ] ActiveProject.json exists.
[ ] active_project_id is non-empty.
[ ] profile_path is non-empty.
[ ] profile_path exists.
[ ] profile_path JSON parses successfully.
[ ] profile project_id matches active_project_id.
```

If validation fails, the workflow must not silently fall back to another project.

Failure should be explicit:

```text
Active project selection invalid.
Fix ActiveProject.json before continuing.
```

---

## 8. Discord v1 Behavior

Current Discord Bot v1 may still use:

```text
default_project_id
```

from local config.

Next recommended integration:

```text
Discord Bot reads ActiveProject.json.
If /ai project profile has no explicit id, show the active project profile.
```

Current behavior is acceptable as a transition state.

---

## 9. Future Discord Commands

Future commands:

```text
/ai project current
/ai project select dustland_custom_cpp_prototype
/ai project select unity_project_template
```

Permission level:

```text
/ai project current
  read-only

/ai project select
  write workflow docs
  approval required
```

Do not implement project selection writes until Discord Stage 3 or later.

---

## 10. Unity Workflow Implication

This selector is required because the long-term workflow target is Unity-based solo game development.

Current active project:

```text
Dust Land custom C++ prototype
```

Future active projects may be:

```text
Dust Land Unity port
Unity Steam prototype
Unity Google Play mobile project
```

The selector prevents Discord and local tools from assuming that Dust Land's C++ prototype is always the active project.

---

## 11. Completion Criteria for WF-012

WF-012 is complete when:

```text
[ ] Active_Project_Selector.md exists.
[ ] ActiveProject.json exists.
[ ] ActiveProject template exists.
[ ] Backlog marks WF-012 as done.
[ ] README.md Document Map includes Active_Project_Selector.md.
[ ] AGENTS.md Source of Truth includes Active_Project_Selector.md if desired.
```

---

## 12. Recommended Next Work

Recommended next task:

```text
WF-016:
Implement active project status reader and integrate active project selection into local scripts.
```

Purpose:

```text
Make tools/aiworkflow read ActiveProject.json and expose active project status.
```

# Project Profile Schema

## 1. Purpose

This document defines the project profile schema for the AI Orchestrator workflow.

Project profiles allow the workflow to support multiple solo-developed game projects without hardcoding Dust Land's current C++ / WinAPI prototype structure.

This is a Level 3 preparation document and a prerequisite for future Discord-connected orchestration.

---

## 2. Core Principle

The workflow must be project-profile driven.

```text
Orchestrator Core:
  common workflow logic

Project Profile:
  project-specific paths, engine, build, validation, release, and safety rules

Tool Adapters:
  execute bounded commands based on project profile
```

Do not hardcode project-specific behavior in Discord bot command handlers.

---

## 3. Strategic Direction

Current testbed:

```text
Dust Land custom C++ / WinAPI prototype
```

Long-term production target:

```text
Unity-based solo game development and release
```

Release targets:

```text
Steam
Google Play / mobile stores
```

Workflow implication:

```text
The workflow must remain reusable across Unity projects.
Dust Land is a workflow testbed, not the permanent baseline.
```

---

## 4. Project Profile Location

Recommended location:

```text
_Docs/AIWorkflow/ProjectProfiles/
```

Initial files:

```text
_Docs/AIWorkflow/ProjectProfiles/dustland_custom_cpp_prototype.json
_Docs/AIWorkflow/ProjectProfiles/unity_project_template.json
```

Future multi-project structure may move profiles into a dedicated machine-readable folder, but for now they should remain under `_Docs/AIWorkflow/` for reviewability.

---

## 5. Required Fields

Every project profile should include:

```json
{
  "schema_version": "1.0",
  "project_id": "",
  "display_name": "",
  "project_type": "",
  "engine": "",
  "engine_version": "",
  "repo_path": "",
  "docs_path": "",
  "devlog_path": "",
  "workflow_state_files": {},
  "source_roots": [],
  "data_roots": [],
  "asset_roots": [],
  "build_profiles": [],
  "validation_profiles": [],
  "release_targets": [],
  "allowed_readonly_commands": [],
  "allowed_write_commands": [],
  "forbidden_operations": [],
  "approval_policy": {},
  "tool_adapters": {},
  "notes": []
}
```

---

## 6. Field Definitions

| Field | Meaning |
|---|---|
| `schema_version` | Profile schema version |
| `project_id` | Stable machine-readable project ID |
| `display_name` | Human-readable project name |
| `project_type` | e.g. `prototype`, `production`, `vertical_slice`, `release_candidate` |
| `engine` | e.g. `custom_cpp`, `unity` |
| `engine_version` | Engine version if applicable |
| `repo_path` | Repository root path |
| `docs_path` | Workflow/document path |
| `devlog_path` | Dev Log path |
| `workflow_state_files` | ProjectStatus/Backlog/ActiveTask paths |
| `source_roots` | Source code directories |
| `data_roots` | Data/config directories |
| `asset_roots` | Asset directories |
| `build_profiles` | Named build profiles |
| `validation_profiles` | Named validation profiles |
| `release_targets` | Steam, Google Play, local prototype, etc. |
| `allowed_readonly_commands` | Safe read-only commands |
| `allowed_write_commands` | Explicitly allowed write commands, usually empty at first |
| `forbidden_operations` | Operations disallowed by default |
| `approval_policy` | Required approvals by action type |
| `tool_adapters` | Git/build/test/Unity/custom tool configuration |
| `notes` | Human-readable constraints and project-specific notes |

---

## 7. Build Profile Model

A build profile should define:

```json
{
  "id": "debug",
  "label": "Debug",
  "type": "manual",
  "command": "",
  "working_directory": "",
  "requires_approval": true,
  "expected_output": ""
}
```

Recommended `type` values:

```text
manual
script
visual_studio
unity_editor
unity_cli
ci
```

---

## 8. Validation Profile Model

A validation profile should define:

```json
{
  "id": "json_smoke",
  "label": "JSON Smoke Check",
  "type": "script",
  "command": "tools/aiworkflow/json_smoke_check.bat",
  "requires_approval": false,
  "evidence_required": "command output"
}
```

Recommended validation types:

```text
script
manual_runtime
build
unit_test
integration_test
unity_editmode
unity_playmode
unity_build_smoke
store_package_check
```

---

## 9. Approval Policy Model

A profile should explicitly define what requires approval.

Example:

```json
{
  "read_status": "auto_allowed",
  "capture_diff": "auto_allowed",
  "json_smoke_check": "auto_allowed",
  "build": "approval_required",
  "runtime_execution": "approval_required",
  "write_docs": "approval_required",
  "write_source": "approval_required",
  "commit": "human_only",
  "push": "human_only",
  "release": "human_only"
}
```

---

## 10. Safety Rules

Default forbidden operations:

```text
automatic source code modification
automatic commit
automatic push
automatic release
automatic store upload
automatic project-file editing
automatic validation pass/fail approval
automatic destructive cleanup
```

These may only be relaxed through explicit workflow rule updates.

---

## 11. Unity-Specific Profile Fields

Unity project profiles should include:

```json
{
  "unity": {
    "unity_version": "",
    "project_settings_path": "ProjectSettings",
    "assets_path": "Assets",
    "packages_path": "Packages",
    "scenes": [],
    "assemblies": [],
    "editor_tests": [],
    "playmode_tests": [],
    "addressables": false,
    "target_platforms": []
  }
}
```

Recommended Unity target platforms:

```text
windows_steam
android_google_play
ios_app_store
mac_steam
linux_steam
```

---

## 12. Custom C++ Prototype Fields

Custom C++ profiles may include:

```json
{
  "custom_cpp": {
    "solution_file": "",
    "project_file": "",
    "data_path": "",
    "visual_studio_version": "",
    "toolset": "",
    "runtime_entry_scene": "",
    "manual_runtime_validation": []
  }
}
```

These fields must remain profile-specific and should not leak into the common Orchestrator Core.

---

## 13. Discord Integration Usage

Discord v1 should read project profiles to answer:

```text
Which project is active?
What workflow state files should be read?
What commands are safe?
What validation profiles exist?
What operations require approval?
What is the next human action?
```

Discord v1 should not perform write operations.

---

## 14. Multi-Project Direction

Future structure may support:

```text
/ai project list
/ai project select dustland
/ai status
/ai backlog
/ai active
```

Project selection should load a project profile, not hardcoded project paths.

---

## 15. Completion Criteria for WF-009

WF-009 is complete when:

```text
[ ] Project_Profile_Schema.md exists.
[ ] Dust Land custom C++ prototype profile exists.
[ ] Unity project template profile exists.
[ ] Profile README exists.
[ ] Backlog marks WF-009 as done.
[ ] ActiveTask records completion.
[ ] Document diff is reviewed.
```

# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-011
title: Create project profile status reader
status: done
workflow_path: local_script_validation
priority: P1
risk_level: low
requested_by: human_director
requested_at: 2026-04-30
last_updated: 2026-04-30
```

---

## Goal

Create a read-only project profile status reader that can later support Discord and local orchestrator commands.

---

## Approved Scope

Included:

```text
- Read project profile JSON files from _Docs/AIWorkflow/ProjectProfiles.
- List available profiles.
- Summarize one selected profile.
- Print JSON output for future Discord integration.
- Validate required fields.
```

Excluded:

```text
- Discord bot implementation.
- Source code modification.
- Automatic project switching.
- Automatic command execution from profiles.
- Build/runtime execution.
```

---

## Tool Route

```yaml
chatgpt: generated scripts
codex: not required
copilot: not used
git: user review and commit
validation: local script execution
```

---

## Files In Scope

```text
tools/aiworkflow/project_profile_status.bat
tools/aiworkflow/project_profile_status.ps1
tools/aiworkflow/README.md
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/Backlog.md
```

---

## Human Action Required

```text
1. Save project_profile_status.bat and project_profile_status.ps1.
2. Save updated tools/aiworkflow/README.md.
3. Update Backlog.md WF-011 to done.
4. Run tools/aiworkflow/project_profile_status.bat --list.
5. Run tools/aiworkflow/project_profile_status.bat.
6. Run tools/aiworkflow/project_profile_status.bat --project unity_project_template.
7. Run JSON output if needed.
8. Review output.
9. Commit if valid.
```

---

## Next Recommended Task

```text
WF-006:
Refine Discord Orchestrator architecture into implementation stages.
```

Alternative:

```text
WF-012:
Create active project selector/config convention.
```

---

## Completion Criteria

```text
[ ] project_profile_status.bat saved
[ ] project_profile_status.ps1 saved
[ ] tools/aiworkflow/README.md updated
[ ] project_profile_status.bat --list tested
[ ] Dust Land profile summary tested
[ ] Unity template profile summary tested
[ ] JSON output tested or explicitly deferred
[ ] Backlog.md updated
[ ] Commit completed or explicitly deferred
```

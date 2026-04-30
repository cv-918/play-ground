# Discord Orchestrator Implementation Stages

## 1. Purpose

This document refines the Discord Orchestrator architecture into practical implementation stages.

The goal is to move toward a Discord-connected AI workflow while preserving safety, reviewability, and multi-project reuse.

This is not a request to build the Discord bot immediately.

---

## 2. Strategic Target

The long-term goal is:

```text
Discord-based remote command / status / approval interface
+
local or server-side AI workflow orchestrator
+
project-profile driven multi-project support
```

The human remains the final director.

The system handles:

```text
state reporting
task tracking
prompt/status surfacing
safe read-only checks
approval reminders
bounded local script execution later
```

The system must not become:

```text
an uncontrolled coding bot
an automatic committer
a hidden state machine
a Dust Land-only tool
```

---

## 3. Final Architecture

```text
Discord Client
  ↓
Discord Bot Adapter
  ↓
Orchestrator Command Layer
  ↓
Orchestrator Core
  ↓
State Store
  ├─ ProjectStatus.md
  ├─ Backlog.md
  ├─ ActiveTask.md
  └─ ProjectProfiles/*.json
  ↓
Tool Adapters
  ├─ Git read-only adapter
  ├─ Workflow status adapter
  ├─ Project profile adapter
  ├─ Diff capture adapter
  ├─ JSON smoke-check adapter
  ├─ DevLog draft adapter
  └─ future build/test adapters
  ↓
Project Workspace
```

Key rule:

```text
Discord is only a UI adapter.
The Orchestrator Core owns state transitions, safety rules, and tool routing.
```

---

## 4. Current Foundation

Already available:

```text
_Docs/AIWorkflow/ProjectStatus.md
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/Task_State_Model.md
_Docs/AIWorkflow/Project_Profile_Schema.md
_Docs/AIWorkflow/ProjectProfiles/dustland_custom_cpp_prototype.json
_Docs/AIWorkflow/ProjectProfiles/unity_project_template.json
tools/aiworkflow/status.bat
tools/aiworkflow/capture_diff.bat
tools/aiworkflow/json_smoke_check.bat
tools/aiworkflow/workflow_status.bat
tools/aiworkflow/project_profile_status.bat
```

This means the workflow has enough structure to begin Discord read-only planning.

---

## 5. Implementation Stage Overview

| Stage | Name | Purpose | Write Permission |
|---:|---|---|---|
| 0 | Manual Workflow Foundation | Docs, state files, local helper scripts | Human only |
| 1 | Read-Only Local Command Layer | Stable CLI summaries for workflow/project state | None |
| 2 | Discord Read-Only Bot | Remote status visibility | None |
| 3 | Discord Approval Notes | Capture human decisions into workflow docs | Docs only, approval required |
| 4 | Controlled Local Script Execution | Trigger safe scripts from Discord | Script-limited |
| 5 | Multi-Project Project Selection | Switch active project profile | Config/docs only |
| 6 | Build/Test Invocation | Run approved build/test profiles | Approval required |
| 7 | Implementation Agent Routing | Prepare or trigger coding-agent tasks | Human approval required |
| 8 | Release Workflow Support | Steam/Google Play checklist and packaging support | Human-gated |

Recommended current target:

```text
Stage 2: Discord Read-Only Bot
```

Do not skip directly to Stage 4 or beyond.

---

## 6. Stage 0 — Manual Workflow Foundation

Status:

```text
mostly complete
```

Scope:

```text
workflow docs
state docs
task state model
project profiles
local helper scripts
manual commits
manual validation
```

Completion evidence:

```text
workflow_status.bat works
project_profile_status.bat works
json_smoke_check.bat works
capture_diff.bat works
```

---

## 7. Stage 1 — Read-Only Local Command Layer

Status:

```text
in progress / mostly complete
```

Required commands:

```text
tools/aiworkflow/status.bat
tools/aiworkflow/workflow_status.bat
tools/aiworkflow/workflow_status.bat --json
tools/aiworkflow/project_profile_status.bat --list
tools/aiworkflow/project_profile_status.bat --json
tools/aiworkflow/json_smoke_check.bat
```

Purpose:

```text
Expose stable machine-readable output before Discord integration.
```

Completion criteria:

```text
[ ] workflow_status.bat --json works
[ ] project_profile_status.bat --json works
[ ] outputs are stable enough for Discord bot parsing
[ ] no command modifies source code
```

---

## 8. Stage 2 — Discord Read-Only Bot

Purpose:

```text
Allow remote status checking from Discord.
```

Allowed commands:

```text
/ai status
/ai active
/ai backlog
/ai project list
/ai project current
/ai project profile
/ai next
/ai blockers
/ai docs
```

Allowed operations:

```text
read state files
run read-only status scripts
format summaries
send Discord messages
```

Forbidden operations:

```text
write source files
write docs
run Copilot
commit
push
build
release
delete files
modify Unity scenes/assets
```

Minimum implementation approach:

```text
Discord bot receives slash command
-> calls local read-only script
-> captures output
-> formats concise Discord response
```

For v1, the bot may be local-only and run on the developer PC.

---

## 9. Stage 3 — Discord Approval Notes

Purpose:

```text
Allow Discord to record human approval decisions into workflow state.
```

Example commands:

```text
/ai approve WF-013
/ai reject WF-013
/ai block WF-013 reason:...
/ai defer WF-013
```

Allowed writes:

```text
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/Backlog.md
```

Restrictions:

```text
Only state fields may be updated.
No source file writes.
No commit.
No implementation execution.
```

This stage requires a safe markdown/state writer and transition validation against `Task_State_Model.md`.

---

## 10. Stage 4 — Controlled Local Script Execution

Purpose:

```text
Allow Discord to run pre-approved local workflow scripts.
```

Candidate commands:

```text
/ai capture-diff
/ai check-json
/ai workflow-status
/ai project-status
```

Allowed scripts only:

```text
tools/aiworkflow/capture_diff.bat --include-untracked
tools/aiworkflow/json_smoke_check.bat
tools/aiworkflow/workflow_status.bat
tools/aiworkflow/project_profile_status.bat
```

Restrictions:

```text
No arbitrary shell command execution.
No source writes.
No commit.
No push.
No release.
```

Command allowlist must come from the active project profile.

---

## 11. Stage 5 — Multi-Project Project Selection

Purpose:

```text
Allow Discord and local tools to select active project profile.
```

Candidate file:

```text
_Docs/AIWorkflow/ActiveProject.json
```

Candidate commands:

```text
/ai project list
/ai project select dustland_custom_cpp_prototype
/ai project current
```

Rules:

```text
project selection writes only ActiveProject.json
selected profile must exist
commands must obey selected profile approval policy
```

This is required before using the workflow across multiple Unity projects.

---

## 12. Stage 6 — Build/Test Invocation

Purpose:

```text
Run approved build/test profiles from Discord or local orchestrator.
```

Examples:

```text
/ai run validation json_smoke
/ai run validation unity_compile_check
/ai run build windows_steam_build
```

Rules:

```text
requires explicit human approval
uses active project profile
records evidence
does not judge subjective runtime validation automatically
```

For Unity, this stage must distinguish:

```text
compile check
editmode tests
playmode tests
manual scene boot
build smoke test
store package check
```

---

## 13. Stage 7 — Implementation Agent Routing

Purpose:

```text
Prepare or route implementation work to Copilot/Codex/coding agents.
```

Allowed first version:

```text
generate prompt files
generate TaskRequests
summarize approved scope
```

Forbidden early version:

```text
automatic Copilot execution
automatic source modification
automatic commit
```

Human must still approve:

```text
scope
files in scope
implementation prompt
diff acceptance
commit
```

---

## 14. Stage 8 — Release Workflow Support

Purpose:

```text
Support Steam / Google Play release checklists and packaging workflows.
```

This is long-term.

Scope may include:

```text
release checklist status
build artifact tracking
store metadata checklist
version/changelog draft
QA checklist
```

Still human-gated:

```text
store upload
release publishing
price/visibility changes
production build approval
```

---

## 15. Recommended Immediate Next Work

Recommended next task:

```text
WF-013:
Design Discord Read-Only Bot v1
```

Scope:

```text
slash command spec
local execution model
security constraints
configuration
message formatting
deployment choice
```

Do not implement build/test/write operations yet.

---

## 16. Stage Gate Rule

Each stage must be completed and validated before enabling the next stage.

```text
Stage 1 before Stage 2
Stage 2 before Stage 3
Stage 3 before Stage 4
```

A later-stage document may be drafted early, but implementation must remain gated.

---

## 17. Summary

The correct path is:

```text
readable state
-> local read-only summaries
-> Discord read-only visibility
-> approval recording
-> controlled script execution
-> multi-project support
-> build/test support
-> coding-agent routing
-> release workflow support
```

This keeps the workflow safe, reusable, and Unity-ready.

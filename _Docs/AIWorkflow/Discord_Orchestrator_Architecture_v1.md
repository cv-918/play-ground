# Discord Orchestrator Architecture v1

## Purpose

This document defines the first architecture for the future Discord-connected AI Orchestrator workflow.

This is not an implementation request.

---

## Core Design Principle

Discord must not be the brain.

```text
Discord:
  UI adapter

Orchestrator Core:
  state machine, routing, approval logic

Tool Adapters:
  Git, file system, Codex prompts, Copilot prompts, build/test scripts

Project Workspace:
  actual game repository
```

---

## Final Architecture

```text
Discord Client
  ↓
Discord Bot Adapter
  ↓
Orchestrator API / Command Handler
  ↓
Orchestrator Core
  ↓
State Store
  ├─ ProjectStatus.md
  ├─ Backlog.md
  └─ ActiveTask.md
  ↓
Tool Adapters
  ├─ Git Adapter
  ├─ File Adapter
  ├─ Diff Adapter
  ├─ JSON Smoke Check Adapter
  ├─ Codex Prompt Adapter
  ├─ Copilot Prompt Adapter
  ├─ Build/Test Adapter
  └─ DevLog Adapter
  ↓
Project Workspace
```

---

## Layer Responsibilities

## Discord Bot Adapter

Owns:

```text
receive slash commands
format responses
send notifications
present approval choices
show status summaries
```

Does not own:

```text
task state machine
tool execution policy
approval rules
project-specific logic
```

## Orchestrator Core

Owns:

```text
load state documents
classify current task state
enforce allowed transitions
determine next required action
route to safe tool adapter
generate status summary
block unsafe actions
```

## State Store

Initial state files:

```text
_Docs/AIWorkflow/ProjectStatus.md
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ActiveTask.md
```

Purpose:

```text
make the workflow readable by humans and tools
avoid hidden bot-only state
keep Git-based traceability
```

---

## Discord v1 Commands

Read-only commands:

```text
/ai status
/ai active
/ai backlog
/ai blockers
/ai next
/ai docs
```

## Discord v2 Commands

Approval commands:

```text
/ai approve
/ai reject
/ai block
/ai resume
/ai assign-next
```

May update task state docs only after approval.

## Discord v3 Commands

Controlled local-script commands:

```text
/ai capture-diff
/ai check-diff
/ai json-smoke
/ai draft-devlog
/ai create-task-request
```

---

## Not Allowed in Early Discord Versions

```text
automatic source code modification
automatic Copilot execution
automatic Codex execution with write permissions
automatic commit
automatic push
automatic release
automatic project-file editing
automatic validation pass/fail approval
```

---

## Safety Model

```text
Read-only:
  safe by default

Write-to-docs:
  approval required

Write-to-source:
  not allowed in v1/v2

Git commit:
  human-only

Build/test execution:
  approval required

Runtime validation result:
  human-provided evidence only
```

---

## Minimal Implementation Strategy

```text
1. Maintain ProjectStatus.md / Backlog.md / ActiveTask.md manually.
2. Create local read-only scripts.
3. Create command-line status summarizer.
4. Connect Discord to read-only summarizer.
5. Add approval command flow.
6. Add bounded local script execution.
7. Consider controlled write operations later.
```

---

## Multi-Project Direction

Project-specific information belongs in config.

Common workflow logic belongs in Orchestrator Core.

Do not hardcode Dust Land rules into Discord command handlers.

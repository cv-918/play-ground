# Studio ToolRun Requests

## Purpose

This folder stores governed ToolRunRequest records before any tool adapter is
allowed to run.

A ToolRunRequest is not execution. It is the reviewable request that explains:

- which adapter is requested
- what action is requested
- why the action is needed
- what permission class it needs
- whether approval is already attached
- what evidence must be collected later

## Boundary

ToolRunRequest planning may say:

- `allowed_without_execution`
- `human_required`
- `blocked`
- `ready_for_execution_gate`

It must not execute the adapter, call LLMs, write canon, create tasks, approve
work, mark work done, commit, or push.

`ToolRun` remains the trace of an actual tool invocation after a request passes
governance and an execution adapter runs.

## Default Store

Durable request records live here:

```text
_Docs/AIWorkflow/Studio/ToolRuns/
```

Validation smoke tests should override the store to `_Temp`:

```bat
tools\aiworkflow\studio_tool_run_planner.bat create _Docs\AIWorkflow\Studio\Examples\tool_run_request_codex_staff.example.json --execute --store-path _Temp\AIWorkflowStudio\toolrun-smoke
```

## Human Director Rule

Any request that can modify files, call external systems, incur cost, change
canon, affect runtime behavior, commit, or push must either be blocked or
stopped for Human Director approval.

The current provider policy is:

```text
Use signed-in Codex App/CLI and ChatGPT/Codex subscription routes first.
Do not require OpenAI API billing by default.
```

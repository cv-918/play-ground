# Workflow Update Request

Use this template when workflow rules, folder structure, tool responsibilities, or prompt templates need to change.

---

## Change Reason

Describe why the workflow needs to change.

```text
Change reason:
...
```

---

## Current Rule

Paste the current rule or describe current behavior.

```text
Current rule:
...
```

---

## Proposed Rule

Describe the proposed new rule.

```text
Proposed rule:
...
```

---

## Affected Documents

List affected documents.

Examples:

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `_Docs/AIWorkflow/00_AI_Orchestrator_Overview.md`
- `_Docs/AIWorkflow/01_AI_Orchestrator_Protocol.md`
- `_Docs/AIWorkflow/02_Workflow_Scope.md`
- `_Docs/AIWorkflow/03_Agent_Roles.md`
- `_Docs/AIWorkflow/04_Human_Approval_Gates.md`
- `_Docs/AIWorkflow/05_Tool_Routing_Rules.md`
- `_Docs/AIWorkflow/06_Task_Templates.md`
- `_Docs/AIWorkflow/07_Review_Validation_Rules.md`
- `_Docs/AIWorkflow/08_DevLog_Rules.md`
- `_Docs/AIWorkflow/PromptTemplates/*.md`

```text
Affected documents:
...
```

---

## Required Migration

Describe whether files, folders, prompts, or previous documents need to be updated.

```text
Required migration:
...
```

---

## Approval Needed

Workflow rule changes require explicit user approval.

```text
Approval needed:
Yes
```

---

## Required Output

The assistant must provide:

1. Rule update summary
2. Reason for the change
3. Affected documents
4. Proposed text changes
5. Required-read Korean summary update if needed
6. User action list
7. Migration steps if needed
8. Commit suggestion

---

## Required Assistant Behavior

The assistant must not silently change workflow rules.

The assistant must not create conflicting rules across documents.

The assistant must identify whether Korean required-read documents need updates.

The assistant must stop at approval gates before changing project workflow rules.

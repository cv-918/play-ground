# WF-417 Intake TaskDraft Schema Enforcement WorkLog

## Summary

Hardened `/ai intake` TaskDraft schema enforcement so the LLM-assisted intake
path cannot silently accept loose or overbroad JSON before writing Backlog state.

## Background

`/ai intake` already used Codex CLI `--output-schema` and a local
`validateTaskDraft` pass. The remaining gap was that local validation normalized
some malformed values into acceptable shapes. This work tightens the local pass
so it acts as a real second gate after Codex CLI schema-constrained output.

## Scope

- Strengthen the TaskDraft JSON schema metadata and field constraints.
- Reject unknown TaskDraft fields locally.
- Reject loose local JSON shapes such as string confidence values, non-array
  list fields, and non-string or blank list items.
- Document the two-layer schema enforcement behavior in the intake command
  source-of-truth document.

## Files Changed

- `tools/discord-orchestrator/src/services/taskDraftSchema.js`
- `_Docs/AIWorkflow/Discord_Task_Intake_Command.md`
- `_DevLog/WorkLog/2026-05-12_WF-417_Intake_TaskDraft_Schema_Enforcement.md`

## Implementation Notes

- Added JSON Schema metadata and explicit `minLength`, `minItems`, and
  `uniqueItems` constraints.
- Added a local unknown-field check matching `additionalProperties: false`.
- Added strict array checks for `recommended_roles`, `human_decision_gates`,
  `required_validation`, and `clarifying_questions`.
- Preserved normalized output for valid drafts so downstream Backlog formatting
  behavior remains stable.

## Validation Summary

Planned validation:

- `node --check tools/discord-orchestrator/src/services/taskDraftSchema.js`
- Local validator smoke for valid TaskDraft, unknown field rejection,
  non-array list rejection, string confidence rejection, and empty required
  validation rejection.
- `git diff --check`
- `git diff --stat`
- `_Local`, `_Temp`, `node_modules`, `.env`, and local config tracking check.

## Remaining Risks

- This is a stricter gate. If a future Codex CLI version returns a structurally
  valid but semantically weak draft, schema validation will still pass and the
  existing rule-based cross-check/human review layer remains responsible for
  semantic judgment.

## AI Assistance

Codex implemented and validated this workflow harness change.

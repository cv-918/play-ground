# Handoff Supervisor Output Format Standardization

## Summary

Standardized the recurring `playground-handoff-supervisor` automation output format.

The automation prompt now requires a fixed Markdown section order so each scheduled run presents the same status surface in the Codex app.

## Background

The human developer observed that the Supervisor run output had been changing shape between scheduled runs.

The previous prompt specified what to report, but not the exact report structure.

## Scope

Changed:

- `playground-handoff-supervisor` Codex automation prompt
- `_Docs/Handoff/Handoff_Supervisor_Automation_Runbook.md`
- `_Docs/Handoff/Handoff_Supervisor_Automation_Runbook_KR.md`

Not changed:

- game source
- gameplay JSON
- runtime behavior
- assets
- build settings
- generated Handoff status surfaces
- Packet manifests
- approval evidence
- commit or push state

## Output Contract

Supervisor run responses must use this section order:

1. Status
2. Counts
3. Waiting User Approval
4. Consistency Issues
5. Generated Files
6. Forbidden Action Check
7. Human Action Needed

Empty Waiting User Approval, Consistency Issues, and Human Action Needed sections must use `None`.

## Validation Summary

Performed:

- updated the Codex automation with the fixed prompt
- documented the fixed format in English and Korean Handoff runbooks

Not performed:

- build validation
- runtime validation
- commit
- push

## Remaining Risks

The next scheduled Supervisor run should be observed to confirm the model follows the fixed format in practice.

The prompt now makes the required format explicit, but the actual scheduled response must still be checked once.

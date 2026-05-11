# AIWorkflow Operating Procedure Docs Update

## Summary

Updated existing AIWorkflow operating documents to clarify the current Discord/Codex App workflow and the boundary between rule-based intake and future LLM-assisted intake.

## Background

The workflow already had operating documents, but the current practical flow uses Discord as the task-state/request/audit layer and Codex App or Codex CLI as a manual execution surface. The existing docs did not clearly state that `/ai intake` is currently keyword/rule-based rather than LLM-powered.

## Scope

- Updated existing AIWorkflow documents only.
- Did not create a new consolidated workflow manual.
- Did not implement LLM API calls.
- Did not change Discord command behavior.
- Added a Backlog done row after the documentation update was reviewed.
- Did not update ActiveTask for this documentation task.
- Did not modify game source or data.

## Files Changed

- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/09_Operational_Playbook.md`
- `_Docs/AIWorkflow/AIWorkflow_Overview_KR.md`
- `_Docs/AIWorkflow/AIWorkflow_Flowchart_KR.md`
- `_Docs/AIWorkflow/AIWorkflow_Korean_Guide_Glossary.md`
- `_Docs/AIWorkflow/Discord_Task_Intake_Command.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_DevLog/FixLog/2026-05-11_AIWorkflow_Operating_Procedure_Docs_Update.md`

## Architecture Notes

The documented responsibility split is:

- Discord Orchestrator owns task state, request generation, approval records, and result audit.
- Codex App or Codex CLI remains a manual execution surface.
- Current `/ai intake` is a rule-based task draft helper.
- Future LLM-assisted intake may generate TaskDraft candidates, but schema validation, rule-based cross-check, Backlog writes, ActiveTask writes, approvals, execution, done, and commit decisions remain controlled by the workflow harness and Human Director.

## Implementation Notes

- Updated the regular flow to allow `/ai intake` or ChatGPT/Codex App discussion before task creation.
- Added Codex App prompt requirements to the operational playbook.
- Added Korean user-facing explanation for current intake limitations and future LLM-assisted intake boundaries.
- Added future LLM-assisted intake boundary rules to the intake command specification.

## Review Summary

Self-review checked that the changes document operating behavior only and do not claim any new command behavior exists.

## Validation Summary

- `git diff --check`: passed with line-ending warnings only.
- `git diff --stat`: reviewed. The full working tree includes pre-existing unrelated dirty files.
- Target document diff reviewed for requested plan coverage.
- Confirmed no new consolidated workflow manual was created.
- Confirmed the docs describe future LLM-assisted intake as design boundary only, not implemented behavior.
- Added Backlog entry `WF-20260511-000001` as a done documentation record.

## Remaining Risks

- The docs now describe a future LLM-assisted intake boundary, but no implementation exists yet.
- Existing unrelated dirty files were present before this documentation update and were not changed by this work.

## Next Tasks

- Review the diff before commit.
- Do not commit until unrelated dirty changes are intentionally accounted for.

## AI Assistance

Codex implemented the documentation update.

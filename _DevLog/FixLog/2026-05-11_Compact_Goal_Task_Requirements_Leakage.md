# Compact Goal Task Requirements Leakage Fix

## Summary

Fixed compact `/ai prepare goal` task-specific requirement generation so WF-208 file watcher/diff snapshot tasks no longer receive WF-207 progress/heartbeat acceptance criteria.

## Background

WF-208 compact output incorrectly selected WF-207-specific requirements because compact prompt inference treated broad runtime terms such as `ProgressEventLog` as enough evidence for the progress/heartbeat branch.

## Scope

- Updated compact goal prompt inference only.
- Did not add Discord commands.
- Did not change task state semantics.
- Did not modify game source or data.
- Did not commit.

## Files Changed

- `tools/discord-orchestrator/src/services/goalPromptService.js`
- `_DevLog/FixLog/2026-05-11_Compact_Goal_Task_Requirements_Leakage.md`

## Architecture Notes

Compact prompt generation now separates file watcher/diff snapshot task detection from progress/heartbeat task detection. The file watcher branch is selected from task reason/scope text that explicitly describes file change collection and diff snapshots.

## Implementation Notes

- Added WF-208-oriented file watcher/diff snapshot requirements and acceptance criteria.
- Added a compact Scope Guard section for task-specific guardrails.
- Narrowed the progress/heartbeat detector so `ProgressEventLog` alone does not trigger WF-207 requirements.

## Review Summary

Self-review found the previous broad detector allowed WF-208 to match the WF-207 branch through shared runtime/evidence vocabulary.

## Validation Summary

- `node --check tools\discord-orchestrator\src\services\goalPromptService.js`: passed.
- Generated WF-208 compact goal request: passed, 6,016 characters.
- Confirmed WF-208 compact output contains file watcher/diff snapshot requirements.
- Confirmed WF-208 compact output does not contain WF-207 heartbeat/idle/stalled acceptance criteria.
- Generated WF-208 standard goal request: passed.
- `git diff --check`: passed with line-ending warnings only.
- Confirmed no `PlayGround/Project` or `PlayGround/Data` diff entries.

## Remaining Risks

- Generated `_Temp/AIWorkflowTaskRequests/` validation artifacts are local output files and should remain untracked.
- Pre-existing `_Docs/AIWorkflow/ActiveTask.md` and `_Docs/AIWorkflow/Backlog.md` changes were present before this fix and were not modified for this code change.

## Next Tasks

- Review the diff before commit.
- Do not commit until the pre-existing documentation changes are intentionally accounted for.

## AI Assistance

Codex implemented and validated this minor fix.

# 10. Quick Checklists

Status: Support / quick-check reference
Authority: Checklist companion for current workflow. If a checklist conflicts with canonical rules or the operational playbook, use the canonical rule.

## 1. Purpose

This document provides short practical checklists for the AI Orchestrator workflow.

Use it to answer:

```text
Can I start?
Can I ask Codex?
Can I ask Copilot?
Can I review?
Can I validate?
Can I commit?
Should I stop?
```

---

## 2. Task Start Checklist

```text
[ ] Task goal is clear.
[ ] Current context is written.
[ ] Scope is defined.
[ ] Non-goals are defined.
[ ] Expected output is defined.
[ ] Architecture risk is considered.
[ ] Runtime/data/lifecycle impact is considered.
[ ] Approval need is identified.
```

Use the orchestrator workflow if the task affects architecture, runtime behavior, data schema, scene/actor lifecycle, save/load, multiple files, or AI-generated implementation.

---

## 3. Architecture Approval Checklist

```text
[ ] Final-form architecture is defined.
[ ] Reduced-scope implementation preserves the same structure.
[ ] Decision, execution, and data responsibilities are separated.
[ ] Ownership and lifecycle are explicit.
[ ] Data flow is explicit.
[ ] Debugging and traceability are considered.
[ ] Non-goals are listed.
[ ] Deferred decisions are listed.
[ ] User approved the direction.
```

Do not proceed to implementation if architecture approval is missing.

---

## 4. Codex Read-Only Analysis Checklist

```text
[ ] Repository context is actually needed.
[ ] Prompt says read-only analysis.
[ ] Prompt says do not modify files.
[ ] Goal is clear.
[ ] Approved scope is included.
[ ] Non-goals are included.
[ ] Systems to inspect are listed.
[ ] Questions to answer are listed.
[ ] Expected output is defined.
[ ] Restrictions are explicit.
```

Recommended setup:

```text
Model: GPT-5.3-Codex or GPT-5.4
Intelligence: High
Mode: Read-only analysis
```

---

## 5. Copilot Implementation Checklist

```text
[ ] Architecture is approved.
[ ] Scope is approved.
[ ] Non-goals are approved.
[ ] Files allowed to create are listed.
[ ] Files allowed to modify are listed.
[ ] Files not allowed to touch are listed.
[ ] Required changes are listed.
[ ] Forbidden changes are listed.
[ ] Stop conditions are included.
[ ] Expected output summary is included.
[ ] git status was checked.
```

Recommended setup:

```text
Model: GPT-5.3-Codex
Intelligence: High
Mode: Agent Mode
Permission: approved files only
```

Do not use Copilot if file scope is unclear.

---

## 6. Full Diff Capture Checklist

```text
[ ] git status was checked.
[ ] git diff --stat was checked.
[ ] Newly created files are included in diff.
[ ] Untracked files were handled with git add -N or staged diff.
[ ] No unexpected files appear.
[ ] git diff --check was run or planned before commit.
```

For untracked new files:

```bash
git add -N <new_file>
git diff > review.diff
```

or:

```bash
git add <intended_files>
git diff --cached > review.diff
```

---

## 7. Diff Review Checklist

```text
[ ] Approved scope respected.
[ ] No forbidden files changed.
[ ] No unrelated refactoring.
[ ] Architecture boundaries preserved.
[ ] Data loading separated from runtime execution.
[ ] Scene/actor lifecycle safe.
[ ] Ownership is clear.
[ ] Update order assumptions are explicit.
[ ] Invalid data handling is safe.
[ ] Debug/release behavior is appropriate.
[ ] No hidden behavior changes.
[ ] Diff is reviewable.
```

---

## 8. Visual Studio Project File Checklist

If `.vcxproj` or `.vcxproj.filters` changed:

```text
[ ] Only approved new files were added.
[ ] Unrelated entries were not reordered.
[ ] Existing filter names were not corrupted.
[ ] Korean filter names remain valid.
[ ] Encoding/BOM changes are intentional or harmless.
[ ] ResourceCompile/Image/None entries point to correct filters.
[ ] No broad project-file rewrite occurred.
```

Treat encoding damage as a review issue.

---

## 9. Scene Lifecycle Checklist

For `Initialize`, `OnEnter`, `OnExit`, `Ready`, `Load`, or `Setup`:

```text
[ ] No broad early return after partial initialization.
[ ] Optional feature failure is handled locally.
[ ] Core scene initialization continues when safe.
[ ] Camera/UI/registration/cleanup symmetry is preserved.
[ ] Created objects have clear ownership.
[ ] Cleanup behavior remains valid.
```

---

## 10. Validation Checklist

```text
[ ] git diff --check passed.
[ ] Target build configuration passed.
[ ] Runtime smoke test passed.
[ ] Feature-specific test passed.
[ ] Regression test for affected systems passed.
[ ] Invalid data / edge case test passed if data-driven.
[ ] Remaining unverified areas are listed.
```

Do not mark the task complete based only on build success.

---

## 11. Validation Result Form

```text
Validation Result

1. Diff Check:
- git diff --check:
- Notes:

2. Build:
- Configuration:
- Result:
- Errors:
- Warnings:

3. Runtime Smoke:
- Result:
- Notes:

4. Feature Test:
- Result:
- Notes:

5. Regression:
- Result:
- Notes:

6. Invalid Data / Edge Cases:
- Tested:
- Result:
- Notes:

7. Remaining Unverified:
- ...
```

---

## 12. Dev Log Checklist

```text
[ ] Summary is clear.
[ ] Background explains why the work was needed.
[ ] Scope lists included and excluded work.
[ ] Files changed are accurate.
[ ] Architecture notes are explicit.
[ ] Implementation notes are concise.
[ ] Review summary is honest.
[ ] Validation summary is evidence-based.
[ ] Remaining risks are listed.
[ ] Next tasks are concrete.
[ ] AI assistance is disclosed if meaningful.
```

Never invent validation results.

---

## 13. Commit Checklist

```text
[ ] Review passed or issues accepted.
[ ] Validation passed or gaps are explicitly accepted.
[ ] Dev Log exists if required.
[ ] Human Director user guide update was completed or explicitly not needed.
[ ] Remaining risks are documented.
[ ] git status checked.
[ ] git diff --stat checked.
[ ] git diff --cached --stat checked after staging.
[ ] No test-only data edits remain.
[ ] No unexpected files are staged.
[ ] Commit message matches scope.
```

Avoid `git add .` unless the whole working tree was reviewed.

---

## 14. Human Director User Guide Checklist

Use this checklist for any AIWorkflow command, runner, approval, completion, or
commit/push behavior change.

```text
[ ] Does this task change the user-facing workflow?
[ ] Does it change Discord commands, cards, labels, or next-command prompts?
[ ] Does it change auto-handoff, approval, runner, finalization, done, commit, push, or manual escalation behavior?
[ ] If yes, update _Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html.
[ ] If no, record that the guide was checked and no update was needed.
[ ] If the HTML guide changed, open or render-check it before completion when practical.
```

---

## 15. Stop Checklist

Stop if:

```text
[ ] Approval is missing.
[ ] Scope is unclear.
[ ] Repository context is insufficient.
[ ] Copilot touched forbidden files.
[ ] Diff includes unexpected files.
[ ] Newly created files are missing from diff.
[ ] Scene lifecycle safety is unclear.
[ ] Data schema changed without approval.
[ ] Build failed.
[ ] Runtime failed.
[ ] Validation evidence is missing.
[ ] User cannot explain the diff.
```

---

## 16. Fast Path Checklist

Fast Path may be used only when:

```text
[ ] Documentation-only task.
[ ] Prompt/template edit.
[ ] Dev Log generation.
[ ] Explanation request.
[ ] Formatting-only change.
[ ] No runtime behavior change.
[ ] No data schema change.
[ ] No source code implementation.
```

Even in Fast Path:

```text
[ ] User action list is provided.
[ ] Git status is checked if files changed.
[ ] Commit scope is clear.
```

---

## 17. Full Path Checklist

Full Path is required when:

```text
[ ] New system.
[ ] Runtime behavior change.
[ ] Scene/actor lifecycle change.
[ ] Data schema change.
[ ] Save/load change.
[ ] Refactor.
[ ] AI-generated implementation.
[ ] Multiple files.
[ ] Build/project file changes.
```

Full Path requires:

```text
Architecture
Reduced scope
Approval gate
Implementation plan
Review
Validation
Dev Log if meaningful
Human Director guide update decision if the workflow changed
Commit decision
```

---

## 18. Summary

```text
Start deliberately.
Approve before implementation.
Use the right tool.
Capture full diff.
Review before validation.
Validate with evidence.
Keep the Human Director guide current.
Document remaining risk.
Commit intentionally.
```

# 12. Troubleshooting and Recovery Guide

Status: Support / recovery reference
Authority: Recovery guide for workflow failures. Follow canonical safety and approval rules when recovery actions would change source, state, schema, or git history.

## 1. Purpose

This document defines how to recover when the AI Orchestrator workflow goes wrong.

The workflow is useful only if failures are diagnosable and reversible.

Use this guide when:

```text
Copilot changed the wrong files.
Codex gave insufficient analysis.
The diff is too large.
New files are missing from the diff.
Build failed.
Runtime validation failed.
Project files were corrupted.
The scope expanded silently.
The user is not sure whether to commit.
```

---

## 2. Core Principle

```text
When the workflow goes wrong, stop first.
Do not patch blindly.
Identify the failure type, isolate the damage, recover safely, then continue.
```

The default recovery order is:

```text
Stop
-> Inspect git status
-> Inspect diff
-> Classify failure
-> Revert or fix narrowly
-> Re-review
-> Re-validate
-> Document if meaningful
```

---

## 3. Immediate Safety Steps

When something looks wrong, run:

```bash
git status
git diff --stat
```

If staged files exist:

```bash
git diff --cached --stat
```

If needed, save a diagnostic diff:

```bash
git diff > recovery_review.diff
```

Do not run more AI edits until the current state is understood.

---

## 4. Failure Type Matrix

| Failure | First Action | Likely Recovery |
|---|---|---|
| Copilot touched forbidden files | Stop and inspect diff | Revert forbidden files or request scope approval |
| Diff too large | Stop | Split task or revert broad changes |
| New files missing from diff | Use `git add -N` or staged diff | Re-run review |
| Build failed | Capture errors | Fix within approved scope only |
| Runtime failed | Record scenario | Review lifecycle/state/data assumptions |
| Project file corrupted | Inspect `.vcxproj/.filters` | Restore encoding/filter entries |
| Data invalid behavior wrong | Review schema policy | Fix loader/validator behavior |
| Scope expanded silently | Stop | Revert or approve expanded scope |
| Validation incomplete | Do not mark complete | Document gaps or continue validation |
| Commit uncertainty | Do not commit | Review staged diff and remaining risks |

---

## 5. Copilot Modified Forbidden Files

## Symptoms

```text
git status shows files outside the approved list.
git diff includes unrelated systems.
Copilot changed files mentioned in "Files Not Allowed to Touch".
```

## Recovery

1. Stop immediately.
2. List unexpected files:

```bash
git status
git diff --stat
```

3. Decide whether each unexpected change is necessary.

If not necessary, revert:

```bash
git checkout -- path/to/unexpected_file
```

If the file is newly created and unwanted:

```bash
del path\to\unexpected_file
```

or:

```bash
rm path/to/unexpected_file
```

4. If the unexpected change is actually necessary, do not keep going silently. Request new approval and update the scope.

## Rule

```text
Forbidden-file edits are review blockers unless explicitly approved after discovery.
```

---

## 6. Diff Is Too Large

## Symptoms

```text
git diff --stat shows many unrelated files.
Formatting changes are mixed with feature changes.
Refactoring is mixed with implementation.
```

## Recovery

1. Stop.
2. Identify whether the large diff is necessary.
3. If not necessary, revert unrelated formatting/refactor changes.
4. If necessary, split the task.

Possible split:

```text
Commit 1: mechanical file/project registration
Commit 2: data structures
Commit 3: runtime integration
Commit 4: cleanup/refactor
```

## Rule

```text
A diff must have one coherent purpose.
```

---

## 7. New Files Missing From Diff

## Symptoms

```text
git diff does not show newly created file contents.
Review cannot inspect new .h/.cpp/.json files.
```

## Cause

Plain `git diff` does not include untracked file contents.

## Recovery

Use intent-to-add:

```bash
git add -N path/to/new_file
git diff > review.diff
```

Or staged diff:

```bash
git add <intended_files>
git diff --cached > review.diff
```

## Rule

```text
Do not perform final review until all new file contents are visible.
```

---

## 8. Build Failed

## Symptoms

```text
Compilation error
Link error
Missing include
Missing project entry
Template or macro error
```

## Recovery

1. Capture build configuration and errors.
2. Do not start runtime validation.
3. Classify the error.

Common classes:

```text
Missing include
Wrong namespace/type
Missing .cpp project registration
Wrong JSON macro
Wrong constructor/API
Linker missing symbol
```

4. Fix only inside approved scope.

If the fix requires files outside approved scope:

```text
Stop and request approval.
```

## User Report Format

```text
Build Failure

Configuration:
Error list:
First error:
Files involved:
Did this require out-of-scope files?
```

---

## 9. Runtime Validation Failed

## Symptoms

```text
Game crashes.
Scene does not enter.
Object is not created.
Duplicate objects appear.
Interaction breaks.
Invalid data is not handled.
```

## Recovery

1. Record exact scenario.
2. Record expected result and actual result.
3. Check whether build passed.
4. Check logs/asserts.
5. Review likely category:

```text
Lifecycle
Ownership
Update order
Data load
Invalid data
Scene re-entry
Interaction/callback registration
```

6. Do not commit.
7. Generate a focused fix request.

## User Report Format

```text
Runtime Failure

Scenario:
Expected:
Actual:
Build status:
Logs/asserts:
Repro steps:
Changed data:
```

---

## 10. Visual Studio Project File Corruption

## Symptoms

```text
.vcxproj or .filters has unrelated changes.
Korean filter names are corrupted.
BOM/encoding changes appear.
Files are added to wrong filters.
Large project-file rewrite occurred.
```

## Recovery

1. Inspect project file diff.
2. Restore corrupted filter names.
3. Remove unrelated project-file changes.
4. Keep only approved file additions.
5. Re-run build.

## Review Checklist

```text
[ ] Only approved new files were added.
[ ] Existing filter names are intact.
[ ] Korean text is not mojibake.
[ ] ResourceCompile/Image/None filters are correct.
[ ] No broad project-file rewrite remains.
```

---

## 11. Data Schema or Loader Behavior Is Wrong

## Symptoms

```text
Missing optional field crashes.
Missing required field silently passes.
Invalid ID is not detected.
Release build fails too hard.
Debug build does not detect bad data.
DataManager performs runtime spawning.
```

## Recovery

1. Re-check approved data policy.
2. Separate loader validation from runtime execution.
3. Define required vs optional fields again.
4. Fix debug/release behavior.
5. Re-test valid, missing, invalid, and duplicate cases.

## Rule

```text
Data loading must be deterministic, debuggable, and separate from runtime execution.
```

---

## 12. Scene Lifecycle Safety Problem

## Symptoms

```text
Early return after partial initialization.
Scene enters with missing camera/UI/player.
Re-entry duplicates objects.
OnExit cleanup does not match OnEnter setup.
Callbacks remain registered.
```

## Recovery

1. Avoid broad early return.
2. Guard only the invalid sub-feature.
3. Preserve core scene initialization.
4. Ensure cleanup symmetry.
5. Re-test scene enter, exit, and re-entry.

## Rule

```text
Do not leave a scene partially initialized unless the lifecycle function is designed to fail atomically.
```

---

## 13. Scope Expanded Silently

## Symptoms

```text
Extra features appear.
Non-goals were implemented.
Architecture changed during implementation.
Refactor was added without approval.
```

## Recovery

1. Stop.
2. List expanded changes.
3. Decide:

```text
Revert
Approve expanded scope
Split into follow-up task
```

4. If accepted, update Dev Log and scope notes.

## Rule

```text
Scope expansion must become an explicit decision.
```

---

## 14. Validation Is Incomplete

## Symptoms

```text
Build passed but runtime not tested.
Runtime tested but invalid data not tested.
Debug tested but Release not tested.
Feature tested but regression not tested.
```

## Recovery

Either:

```text
Continue validation
```

or:

```text
Document remaining unverified areas and explicitly accept risk
```

Do not write “validation passed” if only part of validation was performed.

---

## 15. Commit Uncertainty

## Symptoms

```text
User is not sure whether to commit.
Diff has accepted risks.
Some validation was skipped.
There are untracked files.
```

## Recovery

Run:

```bash
git status
git diff --stat
git diff --cached --stat
```

Check:

```text
[ ] Expected files only
[ ] No test-only data changes
[ ] No temporary files
[ ] Dev Log included if required
[ ] Remaining risks documented
[ ] Validation gaps documented
```

If uncertain, do not commit.

---

## 16. Revert Commands

Use with care.

### Revert one modified tracked file

```bash
git checkout -- path/to/file
```

### Remove one unwanted untracked file

CMD:

```bat
del path\to\file
```

Git Bash:

```bash
rm path/to/file
```

### Unstage a staged file

```bash
git restore --staged path/to/file
```

or older Git:

```bash
git reset HEAD path/to/file
```

### Inspect what is staged

```bash
git diff --cached
```

### Revert all unstaged tracked changes

Dangerous. Use only when intended.

```bash
git checkout -- .
```

Do not use broad revert commands unless the whole working tree has been reviewed.

---

## 17. Recovery Prompt Template

Use this when asking ChatGPT for recovery help.

```md
# Workflow Recovery Request

## What Went Wrong

...

## Current Git Status

Paste `git status`.

## Diff Summary

Paste `git diff --stat`.

## Relevant Diff or Error

Paste diff, build error, or runtime log.

## Approved Scope

...

## Suspected Problem

...

## Output Needed

- Failure classification
- Recovery plan
- Files to revert or preserve
- Fix request if needed
- Validation plan
```

---

## 18. Summary

Recovery rule:

```text
Stop.
Inspect.
Classify.
Recover narrowly.
Re-review.
Re-validate.
Document.
```

Do not allow a workflow failure to become hidden technical debt.

# Workflow Update Request: First Trial Lessons

## 1. Purpose

This document proposes workflow rule updates based on the first practical application of the AI Orchestrator workflow.

The first trial implemented the JSON-based Town NPC placement system v1.

The trial exposed several workflow improvements that should be reflected in the workflow documents before the next feature task.

---

## 2. Change Reason

During the first real workflow trial, the process successfully completed:

```text
Orchestrator
-> Codex read-only analysis
-> Architecture / scope approval
-> Copilot implementation
-> Diff review
-> Copilot fix request
-> Re-review
-> Build / runtime validation
-> Dev Log
-> Commit
```

The workflow worked, but four operational improvements were discovered:

1. Newly created untracked files were not included in the first `git diff`.
2. Visual Studio project files can suffer encoding or filter-entry damage when modified by AI tools.
3. Scene lifecycle methods should not use broad early returns after partial initialization.
4. Copilot task prompts should include an explicit model recommendation block.

---

## 3. Proposed Rule Updates

## 3.1 Add New File Diff Capture Rule

### Current Issue

When reviewing newly created files, a plain `git diff` does not include untracked file content.

This caused the first review pass to miss the contents of:

```text
TownNpcPlacementDataManager.h/.cpp
TownNpcPlacementSpawner.h/.cpp
TownNpcPlacement.json
```

### Proposed Rule

Add the following rule to review-related workflow documents:

```text
When reviewing newly created files, ensure untracked file contents are included in the diff.

Use one of the following:

1. Intent-to-add:
   git add -N <new_file>
   git diff > review.diff

2. Staged diff:
   git add <intended_files>
   git diff --cached > review.diff

Do not perform final review if newly created files are missing from the diff.
```

### Affected Documents

- `_Docs/AIWorkflow/07_Review_Validation_Rules.md`
- `_Docs/AIWorkflow/07_Review_Validation_Rules_Required_Read_KR.md`
- `_Docs/AIWorkflow/PromptTemplates/06_review_request.md`

---

## 3.2 Add Visual Studio Project File Review Checklist

### Current Issue

Copilot modified `.vcxproj.filters` and corrupted an existing Korean filter name.

This was unrelated to the feature logic and was caught only during diff review.

### Proposed Rule

Add a Visual Studio project file review checklist:

```text
When `.vcxproj` or `.vcxproj.filters` changes, review:

[ ] Only approved new files were added.
[ ] Unrelated entries were not reordered.
[ ] Existing filter names were not corrupted.
[ ] Korean filter names remain valid.
[ ] Encoding/BOM changes are intentional or harmless.
[ ] ResourceCompile/Image/None entries still point to the correct filters.
[ ] No broad project-file rewrite occurred.
```

### Affected Documents

- `_Docs/AIWorkflow/07_Review_Validation_Rules.md`
- `_Docs/AIWorkflow/07_Review_Validation_Rules_Required_Read_KR.md`
- `.github/copilot-instructions.md`
- `.github/copilot-instructions_Required_Read_KR.md`

---

## 3.3 Add Scene Lifecycle Early Return Caution

### Current Issue

Copilot initially guarded missing NPC placement data by returning early from `OutGameScene::OnEnter`.

This could have left the scene partially initialized.

### Proposed Rule

Add a lifecycle safety rule:

```text
Avoid broad early returns from Scene lifecycle functions after partial initialization.

For functions such as:

- Initialize
- OnEnter
- OnExit
- Ready
- Load
- Setup

do not abort the entire lifecycle flow unless the function is designed to fail atomically.

If only a sub-feature is invalid, guard that sub-feature only and allow core scene initialization to continue when safe.

Example:

Preferred:
- Log missing optional data.
- Guard the story/NPC-specific branch.
- Continue camera and scene base setup.

Avoid:
- Return from the middle of OnEnter after background/player/NPC partial setup.
```

### Affected Documents

- `_Docs/AIWorkflow/07_Review_Validation_Rules.md`
- `_Docs/AIWorkflow/07_Review_Validation_Rules_Required_Read_KR.md`
- `AGENTS.md`
- `AGENTS_Required_Read_KR.md`
- `.github/copilot-instructions.md`
- `.github/copilot-instructions_Required_Read_KR.md`

---

## 3.4 Add Copilot Model Recommendation Block

### Current Issue

The user asked which model and intelligence level should be used for Copilot implementation tasks.

A default policy was established during the first workflow trial.

### Proposed Rule

Copilot implementation task prompts should include a model recommendation block:

```text
Recommended Copilot Model:
GPT-5.3-Codex

Recommended Intelligence:
High

Reason:
Repository-aware implementation, C++ structure preservation, and bounded multi-file editing are required.

Permission:
Modify only the approved files listed in the prompt.
```

For small low-risk work:

```text
Recommended Copilot Model:
GPT-5 mini or GPT-5.4 mini

Recommended Intelligence:
Auto or Medium

Reason:
This is a low-risk single-file or documentation task.
```

For architecture or review work:

```text
Recommended Model:
GPT-5.4 or GPT-5.3-Codex

Recommended Intelligence:
High

Reason:
This task requires architecture/risk review rather than direct implementation.
```

### Affected Documents

- `_Docs/AIWorkflow/05_Tool_Routing_Rules.md`
- `_Docs/AIWorkflow/05_Tool_Routing_Rules_Required_Read_KR.md`
- `_Docs/AIWorkflow/06_Task_Templates.md`
- `_Docs/AIWorkflow/06_Task_Templates_Required_Read_KR.md`
- `_Docs/AIWorkflow/PromptTemplates/05_copilot_implementation_request.md`
- `.github/copilot-instructions.md`
- `.github/copilot-instructions_Required_Read_KR.md`

---

## 4. Affected Documents Summary

Recommended updates:

```text
_Docs/AIWorkflow/05_Tool_Routing_Rules.md
_Docs/AIWorkflow/05_Tool_Routing_Rules_Required_Read_KR.md

_Docs/AIWorkflow/06_Task_Templates.md
_Docs/AIWorkflow/06_Task_Templates_Required_Read_KR.md

_Docs/AIWorkflow/07_Review_Validation_Rules.md
_Docs/AIWorkflow/07_Review_Validation_Rules_Required_Read_KR.md

_Docs/AIWorkflow/PromptTemplates/05_copilot_implementation_request.md
_Docs/AIWorkflow/PromptTemplates/06_review_request.md

AGENTS.md
AGENTS_Required_Read_KR.md

.github/copilot-instructions.md
.github/copilot-instructions_Required_Read_KR.md
```

---

## 5. Migration Required

No folder migration is required.

Required changes are document updates only.

No source code changes are required.

No project file changes are required.

---

## 6. Approval Needed

Approval Required: Yes

This is a workflow rule update.

Before generating revised document files, the user should approve:

1. Add untracked new-file diff capture rule.
2. Add Visual Studio project file review checklist.
3. Add Scene lifecycle early-return caution.
4. Add Copilot model recommendation block.
5. Update the affected English workflow documents.
6. Update the affected Korean required-read documents.
7. Update affected PromptTemplates.

---

## 7. Recommended Implementation Scope

For this update, keep the changes narrow.

### Implement Now

- Add the four workflow improvements listed above.
- Update only the affected documentation files.
- Do not redesign the workflow.
- Do not add new approval gates.
- Do not change folder structure.

### Do Not Implement Now

- Do not create new automation tooling.
- Do not introduce local orchestrator scripts.
- Do not change the AIWorkflow document numbering.
- Do not rewrite all workflow documents.
- Do not modify source code.

---

## 8. Recommended Commit Message

```text
docs: update AI workflow rules from first trial
```

---

## 9. Next Step

If approved, generate the revised document files for the affected workflow documents and prompt templates.

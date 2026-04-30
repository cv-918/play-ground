# 09. Operational Playbook

## 1. Purpose

This document is the practical runbook for using the AI Orchestrator workflow during real development.

It converts the workflow documents into an execution sequence:

```text
request -> classification -> architecture/scope -> approval -> tool routing
-> implementation -> full diff capture -> review -> validation -> Dev Log -> commit
```

Use this document when starting, reviewing, validating, or committing AI-assisted work.

---

## 2. Core Rule

```text
Do not let AI jump from idea to implementation.
Plan, approve, implement narrowly, review, validate, document, then commit.
```

---

## 3. Standard Flow

For meaningful code/data/runtime work:

```text
1. Start with an orchestrator request.
2. Classify task and risk.
3. Define architecture and reduced scope.
4. Get explicit approval.
5. Use Codex read-only analysis if repository context is needed.
6. Generate a bounded Copilot prompt or manual implementation plan.
7. Implement.
8. Capture a full diff, including new untracked files.
9. Review the diff.
10. Fix review issues.
11. Validate build/runtime/data behavior.
12. Write Dev Log if required.
13. Commit only after final user decision.
```

---

## 4. Starting a Task

Use this entry format:

```text
이 작업에 대해 AI 오케스트레이터 워크플로우 실행해줘.

Task:
...

Context:
...

Scope:
...

Non-Goals:
...

Output needed:
...
```

Use the workflow if the task affects architecture, runtime behavior, data schema, scene/actor lifecycle, save/load, multiple files, or AI-generated implementation.

---

## 5. Tool Routing

```text
ChatGPT:
  reasoning, architecture, planning, review criteria, validation criteria, documentation, prompt generation

Codex:
  read-only repository analysis, file/symbol/context discovery, codebase-aware review

Copilot Agent Mode:
  bounded local implementation after approval

Manual implementation:
  precise small edits or sensitive changes requiring direct control

Git:
  status, diff, rollback, staging, commit boundaries

Build/test tools:
  actual compile-time and runtime verification

Markdown:
  durable records under _Docs/ or _DevLog/
```

Do not use Copilot before architecture, scope, and file boundaries are approved.

---

## 6. Codex Procedure

Default Codex setup:

```text
Mode: Read-only analysis
Model: GPT-5.3-Codex or GPT-5.4
Intelligence: High
```

Codex prompts must include:

```text
- Read-only mode
- Goal
- Approved scope
- Non-goals
- Systems to inspect
- Questions to answer
- Expected output
- Restrictions
```

User action:

```text
Paste prompt into Codex.
Keep read-only.
Return findings to ChatGPT.
Do not allow patches unless explicitly approved.
```

---

## 7. Copilot Procedure

Default Copilot setup for repository-aware implementation:

```text
Recommended Copilot Model:
GPT-5.3-Codex

Recommended Intelligence:
High

Mode:
Agent Mode

Permission:
Modify only approved files listed in the prompt.
```

Copilot prompts must include:

```text
- Goal
- Approved decisions
- Approved scope
- Non-goals
- Files allowed to create
- Files allowed to modify
- Files not allowed to touch
- Required changes
- Forbidden changes
- Stop conditions
- Expected output after implementation
```

After Copilot finishes, do not commit. Capture the diff and review first.

---

## 8. Git Diff Capture

Before implementation:

```bash
git status
```

After implementation:

```bash
git status
git diff --stat
```

A plain `git diff` does not include untracked new file contents.

For new files, use:

```bash
git add -N <new_file>
git diff > review.diff
```

For multiple new files:

```bash
git add -N path/to/new_file_1
git add -N path/to/new_file_2
git diff > review.diff
```

Alternative staged review:

```bash
git add <intended_files>
git diff --cached > review.diff
```

Before validation or commit:

```bash
git diff --check
```

Do not request final review if new file contents are missing from the diff.

---

## 9. Diff Review Checklist

Review before runtime validation.

```text
[ ] Approved file scope respected
[ ] No unrelated files changed
[ ] Newly created files are included in the diff
[ ] Architecture boundaries preserved
[ ] Runtime lifecycle safe
[ ] Data loading separated from runtime execution
[ ] Scene/actor ownership safe
[ ] Update order assumptions explicit
[ ] Invalid data handling appropriate
[ ] No broad refactoring
[ ] No generated project-file damage
```

If `.vcxproj` or `.vcxproj.filters` changed:

```text
[ ] Only approved new files were added
[ ] Unrelated entries were not reordered
[ ] Existing filter names were not corrupted
[ ] Korean filter names remain valid
[ ] Encoding/BOM changes are intentional or harmless
[ ] ResourceCompile/Image/None entries still point to correct filters
[ ] No broad project-file rewrite occurred
```

---

## 10. Scene Lifecycle Review

For lifecycle methods such as:

```text
Initialize
OnEnter
OnExit
Ready
Load
Setup
```

avoid broad early returns after partial initialization.

Preferred:

```text
Log missing optional data.
Guard only the invalid sub-feature branch.
Continue core scene initialization when safe.
```

Avoid:

```text
Return from the middle of OnEnter after partial background/player/NPC setup.
Leave camera, UI, cleanup symmetry, or registration setup incomplete.
```

---

## 11. Validation Procedure

Do not validate before review.

Minimum validation for code/data/runtime tasks:

```text
[ ] git diff --check
[ ] Target build configuration
[ ] Runtime smoke test
[ ] Feature-specific test
[ ] Regression test for affected systems
[ ] Invalid data / edge case test if data-driven
```

Validation result format:

```text
검증 결과

1. diff 정리 확인:
2. 빌드 결과:
3. 런타임 기본 확인:
4. 기능 확인:
5. 회귀 확인:
6. invalid data / edge case 확인:
7. 아직 확인하지 못한 것:
```

---

## 12. Dev Log Procedure

Create a Dev Log for meaningful completed work.

```text
Feature / implementation:
  _DevLog/FixLog/

Investigation:
  _DevLog/WorkLog/

Workflow retrospective:
  _DevLog/Retrospective/
```

Dev Log must include:

```text
Summary
Background
Scope
Files changed
Architecture notes
Implementation notes
Review summary
Validation summary
Remaining risks
Next tasks
AI assistance if meaningful
```

Never invent validation results.

---

## 13. Commit Procedure

Commit only after:

```text
[ ] Review passed or issues accepted
[ ] Validation performed or explicitly deferred
[ ] Dev Log written if required
[ ] Remaining risks documented
[ ] git status reviewed
[ ] git diff --cached reviewed
```

Recommended commands:

```bash
git status
git diff --stat
git add <intended_files>
git diff --cached --stat
git commit -m "<message>"
git status
```

Avoid `git add .` unless the full working tree was reviewed.

---

## 14. Stop Conditions

Stop when:

```text
[ ] Required approval is missing
[ ] Repository context is insufficient
[ ] Copilot modifies forbidden files
[ ] Diff includes unexpected files
[ ] New files are missing from diff
[ ] Scene lifecycle safety is unclear
[ ] Data schema changes were not approved
[ ] Validation criteria cannot be identified
[ ] Build fails
[ ] Runtime test fails
[ ] User cannot explain the diff
```

When stopped, state what blocked the task, why it matters, and what evidence or decision is needed.

---

## 15. Summary

```text
Plan first.
Approve scope.
Route tools.
Implement narrowly.
Review diff.
Validate behavior.
Document evidence.
Commit deliberately.
```

AI can accelerate implementation, but review, validation, and commit control remain explicit.

# 07. Review and Validation Rules

## 1. Purpose

This document defines how AI-assisted work should be reviewed and validated before it is considered complete.

The purpose of review and validation is to prevent AI-generated or AI-assisted changes from being accepted based only on apparent plausibility.

A change is not complete because AI produced code.

A change is complete only when it has been reviewed, validated, documented if required, and accepted by the human developer.

---

## 2. Core Principle

The core principle is:

```text
Review checks whether the change is structurally acceptable.
Validation checks whether the change actually works.
```

Review and validation are different responsibilities.

Both are required for meaningful runtime, data, architecture, or AI-generated changes.

---

## 3. Review vs Validation

## Review

Review answers questions such as:

- Is the architecture boundary preserved?
- Did the implementation stay within approved scope?
- Are responsibilities placed in the correct system?
- Is lifecycle or ownership safe?
- Is the diff reviewable?
- Are there unrelated changes?
- Is the code maintainable and traceable?

Review is primarily about structure, risk, and correctness of implementation intent.

---

## Validation

Validation answers questions such as:

- Does the project build?
- Does the behavior work in runtime?
- Does the data load correctly?
- Does the manual scenario pass?
- Are edge cases handled?
- Are regressions absent?
- Are failure symptoms understood?

Validation is primarily about evidence.

---

## 4. Review Must Happen When

Review is required when:

- Source code changed.
- AI generated or modified code.
- Runtime behavior changed.
- Data schema changed.
- Save/load behavior changed.
- Scene lifecycle changed.
- Actor lifecycle changed.
- Architecture boundaries changed.
- Refactoring was performed.
- Git diff contains multiple files.
- The user cannot trivially verify the change by inspection.

---

## 5. Validation Must Happen When

Validation is required when:

- Source code changed.
- Build behavior may be affected.
- Runtime behavior changed.
- Data loading changed.
- UI behavior changed.
- Scene flow changed.
- Actor behavior changed.
- Save/load behavior changed.
- AI-generated implementation was applied.
- A bug fix is considered complete.
- A refactor is considered complete.

---

## 6. Review Severity Levels

Review findings must be classified by severity.

```text
Critical
Major
Minor
Optional
```

---

## 6.1 Critical

Critical issues must be fixed before continuing.

Examples:

- Build-breaking code
- Incorrect ownership
- Unsafe object lifetime
- Invalid destruction or registration flow
- Data corruption risk
- Save/load incompatibility without migration policy
- Runtime crash risk
- Severe architecture boundary violation
- AI modified files outside the approved scope
- Implementation contradicts approved design

A task cannot proceed to completion while Critical issues remain.

---

## 6.2 Major

Major issues should be fixed before completion unless explicitly accepted by the user.

Examples:

- Responsibility leakage
- Hidden coupling
- Unclear state transition
- Missing invalid-data handling
- Missing validation path
- Large diff that is hard to review
- Unclear lifecycle assumption
- Missing debug/trace point for risky behavior
- Inconsistent data flow
- Implementation partially violates non-goals

Major issues require explicit user decision:

```text
Fix now
Accept risk
Defer with documented risk
Stop task
```

---

## 6.3 Minor

Minor issues may be fixed if practical.

Examples:

- Naming inconsistency
- Small readability issue
- Minor duplication
- Local comment improvement
- Slightly unclear helper function boundary
- Non-critical formatting issue

Minor issues should not block validation unless they hide logic risk.

---

## 6.4 Optional

Optional items are improvement candidates.

Examples:

- Future refactor idea
- Additional debug tooling
- Extra assertion
- Optional documentation improvement
- Future test automation candidate

Optional items must not be mixed with required fixes.

---

## 7. Review Checklist

Every meaningful review should check the following categories.

```text
Architecture Boundary
Responsibility Placement
Scope Compliance
Runtime State Safety
Ownership and Lifetime
Update Order
Data Consistency
Error Handling
Debuggability
Performance Risk
Regression Risk
Diff Reviewability
Unrelated Changes
Style Consistency
Documentation Impact
```

---

## 7.1 Karpathy-style Implementation Sanity Checks

Use these checks as a lightweight behavior guard for implementation and review.
They do not replace the AIWorkflow approval gates.

Check:

- Was the objective, success criteria, and validation loop understood before
  editing?
- Does every changed file map directly to the approved task?
- Is the implementation the smallest useful slice of the approved final-form
  boundary?
- Did the change avoid speculative abstraction, generic frameworks, and
  future-proofing not required by the approved scope?
- Did the diff avoid unrelated cleanup, drive-by refactors, broad reformatting,
  and opportunistic renaming?
- Are validation claims backed by actual command output, manual evidence, or an
  explicit deferral?

Interpretation:

```text
Final-form architecture means choosing the right long-term boundary first.
Reduced-scope implementation means implementing only the smallest useful slice
of that boundary.
Do not add speculative abstractions, generic frameworks, or future-proofing not
required by the approved scope.
```

If these checks fail, treat the issue as a scope or reviewability concern even
when the code appears locally cleaner.

---

## 8. Architecture Boundary Review

Check:

- Did the change preserve the approved architecture?
- Did the implementation follow the reduced-scope plan?
- Did any class absorb responsibilities it should not own?
- Did decision, execution, and data remain separated?
- Did the change introduce temporary architecture?
- Did the change create future rewrite pressure?

Common failure patterns:

- `Enemy` gains more behavior branches instead of delegating.
- `Scene` directly owns loading, spawning, interaction, and UI logic.
- `Manager` classes accumulate unrelated responsibilities.
- JSON parsing, runtime decision, and execution are placed in one class.
- A quick implementation bypasses planned extension points.

---

## 9. Responsibility Placement Review

Check:

- Is each responsibility owned by the correct system?
- Is data loading separated from runtime execution?
- Is decision logic separated from rendering or low-level execution?
- Is behavior configuration separated from behavior runtime?
- Are components focused and composable?
- Is the ownership model obvious?

The reviewer must identify responsibility leakage explicitly.

---

## 10. Scope Compliance Review

Check:

- Did the implementation stay within approved scope?
- Were non-goals respected?
- Were forbidden files untouched?
- Were unrelated refactors avoided?
- Were additional features introduced without approval?
- Did the implementation change public behavior outside the task?

Any scope expansion must be treated as a review issue.

---

## 11. Runtime State Safety Review

Check:

- Are state transitions explicit?
- Are invalid states handled?
- Are release behavior and debug behavior appropriate?
- Are assertions used only where appropriate?
- Are timers, flags, and runtime state reset correctly?
- Are state-specific side effects isolated?
- Is skip/cancel/interrupt behavior considered if relevant?

Runtime state bugs are often more important than local code style issues.

---

## 12. Ownership and Lifetime Review

Check:

- Who owns created objects?
- Who destroys them?
- Is destruction delayed or immediate?
- Are dangling references possible?
- Are component pointers safe?
- Is owner destruction handled?
- Are registration and unregistration paired?
- Are callbacks/events disconnected when needed?

This category is critical for game runtime stability.

---

## 13. Update Order Review

Check:

- Does the change depend on update order?
- Is movement updated before or after state logic?
- Is animation updated after state selection?
- Is input processed before UI or gameplay decisions?
- Are side effects occurring in the expected phase?
- Could order changes cause one-frame bugs?

If update order matters, the review must state it explicitly.

---

## 14. Data Consistency Review

Check:

- Does the runtime structure match JSON schema?
- Are default values defined?
- Are invalid values handled?
- Are enum values serialized safely?
- Are field names consistent with project conventions?
- Are data managers free from unrelated runtime logic?
- Are loaders deterministic and debuggable?
- Is backward compatibility required?

Data changes must be reviewed as both code and content pipeline changes.

---

## 15. Error Handling Review

Check:

- What happens on missing data?
- What happens on invalid IDs?
- What happens on invalid enum values?
- What happens on missing resources?
- What happens in debug builds?
- What happens in release builds?
- Are error messages actionable?
- Does the system fail safely?

For project data, debug builds may assert while release builds should fail safely when appropriate.

---

## 16. Debuggability Review

Check:

- Can the user trace what happened?
- Are relevant IDs visible in logs or debug UI?
- Are failure messages specific?
- Are important state transitions observable?
- Is runtime behavior inspectable?
- Is the diff understandable?
- Can the next developer determine why this structure exists?

Debuggability is part of architecture quality.

---

## 17. Performance Review

Check:

- Does the change introduce per-frame allocations?
- Does the change perform repeated string/path work in update loops?
- Does the change add unnecessary container copies?
- Does the change add broad searches in hot paths?
- Does the change affect render count or draw batching?
- Does the change add expensive logging in runtime paths?
- Is the overhead acceptable for the current scope?

Performance review should be practical, not speculative.

Small constant overhead may be acceptable when it preserves structure and traceability.

---

## 18. Regression Review

Check:

- Which existing behavior could be affected?
- Which previous systems share the same data or lifecycle?
- Which existing scenes, actors, UI flows, or loaders might regress?
- Are old data files still valid?
- Are existing default paths preserved?
- Are old usage patterns still supported?

Regression risk should be tied to actual affected systems.

---

## 19. Diff Reviewability

Check:

- Is the diff small enough to review?
- Are feature changes mixed with formatting changes?
- Are unrelated files changed?
- Are file moves clear?
- Are generated changes understandable?
- Is there one coherent purpose for the diff?

If the diff is too large, the reviewer should recommend splitting the task.

---

## 19.1 New File Diff Capture

When reviewing newly created files, ensure untracked file contents are included in the diff.

A plain `git diff` does not include untracked file contents.

Use one of the following methods:

```bash
git add -N <new_file>
git diff > review.diff
```

or:

```bash
git add <intended_files>
git diff --cached > review.diff
```

Do not complete final review if newly created source, data, or project files are missing from the diff.

---

## 19.2 Visual Studio Project File Review

When `.vcxproj` or `.vcxproj.filters` changes, review the project-file diff explicitly.

Check:

```text
[ ] Only approved new files were added.
[ ] Unrelated entries were not reordered.
[ ] Existing filter names were not corrupted.
[ ] Korean filter names remain valid.
[ ] Encoding/BOM changes are intentional or harmless.
[ ] ResourceCompile/Image/None entries still point to the correct filters.
[ ] No broad project-file rewrite occurred.
```

Any unrelated project-file rewrite or encoding corruption should be treated as a review issue.

---

## 20. Validation Checklist

Validation should be selected based on task type.

Common validation categories:

```text
Build validation
Runtime smoke test
Manual gameplay test
Data loading validation
UI interaction validation
Scene lifecycle validation
Actor lifecycle validation
Save/load validation
Regression validation
Debug/log validation
```

---

## 21. Build Validation

Required when:

- Source code changed.
- Project files changed.
- Build settings changed.
- AI-generated implementation was applied.

Check:

- Does the project compile?
- Are there new warnings that matter?
- Are resource or include paths valid?
- Are linkage or project settings affected?
- Did the build require unrelated fixes?

Build success is required but not sufficient.

---

## 22. Runtime Smoke Test

Required when runtime behavior changed.

Check:

- Can the game start?
- Can the target scene load?
- Can the changed system initialize?
- Does the system avoid immediate crash?
- Does the basic scenario work once?

Smoke test confirms basic runtime viability, not full correctness.

---

## 23. Manual Gameplay Test

Required when gameplay behavior changed.

Define manual steps.

Example format:

```md
### Manual Test Steps

1. Start the game.
2. Enter the target scene.
3. Trigger the target behavior.
4. Observe expected result.
5. Repeat with edge case.
6. Confirm no unrelated behavior changed.
```

Manual tests must include expected results.

---

## 24. Data Loading Validation

Required when data schema, JSON files, resource paths, or loaders changed.

Check:

- Valid data loads correctly.
- Missing optional fields use defaults.
- Missing required fields fail clearly.
- Invalid IDs fail clearly.
- Invalid enum values fail clearly.
- Missing resources produce actionable errors.
- Debug and release behavior are appropriate.

---

## 25. UI Interaction Validation

Required when UI behavior changed.

Check:

- Input works.
- Focus behavior is correct.
- Hover/click behavior is correct.
- Resolution or scaling behavior is correct if relevant.
- Apply/cancel behavior is correct if relevant.
- UI state is not desynchronized from data.

---

## 26. Scene Lifecycle Validation

Required when scene initialization, scene transition, object spawn, or cleanup changed.

Check:

- Scene enters correctly.
- Required objects are created.
- Duplicate creation does not occur unexpectedly.
- Cleanup happens correctly.
- Re-entering the scene works.
- Previous scene state does not leak.
- Missing data does not crash release builds.

---

## 26.1 Scene Lifecycle Early Return Review

When reviewing scene lifecycle functions, check whether the implementation uses broad early returns after partial initialization.

Functions requiring caution include:

```text
Initialize
OnEnter
OnExit
Ready
Load
Setup
```

Avoid returning from the middle of a scene lifecycle function after partially creating scene objects unless the function is designed to fail atomically.

Preferred pattern:

```text
- Log missing optional data.
- Guard only the invalid sub-feature branch.
- Continue core scene initialization when safe.
```

Avoid:

```text
- Returning from the middle of OnEnter after background/player/NPC partial setup.
- Leaving camera, UI, cleanup symmetry, or registration setup incomplete.
```

If only a sub-feature is invalid, guard that sub-feature only.

---

## 27. Actor Lifecycle Validation

Required when actor spawn, state, death, destruction, ownership, or component behavior changed.

Check:

- Actor spawns correctly.
- State initializes correctly.
- Component dependencies exist.
- State changes behave correctly.
- Destruction is safe.
- Owner-following references are cleaned up.
- No dangling references remain.

---

## 28. Save / Load Validation

Required when persistent data changed.

Check:

- New save data writes correctly.
- Existing save data loads safely.
- Missing fields use proper defaults or migration.
- Invalid save data fails safely.
- Versioning is considered if needed.
- User progress is not lost.

---

## 29. Regression Validation

Required when existing behavior could be affected.

Check:

- Existing features still work.
- Old data still loads.
- Existing input behavior remains valid.
- Existing UI flows remain valid.
- Existing actor behavior remains valid.
- Existing debug tools remain valid.

Regression checks should be limited to affected areas.

---

## 30. Debug / Log Validation

Required when traceability is part of the change.

Check:

- Logs are specific enough.
- Logs are not too noisy.
- Debug-only logs do not affect release behavior.
- IDs and file paths are visible when needed.
- Failure messages point to actionable causes.

---

## 31. Validation Result Format

Validation results should use this format:

```md
## Validation Result

### Build
- Status:
- Notes:

### Runtime
- Status:
- Notes:

### Manual Tests
1. Test:
   - Result:
   - Notes:

### Data Validation
- Status:
- Notes:

### Regression
- Status:
- Notes:

### Remaining Unverified Areas
- ...

### Decision
- Pass / Fail / Pass with Known Risks / Blocked
```

---

## 32. Completion Rules

A task can be marked complete only when:

- Critical review issues are resolved.
- Major review issues are fixed or explicitly accepted.
- Required validation was performed.
- Validation failures are resolved or explicitly accepted.
- Remaining risks are documented.
- User approves completion.
- Commit decision is made by the user.

A task must not be marked complete when:

- Build was not run for source changes.
- Runtime was not tested for runtime changes.
- Data was not tested for data changes.
- Review found unresolved Critical issues.
- Diff includes unrelated changes.
- User has not accepted validation status.

---

## 33. Review Output Format

Use this format for review output:

```md
## Review Result

### Scope Compliance
...

### Critical Issues
- ...

### Major Issues
- ...

### Minor Issues
- ...

### Optional Improvements
- ...

### Required Fixes
- ...

### Validation Implications
- ...

### Recommendation
Proceed to validation / Fix required / Stop
```

---

## 34. Validation Output Format

Use this format for validation planning:

```md
## Validation Plan

### Build Checks
- ...

### Runtime Checks
- ...

### Manual Test Steps
1. ...

### Data Checks
- ...

### Regression Checks
- ...

### Failure Symptoms
- ...

### Pass Criteria
- ...

### User Actions
- ...
```

---

## 35. Anti-Patterns

The following review and validation patterns are forbidden.

### 35.1 Build-Only Completion

Treating successful compilation as complete validation.

Risk:

- Runtime bugs
- Data bugs
- State transition bugs
- UI behavior regressions

---

### 35.2 Style-Only Review

Reviewing naming and formatting while ignoring architecture, state, lifecycle, and data flow.

Risk:

- Superficially clean code with broken structure

---

### 35.3 AI Self-Approval

AI-generated code reviewed only by the same AI response without user evidence or diff.

Risk:

- False confidence
- Missed failures
- Scope violations

---

### 35.4 Unbounded Optional Suggestions

Mixing optional future improvements with required fixes.

Risk:

- Scope creep
- Delayed completion
- Unclear priorities

---

### 35.5 Undocumented Known Risk

Accepting risk without recording it.

Risk:

- Future debugging confusion
- Repeated mistakes
- Unclear technical debt

---

## 36. Relationship to Dev Log

If meaningful work is completed, the Dev Log should include:

- Review summary
- Validation summary
- Remaining risks
- Known deferred items
- Whether validation passed, failed, or was partially performed

The Documenter must not invent validation results.

---

## 37. User Responsibilities

The user must:

- Provide diff, snippets, or results when asking for review.
- Run build and runtime tests locally.
- Report validation results honestly.
- Reject unrelated AI changes.
- Decide whether Major issues are fixed or accepted.
- Decide whether remaining risks are acceptable.
- Decide whether to commit.

---

## 38. Assistant Responsibilities

The assistant must:

- Separate review from validation.
- Classify review issues by severity.
- Define validation steps clearly.
- Avoid claiming tests passed without evidence.
- Identify missing evidence.
- State when the task is blocked.
- Provide user actions.
- Keep optional suggestions separate from required fixes.

---

## 39. Summary

Review and validation protect the project from plausible but unsafe AI output.

Correct process:

```text
Review the structure.
Validate the behavior.
Document the evidence.
Accept or reject remaining risk.
Commit only after the user decides.
```

The workflow should not slow down trivial work.

But meaningful AI-assisted development must be reviewable, validated, and traceable.

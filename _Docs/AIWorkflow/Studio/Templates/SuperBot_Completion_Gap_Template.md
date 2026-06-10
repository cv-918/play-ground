# Super Bot Completion / Gap Template

Status: Template
Scope: Super Bot Stage 1 completion record and design-vs-completion gap analysis after work finishes

## Purpose

Use this template after execution, verification, and self-review to record what actually happened, what was verified, what remains risky, what human decisions are needed, and how the actual result compares with the original design / plan.

This template should not be used to claim completion before verification and self-review are actually performed.

## Template

```md
# Completion / Gap Record

## 1. Work ID / Title
- Work ID:
- Title:

## 2. Metadata
- Timestamp/date:
- Author / acting agent:
- Session / channel / execution surface:
- Related WorkOrder / task ID:
- Related intake:
- Related design / plan:
- Related progress record:

## 3. Completion Status
- Status: completed / partial / blocked / cancelled / needs human decision
- Short status summary:

## 4. Work Goal
- User-visible goal:
- Operational goal:

## 5. Approved Scope
- Included files/areas:
- Allowed actions:
- Explicit non-goals:
- Protected actions not approved:

## 6. Actual Work Performed
- Summary:
- Key decisions made:
- Tool actions performed:
- Deviations from plan, if any:

## 7. Files Changed
- Changed files:
  - path:
  - change summary:
- Created files:
  - path:
  - purpose:
- Deleted files:
  - path:
  - approval/evidence:
- Files inspected only:
  - path:

## 8. Executed Verification
- Verification run:
  - command/check:
  - result:
  - evidence:
- Read-back / existence checks:
- Git status / diff checks:
- Build/test/runtime/manual checks, if applicable:

## 9. Unexecuted Verification
- Verification not run:
  - command/check:
  - reason not run:
  - risk:
- Claims that remain unverified:

## 10. Remaining Risks
- Scope risk:
- Technical risk:
- Workflow/policy risk:
- Validation risk:
- Operational or follow-up risk:

## 11. Scope Deviation
- Scope deviation: yes / no / unclear
- Explanation:
- Evidence:

## 12. Reapproval Needed
- Reapproval needed: yes / no / unclear
- Reason:
- Required decision:

## 13. Human Decisions Needed
- Decision needed:
- Options:
- Recommendation:

## 14. Commit Recommendation
- Commit recommended: yes / no / defer
- Reason:
- Suggested commit scope, if applicable:
- Items to review before commit:

## 15. Design-vs-Completion Gap Analysis

### 15.1 Matched Design
- Original design element:
- Actual result:
- Evidence:

### 15.2 Differences
- Difference:
- Impact:
- Scope status:

### 15.3 Reason for Difference
- Cause:
- Was this expected / approved / discovered during work?:

### 15.4 Improvement for Next Work
- Process improvement:
- Template/rule improvement:
- Follow-up task candidate:
```

## Usage Notes

- Separate executed verification from unexecuted verification.
- Do not claim validation passed unless it was actually run or supplied by the user.
- Treat commit/push as a separate human decision unless explicitly approved in the current scope.
- If scope deviation or reapproval need is unclear, mark it `unclear` and ask the user rather than guessing.
- If the completion artifact itself is created before final verification, decide in the plan whether a post-verification update to the same artifact is approved. Otherwise keep final verification evidence in the final report.

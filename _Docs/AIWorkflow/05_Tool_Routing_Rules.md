# 05. Tool Routing Rules

## 1. Purpose

This document defines which tool should be used for each responsibility in the AI Orchestrator workflow.

The purpose of tool routing is to prevent misuse of tools.

A tool should be selected based on the task's required responsibility:

```text
Reasoning
Repository analysis
Local file editing
Build / test execution
Git history control
Documentation
```

The workflow must not use a tool simply because it is available.

---

## 2. Core Principle

The core principle is:

```text
Use the least powerful tool that can safely complete the current responsibility.
```

This means:

- Use ChatGPT for reasoning, planning, review criteria, validation criteria, and documentation.
- Use Codex when repository context is needed.
- Use GitHub Copilot Agent Mode when approved local file editing is needed.
- Use manual implementation when exact control is safer than AI editing.
- Use Git for status, diff, rollback, and commit boundaries.
- Do not use heavy automation before the manual workflow is stable.

---

## 3. Tool Categories

The initial workflow uses the following tool categories.

```text
ChatGPT
Codex
GitHub Copilot Agent Mode
Manual Implementation
Git
Build / Test Tools
Markdown Files
Future Automation Tools
```

Each tool has a bounded role.

No single tool should own the entire workflow.

---

## 4. ChatGPT

## Primary Role

ChatGPT is the orchestrator-facing reasoning and documentation tool.

Use ChatGPT for:

- Orchestration
- Architecture reasoning
- Scope definition
- Risk assessment
- Review criteria
- Validation criteria
- Documentation drafting
- Prompt generation
- Workflow rule updates
- Decision support

ChatGPT is not a local execution environment.

---

## Use ChatGPT When

Use ChatGPT when the task requires:

- Structured reasoning
- Architecture comparison
- Final-form versus reduced-scope planning
- Responsibility boundary definition
- Workflow document generation
- Review checklist generation
- Validation checklist generation
- Copilot or Codex prompt generation
- Korean explanation for the user
- English operational document drafting

---

## Do Not Use ChatGPT For

Do not use ChatGPT as if it can:

- Directly inspect unsupplied local files
- Modify the local repository
- Run Visual Studio builds
- Execute tests
- Check actual Git status
- Confirm runtime behavior
- Verify that Copilot or Codex completed work
- Claim local execution happened without user-provided evidence

---

## Required User Action

When ChatGPT produces project files, the user must:

- Download or copy the generated file.
- Save it to the specified repository path.
- Run `git status`.
- Review whether unintended changes exist.
- Decide whether to commit.

---

## 5. Codex

## Primary Role

Codex is the repository-aware analysis and implementation planning tool.

Use Codex when actual repository context matters.

Codex is especially useful when the task requires inspecting:

- Existing file structure
- Existing class names
- Current responsibility boundaries
- Actual call flow
- Related source files
- Git diff
- Build errors
- Codebase-specific implementation risks

---

## Use Codex When

Use Codex when:

- The assistant does not know the current repository structure.
- File-level planning requires real code context.
- Multiple possible integration points exist.
- A feature may touch several files.
- Existing class names, functions, or data structures must be confirmed.
- A diff needs codebase-aware review.
- Copilot output needs independent review.
- The user wants repository analysis before implementation.

---

## Codex Permission Modes

Codex usage should be explicitly framed as one of:

```text
Read-only analysis
Implementation planning
Patch generation
Diff review
Build error analysis
```

The default mode should be:

```text
Read-only analysis
```

Write or patch generation should require explicit user approval.

---

## Do Not Use Codex For

Do not use Codex when:

- The task is purely conceptual and repository context is unnecessary.
- The change is a trivial text edit.
- The task can be handled by ChatGPT documentation output.
- The user has not approved repository access or code modification.
- The output would duplicate already-known context without benefit.

---

## Required User Action

When Codex is needed, the assistant should generate a Codex prompt and the user must:

- Open the repository in Codex.
- Paste the prompt.
- Confirm whether Codex should be read-only or write-allowed.
- Return Codex findings, diff, or summary to ChatGPT for review if needed.

---

## 6. GitHub Copilot Agent Mode

## Primary Role

GitHub Copilot Agent Mode is the bounded local implementation executor.

Use Copilot Agent Mode when approved changes must be applied to local project files.

Copilot should receive constrained implementation prompts.

---

## Use Copilot Agent Mode When

Use Copilot Agent Mode when:

- The architecture and scope are approved.
- Files allowed to modify are defined.
- Non-goals are defined.
- The task needs actual file edits.
- The implementation can be bounded.
- The user can review the resulting diff.
- Build errors may need local correction.

---

## Copilot Prompt Must Include

Every Copilot implementation prompt must include:

- Goal
- Approved design summary
- Files allowed to create
- Files allowed to modify
- Files not allowed to touch
- Required changes
- Forbidden changes
- Non-goals
- Expected output
- Validation notes
- Stop conditions

---


## Copilot Model Recommendation

For Copilot Agent Mode tasks, include an explicit model recommendation in the implementation prompt.

Default for repository-aware implementation:

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

The model recommendation does not replace approval gates or file-scope restrictions.

---
## Do Not Use Copilot Agent Mode For

Do not use Copilot Agent Mode when:

- Architecture is not approved.
- Scope is unclear.
- Files allowed to modify are unknown.
- The task asks for broad redesign.
- The expected diff would be too large to review.
- The user cannot verify runtime behavior.
- The task should only be analyzed, not executed.

---

## Required User Action

When Copilot Agent Mode is used, the user must:

- Ensure the working tree is in a safe state.
- Paste the approved implementation prompt.
- Monitor proposed changes.
- Reject unrelated modifications.
- Run build and manual tests.
- Check Git diff.
- Return results for review if needed.

---

## 7. Manual Implementation

## Primary Role

Manual implementation is used when human control is safer, faster, or more precise than AI editing.

Manual implementation remains a first-class execution path.

AI assistance should not replace manual implementation when the developer can make a smaller, safer change directly.

---

## Use Manual Implementation When

Use manual implementation when:

- The change is small and obvious.
- The required edit is precise.
- The risk of AI over-editing is higher than the benefit.
- The developer wants exact control over code shape.
- The task touches sensitive lifecycle code.
- The change is exploratory or temporary.
- The implementation is easier than explaining it to a tool.

---

## Do Not Use Manual Implementation Alone When

Do not rely only on manual implementation when:

- The change affects architecture boundaries.
- Multiple systems are involved.
- Data schema changes are involved.
- Review criteria are needed.
- Validation criteria are non-trivial.
- The work should leave a Dev Log.

In those cases, manual implementation can still be used, but the orchestrator workflow should define scope, review, validation, and documentation.

---

## 8. Git

## Primary Role

Git is the safety and traceability tool.

Use Git for:

- Worktree status
- Diff review
- Change isolation
- Rollback
- Commit boundaries
- History tracking
- File move visibility

Git is not optional in AI-assisted workflows.

---

## Required Git Checks

Before AI-assisted implementation:

```bash
git status
```

After AI-assisted implementation:

```bash
git status
git diff
```

Before commit:

```bash
git status
git diff --cached
```

---

## Use Git When

Use Git when:

- Starting a new task
- Moving documentation folders
- Applying AI-generated patches
- Reviewing Copilot output
- Reviewing Codex output
- Preparing a commit
- Rolling back unintended changes

---

## Do Not Proceed When

Do not proceed when:

- There are unrelated uncommitted changes.
- The diff contains unexpected files.
- The AI changed files outside approved scope.
- The user cannot explain the diff.
- Build or validation failed but the commit is still being considered.

---

## 9. Build / Test Tools

## Primary Role

Build and test tools verify actual project behavior.

They are the only way to confirm compile-time and runtime validity.

AI cannot replace build and runtime verification.

---

## Use Build / Test Tools When

Use build and test tools when:

- Source code changed.
- Project files changed.
- Runtime behavior changed.
- Data loading changed.
- AI-generated implementation was applied.
- A bug fix is considered complete.
- A refactor is considered complete.

---

## Required User Action

The user must run the appropriate local checks.

Examples:

- Visual Studio build
- Game runtime smoke test
- Manual gameplay flow
- Data loading scenario
- Regression scenario
- Debug log inspection

The assistant may define what to test but cannot claim tests passed unless the user provides results.

---

## 10. Markdown Files

## Primary Role

Markdown files are the durable operating record of the workflow.

Use Markdown files for:

- Workflow rules
- Architecture notes
- Prompt templates
- Dev Logs
- Review summaries
- Validation summaries
- Required-read translations
- Tool usage rules

Chat history is not the source of truth.

---

## Use Markdown Files When

Use Markdown files when:

- A rule should persist across tasks.
- A prompt will be reused.
- A decision affects future work.
- A feature is completed.
- A bug fix has important context.
- A workflow convention changes.
- A Korean required-read summary is useful for human review.

---

## 11. Future Automation Tools

Future automation tools may include:

```text
Codex CLI
OpenAI Agents SDK
LangGraph
MCP
Claude Code
Gemini CLI
Custom local orchestrator scripts
```

These tools are outside the initial required scope.

They should be evaluated only after the document-based and semi-automated workflow is stable.

---

## Use Future Automation Tools When

Consider future automation tools when:

- The manual workflow is stable.
- Prompt templates are proven.
- Approval gates are well-defined.
- Repeated tasks are predictable.
- Build and validation commands are reliable.
- Git rollback discipline is strong.
- Tool failures can be diagnosed.

---

## Do Not Use Future Automation Tools When

Do not introduce future automation tools when:

- The workflow rules are still changing frequently.
- The user cannot clearly define approval gates.
- Build/test validation is manual and inconsistent.
- The repository structure is unstable.
- The goal is only to follow a trend.
- The added tool would increase confusion more than productivity.

---

## 12. Tool Routing Matrix

| Task Need | Recommended Tool |
|---|---|
| Architecture reasoning | ChatGPT |
| Workflow document drafting | ChatGPT |
| Korean explanation for user | ChatGPT |
| Repository structure analysis | Codex |
| Existing code flow analysis | Codex |
| Codebase-aware implementation planning | Codex, then ChatGPT review |
| Approved local file editing | GitHub Copilot Agent Mode |
| Small precise edit | Manual implementation |
| Build verification | Build tools / Visual Studio |
| Runtime verification | Manual test / game runtime |
| Diff review | Git, ChatGPT, Codex if repository context needed |
| Commit boundary | Git |
| Dev Log generation | ChatGPT, saved as Markdown |
| Prompt generation | ChatGPT |
| Future repeated automation | Future automation tools after workflow stabilizes |

---

## 13. Routing Decision Questions

Before selecting a tool, ask:

```text
1. Does this task require repository context?
2. Does this task require local file editing?
3. Does this task require build or runtime execution?
4. Is the architecture already approved?
5. Is the implementation scope bounded?
6. Can the user review the diff?
7. Is manual implementation safer?
8. Does the result need durable documentation?
9. Is the tool being used because it is necessary, or just because it is available?
```

---

## 14. Default Routing Policy

When unsure, use the following default routing policy:

```text
Reasoning first: ChatGPT
Repository inspection: Codex
Approved implementation: Copilot or manual
Verification: Build/test tools
Change tracking: Git
Durable record: Markdown
```

If repository context is missing, do not invent details.

If implementation scope is not approved, do not route to Copilot.

If build/test evidence is missing, do not mark the task complete.

---

## 15. Anti-Patterns

The following tool routing patterns are forbidden.

### 15.1 Copilot Before Architecture

Using Copilot Agent Mode before architecture and scope are approved.

Risk:

- Uncontrolled edits
- Responsibility leakage
- Broad refactoring
- Hard-to-review diff

---

### 15.2 ChatGPT Pretending to Execute

ChatGPT claiming that it inspected local files, ran builds, or verified runtime behavior without user-provided evidence.

Risk:

- False confidence
- Invalid completion
- Missed failures

---

### 15.3 Codex for Everything

Using Codex for tasks that do not require repository context.

Risk:

- Tool overhead
- Context noise
- Slower workflow

---

### 15.4 Heavy Automation Too Early

Introducing multi-agent runtimes before manual approval gates, validation rules, and prompt templates are stable.

Risk:

- Hard-to-debug automation
- Misapplied changes
- Tool confusion
- False productivity

---

### 15.5 Manual Changes Without Review

Making manual code changes that affect architecture, data, or runtime behavior without review and validation.

Risk:

- Hidden regressions
- Missing documentation
- Inconsistent architecture

---

## 16. User Action Rules

The assistant must clearly state user actions when a tool is needed.

Examples:

```text
Save this file to ...
Run git status.
Copy this prompt into Codex.
Use read-only mode.
Paste Codex findings back here.
Copy this prompt into Copilot Agent Mode.
Review the diff before build.
Run the game and test this scenario.
Do not commit yet.
Commit with this message if validation passed.
```

Tool routing is incomplete unless the user action is explicit.

---

## 17. Completion Criteria

Tool routing is considered correct when:

- The selected tool matches the responsibility.
- The tool has explicit permission boundaries.
- The user knows what action to take.
- The tool output can be reviewed.
- Project state changes are protected by approval gates.
- Verification is performed by the correct local tool.
- Durable decisions are saved to Markdown.

---

## 18. Summary

Tool routing exists to keep AI-assisted development controlled.

The workflow should not ask one tool to do everything.

Correct routing means:

```text
ChatGPT decides and documents.
Codex inspects repository context.
Copilot edits approved files.
Manual implementation handles precise safe changes.
Build/test tools verify behavior.
Git protects history.
Markdown preserves decisions.
Future automation waits until the workflow is stable.
```

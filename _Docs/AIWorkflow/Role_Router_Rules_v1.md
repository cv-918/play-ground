# Role Router Rules v1

## 1. Purpose

Role Router Rules v1 defines how ActiveTask metadata should activate AIWorkflow
roles from `Agent_Role_Registry_v1.md`.

The router exists to make role selection deterministic, reviewable, and
approval-safe. It converts task metadata into a recommended responsibility map
before any execution tool, source change, workflow tool change, validation step,
or documentation finalization is performed.

These rules do not create an executable router. They define the policy that a
future router, Discord command, or Codex prompt generator may use after separate
approval.

The routing model preserves the Human Director as the final decision-maker.
Role activation recommends who should own the next responsibility. It does not
grant approval, write permission, commit permission, or release permission.

---

## 2. Inputs

The role router should read the following ActiveTask metadata when available.

| Input | Meaning | Routing use |
|---|---|---|
| `category` | Broad workflow area such as `WF`, `GAME`, `VAL`, `DOC`, `UNITY`, `RELEASE`, or `DATA` | Selects the category routing matrix |
| `kind` | Work type such as `documentation`, `automation`, `refactoring`, `validation`, `architecture`, `data`, `release`, `prototype`, `review`, or `maintenance` | Selects the kind routing matrix |
| `priority` | Task urgency or impact marker such as `P0`, `P1`, `P2`, or `P3` | Escalates review, validation, and human gates |
| `risk` | Explicit risk level, normally `low`, `medium`, or `high` | Escalates architecture, review, validation, and approval requirements |
| `workflow_path` | Intended path such as Fast Path, Full Path, review-only, validation-only, or documentation-only | Determines minimum gate depth and whether execution roles are allowed |
| `modifies_source` | Whether the task creates or changes game source, project files, build files, or executable behavior | Activates implementation, review, validation, and source approval gates |
| `modifies_data_schema` | Whether the task changes JSON schema, serialized data, save format, resource path rules, or asset metadata conventions | Activates Technical Architect, Validator, Reviewer, and data/schema approval gates |
| `modifies_workflow_tools` | Whether the task changes scripts, Discord commands, prompt generation, tool routing, automation, or workflow command behavior | Activates Tool/Workflow Engineer, Reviewer, Validator, and workflow/tool approval gates |
| `runtime_validation_required` | Whether build, runtime, manual, data-loading, UI, scene, actor, save/load, or workflow command validation is needed | Activates Validator and prevents completion without evidence or accepted deferral |
| `documentation_required` | Whether a durable workflow document, Dev Log, review note, validation note, or finalization record is required | Activates Documentation Keeper |

If metadata is missing, the Orchestrator must infer the lowest safe default from
the task text and repository rules. When the inferred result could change
approval gates, source behavior, data/schema behavior, workflow tool behavior,
or release behavior, the Orchestrator must stop and ask the Human Director.

---

## 3. Base Routing Rules

Apply base routing before category, kind, and risk escalation.

| Rule | Trigger | Activate roles |
|---|---|---|
| Universal orchestration | Every task | Orchestrator |
| Documentation work | `kind=documentation`, `category=DOC`, or `documentation_required=true` | Documentation Keeper |
| Source implementation | `modifies_source=true` or implementation/prototype work | Explorer, Gameplay Implementer, Reviewer, Validator |
| Architecture work | `kind=architecture`, new system, refactor, lifecycle boundary, ownership boundary, or unclear structure | Explorer, Technical Architect, Reviewer |
| Validation work | `kind=validation`, `category=VAL`, or `runtime_validation_required=true` | Explorer, Validator, Reviewer |
| Workflow tool work | `category=WF` with automation/tool behavior, `kind=automation`, or `modifies_workflow_tools=true` | Tool/Workflow Engineer, Reviewer, Validator |
| Data/schema work | `category=DATA`, `kind=data`, or `modifies_data_schema=true` | Explorer, Technical Architect, Validator, Reviewer |

Deterministic merge rule:

1. Start with Orchestrator.
2. Add roles from the category matrix.
3. Add roles from the kind matrix.
4. Add roles from explicit boolean flags.
5. Apply priority and risk escalation.
6. Add Documentation Keeper when a durable decision, validation result, review
   result, workflow rule, or Dev Log is required.
7. Remove any execution role that is forbidden by `workflow_path` or missing
   approval. Do not remove Reviewer or Validator when risk or validation
   evidence is required.

When multiple rules activate the same role, list it once and keep the strongest
gate and validation expectation.

---

## 4. Risk-Based Escalation

### Priority Escalation

| Priority | Routing rule |
|---|---|
| `P0` | Full Path by default. Activate Orchestrator, Explorer, Reviewer, Validator, and Documentation Keeper. Add Technical Architect for any architecture, data, lifecycle, runtime, or scope uncertainty. Require explicit Human Director decision before execution, validation deferral, commit, push, release, or destructive action. |
| `P1` | Activate Reviewer and Validator even for small changes. Require explicit approval for source, data/schema, workflow tool, runtime behavior, or release changes. Documentation Keeper records meaningful decisions and remaining risks. |
| `P2` | Use normal category/kind routing. Reviewer is required for modified files or workflow rule changes. Validator is required when source, data, runtime, tool behavior, or validation evidence is involved. |
| `P3` | Fast Path may be used for low-risk documentation or explanation tasks. Still activate Orchestrator, and activate Documentation Keeper when durable records change. Reviewer/Validator are optional unless files change or validation is requested. |

### Risk Level Escalation

| Risk | Routing rule |
|---|---|
| `low` | Fast Path is allowed when the task is documentation-only, review-only, or explanation-only and no source, data/schema, workflow tool, runtime, release, or destructive action is involved. |
| `medium` | Activate Reviewer and Validator for any file change. Activate Explorer when repository context is needed. Use Human Director gates for implementation, workflow rule changes, schema changes, runtime changes, or validation deferral. |
| `high` | Full Path by default. Activate Explorer, Technical Architect when structure or policy is involved, Reviewer, Validator, and Documentation Keeper. Stop for explicit Human Director approval before execution or scope expansion. |

### Special Escalation Rules

| Condition | Required escalation |
|---|---|
| Schema or save format changes | Activate Explorer, Technical Architect, Validator, Reviewer, and Documentation Keeper. Require Data Schema Approval Gate and Validation Acceptance Gate. |
| Runtime behavior changes | Activate Explorer, Technical Architect if lifecycle/state/ownership may change, Gameplay Implementer only after approval, Reviewer, Validator, and Documentation Keeper. Require Runtime Behavior Approval Gate. |
| External tool usage | Activate Orchestrator and the role that owns the tool responsibility. Require Tool Execution Approval Gate before installation, login, script execution, or external automation. |
| Computer-use action | Require Human Director approval before browser/computer action that clicks, submits, logs in, downloads, purchases, deploys, publishes, or changes external state. Validator records what evidence was or was not observed. |
| Release or deploy operations | Activate Orchestrator, Reviewer, Validator, Documentation Keeper, and an approved release-oriented role if one exists. Require explicit commit/tag/push/release approval. No automatic release path exists in v1. |
| Destructive command | Stop and request explicit Human Director approval. Reviewer or Validator may define safer checks first. |
| Workflow rule changes | Activate Tool/Workflow Engineer when tool behavior changes, Documentation Keeper for the durable record, Reviewer for rule consistency, and Validator for markdown/diff/scope checks. Require Workflow Rule Update Gate. |

---

## 5. Category Routing Matrix

| Category | Default roles | Required gates | Validation expectation | Notes |
|---|---|---|---|---|
| `WF` | Orchestrator, Documentation Keeper; add Tool/Workflow Engineer for workflow tool or automation behavior | Workflow Rule Update Gate for policy changes; Tool Execution Approval Gate for executable tools | `git status --short`, `git diff --check`, `git diff --stat`, link/index checks when docs are updated; command validation for tool changes | Documentation-only WF tasks may use Fast Path, but executable workflow changes require Full Path. |
| `GAME` | Orchestrator, Explorer, Technical Architect when structure/lifecycle/data is involved, Gameplay Implementer, Reviewer, Validator, Documentation Keeper | Design, Scope, File Modification, Runtime Behavior, Data Schema if applicable, Review, Validation, Commit gates | Build validation, runtime smoke test, manual gameplay checks, data checks when relevant | Do not modify game source without explicit approved implementation scope. |
| `VAL` | Orchestrator, Explorer when evidence context is needed, Validator, Reviewer, Documentation Keeper when results must persist | Validation Acceptance Gate; Review Acceptance Gate when findings affect completion | Evidence-specific validation such as build, runtime, data, manual, semantic, or workflow command checks | Validation tasks should not silently fix implementation unless separately approved. |
| `DOC` | Orchestrator, Documentation Keeper; add Reviewer for workflow rules or multi-file docs | Workflow Rule Update Gate when operating policy changes; Commit Approval Gate before commit recommendation | Markdown diff checks, link/index checks, scope verification | Documentation tasks must not smuggle source, schema, tool, or runtime behavior changes. |
| `UNITY` | Orchestrator, Explorer if project context is needed, Technical Architect, Reviewer, Validator, Documentation Keeper | Design and Scope gates; File Modification and Tool Execution gates if a Unity project or tooling is touched | Migration compatibility review; Unity project validation only when actual Unity files/tools are in scope | Future Unity work must not overfit current C++ workflow or force premature migration. |
| `RELEASE` | Orchestrator, Reviewer, Validator, Documentation Keeper; approved release-oriented role if introduced later | Review, Validation, Commit, tag/push/release approval gates; Tool Execution Gate for release tools | Build, runtime smoke test, release checklist, changelog/release notes, rollback notes | No automatic commit, push, tag, deploy, or release in v1. |
| `DATA` | Orchestrator, Explorer, Technical Architect, Validator, Reviewer, Documentation Keeper | Data Schema Approval Gate for schema/save/resource convention changes; File Modification and Validation gates | JSON/data loading checks, invalid-data behavior checks, defaults, compatibility/migration checks | Data changes must define field meanings, required/optional status, defaults, invalid behavior, and compatibility. |

---

## 6. Kind Routing Matrix

| Kind | Default roles | Optional roles | Forbidden shortcuts | Expected output |
|---|---|---|---|---|
| `documentation` | Orchestrator, Documentation Keeper | Reviewer, Validator | Changing workflow policy without Workflow Rule Update Gate; claiming validation not run | Updated document, README/index link if needed, WorkLog when meaningful |
| `automation` | Orchestrator, Tool/Workflow Engineer, Reviewer, Validator, Documentation Keeper | Explorer, Technical Architect | Installing tools, changing command behavior, executing agents, or writing files without approval | Tool/workflow plan or bounded tool diff with safety and validation notes |
| `refactoring` | Orchestrator, Explorer, Technical Architect, Reviewer, Validator, Documentation Keeper | Gameplay Implementer after approval | Mixing feature work with refactor; skipping architecture and validation | Final-form boundary, reduced scope, approved implementation plan or review verdict |
| `validation` | Orchestrator, Validator, Reviewer | Explorer, Documentation Keeper | Treating build success as full runtime proof; inventing manual evidence | Validation plan/result, evidence, unverified areas, verdict |
| `architecture` | Orchestrator, Explorer, Technical Architect, Reviewer, Documentation Keeper | Validator for semantic validation | Routing implementation before approved architecture and scope | Final-form architecture, reduced-scope structure, risks, approval items |
| `data` | Orchestrator, Explorer, Technical Architect, Validator, Reviewer, Documentation Keeper | Gameplay Implementer after approval | Changing schema/save format without Data Schema Approval Gate | Field definitions, defaults, invalid behavior, compatibility, validation plan |
| `release` | Orchestrator, Reviewer, Validator, Documentation Keeper | Approved release-oriented role in future | Automatic commit, tag, push, deploy, release, or skipped smoke checks | Release readiness review, validation evidence, human action list |
| `prototype` | Orchestrator, Explorer, Technical Architect when structure matters, Gameplay Implementer after approval, Reviewer, Validator | Documentation Keeper | Throwaway architecture expected to be rewritten; bypassing runtime validation | Reduced-scope implementation aligned with final-form architecture |
| `review` | Orchestrator, Reviewer | Explorer, Validator, Technical Architect | Silently fixing while reviewing; approving without evidence | Findings by severity, scope compliance, validation implications, verdict |
| `maintenance` | Orchestrator, Explorer when context is needed, Reviewer, Validator when files change | Documentation Keeper, Tool/Workflow Engineer | Broad cleanup outside scope; hidden behavior changes | Small bounded change, scope note, validation evidence or explicit deferral |

---

## 7. Human Decision Gates

The router must stop and ask the Human Director before any of the following:

- Scope expansion.
- JSON schema changes.
- Save format changes.
- External tool install.
- Credential, login, or subscription setup.
- Computer-use action.
- Destructive command.
- Runtime behavior policy change.
- Source code implementation.
- Structural refactoring.
- File creation under project source directories.
- Workflow tool behavior change.
- Discord command behavior change.
- Release, deploy, tag, push, or publish operation.
- Automatic commit, push, or release.
- Accepting failed validation.
- Accepting skipped required validation.
- Accepting unresolved Critical or Major review findings.

Human approval applies only to the described scope. If the router detects that a
task needs additional files, roles, tools, or behavior changes, it must return
to the Human Director instead of expanding automatically.

---

## 8. Role Handoff Examples

### GAME Implementation Task

Input metadata:

```text
category=GAME
kind=prototype
priority=P1
risk=medium
workflow_path=Full Path
modifies_source=true
modifies_data_schema=false
runtime_validation_required=true
documentation_required=true
```

Activated roles:

```text
Orchestrator -> Explorer -> Technical Architect if structure/lifecycle is involved
-> Gameplay Implementer after approval -> Reviewer -> Validator
-> Documentation Keeper
```

Expected gates:

```text
Design, Scope, File Modification, Runtime Behavior if behavior changes,
Review, Validation, Commit
```

### WF Automation Task

Input metadata:

```text
category=WF
kind=automation
priority=P1
risk=high
workflow_path=Full Path
modifies_workflow_tools=true
runtime_validation_required=true
documentation_required=true
```

Activated roles:

```text
Orchestrator -> Explorer if current tool behavior must be inspected
-> Tool/Workflow Engineer after approval -> Reviewer -> Validator
-> Documentation Keeper
```

Expected gates:

```text
Workflow Rule Update, Tool Execution if commands/scripts run,
File Modification, Review, Validation, Commit
```

### Data Validation Task

Input metadata:

```text
category=DATA
kind=validation
priority=P2
risk=medium
workflow_path=validation-only
modifies_data_schema=false
runtime_validation_required=true
documentation_required=true
```

Activated roles:

```text
Orchestrator -> Explorer -> Validator -> Reviewer -> Documentation Keeper
```

Expected gates:

```text
Validation Acceptance, Review Acceptance if findings affect completion
```

If schema or save format changes are discovered, reroute to Technical Architect
and stop for Data Schema Approval Gate.

### Unity Future Task

Input metadata:

```text
category=UNITY
kind=architecture
priority=P2
risk=medium
workflow_path=Full Path
modifies_source=false
runtime_validation_required=false
documentation_required=true
```

Activated roles:

```text
Orchestrator -> Explorer if current project constraints are needed
-> Technical Architect -> Reviewer -> Documentation Keeper
```

Expected gates:

```text
Design, Scope, Workflow Rule Update if workflow policy changes
```

Unity-specific implementation or tool execution requires a separate approved
task.

### Documentation Finalization Task

Input metadata:

```text
category=DOC
kind=documentation
priority=P3
risk=low
workflow_path=Fast Path
modifies_source=false
runtime_validation_required=false
documentation_required=true
```

Activated roles:

```text
Orchestrator -> Documentation Keeper -> Reviewer if workflow rules changed
-> Validator for markdown/diff/link checks when files changed
```

Expected gates:

```text
Workflow Rule Update if policy changes, Commit Approval before commit recommendation
```

---

## 9. Non-goals

Role Router Rules v1 does not introduce:

- Executable router logic.
- Discord command behavior changes.
- Automatic source modification.
- Automatic approval.
- Automatic commit, push, or release.
- External agent execution.
- External tool installation.
- New game source architecture.
- New JSON schema or save format behavior.
- Release or deploy scripts.

---

## 10. Next Tasks

Recommended follow-up tasks:

1. Review/Validation Verdict Format v1.
2. Path-Scoped Rule Mapping for Dust Land.
3. Small Role Router Prototype.
4. Discord role recommendation command.

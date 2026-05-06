# Path-Scoped Rule Mapping for Dust Land v1

## 1. Purpose

Path-Scoped Rule Mapping for Dust Land v1 defines which review, validation, and
safety rules apply to major repository paths in the current Dust Land custom
C++ / WinAPI prototype.

This document builds on:

- `Agent_Role_Registry_v1.md`
- `Role_Router_Rules_v1.md`
- `Review_Validation_Verdict_Format_v1.md`
- `07_Review_Validation_Rules.md`
- `Discord_Orchestrator_Safety_Rules.md`

The mapping is policy-only. It does not introduce executable hooks, automatic
enforcement, Discord command behavior changes, source modification, automatic
approval, automatic commit, push, deploy, or release behavior.

Use this document when classifying a task, preparing a Codex `/goal`, preparing
a Copilot implementation request, reviewing a diff, selecting validation
commands, or deciding whether a human decision gate is required.

---

## 2. Global Rules

Apply these rules before path-specific rules.

### 2.1 Human Director Authority

The Human Director remains the final decision-maker for:

- Scope approval.
- Source or data modification approval.
- JSON schema approval.
- Runtime behavior approval.
- Workflow rule approval.
- Discord command behavior approval.
- Validation acceptance.
- Commit, push, release, or deploy decisions.

Role ownership does not grant approval or write permission.

### 2.2 Fast Path and Full Path

Fast Path may be used for low-risk documentation-only work when:

- No game source, data schema, build setting, Discord implementation, runtime
  behavior, save/load behavior, or release behavior changes.
- The diff stays within approved documentation or log paths.
- Required markdown, diff, link, and scope checks pass.

Full Path is required when a task touches or changes:

- Game source code.
- Runtime behavior.
- Scene, actor, component, or lifecycle behavior.
- JSON schema, save/load behavior, or data-loading behavior.
- Resource path conventions.
- Workflow tools, Discord command behavior, scripts, or automation boundaries.
- Root configuration files that affect tool, build, editor, or repository
  behavior.

### 2.3 Source, Data, and Tool Safety

Do not modify game source, gameplay data, workflow tools, Discord command
implementation, root configuration, or release/deploy behavior without an
approved bounded scope.

Do not modify these paths unless an approved task explicitly allows them:

- `_Local/`
- `node_modules/`
- `_Temp/`
- Release or deploy scripts.
- `Backlog.md`
- `ActiveTask.md`

Do not expose secrets, tokens, credentials, local Discord configuration, or
private machine-local files.

### 2.4 Review and Validation

Any file change requires at least scope review and diff validation.

Source, data, runtime, tool, workflow, or root configuration changes require
Reviewer and Validator roles. Documentation-only workflow rule changes also
require review for policy consistency and validation for link/index/scope
checks.

Validation evidence must state what was actually run and what was not run. Do
not claim build, runtime, manual gameplay, data-loading, or Discord bot
validation passed without evidence.

### 2.5 Commit Safety

Do not commit automatically.

Before a commit recommendation, review:

- `git status --short`
- `git diff --check`
- `git diff --stat`
- Changed file list and forbidden path scope.
- Required validation evidence for the changed path.
- Whether unrelated working tree changes exist.

The Human Director decides whether and when to commit.

---

## 3. Path Rule Summary Table

| Path scope | Primary owner role | Main risk | Required review roles | Required validation | Human gate triggers |
|---|---|---|---|---|---|
| `PlayGround/Project/Gameplay/**` | Gameplay Implementer | Gameplay behavior, component ownership, state/animation coupling, scene or actor lifecycle regression | Explorer, Technical Architect when structure/lifecycle/data is involved, Reviewer, Validator, Documentation Keeper | `git status --short`, `git diff --check`, `git diff --stat`, Debug x64 build, manual runtime validation, data checks if JSON is involved | Source implementation, runtime behavior, lifecycle, data/schema, scope expansion, skipped runtime validation |
| `PlayGround/Project/EngineSystems/**` | Gameplay Implementer with Technical Architect lead for structure | Renderer, input, collision, timing, resource, or engine-service regression | Explorer, Technical Architect, Reviewer, Validator, Documentation Keeper | `git status --short`, `git diff --check`, `git diff --stat`, Debug x64 build, manual runtime validation; resource/data checks when affected | Source implementation, engine behavior, rendering policy, lifecycle/order, ownership, scope expansion, skipped build/runtime validation |
| `PlayGround/Project/Core/**` | Technical Architect | Core lifecycle, ownership, registration, scene transition, and cross-system contract regression | Explorer, Technical Architect, Reviewer, Validator, Documentation Keeper | `git status --short`, `git diff --check`, `git diff --stat`, Debug x64 build, manual runtime validation | Source implementation, lifecycle, ownership, runtime behavior, build setting dependency, scope expansion |
| `PlayGround/Project/Framework/**` | Technical Architect | Framework contract drift, base class growth, update/render ordering, component contract regression | Explorer, Technical Architect, Reviewer, Validator, Documentation Keeper | `git status --short`, `git diff --check`, `git diff --stat`, Debug x64 build, manual runtime validation | Source implementation, framework contract change, actor/component lifecycle, runtime behavior, scope expansion |
| `PlayGround/Data/**` | Technical Architect for schema; Gameplay Implementer for approved data edits | JSON syntax, schema drift, invalid-data behavior, runtime loader mismatch | Explorer, Technical Architect if schema/meaning changes, Reviewer, Validator, Documentation Keeper | `git status --short`, `git diff --check`, `git diff --stat`, `tools/aiworkflow/json_smoke_check.bat`, runtime loader/manual validation when behavior changes | JSON schema, field meaning/defaults, save/load, resource path convention, migration, skipped data validation |
| `PlayGround/Data/Resources/**` | Gameplay Implementer with Validator focus | Missing asset, wrong path, unsupported format, resource load/render mismatch | Explorer when ownership is unclear, Reviewer, Validator, Documentation Keeper | `git status --short`, `git diff --check`, `git diff --stat`, resource path check, Debug x64 build if referenced by source/data, manual runtime validation when visible in game | New asset convention, resource path change, rendering/resource behavior, binary asset provenance, skipped visual/runtime check |
| `tools/aiworkflow/**` | Tool/Workflow Engineer | Validation script behavior, report location, command side effects, local file exposure | Explorer, Tool/Workflow Engineer, Reviewer, Validator, Documentation Keeper | `git status --short`, `git diff --check`, `git diff --stat`, tool-specific command validation, private file tracking check | Tool behavior, script execution behavior, allowlist behavior, output location, external dependency, skipped command validation |
| `tools/discord-orchestrator/**` | Tool/Workflow Engineer | Discord command behavior, bot safety boundary, secret exposure, local automation side effects | Explorer, Tool/Workflow Engineer, Reviewer, Validator, Documentation Keeper | `git status --short`, `git diff --check`, `git diff --stat`, bot register/restart/status when command/runtime behavior changes, private file tracking check | Discord command behavior, bot runtime behavior, secret/local config handling, allowlist changes, skipped bot validation |
| `_Docs/AIWorkflow/**` | Documentation Keeper | Workflow rule drift, inconsistent policy, broken document map, accidental executable behavior claims | Documentation Keeper, Reviewer for policy changes, Validator for document checks | `git status --short`, `git diff --check`, `git diff --stat`, document map check; private file tracking check when local/private paths are mentioned | Workflow rule change, approval policy change, tool routing change, validation deferral, commit recommendation |
| `_DevLog/**` | Documentation Keeper | Inaccurate evidence, invented validation, wrong log location, traceability loss | Documentation Keeper, Reviewer when meaningful work is recorded, Validator for evidence consistency | `git status --short`, `git diff --check`, `git diff --stat`, document evidence check | Recording completion with missing validation, accepting residual risk, commit recommendation |
| `.github/**` | Tool/Workflow Engineer with Documentation Keeper support | Copilot instruction drift, repository automation/config behavior, policy conflict | Explorer, Tool/Workflow Engineer, Reviewer, Validator, Documentation Keeper | `git status --short`, `git diff --check`, `git diff --stat`, document map/policy consistency check; CI/workflow validation if executable workflow files are touched | Copilot policy change, GitHub Actions behavior, repository automation, workflow rule conflict, skipped validation |
| Root workflow/config files: `AGENTS.md`, `README.md`, `.editorconfig`, `.gitattributes` | Documentation Keeper for docs; Tool/Workflow Engineer for config behavior | Repository-wide policy/config drift, line-ending or editor behavior changes, workflow entry-point mismatch | Explorer, Reviewer, Validator, Documentation Keeper; Tool/Workflow Engineer for config behavior | `git status --short`, `git diff --check`, `git diff --stat`, document map check, private file tracking check; config-specific checks when behavior changes | Repository-wide policy change, editor/line-ending behavior, workflow entry point change, skipped scope/config validation |

---

## 4. Gameplay Code Rules

Applies to:

```text
PlayGround/Project/Gameplay/**
```

Primary owner role:

- Gameplay Implementer after explicit implementation approval.

Required support roles:

- Orchestrator for scope and gate control.
- Explorer when file-level behavior, ownership, or lifecycle context is missing.
- Technical Architect when state, lifecycle, data, component boundaries, or
  final-form architecture are involved.
- Reviewer for source diff and behavior risk review.
- Validator for build/runtime/manual/data validation evidence.
- Documentation Keeper for meaningful work and remaining risk.

Main risks:

- Gameplay state and animation playback becoming coupled.
- Actor, scene, or component lifecycle regression.
- Monolithic growth in gameplay classes.
- Hidden ownership or registration cleanup assumptions.
- JSON-driven behavior changing without schema approval.
- Runtime behavior changing without manual validation.

Rules:

- Keep FSM/gameplay state, animator playback, renderer drawing, and data
  assembly separate.
- Do not add branches to large gameplay actors or managers when a focused
  component, service, builder, or strategy-like object is the maintainable
  boundary.
- Avoid broad early returns in scene or actor lifecycle paths after partial
  initialization unless the function is designed to fail atomically.
- Preserve explicit state names, data IDs, ownership rules, lifecycle rules,
  validation points, and failure messages.
- Do not change JSON schema, save/load behavior, rendering policy, or lifecycle
  contracts without a human gate.

Required validation:

- Always: `git status --short`, `git diff --check`, `git diff --stat`.
- Required for source behavior changes: Debug x64 build.
- Required for gameplay behavior changes: manual runtime validation with
  observed result.
- Required when JSON/data is involved: `tools/aiworkflow/json_smoke_check.bat`
  plus relevant runtime loader validation.

Human gate triggers:

- Source code implementation.
- Runtime behavior change.
- Scene, actor, component, or lifecycle change.
- Data/schema or save/load change.
- Rendering policy change.
- Scope expansion or unplanned file ownership.
- Accepting skipped build, runtime, or data validation.

---

## 5. Engine/Core/Framework Rules

Applies to:

```text
PlayGround/Project/EngineSystems/**
PlayGround/Project/Core/**
PlayGround/Project/Framework/**
```

Primary owner role:

- Technical Architect for contract, lifecycle, ownership, and system boundary
  decisions.
- Gameplay Implementer only after bounded implementation approval.

Required support roles:

- Orchestrator.
- Explorer.
- Technical Architect.
- Reviewer.
- Validator.
- Documentation Keeper.

Main risks:

- Renderer, input, collision, time, or resource behavior regression.
- Core lifecycle, scene transition, ownership, registration, or cleanup
  regression.
- Framework base class growth or unclear component contract changes.
- Update/render order changes with broad behavioral impact.
- Rendering pipeline drift.

Rules:

- Preserve the WinAPI/custom renderer pipeline.
- Do not introduce GDI+ unless the Human Director explicitly approves a major
  rendering-policy change.
- Keep engine execution, gameplay decisions, and data parsing in separate
  responsibilities.
- Treat initialization order, update order, render order, ownership,
  registration/unregistration, delayed destruction, scene transitions, component
  dependencies, owner destruction, and event/callback cleanup as high-risk.
- Do not mix engine/core/framework refactoring with gameplay feature work unless
  the scope explicitly approves both.

Required validation:

- Always: `git status --short`, `git diff --check`, `git diff --stat`.
- Required for source changes: Debug x64 build.
- Required for lifecycle, renderer, input, collision, resource, or scene flow
  changes: manual runtime validation.
- Required when resource or data loading is affected:
  `tools/aiworkflow/json_smoke_check.bat` when JSON is involved, plus targeted
  runtime validation.

Human gate triggers:

- Source implementation.
- Structural refactor.
- Runtime behavior or lifecycle change.
- Rendering policy change.
- Engine service contract change.
- Build/project setting dependency.
- Accepting skipped build/runtime validation.

---

## 6. Data Rules

Applies to:

```text
PlayGround/Data/**
```

Primary owner role:

- Technical Architect for schema and data ownership decisions.
- Gameplay Implementer for approved data edits that do not change schema.

Required support roles:

- Orchestrator.
- Explorer when schema, loader, ownership, or runtime use is unclear.
- Technical Architect when field meanings, defaults, schema, resource path
  conventions, save/load, or migration concerns exist.
- Reviewer.
- Validator.
- Documentation Keeper.

Main risks:

- JSON syntax errors.
- Schema drift.
- Undefined required/optional field behavior.
- Defaults changing without documentation.
- Invalid-data behavior being handled in the wrong layer.
- Runtime loader behavior diverging from documented data behavior.

Rules:

- Any schema change must define field names, meanings, required/optional status,
  defaults, invalid-data behavior, debug/release behavior, and migration or
  backward compatibility needs.
- Do not infer gameplay behavior in raw data files when the behavior belongs in
  loader, builder, decision, or runtime logic.
- Keep data changes traceable to data IDs and loader expectations.
- Do not change save/load behavior without explicit approval.

Required validation:

- Always: `git status --short`, `git diff --check`, `git diff --stat`.
- Required for JSON edits: `tools/aiworkflow/json_smoke_check.bat`.
- Required for schema, loader, or runtime-impacting data changes: runtime
  loader validation and, when player-visible, manual runtime validation.
- Required for compatibility changes: migration/backward compatibility review.

Human gate triggers:

- JSON schema change.
- Field meaning/default change.
- Required/optional field behavior change.
- Invalid-data behavior change.
- Save/load behavior change.
- Resource path convention change.
- Accepting skipped JSON smoke, loader, or manual validation.

---

## 7. Resource Rules

Applies to:

```text
PlayGround/Data/Resources/**
```

Primary owner role:

- Gameplay Implementer for approved resource additions or edits.
- Validator for resource path, load, and visible runtime evidence.

Required support roles:

- Orchestrator.
- Explorer when resource ownership or references are unclear.
- Reviewer.
- Validator.
- Documentation Keeper.
- Technical Architect if resource path conventions or loading policy changes.

Main risks:

- Missing resource files.
- Case/path mismatch.
- Unsupported file format.
- Resource added without data/source reference update.
- Runtime load failure.
- Visual regression not caught by build-only validation.

Rules:

- Keep resource paths consistent with existing data and loader conventions.
- Do not introduce a new resource path convention without explicit approval.
- Do not commit local-only, generated temporary, or private assets unless the
  task explicitly approves the asset.
- Binary or generated assets must have clear provenance and scope.

Required validation:

- Always: `git status --short`, `git diff --check`, `git diff --stat`.
- Required when JSON references resources:
  `tools/aiworkflow/json_smoke_check.bat`.
- Required when source/data references change: Debug x64 build.
- Required when player-visible resources change: manual runtime validation or
  explicit Human Director acceptance of deferred visual validation.

Human gate triggers:

- New asset convention.
- Resource path convention change.
- Rendering/resource loader behavior change.
- Large or binary asset addition.
- Accepting skipped visual/runtime validation.

---

## 8. AIWorkflow Tool Rules

Applies to:

```text
tools/aiworkflow/**
```

Primary owner role:

- Tool/Workflow Engineer.

Required support roles:

- Orchestrator.
- Explorer when current command behavior must be inspected.
- Tool/Workflow Engineer.
- Reviewer.
- Validator.
- Documentation Keeper.

Main risks:

- Validation script behavior changing silently.
- Reports written to unsafe or unclear locations.
- Command side effects expanding beyond the allowlist.
- Private/local files exposed.
- Future automation bypassing human approval gates.

Rules:

- Keep tool behavior explicit and auditable.
- Do not add automatic approval, automatic source modification, automatic
  commit, automatic push, automatic release, or external agent execution.
- Do not change output paths, allowlists, script behavior, or dependency
  requirements without explicit approval.
- Do not write `_Local/`, `node_modules/`, `_Temp/`, credential files, or
  release/deploy outputs unless a separate approved task explicitly permits it.

Required validation:

- Always: `git status --short`, `git diff --check`, `git diff --stat`.
- Required for script behavior changes: run the changed script or document why
  command validation is blocked or deferred.
- Required when JSON smoke behavior changes:
  `tools/aiworkflow/json_smoke_check.bat`.
- Required when private/local paths are touched or mentioned: private file
  tracking check.

Human gate triggers:

- Tool behavior change.
- Script execution behavior change.
- Allowlist change.
- Output location change.
- External dependency installation.
- Accepting skipped command validation.

---

## 9. Discord Orchestrator Rules

Applies to:

```text
tools/discord-orchestrator/**
```

Primary owner role:

- Tool/Workflow Engineer.

Required support roles:

- Orchestrator.
- Explorer.
- Tool/Workflow Engineer.
- Reviewer.
- Validator.
- Documentation Keeper.

Main risks:

- Discord command behavior changing without approval.
- Bot registration/restart/status flow regression.
- Local secret or config exposure.
- Allowlist or command execution boundary weakening.
- Generated prompts bypassing human approval gates.

Rules:

- Discord commands may recommend, summarize, or route only within approved
  behavior.
- Do not make Discord commands execute Codex, Copilot, commits, pushes,
  releases, deploys, destructive commands, or source modifications unless a
  future approved workflow explicitly allows that exact behavior.
- Do not expose `_Local/AIWorkflow/discord_bot.local.json`, tokens, credentials,
  `.env`, or machine-local configuration.
- Keep all write behavior and command side effects explicit.

Required validation:

- Always: `git status --short`, `git diff --check`, `git diff --stat`.
- Required for command contract or runtime behavior changes: bot registration,
  restart, and status validation using the repository-approved bot commands.
- Required for script/allowlist integration changes: command-specific manual or
  automated validation.
- Required for secret/local safety: private file tracking check.

Human gate triggers:

- Discord command behavior change.
- Bot runtime behavior change.
- Allowlist or script execution boundary change.
- Prompt generation behavior change that affects approval gates.
- Secret/local configuration handling change.
- Accepting skipped bot register/restart/status validation.

---

## 10. Documentation Rules

Applies to:

```text
_Docs/AIWorkflow/**
_DevLog/**
```

Primary owner role:

- Documentation Keeper.

Required support roles:

- Orchestrator.
- Reviewer when workflow rules, approval gates, validation rules, or multi-file
  documentation are changed.
- Validator for markdown/diff/document map/scope checks.
- Tool/Workflow Engineer when documentation changes tool or command behavior
  policy.

Main risks:

- Workflow policy drift.
- Contradictory rule documents.
- README document map missing new durable documents.
- Dev Log claims validation that was not performed.
- Logs stored in the wrong repository-level path.

Rules:

- Store AIWorkflow policy documents under `_Docs/AIWorkflow/`.
- Store investigation or workflow task records under `_DevLog/WorkLog/`.
- Store fix records under `_DevLog/FixLog/`.
- Store retrospectives under `_DevLog/Retrospective/`.
- Do not create redundant documentation paths inside `PlayGround/`.
- Do not invent validation evidence.
- Link new durable AIWorkflow documents from `_Docs/AIWorkflow/README.md` when
  they are part of the document set.

Required validation:

- Always: `git status --short`, `git diff --check`, `git diff --stat`.
- Required when README or document indexes change: document map check.
- Required when validation evidence is recorded: evidence consistency review.
- Required when local/private file rules are mentioned or tool docs change:
  private file tracking check.

Human gate triggers:

- Workflow rule change.
- Approval gate change.
- Validation requirement change.
- Tool routing or Discord behavior policy change.
- Completing a task with skipped validation.
- Commit recommendation.

---

## 11. Root / Configuration Rules

Applies to root-level workflow and configuration files, including:

```text
AGENTS.md
README.md
.editorconfig
.gitattributes
```

Also applies to:

```text
.github/**
```

Primary owner role:

- Documentation Keeper for workflow entry-point documents.
- Tool/Workflow Engineer for repository configuration, automation, or behavior.

Required support roles:

- Orchestrator.
- Explorer when policy or config ownership is unclear.
- Reviewer.
- Validator.
- Documentation Keeper.
- Tool/Workflow Engineer when config or automation behavior changes.

Main risks:

- Repository-wide policy drift.
- Conflict between `AGENTS.md`, `.github/copilot-instructions.md`, and
  `_Docs/AIWorkflow/`.
- Line-ending, editor, or Git behavior changes.
- GitHub Actions or Copilot instruction behavior changing without approval.
- Private/local file tracking rules weakening.

Rules:

- Treat `AGENTS.md` as the repository-level AI entry point.
- Treat `.github/copilot-instructions.md` as Copilot-specific implementation
  guidance.
- Keep root README and workflow documents consistent with AIWorkflow source of
  truth.
- Do not change `.editorconfig` or `.gitattributes` without explicit approval
  and line-ending/config validation.
- Do not change GitHub Actions or automation behavior without explicit approval.

Required validation:

- Always: `git status --short`, `git diff --check`, `git diff --stat`.
- Required for workflow docs or entry-point docs: document map/policy
  consistency check.
- Required for `.editorconfig` or `.gitattributes`: line-ending/config impact
  review.
- Required for `.github` automation files: CI/workflow validation plan or
  explicit blocked/deferred validation note.
- Required for privacy-sensitive config changes: private file tracking check.

Human gate triggers:

- Repository-wide AI policy change.
- Copilot instruction change.
- GitHub Actions or repository automation behavior change.
- Editor or Git attribute behavior change.
- Private/local file handling change.
- Accepting skipped config or automation validation.

---

## 12. Human Decision Gates

The Orchestrator must stop for explicit Human Director approval before:

- Source code implementation.
- Structural refactoring.
- File creation under project source directories.
- JSON schema changes.
- Save/load behavior changes.
- Actor, component, scene, engine, or framework lifecycle changes.
- Runtime behavior changes.
- Rendering policy changes, including any GDI+ introduction.
- Build setting changes.
- Tool execution that may modify files.
- Workflow rule changes.
- Discord command behavior changes.
- Script allowlist or automation boundary changes.
- External dependency installation.
- Credential, login, subscription, or secret-handling setup.
- Destructive commands.
- Release, deploy, tag, push, or publish operations.
- Accepting failed validation.
- Accepting skipped required validation.
- Accepting unresolved Critical or Major review findings.
- Commit decisions.

Approval applies only to the described scope. If path scope, file scope, role
scope, behavior, validation, or risk changes, request a new decision.

---

## 13. Validation Matrix

Use this matrix to select validation by changed path. `Required` means the check
is expected before completion. `Conditional` means it is required when the
path-specific condition applies. `Not normally required` means the check is not
expected unless the task expands into that area.

| Validation check | Gameplay source | Engine/Core/Framework source | Data JSON | Resources | AIWorkflow tools | Discord orchestrator | AIWorkflow docs / DevLog | Root / `.github` |
|---|---|---|---|---|---|---|---|---|
| `git status --short` | Required | Required | Required | Required | Required | Required | Required | Required |
| `git diff --check` | Required | Required | Required | Required | Required | Required | Required | Required |
| `git diff --stat` | Required | Required | Required | Required | Required | Required | Required | Required |
| `tools/aiworkflow/json_smoke_check.bat` | Conditional when JSON/data behavior is involved | Conditional when JSON/resource loading is affected | Required for JSON edits | Conditional when JSON references resources | Conditional when the script or JSON smoke behavior changes | Conditional when command integration changes | Not normally required | Not normally required |
| Debug x64 build | Required for source changes | Required for source changes | Conditional when data affects runtime loader behavior | Conditional when resource references affect runtime loading/rendering | Not normally required | Conditional when source/tool integration affects runtime scripts or bot package validation requires it | Not normally required | Conditional for build/config changes |
| Bot register/restart/status | Not normally required | Not normally required | Not normally required | Not normally required | Conditional when bot-invoked scripts or command contracts are affected | Required for Discord command/runtime behavior changes | Not normally required unless docs claim bot behavior validation | Conditional for `.github`/root automation only if bot operation is affected |
| Manual runtime validation | Required for gameplay behavior changes | Required for lifecycle/render/input/collision/resource behavior changes | Conditional when data changes player-visible/runtime behavior | Required when visible resources change | Conditional when tool behavior affects game validation workflow | Conditional when Discord command behavior must be observed | Not normally required | Conditional for runtime/config behavior changes |
| Document map check | Conditional when docs/indexes are updated | Conditional when docs are updated | Conditional when schema docs are updated | Conditional when resource docs are updated | Conditional when tool docs are updated | Conditional when Discord docs are updated | Required when README/index/doc map changes | Required when root README or policy index changes |
| Private file tracking check | Conditional when local/private paths are touched or mentioned | Conditional when local/private paths are touched or mentioned | Conditional when local/private data is touched or mentioned | Conditional when local/private assets are touched or mentioned | Required for tooling changes that may access local files | Required for Discord/local config changes | Conditional when local/private rules are changed | Required for privacy-sensitive config or `.github` changes |

Suggested private file tracking check:

```powershell
git ls-files | Select-String -Pattern '(^|/)(_Local|node_modules|_Temp)(/|$)|(^|/)(\.env|discord_bot\.local\.json)$'
```

The expected result is no tracked private/local files. If the command returns
paths, review whether each path is intentionally tracked and safe.

Suggested document map check:

```bat
findstr /C:"Path_Scoped_Rule_Mapping_DustLand_v1.md" _Docs\AIWorkflow\README.md
```

The expected result is a README document map entry for this document when the
README is updated.

---

## 14. Non-goals

Path-Scoped Rule Mapping for Dust Land v1 does not introduce:

- Executable hooks.
- Git hooks.
- CI enforcement.
- Discord command implementation.
- Discord command behavior changes.
- Workflow script changes.
- Automatic role routing.
- Automatic approval.
- Automatic source modification.
- Automatic validation.
- Automatic commit, push, release, or deploy behavior.
- Game source architecture changes.
- JSON schema changes.
- Save/load behavior changes.
- Resource path convention changes.
- Release or deploy script changes.

---

## 15. Next Tasks

Recommended follow-up tasks:

1. Add path-scope hints to future ActiveTask metadata templates if approved.
2. Define a read-only document map check script only if repeated manual checks
   become error-prone.
3. Create a Small Role Router Prototype as a separate approved policy/tooling
   task.
4. Create a Discord role recommendation command as a separate approved
   Discord-orchestrator task.
5. Review whether root-level `AGENTS.md` and `.github/copilot-instructions.md`
   need a short pointer to this mapping after this document is accepted.

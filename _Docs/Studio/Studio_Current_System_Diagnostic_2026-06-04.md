# Studio Current System Diagnostic

## Date

2026-06-04

## Status

Diagnostic report only.

No source code or runtime behavior was changed by this report.

## Purpose

The Human Director requested a broad inspection of the existing Studio system before further implementation.

Main concern:

- Studio was intended to be a natural-language conversational meeting room.
- Prior implementation drifted toward system/operator perspective.
- Internal terms, state units, IDs, WorkOrders, runners, queues, registries, logs, and status machinery may be overexposed.
- Over-structuring may be harming actual usability.

This report evaluates the current Studio implementation against the newer Studio direction documents:

- `_Docs/Studio/Personal_AI_Game_Development_Operating_System_North_Star.md`
- `_Docs/Studio/Personal_AI_Game_Development_Operating_Rules.md`
- `_Docs/Studio/Studio_Director_Workflow_Principles.md`

## Diagnostic Method

Inspection sources:

- Studio implementation under `tools/aiworkflow/studio/`
- Studio server entrypoint: `tools/aiworkflow/studio_director_console_server.js`
- Studio API route modules
- Studio page renderer modules
- Legacy Studio/AIWorkflow documents under `_Docs/AIWorkflow/Studio/`
- Studio final blueprint documents under `_Docs/AIWorkflow/FinalBlueprint/`
- Recent Studio WorkLogs
- Live local Studio page loaded in browser on `http://127.0.0.1:4318/`

Additional sub-reviews were performed for:

1. UI/user-facing terminology and visible flow
2. Backend/API/data model over-structuring
3. Legacy documentation direction drift

## Bottom-Line Diagnosis

The user's concern is valid.

The current Studio contains a partially improved natural-language conversation surface, but the overall system still strongly reflects an internal AIWorkflow/operator dashboard architecture.

The implementation has accumulated too many first-class concepts:

- ActiveTask
- Backlog
- WorkOrder
- Handoff
- MeetingSession
- RoleRun
- ToolRun
- ContextPacket
- Materialization
- Runner
- Finalization
- Git Gate
- Staff registry
- Department registry
- Tool adapter registry
- Policy evaluation
- Smoke/eval/recovery/traceability plans

These concepts may be useful internally, but they are too visible or too structurally central for the intended Director-facing product.

The current system behaves less like:

```text
Natural-language meeting room -> decision -> execution request -> result review -> record
```

and more like:

```text
Workflow/runtime control plane -> state dashboard -> packet/runner/tool orchestration -> artifact browser
```

## Critical Live UI Finding

A live browser inspection revealed a concrete UI bug / structural leak:

### Finding: hidden and inactive sections are visible on the Home page

Observed behavior:

- The Home page visually shows not only the Home content, but also the Studio Conversation area below it.
- Hidden Home diagnostic/metric sections also appear.
- This makes the page much longer and more system-dashboard-like than intended.

Likely implementation causes:

1. `tools/aiworkflow/studio/studioSessionsPageRenderer.js` renders:

```html
<section class="page-shell page-shell-wide">
```

instead of a normal hidden page shell such as:

```html
<section class="page" data-page="sessions">
```

Therefore the sessions page is not controlled by the normal page navigation hiding logic.

2. `tools/aiworkflow/studio/directorConsolePage.js` uses elements like:

```html
<section id="metrics" class="grid" hidden></section>
<section class="grid" hidden>
```

but CSS defines `.grid { display:grid; ... }` without a general `[hidden] { display:none !important; }` rule.

The browser's default hidden behavior can be overridden by authored `.grid` display styling, so hidden sections become visible.

Impact:

- The Home page becomes visually cluttered.
- The intended first impression of “what should I decide now?” is diluted by metrics, staff status, recent activity, runtime status, and conversation UI.
- This is a direct example of internal/system structure breaking the meeting-room experience.

Severity: Critical for UX direction.

## Major Finding 1: The UI exposes too many pages and operator categories

Current top-level visible navigation includes:

- Home
- Studio Conversation
- Director Inbox
- Result Review
- Records
- Toolbox

Additional toggled categories include:

- Operations Detail
  - Work Instructions
  - Staff Reports
  - Diff Review
  - DevLog
  - Execution Timeline
- Organization Reference
  - Project
  - Departments
  - AI Staff
- Internal Tools
  - Systems
  - Policy

Some of this is hidden behind toggles, which is an improvement, but the conceptual surface is still large.

Problem:

The user-facing product direction says Studio should have only five first-class functions:

1. Conversation
2. Decision
3. Execution Request
4. Result Review
5. Record Keeping

The current page model still suggests a much broader operator console.

Severity: High.

## Major Finding 2: Home still exposes runner/task/system status

Evidence:

- `tools/aiworkflow/studio/directorConsolePage.js`
- Home/current state logic includes ActiveTask, Runner, selected task, runner records, Git/diff/completion status, and company runtime readiness.

Observed live UI examples:

- “Runner 기록 없음”
- “직원 보고서” metrics
- “인수인계” metrics
- “정책 평가” metrics
- “회사 런타임”
- “C gate”
- “도구 어댑터”
- “도구 요청서”

Problem:

Home should answer:

```text
What needs my judgment now?
What conversation/result/record needs attention?
```

Instead, it also displays runtime health and internal artifact counts.

Severity: High.

## Major Finding 3: Natural-language conversation is present, but command/session vocabulary leaks through

Positive:

`tools/aiworkflow/studio/studioSessionsPageRenderer.js` has a good direction:

- “그냥 말하면서 아이디어를 구체화...”
- “자연어로 바로 말하세요...”
- First message auto-creates a conversation record.

Problems:

The same page still exposes:

- “세션 제목, ID 검색”
- `/ask`, `/summon`, `/work`, `/decision`, `/close` command hints
- “내부 대화 기록”
- staff selector mechanics
- decision/work candidate buttons as separate machinery

Problem:

The conversation room should not teach the user slash commands or session IDs as a normal affordance.

Severity: High.

## Major Finding 4: Execution Request is over-fragmented into WorkOrder/Handoff/Backlog/Runner concepts

Evidence:

- `tools/aiworkflow/studio/studioWorkPageRenderer.js`
- `tools/aiworkflow/studio/studioWorkOrderApiRoutes.js`
- `tools/aiworkflow/studio/studioToolAutomationApiRoutes.js`

Current visible/workflow concepts include:

- 업무 지시서
- 담당 부서
- 담당 직원
- 직원 인수인계
- 인수인계 점검
- 직원 자료 미리보기
- 직원 실행 계획
- 작업 생성 계획
- 직원에게 맡기기
- 작업 목록에 넣기
- AIWorkflow Backlog task
- Runner start as separate step

Problem:

The intended Director-facing concept is simply:

```text
Execution Request: what is approved, what is not approved, who/what should execute, how results will be judged.
```

The internal implementation may create WorkOrders, context packets, handoffs, or runner tasks, but the user should not have to manage those as separate conceptual stages.

Severity: High.

## Major Finding 5: API surface confirms over-structuring

Actual API route count found:

- `studioToolAutomationApiRoutes.js`: 22 endpoints
- `studioPlanningMeetingApiRoutes.js`: 17 endpoints
- `studioEvidenceReviewApiRoutes.js`: 13 endpoints
- `studioWorkOrderApiRoutes.js`: 7 endpoints
- `studioKnowledgeDecisionApiRoutes.js`: 7 endpoints
- `studioWorkflowApiRoutes.js`: 5 endpoints
- plus `/api/summary`

Total: 71+ endpoint-level operations.

Examples:

- `/api/handoff/plan`
- `/api/handoff/execute`
- `/api/output/materialize-plan`
- `/api/output/materialize`
- `/api/studio/toolrun/plan`
- `/api/studio/toolrun/create`
- `/api/automation/replay`
- `/api/automation/repair`
- `/api/studio/meeting/runbook`
- `/api/studio/meeting/board`
- `/api/studio/meeting/agent-turn-plan`
- `/api/studio/workorder/context-plan`
- `/api/studio/workorder/staff-run`
- `/api/studio/recovery/plan`
- `/api/studio/traceability/map`
- `/api/studio/company/runtime-readiness`

Problem:

A rich internal API is not automatically wrong, but the route set reflects a system that models many internal artifacts as first-class actions.

The user-facing flow should not feel like 71 possible operations.

Severity: High.

## Major Finding 6: Store/data model is broader than the intended product model

Evidence:

`tools/aiworkflow/studio_director_console_server.js` summary loads and exposes:

- review packets
- director goal plans
- staff runs
- context packets
- handoffs
- materializations
- work orders
- proposals
- decisions
- memories
- meetings
- project profiles
- tool adapters
- tool run requests
- conditional automation
- workflow core
- dev logs

Problem:

The public model should be closer to:

- Conversation
- Decision
- Execution Request
- Result Review
- Record

Everything else should be internal implementation evidence, not primary product state.

Severity: High.

## Major Finding 7: Legacy documents likely caused the drift

Several older source documents strongly framed Studio as an internal runtime/control plane.

High-risk legacy concepts:

- “AI Studio Company Runtime”
- “Human Director Control Plane”
- persistent StaffAgent / Department registry
- MeetingSession lifecycle
- WorkOrder lifecycle
- Handoff router / queue
- RoleRun / ToolRun lifecycle
- StaffContextPacket sealed envelope
- MemoryRecord/canonization state machine
- local registry inspection CLI commands
- Systems / Policy / Timeline / Staff / Departments pages as Studio pages
- recovery/smoke/traceability/readiness plans as visible Studio actions
- Home reading ActiveTask, Backlog, PC Runner artifacts, and Git status directly

Important files:

- `_Docs/AIWorkflow/Studio/README.md`
- `_Docs/AIWorkflow/Studio/Studio_Runtime_Contracts.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Personal_AI_Development_Studio_Architecture.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Studio_Control_Plane_Repositioning_Audit.md`
- `_Docs/AIWorkflow/Studio/RoleRuns/README.md`
- `_Docs/AIWorkflow/Studio/ContextPackets/README.md`
- `_Docs/AIWorkflow/Studio/Handoffs/README.md`
- `_Docs/AIWorkflow/Studio/Canon_Decision_Flow.md`

Diagnosis:

The older documentation contains useful governance and safety ideas, but it over-centered internal runtime concepts. Codex likely followed those documents faithfully and therefore produced a system that is structurally coherent but user-experience wrong for the current Director-facing goal.

Severity: Critical as root-cause context.

## Major Finding 8: Tool/Diff/Git features are too close to first-class UX

Evidence:

- `tools/aiworkflow/studio/studioToolboxPageRenderer.js`
- `tools/aiworkflow/studio/studioDiffPageRenderer.js`

Problems:

- Toolbox is in the main navigation.
- Toolbox exposes allowlisted tools and execution command displays.
- Diff page exposes commit and commit+push controls.

The product direction says:

- raw command operation is not the Director UX
- commit/push requires explicit approval
- Git/build/test/diff are evidence and validation systems, not the primary meeting room

Severity: High.

## What Is Working / Worth Preserving

The system is not useless. Several parts are directionally correct and should be preserved or simplified:

1. Natural-language conversation panel exists.
2. Home tries to prioritize “what should I decide now?”
3. Result Review page correctly frames completion as complete / revise / defer.
4. Knowledge page correctly warns that Studio is not the long-term wiki.
5. Many dangerous actions are at least described as non-mutating or separately gated.
6. Internal/operations pages are partly hidden behind toggles.
7. The implementation has useful data loaders and evidence aggregation that can be internalized.
8. Governance rules around approval, validation, and commit/push boundaries are valuable.

## Root Cause Hypothesis

The main root cause is not poor coding quality.

The main root cause is product-model mismatch:

```text
The implementation optimized for a complete internal AIWorkflow runtime/control plane,
while the desired product is a Director-facing natural-language meeting room.
```

The earlier architecture documents made internal runtime artifacts durable and explicit. Codex then implemented those concepts as visible screens, routes, plans, stores, and controls.

In other words:

```text
The system is overfaithful to legacy workflow machinery and underfaithful to the user's actual daily use scene.
```

## Recommended Reclassification

### Keep as Director-facing

- Conversation
- Decision
- Execution Request
- Result Review
- Record Keeping

### Keep but simplify / rename

- Studio Conversation
  - Keep as the main entry point.
  - Remove slash command language from normal UX.
  - Hide session IDs by default.

- Director Inbox
  - Keep as Decision.
  - Show only decisions requiring judgment.
  - Hide ActiveTask/Runner internals.

- Result Review
  - Keep.
  - Show outcome, changed behavior, validation, risks, next decision.
  - Hide raw packet/log/artifact paths by default.

- Records
  - Keep.
  - Prefer “Decision / Note / Canon Candidate / Rejected Idea / Lesson”.
  - Hide MemoryRecord/proposal IDs by default.

### Internalize

- WorkOrder
- Handoff
- ContextPacket
- RoleRun
- ToolRun
- Materialization
- TaskBinding
- Runner state
- Git dirty state
- registry inspection
- policy replay/repair
- smoke/eval/recovery/traceability plans

### Move to debug/admin only

- Systems page
- Policy page
- raw registry views
- tool adapter views
- tool run requests
- automation validation/replay/repair
- raw JSON links
- raw execution timeline
- staff/department registry maintenance

### Demote to evidence only

- Git diff
- build/test outputs
- DevLog links
- runner logs
- review packets
- completion/finalization artifacts

## Proposed Target UX Shape

The Studio default screen should feel like this:

```text
Studio = natural-language meeting room + decision desk
```

Default navigation should be reduced to:

1. Conversation
2. Decisions
3. Execution Requests
4. Results
5. Records

Possible optional debug entry:

- Internal / Debug

but it should not be visually equivalent to the main workflow.

## Recommended Cleanup Sequence

Do not start by deleting backend machinery.

Recommended order:

1. Freeze current diagnosis as the accepted UX problem statement.
2. Define a Director-facing vocabulary map.
3. Fix critical visibility leaks:
   - Sessions page must be a real hidden page: `class="page" data-page="sessions"`.
   - Add global `[hidden] { display:none !important; }`.
4. Reduce Home to only:
   - current decision needed
   - current conversation / next step
   - result awaiting review
   - record promotion candidate
5. Move metrics/staff/runtime/status into internal/debug.
6. Remove slash-command hints and ID-search wording from normal Conversation UI.
7. Collapse WorkOrder/Handoff/Backlog into a single visible “Execution Request” concept.
8. Collapse Tool/Diff/Git pages into Result Review / internal evidence views.
9. Archive or reclassify legacy `_Docs/AIWorkflow/Studio/` documents as legacy runtime/internal references, not current product direction.
10. Only after UX surface is corrected, consider backend/API consolidation.

## Immediate Fix Candidates

These are small, high-leverage corrections that do not require changing the whole architecture:

1. Add CSS rule:

```css
[hidden] { display: none !important; }
```

2. Change `studioSessionsPageRenderer.js` root section from:

```html
<section class="page-shell page-shell-wide">
```

to:

```html
<section class="page page-shell page-shell-wide" data-page="sessions">
```

3. Remove or hide from normal Conversation UI:

- `/ask`, `/summon`, `/work`, `/decision`, `/close` hint
- “세션 제목, ID 검색” wording
- “내부 대화 기록” wording

4. Rename or hide main-nav “도구함”.

5. Move Home metrics grid and staff/runtime status sections behind debug/internal.

6. Remove “Runner 기록 없음” from the Home default card; replace with “아직 검토할 실행 결과 없음”.

7. Do not expose commit/push as normal Diff page primary buttons; keep as explicit post-review action only.

## Human Decision Needed

Before implementation, decide the correction scope:

### Option A: Fast UX containment

Goal:

- Fix critical visibility bugs and remove most obvious internal terms from default screens.

Scope:

- CSS hidden rule
- sessions page root class/data-page fix
- Home default clutter reduction
- conversation wording cleanup

Risk:

- Backend over-structure remains.

### Option B: Director-surface refactor

Goal:

- Reorganize visible Studio around the five Director functions.

Scope:

- Navigation simplification
- Home rewrite
- Conversation/Decision/Execution Request/Result Review/Records vocabulary pass
- Internal/debug segregation

Risk:

- Larger UI diff, but still mostly frontend.

### Option C: Full model consolidation

Goal:

- Collapse public API/data model around the five product concepts.

Scope:

- UI + API + data model consolidation
- WorkOrder/Handoff/RoleRun/ToolRun/Materialization internalization
- legacy docs reclassification

Risk:

- Larger architectural work; should be planned carefully.

## Recommended Next Step

Recommended path:

1. Do Option A immediately to stop the most damaging UX leaks.
2. Then write an approved implementation plan for Option B.
3. Defer Option C until the visible product direction is stabilized.

This matches the principle:

```text
Final-form architecture -> reduced-scope implementation of the same structure
```

The final form is five Director-facing functions.

The reduced scope is to make the current UI stop leaking internal machinery while preserving backend evidence and governance for now.

## Validation Performed

- Source files inspected with repository tools.
- Studio server launched locally with Node.
- Browser opened against local Studio instance.
- Visual inspection confirmed Home page clutter and hidden-section leak.
- No source code was changed.
- No build/test validation was required for this diagnostic report.

## Known Risks

- This report is diagnostic only.
- Some line numbers may shift after future edits.
- Existing uncommitted changes were present before this diagnostic.
- Legacy documents remain in place and can continue to mislead future implementation agents unless explicitly reclassified.

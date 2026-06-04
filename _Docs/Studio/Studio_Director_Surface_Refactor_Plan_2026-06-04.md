# Studio Director Surface Refactor Plan

## Date

2026-06-04

## Status

Implementation plan for the next approved Studio goal.

No source code has been changed by this plan.

## Goal

Refactor the Studio Director-facing surface so the normal user experience is organized around the five approved first-class functions:

1. Conversation
2. Decision
3. Execution Request
4. Result Review
5. Record Keeping

This goal follows the completed Fast UX Containment pass. The containment pass reduced obvious terminology leaks and fixed page visibility defects. This plan defines the next bounded implementation scope: reorganize the visible Director surface so the user is guided through the intended daily workflow rather than through internal AIWorkflow machinery.

## Source of Truth

Read these first:

- `_Docs/Studio/Personal_AI_Game_Development_Operating_System_North_Star.md`
- `_Docs/Studio/Personal_AI_Game_Development_Operating_Rules.md`
- `_Docs/Studio/Studio_Director_Workflow_Principles.md`
- `_Docs/Studio/Studio_Current_System_Diagnostic_2026-06-04.md`
- `_DevLog/WorkLog/2026-06-04_Studio_North_Star_Scope_Correction.md`
- `AGENTS.md`

## Background

The current Studio implementation has already been partially contained:

- hidden inactive pages no longer leak into Home
- the primary navigation now uses more Director-facing labels
- slash-command, WorkOrder, Runner, Git Gate, task, and Backlog terminology was reduced in primary copy
- internal tools were moved out of the primary navigation

However, the screen model still largely reflects the old internal architecture:

- Home is still constructed from internal workflow state summaries.
- Conversation, Decision, Execution Request, Result Review, and Record Keeping are separate pages but are not yet presented as one cohesive Director flow.
- Operations/detail/debug surfaces still exist next to the main flow rather than being clearly secondary.
- Some functions are split into secondary pages such as staff reports, diff review, DevLog, timeline, project, departments, staff, systems, and policy.

The next step is not backend/API consolidation. The next step is to refactor the Director-facing surface and navigation model.

## Approved Scope for Goal 2

Implement a Director Surface Refactor.

Allowed changes:

- Reorganize the Studio shell and primary page model around the five first-class functions.
- Redesign Home as a Director desk that summarizes the five functions and the next judgment required.
- Make the primary navigation exactly match the normal Director workflow.
- Demote operations/detail/debug/reference pages so they are clearly secondary and not part of normal flow.
- Introduce small UI helper structures if needed, such as a `DIRECTOR_FLOW` or page grouping metadata.
- Update page titles, subtitles, empty states, help copy, and navigation jump labels to match the five-function model.
- Consolidate duplicated Director-facing entry points where this can be done without backend/API redesign.
- Keep existing page renderer modules and backend handlers mostly intact.
- Add or update WorkLog/DevLog notes and README links if needed.

Non-goals:

- Do not rewrite the backend API model.
- Do not remove AIWorkflow runtime artifacts from disk.
- Do not change JSON schema, save/load behavior, migration behavior, build settings, or execution runtime policy.
- Do not implement internal model/API consolidation. That belongs to Goal 3.
- Do not remove internal/debug/admin capabilities if removal would change operational behavior.
- Do not alter game project source under `PlayGround/`.
- Do not introduce external dependencies.
- Do not commit, push, release, or deploy.

Renewed approval is required if implementation needs to:

- replace or redesign backend route/data contracts
- merge or delete persisted artifact types
- change task execution behavior
- change git/commit/push behavior
- change schema or migration behavior
- introduce a new frontend framework or dependency
- expand into Goal 3 model/API consolidation

## Final-Form Architecture

The Director-facing Studio surface should be structured as:

```text
Studio Shell
  Home / Director Desk
    - Next judgment
    - Active conversation or result summary
    - Safe entry points into the five functions

  Conversation
    - Natural-language meeting room
    - AI staff advice and objections
    - Candidate decisions and execution requests

  Decision
    - Approve / reject / revise / defer
    - Shows only human judgment items
    - Does not require internal IDs

  Execution Request
    - Convert approved direction into bounded work contract
    - Scope, non-goals, expected output, validation
    - Execution remains separately approved

  Result Review
    - Changed files, behavior summary, validation, risks
    - Complete / revise / defer / reject / commit decision

  Record Keeping
    - Decisions, accepted/rejected proposals, DevLog, knowledge promotion
    - Links to durable documents instead of raw artifact browsing by default

  Secondary / Debug / Reference
    - Operations detail
    - Organization reference
    - Internal tools
    - Existing pages remain available but are visually and conceptually secondary
```

Reduced-scope implementation for this goal:

```text
Keep the existing single-page app and renderer modules.
Add flow metadata, regroup navigation, rewrite Home, and adjust copy/empty states.
Do not replace storage, API handlers, or artifact types.
```

## Implementation Plan

### Task 1: Add Director flow metadata

Objective:
Create a single in-code source for the five Director-facing functions and secondary/debug groupings.

Files:

- Modify: `tools/aiworkflow/studio/directorConsolePage.js`

Steps:

1. Add a metadata object near `PAGES`, for example:

```js
const DIRECTOR_FLOW = [
  { page: "sessions", label: "Conversation", title: "스튜디오 대화", purpose: "자연어로 의도와 방향을 구체화합니다." },
  { page: "inbox", label: "Decision", title: "결정", purpose: "승인, 수정, 보류, 반려가 필요한 판단만 봅니다." },
  { page: "work", label: "Execution Request", title: "실행 요청", purpose: "승인된 방향을 범위가 있는 실행 계약으로 만듭니다." },
  { page: "evidence", label: "Result Review", title: "결과 검토", purpose: "결과, 검증, 위험, 다음 판단을 확인합니다." },
  { page: "knowledge", label: "Record Keeping", title: "기록함", purpose: "중요한 결정과 지식을 durable record로 남깁니다." },
];
```

2. Add secondary group metadata for existing support pages:

```js
const SECONDARY_PAGE_GROUPS = {
  operations: ["runs", "diff", "devlog", "timeline"],
  reference: ["project", "departments", "staff"],
  internal: ["toolbox", "systems", "policy"],
};
```

3. Use these constants where possible for navigation or Home cards without changing page routes.

Verification:

```text
node --check tools/aiworkflow/studio/directorConsolePage.js
```

### Task 2: Rebuild the primary sidebar around the five functions

Objective:
Make the sidebar describe the product workflow, not a generic page list.

Files:

- Modify: `tools/aiworkflow/studio/directorConsolePage.js`

Steps:

1. Keep `홈` at the top as Director Desk.
2. Render or manually order the five function buttons:

```text
스튜디오 대화
결정
실행 요청
결과 검토
기록함
```

3. Add a short muted line under primary nav:

```text
대화 → 결정 → 실행 요청 → 결과 검토 → 기록
```

4. Rename support toggles so they are clearly not normal workflow:

```text
참고/검증 자료
프로젝트/조직 참고
관리자 도구
```

5. Keep support pages hidden by default.

Verification:

- Browser home shows the five functions as the normal flow.
- Support/debug toggles do not look like required daily steps.

### Task 3: Redesign Home as Director Desk

Objective:
Home should answer: “What do I need to decide now?” and “Where should I go next?”

Files:

- Modify: `tools/aiworkflow/studio/directorConsolePage.js`

Steps:

1. Replace the current Home layout with three primary areas:

```text
A. Next Director Judgment
B. Director Workflow Cards
C. Current Result / Record Attention
```

2. The Next Director Judgment area should use existing decision queue/result data but show Director-facing labels only.
3. Add one card per first-class function using `DIRECTOR_FLOW` metadata.
4. Keep metrics/staff/runtime/recent activity hidden or moved below a collapsed support section.
5. Remove Home copy that implies direct task/runner/system operation.

Expected Home visual hierarchy:

```text
Human Director Desk
  내가 지금 판단할 것
  [next decision card]

  오늘의 흐름
  [Conversation] [Decision] [Execution Request] [Result Review] [Record Keeping]

  결과/기록 주의 항목
  [result review summary]
```

Verification:

- Home snapshot does not show Runner, WorkOrder, Backlog, raw task ID, registry, system status, or debug concepts in first view.
- Home provides clear entry points into all five functions.

### Task 4: Normalize page subtitles and empty states

Objective:
Each primary page should explain the Director decision it supports.

Files:

- Modify: `tools/aiworkflow/studio/directorConsolePage.js`
- Modify: `tools/aiworkflow/studio/studioSessionsPageRenderer.js`
- Modify: `tools/aiworkflow/studio/studioInboxPageRenderer.js`
- Modify: `tools/aiworkflow/studio/studioWorkPageRenderer.js`
- Modify: `tools/aiworkflow/studio/studioEvidencePageRenderer.js`
- Modify: `tools/aiworkflow/studio/studioKnowledgePageRenderer.js`

Steps:

1. Update subtitles in `PAGES` for the five functions.
2. Update each page's top copy so it starts with the Director decision supported by that page.
3. Update empty states:

```text
Conversation empty: “대화할 주제를 자연어로 입력하세요.”
Decision empty: “지금 승인/수정/보류할 항목이 없습니다.”
Execution Request empty: “아직 실행 요청이 없습니다. 대화나 결정에서 만들 수 있습니다.”
Result Review empty: “검토할 실행 결과가 없습니다.”
Record Keeping empty: “기록할 결정이나 지식 후보가 없습니다.”
```

4. Do not remove underlying IDs from code; only avoid foreground display where feasible.

Verification:

- Browser snapshots of the five primary pages show Director-facing empty states.
- No primary page teaches the user to manage raw IDs or internal queues as the normal path.

### Task 5: Demote secondary pages in routing and jumps

Objective:
Secondary pages should remain accessible but not be presented as the normal workflow.

Files:

- Modify: `tools/aiworkflow/studio/directorConsolePage.js`
- Possibly modify page renderers for operations/reference/internal pages if labels need adjustment.

Steps:

1. Ensure `setPage()` only auto-opens secondary nav groups when the user explicitly navigates there or when already in that group.
2. Avoid primary Home cards that jump directly to operations/debug pages unless the card is a result/evidence summary.
3. Change labels such as “전체 보기” on staff/runtime cards so they do not appear in the main Home flow.
4. Preserve direct access for maintenance.

Verification:

- Normal Home → five function page navigation does not automatically open support/debug nav groups.
- Support pages remain reachable through their collapsed toggles.

### Task 6: Smoke validation

Objective:
Verify the UI refactor without claiming runtime behavior changes.

Commands:

```text
node --check tools/aiworkflow/studio/directorConsolePage.js
node --check tools/aiworkflow/studio/studioSessionsPageRenderer.js
node --check tools/aiworkflow/studio/studioInboxPageRenderer.js
node --check tools/aiworkflow/studio/studioWorkPageRenderer.js
node --check tools/aiworkflow/studio/studioEvidencePageRenderer.js
node --check tools/aiworkflow/studio/studioKnowledgePageRenderer.js
```

If the server uses generated inline script, also extract and check served script:

```text
python - <<'PY'
import urllib.request, re, pathlib
s = urllib.request.urlopen('http://127.0.0.1:PORT/').read().decode('utf-8', errors='replace')
script = re.search(r'<script>([\s\S]*)</script>', s)
path = pathlib.Path('_Temp/studio_page_script_check.js')
path.parent.mkdir(exist_ok=True)
path.write_text(script.group(1) if script else '', encoding='utf-8')
print('generated script bytes', len(script.group(1)) if script else 0)
PY
node --check _Temp/studio_page_script_check.js
```

Run:

```text
git diff --check
node tools/aiworkflow/studio_director_console_server.js --host 127.0.0.1 --port 4317
```

Browser smoke:

- Open served Studio URL.
- Verify Home only shows Director Desk and five-function flow.
- Navigate to Conversation, Decision, Execution Request, Result Review, Record Keeping.
- Confirm only one page is visible at a time.
- Check browser console for obvious JS errors.
- Stop server.

### Task 7: Record results

Objective:
Preserve the implementation and validation evidence.

Files:

- Modify: `_DevLog/WorkLog/2026-06-04_Studio_North_Star_Scope_Correction.md` or create a new WorkLog if the implementation becomes large.
- Optionally update: `_Docs/Studio/README.md` if this plan becomes required reading.

Required record contents:

- Implementation summary
- Files changed
- UX behavior changed
- Validation commands run
- Validation results
- Remaining risks
- Next recommended goal
- Commit recommendation

## Acceptance Criteria

- Primary Studio flow is visibly centered on the five functions.
- Home reads as a Director Desk, not a workflow/runtime dashboard.
- The five primary pages explain the Director judgment or action they support.
- Operations/reference/internal pages remain available but are clearly secondary.
- No backend/API/schema/save-load/runtime policy changes are introduced.
- Existing Studio server starts.
- Browser smoke confirms Home and all five primary pages render without obvious broken layout.
- DOM inspection confirms only one page is visible at a time.
- `git diff --check` passes.
- WorkLog records the change and validation result.

## Expected Return Format

1. Implementation summary
2. Files changed
3. UX behavior changed
4. Validation commands run
5. Validation results
6. Remaining risks
7. Recommended next goal
8. Commit recommendation

## Recommended Next Goal After This

Goal 3 should be:

```text
Studio Internal Model/API Consolidation Plan
```

Goal 3 should not begin until this Director Surface Refactor is implemented and reviewed.

Goal 3 should handle internal concepts and API/data model concerns such as WorkOrder, Handoff, RoleRun, ToolRun, Materialization, Runner, route consolidation, and artifact taxonomy.

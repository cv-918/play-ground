# Studio Director Surface Smoke and Commit Preparation

## Date

2026-06-04

## Status

Prepared for Human Director commit decision.

No commit was created by this check.

## Goal

Run an integrated smoke, review, and commit-boundary pass over the Studio Director-facing refactor chain.

This goal verifies the current working tree state after these bounded Studio goals:

1. Studio Fast UX Containment
2. Studio Director Surface Refactor
3. Studio Internal Model/API Consolidation Plan
4. Studio Internal Model/API Inventory and Read-Only View Models
5. Studio UI Consume Director View Models
6. Studio Director API Alias Plan
7. Studio Director Read-Only API Aliases
8. Studio Server Port Fallback Listener Warning Fix

## Commit Boundary

### Include in Studio commit candidate

```text
_Docs/Studio/README.md
_Docs/Studio/Studio_Director_Workflow_Principles.md
_Docs/Studio/Personal_AI_Game_Development_Operating_Rules.md
_Docs/Studio/Personal_AI_Game_Development_Operating_System_North_Star.md
_Docs/Studio/Studio_Current_System_Diagnostic_2026-06-04.md
_Docs/Studio/Studio_Director_API_Alias_Plan_2026-06-04.md
_Docs/Studio/Studio_Director_Surface_Refactor_Plan_2026-06-04.md
_Docs/Studio/Studio_Internal_Model_API_Consolidation_Plan_2026-06-04.md
_Docs/Studio/Studio_Internal_Model_API_Inventory_2026-06-04.md
_Docs/Studio/Studio_Director_Surface_Smoke_and_Commit_Preparation_2026-06-04.md
_DevLog/WorkLog/2026-06-04_Studio_North_Star_Scope_Correction.md
tools/aiworkflow/studio/directorConsolePage.js
tools/aiworkflow/studio/studioApiHandlers.js
tools/aiworkflow/studio/studioClientWorkflowResultScript.js
tools/aiworkflow/studio/studioDiffPageRenderer.js
tools/aiworkflow/studio/studioEvidencePageRenderer.js
tools/aiworkflow/studio/studioInboxPageRenderer.js
tools/aiworkflow/studio/studioKnowledgePageRenderer.js
tools/aiworkflow/studio/studioSessionsPageRenderer.js
tools/aiworkflow/studio/studioWorkPageRenderer.js
tools/aiworkflow/studio/directorConsoleDirectorViews.test.js
tools/aiworkflow/studio/studioDirectorApiAliases.js
tools/aiworkflow/studio/studioDirectorApiAliases.test.js
tools/aiworkflow/studio/studioDirectorViewModels.js
tools/aiworkflow/studio/studioDirectorViewModels.test.js
tools/aiworkflow/studio/studioServerPortFallback.test.js
tools/aiworkflow/studio_director_console_server.js
```

### Exclude from Studio commit candidate

Pre-existing Handoff changes remain outside this Studio commit boundary:

```text
_Docs/Handoff/Dashboard.md
_Docs/Handoff/Queues/Artist.md
_Docs/Handoff/Queues/Developer.md
_Docs/Handoff/Queues/Planner.md
_Docs/Handoff/Queues/QA.md
_Docs/Handoff/Queues/Reviewer.md
_Docs/Handoff/Violations/Open.md
```

## Static Scan

Security/static scan was run over Studio documentation and Studio JavaScript source for obvious hardcoded secrets and dangerous execution patterns.

Patterns checked included:

```text
api_key / secret / password / token / passwd assignments
eval()
exec()
os.system()
subprocess shell=True
pickle.loads()
```

Result:

```text
No matches found in the Studio target paths.
```

## Independent Review

An independent review subagent inspected the Studio-related changed files and avoided `_Docs/Handoff/*`.

Verdict:

```text
passed: true
security_concerns: []
logic_errors: []
```

Non-blocking suggestions:

```text
- Consider adding a small test that asserts /api/director/* aliases are wired through createStudioApiHandler, not only the alias handler unit itself.
- Consider adding href-scheme/path assertions for renderDirectorViewCard/director_views items.
- Consider updating Studio_Director_API_Alias_Plan_2026-06-04.md status language if it should describe implemented endpoint state rather than remain a pre-implementation plan.
```

## Validation Commands

Executed:

```text
node tools/aiworkflow/studio/studioDirectorApiAliases.test.js
node tools/aiworkflow/studio/studioDirectorViewModels.test.js
node tools/aiworkflow/studio/directorConsoleDirectorViews.test.js
node --check tools/aiworkflow/studio/studioDirectorApiAliases.js
node --check tools/aiworkflow/studio/studioDirectorApiAliases.test.js
node --check tools/aiworkflow/studio/studioDirectorViewModels.js
node --check tools/aiworkflow/studio/studioDirectorViewModels.test.js
node --check tools/aiworkflow/studio/directorConsoleDirectorViews.test.js
node --check tools/aiworkflow/studio/directorConsolePage.js
node --check tools/aiworkflow/studio/studioApiHandlers.js
node --check tools/aiworkflow/studio_director_console_server.js
node tools/aiworkflow/studio_director_console_server.js --once > _Temp/studio_summary_check.json
```

Results:

```text
studioDirectorApiAliases tests passed
studioDirectorViewModels tests passed
director console director_views consumption test passed
```

Summary assertion:

```text
summary director_views ok {
  conversation_records: 0,
  decision_items: 0,
  execution_requests: 0,
  result_review_items: 10,
  record_items: 24
}
```

## Live Server Smoke

Server command:

```text
node tools/aiworkflow/studio_director_console_server.js --host 127.0.0.1 --port 4317
```

Observed server URL:

```text
http://127.0.0.1:4326/
```

Observed server startup warning:

```text
MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 listening listeners added to [Server]. MaxListeners is 10.
```

This warning was fixed by the follow-up `Studio Server Port Fallback Listener Warning Fix` goal before commit.

Follow-up validation observed the server at the requested URL:

```text
http://127.0.0.1:4317/
```

No `MaxListenersExceededWarning` was emitted after the fix.

## API Smoke

Fetched:

```text
/api/summary
/api/director/conversations
/api/director/decisions
/api/director/execution-requests
/api/director/result-reviews
/api/director/records
/api/director/records?source_type=devlog&limit=2
```

Observed counts:

```text
summary director_views:
  conversation_records: 0
  decision_items: 0
  execution_requests: 0
  result_review_items: 10
  record_items: 24

/api/director/conversations: 0
/api/director/decisions: 0
/api/director/execution-requests: 0
/api/director/result-reviews: 10
/api/director/records: 24
/api/director/records?source_type=devlog&limit=2: 2
```

## Browser Smoke

Browser opened:

```text
http://127.0.0.1:4326/
```

Primary pages checked:

```text
home -> Director Desk
sessions -> 스튜디오 대화
inbox -> 결정
work -> 실행 요청
evidence -> 결과 검토
knowledge -> 기록함
```

Visible-page assertion:

```text
Each checked navigation state showed exactly one visible primary page.
```

Director card counts observed:

```text
home: 0
sessions: 0
inbox: 0
work: 0
evidence: 10
knowledge: 24
```

Browser endpoint fetches confirmed all five `/api/director/*` endpoints returned `ok: true`.

Browser console:

```text
console_messages: []
js_errors: []
```

Server process was stopped after validation.

## Remaining Risks

### Port fallback and listener warning

The server still does not bind to the requested port directly in this environment.

Observed:

```text
requested_port: 4317
actual_url: http://127.0.0.1:4326/
port_fallback_used: yes
MaxListenersExceededWarning during startup
```

This is not a blocking issue for the Director surface commit, because the UI and API smoke passed, but it should be tracked as a future technical cleanup.

### Empty normalized arrays

Current data had empty normalized arrays for:

```text
conversation_records
decision_items
execution_requests
```

The UI rendered safe empty/fallback states. This is acceptable for this commit, but richer seeded data would improve future smoke coverage.

### Non-blocking test suggestions

Independent review suggested adding extra tests for dispatcher-level alias wiring and href/path expectations. Current unit, server, and browser smoke cover the implemented behavior, so these are non-blocking.

## Commit Recommendation

Recommended commit style:

```text
feat: align Studio with Director-facing workflow
```

Alternative:

```text
refactor: align Studio around Director workflow
```

Do not commit automatically. The Human Director should decide whether to commit.

If committing, stage only the Studio commit candidate files and exclude `_Docs/Handoff/*`.

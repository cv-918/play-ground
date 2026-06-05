# Studio Internal Model/API Inventory

## Date

2026-06-04

## Status

Read-only inventory for the approved `Studio Internal Model/API Inventory and Read-Only View Models` goal.

No API behavior, JSON schema, persisted folder, runtime policy, or build setting is changed by this document.

## JavaScript Surface

- Studio JS files inspected: 40
- API route modules inspected: 7

## Persisted Artifact Compatibility Map

| Folder | Current artifact | Director classification |
|---|---|---|
| `_Docs/AIWorkflow/Studio/DirectorGoals/` | `DirectorGoalPlan` | Decision candidate / goal planning |
| `_Docs/AIWorkflow/Studio/MeetingSessions/` | `MeetingSession` | Conversation compatibility artifact |
| `_Docs/AIWorkflow/Studio/WorkOrders/` | `WorkOrder` | Execution Request compatibility artifact |
| `_Docs/AIWorkflow/Studio/Handoffs/` | `Handoff` | Internal assignment detail |
| `_Docs/AIWorkflow/Studio/ContextPackets/` | `ContextPacket` | Internal worker context |
| `_Docs/AIWorkflow/Studio/RoleRuns/` | `RoleRun` | Internal/evidence run artifact |
| `_Docs/AIWorkflow/Studio/ToolRuns/` | `ToolRunRequest` | Admin/internal automation request |
| `_Docs/AIWorkflow/Studio/Materializations/` | `Materialization` | Internal bridge/audit artifact |
| `_Docs/AIWorkflow/Studio/Proposals/` | `Proposal` | Decision candidate |
| `_Docs/AIWorkflow/Studio/Decisions/` | `Decision` | Durable Director decision |
| `_Docs/AIWorkflow/Studio/MemoryRecords/` | `MemoryRecord` | Record Keeping item |

## API Route Module Inventory

### `tools/aiworkflow/studio\studioApiHandlers.js`

- `if (req.method === "GET" && parsedUrl.pathname === "/api/summary") {`

### `tools/aiworkflow/studio\studioEvidenceReviewApiRoutes.js`

- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/project/execution-plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/model/routing-plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/completion/decision-plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/completion/evidence-checklist") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/automation/readiness-plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/approval/impact-plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/ui/surface-map") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/traceability/map") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/recovery/plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/smoke/eval-plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/smoke/status") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/company/runtime-readiness") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/staff/operating-plan") {`

### `tools/aiworkflow/studio\studioKnowledgeDecisionApiRoutes.js`

- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/proposal/create") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/decision/create") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/memory/create") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/proposal/create-decision") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/knowledge/transition-plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/knowledge/canon-conflict-report") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/decision/create-memory") {`

### `tools/aiworkflow/studio\studioPlanningMeetingApiRoutes.js`

- `if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/inspect") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/handoff") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/start") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/finalize") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/create") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/create") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/director-goal/plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/director-goal/store") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/director-goal/create-bundle") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/add-turn") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/create-workorder") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/create-decision") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/facilitation-plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/board") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/runbook") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/agent-turn-plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/agent-turn-run") {`

### `tools/aiworkflow/studio\studioToolAutomationApiRoutes.js`

- `if (req.method === "GET" && parsedUrl.pathname === "/api/toolbox/catalog") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/toolbox/run") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/dashboard/export") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/handoff/plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/handoff/execute") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/output/materialize-plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/output/materialize") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/staff-run/cleanup") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/review-packet/export") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/materialization/review-plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/materialization/review-record") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/workorder/plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/workorder/create") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/toolrun/plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/toolrun/create") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/toolrun/plan-file") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/automation/status") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/automation/validate") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/automation/test") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/automation/test-write") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/automation/replay") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/automation/repair") {`

### `tools/aiworkflow/studio\studioWorkOrderApiRoutes.js`

- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/create") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/completion/create-fix-workorder") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/handoff-plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/context-plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/context-create") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/staff-plan") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/staff-run") {`

### `tools/aiworkflow/studio\studioWorkflowApiRoutes.js`

- `if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/intake") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/finalize") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/task/approve-start") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/git/commit") {`
- `if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/git/push") {`

## Internal Term Concentration

Top files by compatibility/internal terminology count:

- `tools/aiworkflow/studio\studioActionPayloadBuilders.js` — 187 (Decision:57, DirectorGoalPlan:3, Handoff:13, MeetingSession:8, Proposal:54, StaffRun:2, ToolRunRequest:2, WorkOrder:48)
- `tools/aiworkflow/studio\studioOperationalPlanBuilders.js` — 169 (ActiveTask:7, Completion:25, ContextPacket:1, Decision:38, DirectorGoalPlan:1, Finalization:4, Handoff:4, Materialization:4, MeetingSession:1, Proposal:30, RoleRun:2, Runner:30, StaffRun:2, ToolRunRequest:3, WorkOrder:17)
- `tools/aiworkflow/studio\studioWorkflowReviewPlanBuilders.js` — 134 (ActiveTask:2, Completion:33, Decision:48, Finalization:5, Handoff:3, Proposal:15, Runner:25, WorkOrder:3)
- `tools/aiworkflow/studio\studioClientWorkflowResultScript.js` — 107 (Completion:52, Decision:30, Finalization:12, Materialization:5, ReviewPacket:3, Runner:4, WorkOrder:1)
- `tools/aiworkflow/studio\studioDocumentDataLoaders.js` — 67 (ContextPacket:4, Decision:9, DirectorGoalPlan:2, Handoff:12, Materialization:6, MeetingSession:2, Proposal:15, ReviewPacket:2, StaffRun:2, ToolRunRequest:2, WorkOrder:11)
- `tools/aiworkflow/studio\studioClientGenericResultScript.js` — 66 (ActiveTask:1, Completion:6, Decision:20, Finalization:6, Handoff:17, Materialization:6, Proposal:2, Runner:3, WorkOrder:5)
- `tools/aiworkflow/studio\studioDirectorViewModels.js` — 45 (Completion:1, Decision:18, DirectorGoalPlan:1, Proposal:6, ReviewPacket:1, Runner:1, StaffRun:1, WorkOrder:16)
- `tools/aiworkflow/studio\studioDataService.js` — 33 (Completion:1, ContextPacket:2, Decision:2, DirectorGoalPlan:2, Handoff:14, Materialization:2, Proposal:2, ReviewPacket:2, StaffRun:2, ToolRunRequest:2, WorkOrder:2)
- `tools/aiworkflow/studio\studioDirectorViewModels.test.js` — 29 (Decision:13, MeetingSession:2, Proposal:10, ReviewPacket:1, WorkOrder:3)
- `tools/aiworkflow/studio\artifactRenderer.js` — 22 (Completion:9, Decision:7, Proposal:1, Runner:5)
- `tools/aiworkflow/studio\studioKnowledgePageRenderer.js` — 19 (Decision:11, Proposal:8)
- `tools/aiworkflow/studio\studioSessionsPageRenderer.js` — 3 (Decision:2, DirectorGoalPlan:1)
- `tools/aiworkflow/studio\studioEvidencePageRenderer.js` — 3 (Completion:2, Decision:1)
- `tools/aiworkflow/studio\studioWorkPageRenderer.js` — 2 (Handoff:1, WorkOrder:1)
- `tools/aiworkflow/studio\studioRunsPageRenderer.js` — 2 (ContextPacket:1, Materialization:1)
- `tools/aiworkflow/studio\studioMeetingsPageRenderer.js` — 2 (MeetingSession:2)
- `tools/aiworkflow/studio\studioToolboxService.js` — 1 (ActiveTask:1)
- `tools/aiworkflow/studio\studioSystemsPageRenderer.js` — 1 (ToolRunRequest:1)
- `tools/aiworkflow/studio\studioInboxPageRenderer.js` — 1 (Decision:1)
- `tools/aiworkflow/studio\studioGoalsPageRenderer.js` — 1 (DirectorGoalPlan:1)

## Read-Only View Model Boundary

The approved implementation adds read-only Director view models while preserving existing storage and routes:

| Director view model | Compatibility sources |
|---|---|
| `ConversationRecord` | `MeetingSession` |
| `DecisionItem` | `Proposal`, `DirectorGoalPlan` approval/candidate data |
| `ExecutionRequest` | `WorkOrder` |
| `ResultReviewItem` | `ReviewPacket`, `StaffRun` evidence |
| `RecordItem` | `Decision`, `DevLog`, `MemoryRecord` |

## Non-Changes

- Existing route modules remain active.
- Existing JSON field names remain unchanged.
- Existing persisted folders remain unchanged.
- Runtime execution, git, commit, push, and build policies are unchanged.
- This inventory is not a migration plan.

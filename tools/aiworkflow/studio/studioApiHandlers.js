#!/usr/bin/env node
"use strict";

const path = require("path");

function createStudioApiHandler(deps = {}) {
  const {
    buildApprovalImpactPlan,
    buildAutomationReadinessPlan,
    buildCanonConflictReport,
    buildCompletionDecisionPlan,
    buildCompletionEvidenceChecklist,
    buildDecisionFromMeetingPayload,
    buildDecisionFromProposalPayload,
    buildDecisionPayload,
    buildDirectorGoalPlanPayload,
    buildDirectorSurfaceMap,
    buildKnowledgeTransitionPlan,
    buildMeetingAgentTurnWorkOrder,
    buildMeetingBoard,
    buildMeetingFacilitationPlan,
    buildMeetingPayload,
    buildMeetingRunbook,
    buildMemoryFromDecisionPayload,
    buildMemoryPayload,
    buildModelRoutingPlan,
    buildProjectExecutionPlan,
    buildProposalPayload,
    buildStaffOperatingPlan,
    buildStudioEvalPlan,
    buildStudioRecoveryPlan,
    buildStudioSmokeReport,
    buildToolboxCatalog,
    buildToolRunRequestPayload,
    buildTraceabilityMap,
    buildWorkOrderFromMeetingPayload,
    buildWorkOrderHandoffPlan,
    buildWorkOrderPayload,
    cleanupTemporaryStaffRun,
    commitSelectedFiles,
    extractMeetingTurnFromStaffRun,
    getConditionalAutomation,
    getSummary,
    getWorkflowCore,
    importDiscordService,
    readRequestJson,
    readStudioRecordFromBody,
    repoPath,
    requireStudioText,
    resolveMeetingAgent,
    resolveWorkOrderAgent,
    runTool,
    runToolboxTool,
    safeResolveReadable,
    safeWorkflowId,
    sendJson,
    slash,
    studioServiceConfig,
    stringList,
    pushCurrentBranch,
    writeStudioRecord,
    writeTempStudioInput,
    writeTempStudioText,
  } = deps;

  return async function handleApi(repoRoot, req, res, parsedUrl, serverContext = {}) {
  if (req.method === "GET" && parsedUrl.pathname === "/api/summary") {
    return sendJson(res, 200, await getSummary(repoRoot));
  }

  if (req.method === "GET" && parsedUrl.pathname === "/api/toolbox/catalog") {
    return sendJson(res, 200, { ok: true, toolbox: buildToolboxCatalog(repoRoot) });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/toolbox/run") {
    const body = await readRequestJson(req);
    const result = await runToolboxTool(repoRoot, String(body.tool_id || ""), {
      ...serverContext,
      data_version: body.data_version || "",
    });
    return sendJson(res, result.ok ? 200 : 500, result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/dashboard/export") {
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_dashboard_export.bat");
    const result = await runTool(repoRoot, bat, ["--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/handoff/plan") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_staff_pipeline.bat");
    const result = await runTool(repoRoot, bat, ["handoff", body.path, "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/handoff/execute") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const model = body.model || "gpt-5.5";
    const reasoning = body.reasoning || "high";
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_staff_pipeline.bat");
    const args = [
      "handoff",
      body.path,
      "--execute",
      "--context-store-path",
      "_Temp/AIWorkflowStudio/console_contexts",
      "--model",
      model,
      "--reasoning",
      reasoning,
      "--timeout-seconds",
      "900",
      "--ephemeral",
      "--json",
    ];
    const result = await runTool(repoRoot, bat, args, 20 * 60 * 1000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/output/materialize-plan") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_output_materializer.bat");
    const result = await runTool(repoRoot, bat, ["plan", body.path, "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/output/materialize") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_output_materializer.bat");
    const result = await runTool(repoRoot, bat, ["materialize", body.path, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/staff-run/cleanup") {
    const body = await readRequestJson(req);
    const result = await cleanupTemporaryStaffRun(repoRoot, body.path || "");
    return sendJson(res, 200, result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/review-packet/export") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_review_packet_exporter.bat");
    const result = await runTool(repoRoot, bat, ["export", body.path, "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/materialization/review-plan") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const decision = body.decision || "approve";
    const target = body.target || "all";
    const reason = body.reason || "StudioConsolePlan";
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_materialization_review.bat");
    const result = await runTool(repoRoot, bat, ["plan", body.path, "--decision", decision, "--target", target, "--reason", reason, "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/materialization/review-record") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const decision = body.decision || "approve";
    const target = body.target || "all";
    const reason = body.reason || "StudioConsole";
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_materialization_review.bat");
    const result = await runTool(repoRoot, bat, ["record", body.path, "--decision", decision, "--target", target, "--reason", reason, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/workorder/plan") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_workorder_planner.bat");
    const result = await runTool(repoRoot, bat, ["plan", body.path, "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/workorder/create") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_workorder_planner.bat");
    const result = await runTool(repoRoot, bat, ["create", body.path, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/toolrun/plan") {
    const body = await readRequestJson(req);
    const payload = buildToolRunRequestPayload(body);
    const inputPath = await writeTempStudioInput(repoRoot, "toolrun-request", payload);
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_tool_run_planner.bat");
    const result = await runTool(repoRoot, bat, ["plan", inputPath, "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, { ...(result.json || result), input_path: inputPath });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/toolrun/create") {
    const body = await readRequestJson(req);
    const payload = buildToolRunRequestPayload(body);
    const inputPath = await writeTempStudioInput(repoRoot, "toolrun-request", payload);
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_tool_run_planner.bat");
    const result = await runTool(repoRoot, bat, ["create", inputPath, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, { ...(result.json || result), input_path: inputPath });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/toolrun/plan-file") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_tool_run_planner.bat");
    const result = await runTool(repoRoot, bat, ["plan", body.path, "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/automation/status") {
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_conditional_automation.bat");
    const result = await runTool(repoRoot, bat, ["status", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/automation/validate") {
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_conditional_automation.bat");
    const result = await runTool(repoRoot, bat, ["validate", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/automation/test") {
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_conditional_automation.bat");
    const result = await runTool(repoRoot, bat, ["test", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/automation/test-write") {
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_conditional_automation.bat");
    const result = await runTool(repoRoot, bat, ["test", "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/automation/replay") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_conditional_automation.bat");
    const result = await runTool(repoRoot, bat, ["replay", body.path, "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/automation/repair") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_conditional_automation.bat");
    const result = await runTool(repoRoot, bat, ["repair-plan", body.path, "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/inspect") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
    const result = await runTool(repoRoot, bat, ["inspect", body.path, "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/handoff") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
    const result = await runTool(repoRoot, bat, ["handoff", body.path, "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/start") {
    const body = await readRequestJson(req);
    const meetingId = String(body.meeting_id || "");
    if (!/^[A-Za-z0-9_.:-]+$/.test(meetingId)) {
      throw new Error("Invalid meeting_id.");
    }
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
    const result = await runTool(repoRoot, bat, ["start", meetingId, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/finalize") {
    const body = await readRequestJson(req);
    const meetingId = String(body.meeting_id || "");
    if (!/^[A-Za-z0-9_.:-]+$/.test(meetingId)) {
      throw new Error("Invalid meeting_id.");
    }
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
    const result = await runTool(repoRoot, bat, ["finalize", meetingId, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/create") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
    const result = await runTool(repoRoot, bat, ["create", body.path, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/create") {
    const body = await readRequestJson(req);
    const payload = buildMeetingPayload(body);
    const inputPath = await writeTempStudioInput(repoRoot, "meeting", payload);
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
    const result = await runTool(repoRoot, bat, ["create", inputPath, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/director-goal/plan") {
    const body = await readRequestJson(req);
    const payload = buildDirectorGoalPlanPayload(body);
    return sendJson(res, 200, {
      ok: true,
      director_goal_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/director-goal/store") {
    const body = await readRequestJson(req);
    const payload = buildDirectorGoalPlanPayload(body);
    const record = await writeStudioRecord(repoRoot, "_Docs/AIWorkflow/Studio/DirectorGoals", payload.director_goal_plan_id, payload);
    return sendJson(res, 200, {
      ok: true,
      director_goal_plan: payload,
      path: record.path,
      href: record.href,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/director-goal/create-bundle") {
    const body = await readRequestJson(req);
    const payload = buildDirectorGoalPlanPayload(body);
    const goalRecord = await writeStudioRecord(repoRoot, "_Docs/AIWorkflow/Studio/DirectorGoals", payload.director_goal_plan_id, payload);
    const results = {
      director_goal_plan: goalRecord,
      meetings: [],
      work_orders: [],
      proposals: [],
    };

    const meetingBat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
    for (const meeting of payload.meeting_recommendations || []) {
      const inputPath = await writeTempStudioInput(repoRoot, "meeting", meeting);
      const result = await runTool(repoRoot, meetingBat, ["create", inputPath, "--execute", "--json"], 120000);
      results.meetings.push(result.json || result);
      if (!result.ok) return sendJson(res, 500, { ok: false, stage: "meeting", results, error: result.json || result });
    }

    const workOrderBat = repoPath(repoRoot, "tools/aiworkflow/studio_workorder_planner.bat");
    for (const workOrder of payload.work_order_candidates || []) {
      const inputPath = await writeTempStudioInput(repoRoot, "workorder", workOrder);
      const result = await runTool(repoRoot, workOrderBat, ["store", inputPath, "--execute", "--json"], 120000);
      results.work_orders.push(result.json || result);
      if (!result.ok) return sendJson(res, 500, { ok: false, stage: "work_order", results, error: result.json || result });
    }

    const decisionBat = repoPath(repoRoot, "tools/aiworkflow/studio_decision_store.bat");
    for (const proposal of payload.proposal_candidates || []) {
      const inputPath = await writeTempStudioInput(repoRoot, "proposal", proposal);
      const result = await runTool(repoRoot, decisionBat, ["create-proposal", inputPath, "--execute", "--json"], 120000);
      results.proposals.push(result.json || result);
      if (!result.ok) return sendJson(res, 500, { ok: false, stage: "proposal", results, error: result.json || result });
    }

    return sendJson(res, 200, {
      ok: true,
      director_goal_plan: payload,
      results,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/add-turn") {
    const body = await readRequestJson(req);
    const meetingId = String(body.meeting_id || "").trim();
    const speakerId = String(body.speaker_id || "").trim();
    const turnType = String(body.turn_type || "synthesis").trim();
    const content = requireStudioText(body.content, "turn content");
    if (!/^[A-Za-z0-9_.:-]+$/u.test(meetingId)) throw new Error("Invalid meeting_id.");
    if (!/^[A-Za-z0-9_.:-]+$/u.test(speakerId)) throw new Error("Invalid speaker_id.");
    const contentPath = await writeTempStudioText(repoRoot, "meeting-turn", content);
    const ps1 = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.ps1");
    const result = await runTool(repoRoot, "powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      ps1,
      "-RepoRoot",
      repoRoot,
      "add-turn",
      meetingId,
      speakerId,
      turnType,
      "--content-file",
      contentPath,
      "--execute",
      "--json",
    ], 120000);
    if (result.json?.ok && result.json?.turn) {
      result.json.turn.content = content;
    }
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/create") {
    const body = await readRequestJson(req);
    const payload = buildWorkOrderPayload(body);
    const inputPath = await writeTempStudioInput(repoRoot, "workorder", payload);
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_workorder_planner.bat");
    const result = await runTool(repoRoot, bat, ["store", inputPath, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/completion/create-fix-workorder") {
    const core = await getWorkflowCore(repoRoot);
    const task = core.active_task || {};
    const completion = core.completion || {};
    const verification = core.verification || {};
    const finalization = core.finalization || {};
    if (!task.task_id) {
      return sendJson(res, 400, {
        ok: false,
        command: "store",
        error: "No active task is available for a completion fix WorkOrder.",
        safety: { workorder_written: false, source_changed: false, task_state_changed: false, git_changed: false },
      });
    }
    if (!completion.path) {
      return sendJson(res, 400, {
        ok: false,
        command: "store",
        error: "No CompletionReport is available for the active task.",
        safety: { workorder_written: false, source_changed: false, task_state_changed: false, git_changed: false },
      });
    }
    const concernLines = stringList(completion.remaining_concerns).slice(0, 12);
    const warningLines = stringList(completion.remaining_warnings).slice(0, 8);
    const objective = `Resolve completion review changes for ${task.task_id}: ${task.title || "active task"}`;
    const scopeLines = [
      `Review CompletionReport ${completion.id || path.basename(completion.path, ".json")}.`,
      `Resolve only the issues that caused the current completion review to require changes.`,
      ...concernLines.map((item) => `Concern: ${String(item)}`),
      ...(!concernLines.length && warningLines.length ? warningLines.map((item) => `Warning to check: ${String(item)}`) : []),
      "After the fix, regenerate the relevant verification and completion evidence before final completion.",
    ];
    const payload = buildWorkOrderPayload({
      objective,
      department_id: "engineering",
      assigned_agents: "tools_engineer\nqa_tester",
      status: "director_review",
      scope: scopeLines.join("\n"),
      non_goals: [
        "Do not mark the task done from this WorkOrder.",
        "Do not commit or push from this WorkOrder.",
        "Do not expand beyond the recorded completion review concerns.",
        "Do not change schema, save/load, runtime, source, or data behavior without the normal Human Director approval gate.",
      ].join("\n"),
      expected_outputs: [
        "Focused fix scope for the completion review concerns.",
        "Updated verification evidence after the fix is performed.",
        "New CompletionReport/CompletionCard for Human Director review.",
      ].join("\n"),
      approval_summary: `Approve creating a focused follow-up WorkOrder for ${task.task_id}. This does not approve implementation, task done, commit, or push.`,
      files_or_memory_affected: [
        task.task_id,
        completion.path,
        verification.path,
        finalization.path,
      ].filter(Boolean).join("\n"),
      risks: [
        "The previous completion result must not be accepted again without a new fix and new evidence.",
        "Any actual source/data/runtime change still requires the normal approval and validation flow.",
      ].join("\n"),
      rollback_plan: "Delete or supersede this Studio WorkOrder if the follow-up scope is not needed.",
      evidence_requirements: [
        completion.path,
        verification.path,
        finalization.path,
      ].filter(Boolean).join("\n"),
      verification_plan: [
        "Confirm the previous completion review concerns are addressed or explicitly reclassified.",
        "Confirm no unrelated files changed.",
        "Regenerate VerificationReport and CompletionReport before final completion.",
      ].join("\n"),
      handoff_plan: [
        "Human Director reviews this WorkOrder.",
        "If accepted, convert it into the normal task/runner flow or hand it to an approved staff run.",
      ].join("\n"),
    });
    payload.source_type = "completion_review";
    payload.source_ref = completion.id || task.task_id;
    const inputPath = await writeTempStudioInput(repoRoot, "completion_fix_workorder", payload);
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_workorder_planner.bat");
    const result = await runTool(repoRoot, bat, ["store", inputPath, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/proposal/create") {
    const body = await readRequestJson(req);
    const payload = buildProposalPayload(body);
    const inputPath = await writeTempStudioInput(repoRoot, "proposal", payload);
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_decision_store.bat");
    const result = await runTool(repoRoot, bat, ["create-proposal", inputPath, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/decision/create") {
    const body = await readRequestJson(req);
    const payload = buildDecisionPayload(body);
    const inputPath = await writeTempStudioInput(repoRoot, "decision", payload);
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_decision_store.bat");
    const result = await runTool(repoRoot, bat, ["create-decision", inputPath, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/memory/create") {
    const body = await readRequestJson(req);
    const payload = buildMemoryPayload(body);
    const inputPath = await writeTempStudioInput(repoRoot, "memory", payload);
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_memory_store.bat");
    const result = await runTool(repoRoot, bat, ["create", inputPath, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/create-workorder") {
    const body = await readRequestJson(req);
    const { json: meeting } = await readStudioRecordFromBody(repoRoot, body, "meeting");
    const payload = buildWorkOrderFromMeetingPayload(meeting);
    const inputPath = await writeTempStudioInput(repoRoot, "workorder_from_meeting", payload);
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_workorder_planner.bat");
    const result = await runTool(repoRoot, bat, ["store", inputPath, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/create-decision") {
    const body = await readRequestJson(req);
    const { json: meeting } = await readStudioRecordFromBody(repoRoot, body, "meeting");
    const payload = buildDecisionFromMeetingPayload(meeting, String(body.decision_type || "approve").trim() || "approve");
    const inputPath = await writeTempStudioInput(repoRoot, "decision_from_meeting", payload);
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_decision_store.bat");
    const result = await runTool(repoRoot, bat, ["create-decision", inputPath, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/facilitation-plan") {
    const body = await readRequestJson(req);
    const { json: meeting } = await readStudioRecordFromBody(repoRoot, body, "meeting");
    const payload = buildMeetingFacilitationPlan(meeting);
    return sendJson(res, 200, {
      ok: true,
      meeting_facilitation_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/board") {
    const body = await readRequestJson(req);
    const { json: meeting } = await readStudioRecordFromBody(repoRoot, body, "meeting");
    const payload = buildMeetingBoard(meeting);
    return sendJson(res, 200, {
      ok: true,
      meeting_board: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/runbook") {
    const body = await readRequestJson(req);
    const { json: meeting } = await readStudioRecordFromBody(repoRoot, body, "meeting");
    const payload = buildMeetingRunbook(meeting);
    return sendJson(res, 200, {
      ok: true,
      meeting_runbook: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/agent-turn-plan") {
    const body = await readRequestJson(req);
    const { json: meeting } = await readStudioRecordFromBody(repoRoot, body, "meeting");
    const agentId = resolveMeetingAgent(meeting, body.agent_id);
    const workOrder = buildMeetingAgentTurnWorkOrder(meeting, agentId);
    const workOrderPath = await writeTempStudioInput(repoRoot, "meeting_turn_workorder", workOrder);
    const contextScript = repoPath(repoRoot, "tools/aiworkflow/studio_context_builder.ps1");
    const contextResult = await runTool(repoRoot, "powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", contextScript, "-RepoRoot", repoRoot, "plan", agentId, workOrderPath, "--memory-query", meeting.topic || "", "--json"], 120000);
    if (!contextResult.ok || !contextResult.json?.context_packet) {
      return sendJson(res, 200, {
        ok: true,
        meeting_id: meeting.meeting_id || "",
        agent_id: agentId,
        work_order_path: workOrderPath,
        context_available: false,
        staff_plan: {
          ok: false,
          status: "context_unavailable",
          current_meaning: "직원 발언 계획에 필요한 문맥 묶음을 만들지 못했습니다. 회의 기록은 유지되며, canon/task/git은 바뀌지 않았습니다.",
          next_actions: [
            "회의를 계속하려면 내 의견 기록을 사용하세요.",
            "AI 직원 발언이 필요하면 직원 registry와 context builder 상태를 먼저 확인하세요.",
          ],
          error: contextResult.stderr || contextResult.stdout || "context builder plan failed",
        },
        safety: {
          meeting_turn_written: false,
          source_changed: false,
          task_state_changed: false,
          git_changed: false,
        },
      });
    }
    const contextPath = await writeTempStudioInput(repoRoot, "context_packet", contextResult.json.context_packet);
    const staffExecutor = repoPath(repoRoot, "tools/aiworkflow/studio_staff_executor.bat");
    const staffPlan = await runTool(repoRoot, staffExecutor, ["plan", contextPath, "--model", body.model || "gpt-5.5", "--reasoning", body.reasoning || "high", "--ephemeral", "--json"], 120000);
    const safeStaffPlan = staffPlan.ok
      ? (staffPlan.json || staffPlan)
      : {
          ok: false,
          status: "executor_plan_unavailable",
          current_meaning: "직원 실행 계획을 만들지 못했습니다. 회의 기록과 문맥 묶음은 준비됐지만, 직원 실행 도구 쪽 점검이 필요합니다.",
          next_actions: [
            "회의를 계속하려면 내 의견 기록을 사용하세요.",
            "AI 직원 발언이 꼭 필요하면 staff executor 상태를 먼저 확인하세요.",
          ],
          error: staffPlan.stderr || staffPlan.stdout || "staff executor plan failed",
        };
    return sendJson(res, 200, {
      ok: true,
      meeting_id: meeting.meeting_id || "",
      agent_id: agentId,
      work_order_path: workOrderPath,
      context_path: contextPath,
      context_packet: contextResult.json.context_packet,
      staff_plan: safeStaffPlan,
      executor_plan_available: staffPlan.ok,
      safety: {
        meeting_turn_written: false,
        source_changed: false,
        task_state_changed: false,
        git_changed: false,
      },
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/agent-turn-run") {
    const body = await readRequestJson(req);
    const { json: meeting, relativePath } = await readStudioRecordFromBody(repoRoot, body, "meeting");
    const beforeTurnCount = Array.isArray(meeting.discussion_turns) ? meeting.discussion_turns.length : 0;
    const agentId = resolveMeetingAgent(meeting, body.agent_id);
    const workOrder = buildMeetingAgentTurnWorkOrder(meeting, agentId);
    const workOrderPath = await writeTempStudioInput(repoRoot, "meeting_turn_workorder", workOrder);
    const contextScript = repoPath(repoRoot, "tools/aiworkflow/studio_context_builder.ps1");
    const contextResult = await runTool(repoRoot, "powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", contextScript, "-RepoRoot", repoRoot, "plan", agentId, workOrderPath, "--memory-query", meeting.topic || "", "--json"], 120000);
    if (!contextResult.ok || !contextResult.json?.context_packet) {
      return sendJson(res, 500, contextResult.json || contextResult);
    }
    const contextPath = await writeTempStudioInput(repoRoot, "context_packet", contextResult.json.context_packet);
    const staffExecutor = repoPath(repoRoot, "tools/aiworkflow/studio_staff_executor.bat");
    const staffRun = await runTool(repoRoot, staffExecutor, ["run", contextPath, "--execute", "--model", body.model || "gpt-5.5", "--reasoning", body.reasoning || "high", "--timeout-seconds", "900", "--ephemeral", "--json"], 20 * 60 * 1000);
    const runJson = staffRun.json || {};
    let turnResult = null;
    const canAppendTurn = slash(relativePath).startsWith("_Docs/AIWorkflow/Studio/MeetingSessions/");
    const turnContent = staffRun.ok ? extractMeetingTurnFromStaffRun(repoRoot, runJson) : "";
    if (canAppendTurn && turnContent) {
      const turnContentPath = await writeTempStudioText(repoRoot, "meeting-agent-turn", turnContent);
      const meetingScript = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.ps1");
      const turn = await runTool(repoRoot, "powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        meetingScript,
        "-RepoRoot",
        repoRoot,
        "add-turn",
        meeting.meeting_id || "",
        agentId,
        "synthesis",
        "--content-file",
        turnContentPath,
        "--execute",
        "--json",
      ], 120000);
      turnResult = turn.json || turn;
      if (turnResult?.ok && turnResult?.turn) {
        turnResult.turn.content = turnContent;
      }
    }
    return sendJson(res, staffRun.ok ? 200 : 500, {
      ok: staffRun.ok,
      meeting_id: meeting.meeting_id || "",
      agent_id: agentId,
      before_turn_count: beforeTurnCount,
      after_turn_count: beforeTurnCount + (turnResult?.ok ? 1 : 0),
      work_order_path: workOrderPath,
      context_path: contextPath,
      staff_run: runJson || staffRun,
      turn_appended: Boolean(turnResult?.ok),
      added_turn: turnResult?.turn || null,
      turn_result: turnResult,
      safety: {
        meeting_turn_written: Boolean(turnResult?.ok),
        source_changed: false,
        task_state_changed: false,
        git_changed: false,
      },
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/proposal/create-decision") {
    const body = await readRequestJson(req);
    const { json: proposal } = await readStudioRecordFromBody(repoRoot, body, "proposal");
    const payload = buildDecisionFromProposalPayload(proposal, String(body.decision_type || "approve").trim() || "approve");
    const inputPath = await writeTempStudioInput(repoRoot, "decision_from_proposal", payload);
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_decision_store.bat");
    const result = await runTool(repoRoot, bat, ["create-decision", inputPath, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/knowledge/transition-plan") {
    const body = await readRequestJson(req);
    const { json, relativePath } = await readStudioRecordFromBody(repoRoot, body, "knowledge record");
    const payload = buildKnowledgeTransitionPlan(json, relativePath);
    return sendJson(res, 200, {
      ok: true,
      knowledge_transition_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/knowledge/canon-conflict-report") {
    const payload = await buildCanonConflictReport(repoRoot);
    return sendJson(res, 200, {
      ok: true,
      canon_conflict_report: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/project/execution-plan") {
    const payload = await buildProjectExecutionPlan(repoRoot);
    return sendJson(res, 200, {
      ok: true,
      project_execution_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/model/routing-plan") {
    const payload = await buildModelRoutingPlan(repoRoot);
    return sendJson(res, 200, {
      ok: true,
      model_routing_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/completion/decision-plan") {
    const core = await getWorkflowCore(repoRoot);
    const payload = buildCompletionDecisionPlan(core);
    return sendJson(res, 200, {
      ok: true,
      completion_decision_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/completion/evidence-checklist") {
    const core = await getWorkflowCore(repoRoot);
    const payload = buildCompletionEvidenceChecklist(core);
    return sendJson(res, 200, {
      ok: true,
      completion_evidence_checklist: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/automation/readiness-plan") {
    const payload = await buildAutomationReadinessPlan(repoRoot);
    return sendJson(res, 200, {
      ok: true,
      automation_readiness_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/approval/impact-plan") {
    const core = await getWorkflowCore(repoRoot);
    const automation = await getConditionalAutomation(repoRoot);
    const payload = buildApprovalImpactPlan(core, automation);
    return sendJson(res, 200, {
      ok: true,
      approval_impact_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/ui/surface-map") {
    const payload = buildDirectorSurfaceMap();
    return sendJson(res, 200, {
      ok: true,
      director_surface_map: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/traceability/map") {
    const payload = await buildTraceabilityMap(repoRoot);
    return sendJson(res, 200, {
      ok: true,
      traceability_map: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/recovery/plan") {
    const payload = await buildStudioRecoveryPlan(repoRoot);
    return sendJson(res, 200, {
      ok: true,
      studio_recovery_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/smoke/eval-plan") {
    const payload = buildStudioEvalPlan();
    return sendJson(res, 200, {
      ok: true,
      studio_eval_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/smoke/status") {
    const payload = await buildStudioSmokeReport(repoRoot);
    return sendJson(res, 200, {
      ok: true,
      studio_smoke_report: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/company/runtime-readiness") {
    const summary = await getSummary(repoRoot);
    const payload = summary.company_runtime;
    return sendJson(res, 200, {
      ok: true,
      company_runtime_readiness_report: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/staff/operating-plan") {
    const body = await readRequestJson(req);
    const agentId = String(body.agent_id || "").trim();
    const payload = await buildStaffOperatingPlan(repoRoot, agentId);
    return sendJson(res, 200, {
      ok: true,
      staff_operating_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/decision/create-memory") {
    const body = await readRequestJson(req);
    const { json: decision } = await readStudioRecordFromBody(repoRoot, body, "decision");
    if (!String(decision.target_ref || "").trim()) {
      return sendJson(res, 400, {
        ok: false,
        command: "decision-create-memory",
        error: "Decision target is empty. Nothing was written.",
        decision_id: decision.decision_id || "",
        decision_type: decision.decision_type || "",
        summary: decision.decision_summary || "",
        validation: {
          errors: ["대상 ID가 비어 있어 이 판단을 참고 기록으로 저장할 수 없습니다."],
        },
        safety: {
          memory_written: false,
          canon_written: false,
          source_changed: false,
          commit_push: false,
        },
      });
    }
    const payload = buildMemoryFromDecisionPayload(decision, String(body.status || "").trim());
    const inputPath = await writeTempStudioInput(repoRoot, "memory_from_decision", payload);
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_memory_store.bat");
    const result = await runTool(repoRoot, bat, ["create", inputPath, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/handoff-plan") {
    const body = await readRequestJson(req);
    const { json: workOrder } = await readStudioRecordFromBody(repoRoot, body, "work order");
    const payload = await buildWorkOrderHandoffPlan(repoRoot, workOrder);
    return sendJson(res, 200, {
      ok: true,
      work_order_handoff_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/context-plan") {
    const body = await readRequestJson(req);
    const { json: workOrder } = await readStudioRecordFromBody(repoRoot, body, "work order");
    const agentId = resolveWorkOrderAgent(workOrder, body.agent_id);
    const memoryQuery = String(body.memory_query || workOrder.objective || "").trim();
    const ps1 = repoPath(repoRoot, "tools/aiworkflow/studio_context_builder.ps1");
    const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1, "-RepoRoot", repoRoot, "plan", agentId, body.path, "--json"];
    if (memoryQuery) args.push("--memory-query", memoryQuery);
    const result = await runTool(repoRoot, "powershell.exe", args, 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/context-create") {
    const body = await readRequestJson(req);
    const { json: workOrder } = await readStudioRecordFromBody(repoRoot, body, "work order");
    const agentId = resolveWorkOrderAgent(workOrder, body.agent_id);
    const memoryQuery = String(body.memory_query || workOrder.objective || "").trim();
    const ps1 = repoPath(repoRoot, "tools/aiworkflow/studio_context_builder.ps1");
    const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1, "-RepoRoot", repoRoot, "create", agentId, body.path, "--execute", "--json"];
    if (memoryQuery) args.push("--memory-query", memoryQuery);
    const result = await runTool(repoRoot, "powershell.exe", args, 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/staff-plan") {
    const body = await readRequestJson(req);
    const { json: workOrder } = await readStudioRecordFromBody(repoRoot, body, "work order");
    const agentId = resolveWorkOrderAgent(workOrder, body.agent_id);
    const memoryQuery = String(body.memory_query || workOrder.objective || "").trim();
    const contextScript = repoPath(repoRoot, "tools/aiworkflow/studio_context_builder.ps1");
    const contextArgs = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", contextScript, "-RepoRoot", repoRoot, "plan", agentId, body.path, "--json"];
    if (memoryQuery) contextArgs.push("--memory-query", memoryQuery);
    const contextResult = await runTool(repoRoot, "powershell.exe", contextArgs, 120000);
    if (!contextResult.ok || !contextResult.json?.context_packet) {
      return sendJson(res, 500, contextResult.json || contextResult);
    }
    const contextPath = await writeTempStudioInput(repoRoot, "context_packet", contextResult.json.context_packet);
    const staffExecutor = repoPath(repoRoot, "tools/aiworkflow/studio_staff_executor.bat");
    const result = await runTool(repoRoot, staffExecutor, ["plan", contextPath, "--model", body.model || "gpt-5.5", "--reasoning", body.reasoning || "high", "--ephemeral", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, {
      ok: result.ok,
      context_path: contextPath,
      context_packet: contextResult.json.context_packet,
      staff_plan: result.json || result,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/staff-run") {
    const body = await readRequestJson(req);
    const { json: workOrder } = await readStudioRecordFromBody(repoRoot, body, "work order");
    const agentId = resolveWorkOrderAgent(workOrder, body.agent_id);
    const memoryQuery = String(body.memory_query || workOrder.objective || "").trim();
    const contextScript = repoPath(repoRoot, "tools/aiworkflow/studio_context_builder.ps1");
    const contextArgs = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", contextScript, "-RepoRoot", repoRoot, "plan", agentId, body.path, "--json"];
    if (memoryQuery) contextArgs.push("--memory-query", memoryQuery);
    const contextResult = await runTool(repoRoot, "powershell.exe", contextArgs, 120000);
    if (!contextResult.ok || !contextResult.json?.context_packet) {
      return sendJson(res, 500, contextResult.json || contextResult);
    }
    const contextPath = await writeTempStudioInput(repoRoot, "context_packet", contextResult.json.context_packet);
    const staffExecutor = repoPath(repoRoot, "tools/aiworkflow/studio_staff_executor.bat");
    const result = await runTool(repoRoot, staffExecutor, ["run", contextPath, "--execute", "--model", body.model || "gpt-5.5", "--reasoning", body.reasoning || "high", "--timeout-seconds", "900", "--ephemeral", "--json"], 20 * 60 * 1000);
    return sendJson(res, result.ok ? 200 : 500, {
      ok: result.ok,
      context_path: contextPath,
      context_packet: contextResult.json.context_packet,
      staff_run: result.json || result,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/intake") {
    const body = await readRequestJson(req);
    const text = String(body.text || "").trim();
    if (!text) throw new Error("Missing intake text.");
    const { createTaskFromIntake } = await importDiscordService(repoRoot, "tools/discord-orchestrator/src/services/intakeTaskCreationService.js");
    const result = await createTaskFromIntake(studioServiceConfig(repoRoot), { text });
    return sendJson(res, result.ok ? 200 : 500, result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/finalize") {
    const body = await readRequestJson(req);
    const taskId = safeWorkflowId(body.task_id, "task id");
    const decision = String(body.decision || "").trim();
    const runnerRunId = String(body.runner_run_id || "").trim();
    const completionReportId = String(body.completion_report_id || "").trim();
    const config = studioServiceConfig(repoRoot);

    if (decision === "accept" || decision === "accept-concerns") {
      const { acceptCompletionAndContinueRunner } = await importDiscordService(repoRoot, "tools/discord-orchestrator/src/services/runnerCompletionService.js");
      const result = await acceptCompletionAndContinueRunner(config, {
        id: taskId,
        decision,
        runnerRunId,
        completionReportId,
        markDone: body.mark_done === true,
        actor: "studio_console",
      });
      return sendJson(res, result.ok ? 200 : 500, result);
    }

    const commandByDecision = {
      "request-changes": "request-changes",
      reject: "reject",
      defer: "defer",
    };
    if (!commandByDecision[decision]) {
      throw new Error("Unsupported finalization decision.");
    }
    const { recordFinalizationDecision } = await importDiscordService(repoRoot, "tools/discord-orchestrator/src/services/finalizationService.js");
    const result = await recordFinalizationDecision(config, {
      id: taskId,
      command: commandByDecision[decision],
      completionReportId,
      actor: "studio_console",
    });
    return sendJson(res, result.ok ? 200 : 500, result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/task/approve-start") {
    const body = await readRequestJson(req);
    const taskId = safeWorkflowId(body.task_id, "task id");
    const config = studioServiceConfig(repoRoot);
    const { setActiveTask, approveTask } = await importDiscordService(repoRoot, "tools/discord-orchestrator/src/services/taskService.js");
    const { startPcRunnerDetached } = await importDiscordService(repoRoot, "tools/discord-orchestrator/src/services/pcRunnerService.js");
    const activation = await setActiveTask(config, taskId);
    if (!activation.ok) return sendJson(res, 500, activation);
    const approval = await approveTask(config, {
      id: taskId,
      note: body.note || "Studio Console approved selected task scope for PC Runner execution.",
    });
    if (!approval.ok) return sendJson(res, 500, approval);
    const runner = await startPcRunnerDetached(config, {
      id: taskId,
      profile: body.profile || "",
      executor: body.executor || "",
    });
    return sendJson(res, runner.ok ? 200 : 500, {
      ok: runner.ok,
      command: "approve-start",
      data: { activation, approval, runner },
      error: runner.error || "",
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/git/commit") {
    const body = await readRequestJson(req);
    const commit = await commitSelectedFiles(repoRoot, body);
    let push = null;
    if (body.push === true && commit.committed === true) {
      push = await pushCurrentBranch(repoRoot);
    }
    return sendJson(res, 200, {
      ok: true,
      command: body.push === true ? "commit-push-selected" : "commit-selected",
      data: { commit, push },
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/git/push") {
    const push = await pushCurrentBranch(repoRoot);
    return sendJson(res, 200, {
      ok: true,
      command: "push",
      data: push,
    });
  }

  return sendJson(res, 404, { ok: false, error: "Not found" });
}
}

module.exports = { createStudioApiHandler };

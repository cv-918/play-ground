#!/usr/bin/env node
"use strict";

const {
  readStudioRecordRequest,
  runPayloadToolJson,
  sendStudioPayload,
  sendToolJson,
} = require("./studioApiRouteUtils");

function createPlanningMeetingApiHandler(deps = {}) {
  const {
    buildDecisionFromMeetingPayload,
    buildDirectorGoalPlanPayload,
    buildMeetingAgentTurnWorkOrder,
    buildMeetingBoard,
    buildMeetingFacilitationPlan,
    buildMeetingPayload,
    buildMeetingRunbook,
    buildWorkOrderFromMeetingPayload,
    extractMeetingTurnFromStaffRun,
    readRequestJson,
    readStudioRecordFromBody,
    requireStudioText,
    resolveMeetingAgent,
    repoPath,
    runTool,
    safeResolveReadable,
    sendJson,
    slash,
    writeStudioRecord,
    writeTempStudioInput,
    writeTempStudioText,
  } = deps;

  return async function handlePlanningMeetingApi({ repoRoot, req, res, parsedUrl, serverContext = {} }) {
    if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/inspect") {
      const body = await readRequestJson(req);
      safeResolveReadable(repoRoot, body.path || "");
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
      const result = await runTool(repoRoot, bat, ["inspect", body.path, "--json"], 120000);
      return sendToolJson(sendJson, res, result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/handoff") {
      const body = await readRequestJson(req);
      safeResolveReadable(repoRoot, body.path || "");
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
      const result = await runTool(repoRoot, bat, ["handoff", body.path, "--json"], 120000);
      return sendToolJson(sendJson, res, result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/start") {
      const body = await readRequestJson(req);
      const meetingId = String(body.meeting_id || "");
      if (!/^[A-Za-z0-9_.:-]+$/.test(meetingId)) {
        throw new Error("Invalid meeting_id.");
      }
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
      const result = await runTool(repoRoot, bat, ["start", meetingId, "--execute", "--json"], 120000);
      return sendToolJson(sendJson, res, result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/finalize") {
      const body = await readRequestJson(req);
      const meetingId = String(body.meeting_id || "");
      if (!/^[A-Za-z0-9_.:-]+$/.test(meetingId)) {
        throw new Error("Invalid meeting_id.");
      }
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
      const result = await runTool(repoRoot, bat, ["finalize", meetingId, "--execute", "--json"], 120000);
      return sendToolJson(sendJson, res, result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/create") {
      const body = await readRequestJson(req);
      safeResolveReadable(repoRoot, body.path || "");
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
      const result = await runTool(repoRoot, bat, ["create", body.path, "--execute", "--json"], 120000);
      return sendToolJson(sendJson, res, result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/create") {
      const body = await readRequestJson(req);
      const payload = buildMeetingPayload(body);
      return runPayloadToolJson(
        repoRoot,
        res,
        { repoPath, runTool, sendJson, writeTempStudioInput },
        "meeting",
        payload,
        "tools/aiworkflow/studio_meeting_runtime.bat",
        (inputPath) => ["create", inputPath, "--execute", "--json"],
      );
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/director-goal/plan") {
      const body = await readRequestJson(req);
      const payload = buildDirectorGoalPlanPayload(body);
      return sendStudioPayload(sendJson, res, "director_goal_plan", payload);
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
      return sendToolJson(sendJson, res, result);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/create-workorder") {
      const body = await readRequestJson(req);
      const { json: meeting } = await readStudioRecordFromBody(repoRoot, body, "meeting");
      const payload = buildWorkOrderFromMeetingPayload(meeting);
      return runPayloadToolJson(
        repoRoot,
        res,
        { repoPath, runTool, sendJson, writeTempStudioInput },
        "workorder_from_meeting",
        payload,
        "tools/aiworkflow/studio_workorder_planner.bat",
        (inputPath) => ["store", inputPath, "--execute", "--json"],
      );
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/create-decision") {
      const body = await readRequestJson(req);
      const { json: meeting } = await readStudioRecordFromBody(repoRoot, body, "meeting");
      const payload = buildDecisionFromMeetingPayload(meeting, String(body.decision_type || "approve").trim() || "approve");
      return runPayloadToolJson(
        repoRoot,
        res,
        { repoPath, runTool, sendJson, writeTempStudioInput },
        "decision_from_meeting",
        payload,
        "tools/aiworkflow/studio_decision_store.bat",
        (inputPath) => ["create-decision", inputPath, "--execute", "--json"],
      );
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/facilitation-plan") {
      const { json: meeting } = await readStudioRecordRequest(repoRoot, req, readRequestJson, readStudioRecordFromBody, "meeting");
      const payload = buildMeetingFacilitationPlan(meeting);
      return sendStudioPayload(sendJson, res, "meeting_facilitation_plan", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/board") {
      const { json: meeting } = await readStudioRecordRequest(repoRoot, req, readRequestJson, readStudioRecordFromBody, "meeting");
      const payload = buildMeetingBoard(meeting);
      return sendStudioPayload(sendJson, res, "meeting_board", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/runbook") {
      const { json: meeting } = await readStudioRecordRequest(repoRoot, req, readRequestJson, readStudioRecordFromBody, "meeting");
      const payload = buildMeetingRunbook(meeting);
      return sendStudioPayload(sendJson, res, "meeting_runbook", payload);
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

    return false;
  };
}

module.exports = { createPlanningMeetingApiHandler };

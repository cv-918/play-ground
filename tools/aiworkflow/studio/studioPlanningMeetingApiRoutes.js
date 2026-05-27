#!/usr/bin/env node
"use strict";

function createPlanningMeetingApiHandler(deps = {}) {
  const {
    buildDirectorGoalPlanPayload,
    buildMeetingPayload,
    readRequestJson,
    repoPath,
    runTool,
    safeResolveReadable,
    sendJson,
    writeStudioRecord,
    writeTempStudioInput,
  } = deps;

  return async function handlePlanningMeetingApi({ repoRoot, req, res, parsedUrl, serverContext = {} }) {
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
    return false;
  };
}

module.exports = { createPlanningMeetingApiHandler };

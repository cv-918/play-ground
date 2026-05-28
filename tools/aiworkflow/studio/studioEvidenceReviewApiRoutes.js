#!/usr/bin/env node
"use strict";

const { sendStudioPayload } = require("./studioApiRouteUtils");

function createEvidenceReviewApiHandler(deps = {}) {
  const {
    buildApprovalImpactPlan,
    buildAutomationReadinessPlan,
    buildCompletionDecisionPlan,
    buildCompletionEvidenceChecklist,
    buildDirectorSurfaceMap,
    buildModelRoutingPlan,
    buildProjectExecutionPlan,
    buildStaffOperatingPlan,
    buildStudioEvalPlan,
    buildStudioRecoveryPlan,
    buildStudioSmokeReport,
    buildTraceabilityMap,
    getConditionalAutomation,
    getSummary,
    getWorkflowCore,
    readRequestJson,
    sendJson,
  } = deps;

  return async function handleEvidenceReviewApi({ repoRoot, req, res, parsedUrl, serverContext = {} }) {
    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/project/execution-plan") {
      const payload = await buildProjectExecutionPlan(repoRoot);
      return sendStudioPayload(sendJson, res, "project_execution_plan", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/model/routing-plan") {
      const payload = await buildModelRoutingPlan(repoRoot);
      return sendStudioPayload(sendJson, res, "model_routing_plan", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/completion/decision-plan") {
      const core = await getWorkflowCore(repoRoot);
      const payload = buildCompletionDecisionPlan(core);
      return sendStudioPayload(sendJson, res, "completion_decision_plan", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/completion/evidence-checklist") {
      const core = await getWorkflowCore(repoRoot);
      const payload = buildCompletionEvidenceChecklist(core);
      return sendStudioPayload(sendJson, res, "completion_evidence_checklist", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/automation/readiness-plan") {
      const payload = await buildAutomationReadinessPlan(repoRoot);
      return sendStudioPayload(sendJson, res, "automation_readiness_plan", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/approval/impact-plan") {
      const core = await getWorkflowCore(repoRoot);
      const automation = await getConditionalAutomation(repoRoot);
      const payload = buildApprovalImpactPlan(core, automation);
      return sendStudioPayload(sendJson, res, "approval_impact_plan", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/ui/surface-map") {
      const payload = buildDirectorSurfaceMap();
      return sendStudioPayload(sendJson, res, "director_surface_map", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/traceability/map") {
      const payload = await buildTraceabilityMap(repoRoot);
      return sendStudioPayload(sendJson, res, "traceability_map", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/recovery/plan") {
      const payload = await buildStudioRecoveryPlan(repoRoot);
      return sendStudioPayload(sendJson, res, "studio_recovery_plan", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/smoke/eval-plan") {
      const payload = buildStudioEvalPlan();
      return sendStudioPayload(sendJson, res, "studio_eval_plan", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/smoke/status") {
      const payload = await buildStudioSmokeReport(repoRoot);
      return sendStudioPayload(sendJson, res, "studio_smoke_report", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/company/runtime-readiness") {
      const summary = await getSummary(repoRoot);
      const payload = summary.company_runtime;
      return sendStudioPayload(sendJson, res, "company_runtime_readiness_report", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/staff/operating-plan") {
      const body = await readRequestJson(req);
      const agentId = String(body.agent_id || "").trim();
      const payload = await buildStaffOperatingPlan(repoRoot, agentId);
      return sendStudioPayload(sendJson, res, "staff_operating_plan", payload);
    }



    return false;
  };
}

module.exports = { createEvidenceReviewApiHandler };

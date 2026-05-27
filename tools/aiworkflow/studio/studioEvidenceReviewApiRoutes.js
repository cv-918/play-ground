#!/usr/bin/env node
"use strict";

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



    return false;
  };
}

module.exports = { createEvidenceReviewApiHandler };

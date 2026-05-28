#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  getConditionalAutomation,
  getDecisions,
  getMemories,
  getProjectProfiles,
  getProposals,
  getToolAdapters,
} = require("./studioDataService");

function repoPath(repoRoot, relativePath) {
  return path.resolve(repoRoot, relativePath);
}

function shortText(value, max = 180) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 3).trimEnd() + "..." : clean;
}

function slugifyId(value, fallback = "item") {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 36);
  return slug || fallback;
}

function studioTimestampParts() {
  const now = new Date();
  const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
  const compact = local.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return {
    date: compact.slice(0, 8),
    time: compact.slice(8, 14),
    iso: now.toISOString(),
  };
}

function makeStudioId(prefix, label) {
  const stamp = studioTimestampParts();
  return String(prefix) + "-" + stamp.date + "-" + stamp.time + "-" + slugifyId(label);
}

function stringList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return String(item.plain_language_summary || item.summary || item.title || item.type || item.id || item.record_id || "").trim();
      }
      return String(item || "").trim();
    })
    .filter(Boolean);
}

function createStudioOperationalPlanBuilders(deps = {}) {
  const { getSummary, getWorkflowCore } = deps;
  if (typeof getSummary !== "function") throw new Error("getSummary dependency is required.");
  if (typeof getWorkflowCore !== "function") throw new Error("getWorkflowCore dependency is required.");

  async function buildCanonConflictReport(repoRoot) {
    const proposals = await getProposals(repoRoot);
    const decisions = await getDecisions(repoRoot);
    const memories = await getMemories(repoRoot);
    const canonMemories = memories.filter((memory) => memory.status === "canon" || memory.scope === "canon" || memory.type === "canon");
    const activeProposals = proposals.filter((proposal) => !["rejected", "superseded"].includes(String(proposal.status || "").toLowerCase()));
    const proposedMemories = memories.filter((memory) => !["canon", "rejected", "superseded"].includes(String(memory.status || "").toLowerCase()));
    const sourceRefs = new Set([
      ...decisions.map((decision) => decision.decision_id),
      ...decisions.map((decision) => decision.target_ref),
    ].filter(Boolean));
    const needsDecision = [
      ...activeProposals.map((proposal) => ({
        kind: "proposal",
        ref: proposal.proposal_id,
        summary: proposal.title || proposal.summary,
        reason: "제안은 아이디어 후보라서 공식 설정이나 구현 근거가 되려면 Human Director 결정이 필요합니다.",
      })),
      ...proposedMemories.map((memory) => ({
        kind: "memory",
        ref: memory.memory_id,
        summary: memory.content,
        reason: "이 기억은 canon이 아니므로 확정 설정처럼 사용하면 안 됩니다.",
      })),
    ].slice(0, 12);
    const missingDecisionRefs = canonMemories
      .filter((memory) => !stringList(memory.evidence_refs || memory.source_refs).some((ref) => sourceRefs.has(ref)))
      .map((memory) => ({
        kind: "canon_memory",
        ref: memory.memory_id,
        summary: memory.content,
        reason: "canon 기억이지만 연결된 Decision 근거를 찾지 못했습니다. 실제 승인 근거를 확인해야 합니다.",
      }));
    const overlapSignals = [];
    const canonTexts = canonMemories.map((memory) => ({
      ref: memory.memory_id,
      text: String(memory.content || "").toLowerCase(),
      summary: memory.content,
    }));
    for (const proposal of activeProposals) {
      const proposalText = String([proposal.title, proposal.summary, ...(proposal.risks || [])].join(" ")).toLowerCase();
      const tokens = Array.from(new Set(proposalText.split(/[^a-z0-9가-힣_]+/u).filter((token) => token.length >= 4))).slice(0, 40);
      for (const canon of canonTexts) {
        const matched = tokens.filter((token) => canon.text.includes(token)).slice(0, 5);
        if (matched.length >= 2) {
          overlapSignals.push({
            proposal_ref: proposal.proposal_id,
            canon_ref: canon.ref,
            matched_terms: matched,
            reason: "제안과 기존 canon 기억이 같은 핵심 단어를 공유합니다. 충돌인지, 보강인지 사람이 확인해야 합니다.",
          });
        }
      }
    }
    return {
      canon_conflict_report_id: makeStudioId("CCR", "canon-conflict"),
      generated_at: studioTimestampParts().iso,
      current_meaning: "제안, 결정, 기억, 공식 설정 후보가 서로 섞이지 않았는지 확인하는 읽기 전용 점검입니다.",
      counts: {
        proposals: proposals.length,
        decisions: decisions.length,
        memories: memories.length,
        canon_memories: canonMemories.length,
        active_proposals: activeProposals.length,
      },
      needs_director_decision: needsDecision,
      canon_records_missing_decision_evidence: missingDecisionRefs,
      possible_overlap_signals: overlapSignals.slice(0, 12),
      recommended_actions: [
        "제안은 채택/수정 요청/반려/공식 설정 후보 중 하나로 Decision을 남깁니다.",
        "canon 기억에 근거 Decision이 없으면 근거를 보강하거나 canon 상태를 재검토합니다.",
        "제안과 canon이 겹치면 충돌인지 보강인지 확인하고 필요한 경우 수정 요청 Decision을 남깁니다.",
      ],
      safety: {
        read_only: true,
        proposal_changed: false,
        decision_written: false,
        memory_written: false,
        canon_changed: false,
        task_state_changed: false,
        commit_or_push: false,
      },
    };
  }

  async function buildProjectExecutionPlan(repoRoot) {
    const profiles = await getProjectProfiles(repoRoot);
    const toolAdapters = await getToolAdapters(repoRoot);
    const active = profiles.profiles.find((profile) => profile.project_id === profiles.active_project_id) || profiles.profiles[0] || {};
    const enabledTools = toolAdapters.filter((adapter) => adapter.status === "available" && adapter.default_enabled);
    const writeTools = enabledTools.filter((adapter) => adapter.can_modify_files);
    const costTools = enabledTools.filter((adapter) => adapter.can_incur_cost || adapter.can_call_external);
    const missing = [];
    if (!active.project_id) missing.push("활성 Project Profile이 없습니다.");
    if (!active.validation_profile_count) missing.push("검증 profile이 부족합니다.");
    if (!active.build_profile_count) missing.push("빌드 profile이 부족합니다.");
    if (!enabledTools.length) missing.push("기본 활성화된 실행 도구가 없습니다.");
    return {
      project_execution_plan_id: makeStudioId("PEP", active.project_id || "project"),
      project_id: active.project_id || "",
      active_profile_path: profiles.active_profile_path || active.path || "",
      current_meaning: active.project_id
        ? `${active.display_name || active.project_id} 프로젝트의 빌드/검증/도구 실행 경계를 점검합니다.`
        : "활성 Project Profile을 찾지 못했습니다.",
      profile_summary: {
        display_name: active.display_name || active.project_id || "",
        project_type: active.project_type || "",
        source_roots: active.source_roots || [],
        data_roots: active.data_roots || [],
        asset_roots: active.asset_roots || [],
        build_profile_count: active.build_profile_count || 0,
        validation_profile_count: active.validation_profile_count || 0,
      },
      available_validation_profiles: active.validation_profile_ids || [],
      available_build_profiles: active.build_profile_ids || [],
      available_tool_adapters: enabledTools.map((adapter) => adapter.adapter_id),
      tool_risk_matrix: enabledTools.map((adapter) => ({
        adapter_id: adapter.adapter_id,
        display_name: adapter.display_name || adapter.adapter_id,
        can_modify_files: Boolean(adapter.can_modify_files),
        can_call_external: Boolean(adapter.can_call_external),
        can_incur_cost: Boolean(adapter.can_incur_cost),
        requires_human_approval: Boolean(adapter.requires_human_approval),
        safe_for_default_read: !adapter.can_modify_files && !adapter.can_call_external && !adapter.can_incur_cost,
      })),
      human_approval_required_for: [
        ...writeTools.map((adapter) => `${adapter.adapter_id}: 파일을 수정할 수 있는 도구입니다.`),
        ...costTools.map((adapter) => `${adapter.adapter_id}: 외부 호출 또는 비용 영향이 있을 수 있습니다.`),
      ],
      missing_or_weak_items: missing,
      safe_start_candidates: [
        ...(active.validation_profile_ids || []).slice(0, 3).map((id) => `검증 profile: ${id}`),
        ...enabledTools.filter((adapter) => !adapter.can_modify_files).slice(0, 3).map((adapter) => `읽기 중심 도구: ${adapter.adapter_id}`),
      ],
      ready_to_run_checks: [
        active.validation_profile_count ? "검증 프로필이 등록되어 있습니다." : "검증 프로필이 부족합니다.",
        active.build_profile_count ? "빌드 프로필이 등록되어 있습니다." : "빌드 프로필이 부족합니다.",
        enabledTools.length ? "사용 가능한 도구 어댑터가 있습니다." : "사용 가능한 도구 어댑터가 없습니다.",
      ],
      recommended_next_actions: [
        "작업 전 Project Profile이 현재 목표와 맞는지 확인합니다.",
        "실행이 필요한 경우 ToolRunRequest를 먼저 만들고 권한/비용/파일 수정 가능성을 확인합니다.",
        "빌드나 검증은 검증 자료로 남기고 완료 판단은 별도 gate에서 처리합니다.",
      ],
      safety: {
        read_only: true,
        source_changed: false,
        task_state_changed: false,
        tool_executed: false,
        commit_or_push: false,
      },
      created_at: studioTimestampParts().iso,
    };
  }

  async function buildModelRoutingPlan(repoRoot) {
    const core = await getWorkflowCore(repoRoot);
    const toolAdapters = await getToolAdapters(repoRoot);
    const task = core.active_task || {};
    const risk = String(task.risk || "").toLowerCase();
    const kind = String(task.kind || "").toLowerCase();
    const isLowRiskRoutine = ["low"].includes(risk) && ["documentation", "validation", "review"].includes(kind);
    const route = isLowRiskRoutine
      ? { model: "gpt-5.4-mini", reasoning: "low", route: "fast_low_risk_signed_in_codex" }
      : { model: "gpt-5.5", reasoning: "high", route: "default_final_form_signed_in_codex" };
    const externalOrCostAdapters = toolAdapters.filter((adapter) => adapter.can_call_external || adapter.can_incur_cost);
    const writeAdapters = toolAdapters.filter((adapter) => adapter.can_modify_files);
    const gateLines = Array.from(new Set([
      ...writeAdapters.map((adapter) => `${adapter.adapter_id}: 파일 수정 가능성이 있어 승인 필요`),
      ...externalOrCostAdapters.map((adapter) => `${adapter.adapter_id}: 외부 호출 또는 비용 영향 가능성이 있어 승인 필요`),
    ]));
    const summarizedGateLines = gateLines.length > 12
      ? [...gateLines.slice(0, 12), `+${gateLines.length - 12}개 추가 gate 있음`]
      : gateLines;
    return {
      model_routing_plan_id: makeStudioId("MRP", task.task_id || "studio"),
      task_id: task.task_id || "",
      task_title: task.title || "",
      current_meaning: "현재 작업을 어떤 signed-in Codex/ChatGPT 계열 모델과 권한 경계로 처리할지 보여주는 읽기 전용 라우팅 계획입니다.",
      selected_route: route,
      subscription_policy: {
        default_ai_path: "signed-in Codex / ChatGPT plan",
        openai_api_required: false,
        image_generation_path: "Codex/ChatGPT plan first; external provider only after explicit approval",
        paid_external_tools_require_approval: true,
      },
      route_rules: [
        "복잡한 설계, 구현, 리뷰, 장기 구조 판단은 gpt-5.5 high를 기본으로 사용합니다.",
        "저위험 문서/검증/읽기 중심 반복 작업은 빠른 모델/낮은 추론 강도를 후보로 둘 수 있습니다.",
        "외부 API, 별도 과금, 파일 쓰기, runtime 영향이 있으면 사람 승인 gate를 유지합니다.",
        "LLM은 제안과 실행 보조를 담당하고 승인권은 갖지 않습니다.",
      ],
      permission_gates: summarizedGateLines,
      adapter_summary: toolAdapters.slice(0, 16).map((adapter) => ({
        adapter_id: adapter.adapter_id,
        display_name: adapter.display_name || adapter.adapter_id,
        can_modify_files: Boolean(adapter.can_modify_files),
        can_call_external: Boolean(adapter.can_call_external),
        can_incur_cost: Boolean(adapter.can_incur_cost),
        requires_human_approval: Boolean(adapter.requires_human_approval),
      })),
      safety: {
        read_only: true,
        model_called: false,
        external_call: false,
        cost_incurred: false,
        source_changed: false,
        commit_or_push: false,
      },
      created_at: studioTimestampParts().iso,
    };
  }

  async function buildAutomationReadinessPlan(repoRoot) {
    const core = await getWorkflowCore(repoRoot);
    const automation = await getConditionalAutomation(repoRoot);
    const task = core.active_task || {};
    const verification = core.verification || {};
    const completion = core.completion || {};
    const git = core.git || {};
    const priority = String(task.priority || "").toUpperCase();
    const kind = String(task.kind || "").toLowerCase();
    const blockers = [];

    if (!task.task_id) blockers.push("현재 ActiveTask가 없습니다.");
    if (["P0", "P1"].includes(priority)) blockers.push("중요 작업은 자동 진행 대상이 아닙니다.");
    if (["implementation", "data", "runtime", "schema", "save", "source"].includes(kind)) blockers.push("소스/데이터/런타임 인접 작업은 사람 승인이 필요합니다.");
    if (verification.verdict === "CONCERNS" || verification.verdict === "FAIL" || verification.verdict === "BLOCKED") blockers.push("검증 판정에 우려 또는 실패가 있습니다.");
    if (completion.state === "needs_human_decision") blockers.push("완료 검토에서 사람 판단이 필요합니다.");
    if (git.dirty) blockers.push("Git 작업대에 변경이 있어 자동 commit/push는 금지됩니다.");

    return {
      automation_readiness_plan_id: makeStudioId("ARP", task.task_id || "automation"),
      task_id: task.task_id || "",
      current_meaning: blockers.length
        ? "현재 상태에서는 자동 진행보다 사람 판단 또는 명시적 버튼 실행이 우선입니다."
        : "현재 상태는 저위험 자동 진행 후보가 될 수 있습니다.",
      can_auto_handoff: blockers.length === 0,
      can_auto_finalize: false,
      can_auto_commit_or_push: false,
      blockers,
      allowed_auto_steps: [
        "저위험 validation/documentation 작업의 intake 후 ActiveTask 선택",
        "정책 조건을 만족한 저위험 작업의 approve 기록",
        "지원 runner profile이 있는 경우 PC Runner 시작",
        "_Temp 검증 자료 생성",
      ],
      always_human_steps: [
        "P0/P1, high-risk, source/data/runtime/schema/save 인접 작업 승인",
        "CONCERNS/FAIL/BLOCKED 완료 판정 수용",
        "공식 설정/canon 전환",
        "commit, push, release",
      ],
      policy_inputs: {
        conditional_case_count: automation.cases?.length || 0,
        evaluation_count: automation.evaluations?.length || 0,
        latest_evaluation_id: automation.evaluations?.[0]?.id || "",
      },
      recommended_next_actions: blockers.length
        ? ["감독자 결정함에서 차단 사유를 확인합니다.", "필요하면 완료 판단안 또는 실행 준비 점검을 먼저 봅니다.", "자동 확장 전 정책 테스트를 실행합니다."]
        : ["정책 테스트를 실행해 자동 진행 조건을 재확인합니다.", "실제 자동 확장은 작은 validation/documentation smoke로 검증합니다."],
      safety: {
        read_only: true,
        auto_approval_applied: false,
        runner_started: false,
        task_state_changed: false,
        commit_or_push: false,
      },
      created_at: studioTimestampParts().iso,
    };
  }

  async function buildStudioSmokeReport(repoRoot) {
    const summary = await getSummary(repoRoot);
    const expectedSchemas = [
      "StaffOperatingPlan.schema.json",
      "DirectorGoalPlan.schema.json",
      "MeetingFacilitationPlan.schema.json",
      "MeetingRunbook.schema.json",
      "KnowledgeTransitionPlan.schema.json",
      "CanonConflictReport.schema.json",
      "WorkOrderHandoffPlan.schema.json",
      "ProjectExecutionPlan.schema.json",
      "ModelRoutingPlan.schema.json",
      "CompletionEvidenceChecklist.schema.json",
      "CompletionDecisionPlan.schema.json",
      "ApprovalImpactPlan.schema.json",
      "AutomationReadinessPlan.schema.json",
      "DirectorSurfaceMap.schema.json",
      "TraceabilityMap.schema.json",
      "StudioRecoveryPlan.schema.json",
      "StudioEvalPlan.schema.json",
      "CompanyRuntimeReadinessReport.schema.json",
    ];
    const schemaResults = [];
    for (const schema of expectedSchemas) {
      const full = repoPath(repoRoot, `_Docs/AIWorkflow/Studio/Schemas/${schema}`);
      schemaResults.push({
        schema,
        exists: fs.existsSync(full),
        path: `_Docs/AIWorkflow/Studio/Schemas/${schema}`,
      });
    }
    const pageChecks = [
      "home",
      "goals",
      "project",
      "inbox",
      "departments",
      "staff",
      "meetings",
      "runs",
      "work",
      "knowledge",
      "timeline",
      "diff",
      "evidence",
      "devlog",
    ].map((page) => ({ page, expected_visible: true }));
    const warnings = [];
    if (summary.workflow_core?.git?.dirty) warnings.push("Git 작업대에 Studio 외 변경이 있을 수 있습니다. 커밋 전 선택 파일을 확인하세요.");
    if (!summary.metrics?.staff) warnings.push("Staff registry를 읽지 못했습니다.");
    if (!summary.metrics?.departments) warnings.push("Department registry를 읽지 못했습니다.");
    if (!schemaResults.every((item) => item.exists)) warnings.push("일부 Studio schema 파일이 없습니다.");

    return {
      studio_smoke_report_id: makeStudioId("SSR", "studio-smoke"),
      generated_at: studioTimestampParts().iso,
      console_pages: pageChecks,
      schema_checks: schemaResults,
      core_counts: {
        departments: summary.metrics.departments,
        staff: summary.metrics.staff,
        project_profiles: summary.metrics.project_profiles,
        tool_adapters: summary.metrics.tool_adapters,
        director_goal_plans: summary.metrics.director_goal_plans,
        review_packets: summary.metrics.review_packets,
      },
      warnings,
      recommended_manual_smoke: [
        "홈에서 현재 할 일을 확인합니다.",
        "새 안건에서 브리프 미리보기를 실행합니다.",
        "자문실에서 자문판을 봅니다.",
        "LLM Wiki에서 전환 계획을 봅니다.",
        "프로젝트에서 실행 준비 점검을 봅니다.",
        "검증 자료에서 완료 판단안을 봅니다.",
        "정책에서 자동 진행 준비도를 봅니다.",
      ],
      safety: {
        read_only: true,
        source_changed: false,
        task_state_changed: false,
        commit_or_push: false,
      },
    };
  }

  async function buildTraceabilityMap(repoRoot) {
    const summary = await getSummary(repoRoot);
    const core = summary.workflow_core || {};
    const task = core.active_task || {};
    const taskId = task.task_id || "";
    const refs = [];
    if (taskId) refs.push({ kind: "Task", label: taskId, meaning: "현재 ActiveTask입니다.", ref: "_Docs/AIWorkflow/ActiveTask.md" });
    if (core.runner?.runner_run_id) refs.push({ kind: "Runner", label: core.runner.runner_run_id, meaning: "실제 실행 세션 기록입니다.", ref: core.runner.path || "" });
    if (core.verification?.path) refs.push({ kind: "VerificationReport", label: core.verification.verdict || "verification", meaning: "무엇을 검증했고 어떤 판정이 났는지 보여줍니다.", ref: core.verification.path });
    if (core.completion?.path) refs.push({ kind: "CompletionReport", label: core.completion.state || "completion", meaning: "완료 가능 여부와 남은 우려를 보여줍니다.", ref: core.completion.path });
    if (core.completion?.card_path) refs.push({ kind: "CompletionCard", label: "completion card", meaning: "감독자가 읽는 짧은 완료 요약입니다.", ref: core.completion.card_path });
    if (core.git?.changed_count) refs.push({ kind: "Git", label: `${core.git.changed_count} changed`, meaning: "커밋 전 확인해야 할 현재 변경입니다.", ref: core.git.changed_files?.join(", ") || "" });
    const relatedDevLogs = (summary.dev_logs || []).filter((item) => !taskId || JSON.stringify(item).includes(taskId)).slice(0, 6);
    relatedDevLogs.forEach((item) => refs.push({ kind: "DevLog", label: item.title || item.id || "DevLog", meaning: "작업 배경과 검증 참고 자료입니다.", ref: item.path || item.href || "" }));
    const missing = [];
    if (taskId && !core.runner?.runner_run_id) missing.push("Runner 실행 기록이 없습니다.");
    if (taskId && !core.verification?.path) missing.push("VerificationReport를 찾지 못했습니다.");
    if (taskId && !core.completion?.path) missing.push("CompletionReport를 찾지 못했습니다.");
    if (taskId && !core.completion?.card_path) missing.push("CompletionCard를 찾지 못했습니다.");

    return {
      traceability_map_id: makeStudioId("TRM", taskId || "studio"),
      task_id: taskId,
      task_title: task.title || "",
      current_meaning: "현재 작업을 기준으로 업무 상태, 실행 세션, 검증 자료, 완료 자료, git 변경, DevLog가 어떻게 이어지는지 보여주는 읽기 전용 지도입니다.",
      linked_refs: refs,
      missing_links: missing,
      timeline_counts: {
        staff_runs: summary.metrics?.staff_runs || 0,
        work_orders: summary.metrics?.work_orders || 0,
        meetings: summary.metrics?.meetings || 0,
        review_packets: summary.metrics?.review_packets || 0,
        dev_logs: summary.metrics?.dev_logs || 0,
      },
      recommended_next_actions: missing.length
        ? ["빠진 연결을 만든 뒤 완료 판단이나 commit/push를 진행합니다.", "필요하면 검증 자료 화면에서 완료 근거 점검을 실행합니다."]
        : ["검증 자료 화면에서 완료 판단을 확인합니다.", "변경 검토 화면에서 commit/push 범위를 확인합니다."],
      safety: {
        read_only: true,
        source_changed: false,
        task_state_changed: false,
        commit_or_push: false,
      },
      created_at: studioTimestampParts().iso,
    };
  }

  async function buildStudioRecoveryPlan(repoRoot) {
    const summary = await getSummary(repoRoot);
    const smoke = await buildStudioSmokeReport(repoRoot);
    const core = summary.workflow_core || {};
    const issues = [];
    if (core.git?.dirty) issues.push(`${core.git.changed_count || 0}개 git 변경이 있습니다. 커밋 전 범위 분리가 필요합니다.`);
    if (smoke.schema_checks.some((item) => !item.exists)) issues.push("누락된 Studio schema가 있습니다.");
    if (!summary.metrics?.staff) issues.push("AI 직원 registry를 읽지 못했습니다.");
    if (!summary.metrics?.departments) issues.push("부서 registry를 읽지 못했습니다.");
    if (core.runner?.stop_reason === "completion_review_required") issues.push("완료 검토 gate에서 멈춘 실행이 있습니다.");
    if (core.runner?.status === "running") issues.push("실행 중인 Runner가 있습니다. 중복 실행 전에 상태 확인이 필요합니다.");
    const recoverySteps = [
      "홈에서 판단 대기 항목을 먼저 확인합니다.",
      "추적 지도에서 task, runner, 검증 자료 연결이 끊겼는지 확인합니다.",
      "완료 gate에서 멈췄다면 검증 자료 화면의 완료 근거 점검과 완료 판단안을 봅니다.",
      "git 변경이 섞였으면 변경 검토 화면에서 선택 파일만 commit/push합니다.",
      "화면 또는 schema가 이상하면 Studio 점검을 실행하고 서버를 재시작합니다.",
    ];
    return {
      studio_recovery_plan_id: makeStudioId("SRP", "studio-recovery"),
      current_meaning: "Studio 사용 중 멈춤, 누락, 혼합 변경이 생겼을 때 어디부터 확인할지 정리하는 읽기 전용 복구 계획입니다.",
      health: issues.length ? "needs_attention" : "ok",
      issues,
      recovery_steps: recoverySteps,
      safe_restart_command: "tools\\aiworkflow\\studio_director_console.bat --host 127.0.0.1 --port 47831",
      smoke_summary: {
        missing_schema_count: smoke.schema_checks.filter((item) => !item.exists).length,
        warning_count: smoke.warnings.length,
        page_count: smoke.console_pages.length,
      },
      safety: {
        read_only: true,
        process_restarted: false,
        source_changed: false,
        task_state_changed: false,
        commit_or_push: false,
      },
      created_at: studioTimestampParts().iso,
    };
  }

  function existsRel(repoRoot, relativePath) {
    return fs.existsSync(repoPath(repoRoot, relativePath));
  }

  function readinessGate(id, stage, label, meaning, requiredItems, missingItems, nextActions) {
    const missing = (missingItems || []).filter(Boolean);
    return {
      id,
      stage,
      label,
      status: missing.length ? "attention" : "pass",
      meaning,
      required_items: requiredItems,
      missing_or_weak_items: missing,
      next_actions: missing.length ? nextActions : ["이 gate는 C 단계 기준을 만족합니다."],
    };
  }

  function buildCompanyRuntimeReadinessReport(repoRoot, context = {}) {
    const stores = context.stores || {};
    const staffDirectory = context.staffDirectory || { departments: [], staff: [] };
    const workflowCore = context.workflowCore || {};
    const projectProfiles = context.projectProfiles || { profiles: [] };
    const toolRegistry = context.toolRegistry || {};
    const toolAdapters = Array.isArray(toolRegistry.tool_adapters) ? toolRegistry.tool_adapters : [];
    const requiredFiles = {
      consoleServer: "tools/aiworkflow/studio_director_console_server.js",
      startBat: "tools/aiworkflow/studio_start_here.bat",
      userGuide: "_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html",
      staffRegistry: "_Docs/AIWorkflow/Studio/Registries/staff_agents.initial.json",
      departmentRegistry: "_Docs/AIWorkflow/Studio/Registries/departments.initial.json",
      workOrderPlanner: "tools/aiworkflow/studio_workorder_planner.ps1",
      workOrderBindingSchema: "_Docs/AIWorkflow/Studio/Schemas/WorkOrderTaskBinding.schema.json",
      pcRunner: "tools/aiworkflow/pc_runner.ps1",
      verification: "tools/aiworkflow/verification_report.ps1",
      completion: "tools/aiworkflow/completion_report.ps1",
      finalization: "tools/aiworkflow/finalization_log.ps1",
      contextBuilder: "tools/aiworkflow/studio_context_builder.ps1",
      staffExecutor: "tools/aiworkflow/studio_staff_executor.ps1",
      staffRuntime: "tools/aiworkflow/studio_staff_runtime.ps1",
      meetingRuntime: "tools/aiworkflow/studio_meeting_runtime.ps1",
      memoryStore: "tools/aiworkflow/studio_memory_store.ps1",
      decisionStore: "tools/aiworkflow/studio_decision_store.ps1",
      handoffRouter: "tools/aiworkflow/studio_handoff_router.ps1",
      outputMaterializer: "tools/aiworkflow/studio_output_materializer.ps1",
      materializationReview: "tools/aiworkflow/studio_materialization_review.ps1",
      toolRunPlanner: "tools/aiworkflow/studio_tool_run_planner.ps1",
      automationPolicy: "tools/aiworkflow/studio_conditional_automation.ps1",
    };
    const missingFiles = (keys) => keys
      .map((key) => requiredFiles[key])
      .filter((relativePath) => !existsRel(repoRoot, relativePath));

    const gates = [
      readinessGate(
        "A-console-mvp",
        "A",
        "Studio Console MVP",
        "Human Director가 Studio 화면만 보고 현재 작업, 직원, 자문, 검증 자료, git gate를 이해할 수 있어야 합니다.",
        ["Director Console server", "daily Studio pages", "Korean user guide", "department/staff registries"],
        [
          ...missingFiles(["consoleServer", "startBat", "userGuide", "staffRegistry", "departmentRegistry"]),
          staffDirectory.departments.length ? "" : "Department registry has no departments.",
          staffDirectory.staff.length ? "" : "Staff registry has no active staff agents.",
        ],
        ["Studio server, guide, registry를 먼저 복구한 뒤 Home smoke를 다시 실행하세요."]
      ),
      readinessGate(
        "B-workorder-task-runtime",
        "B",
        "WorkOrder to Task/Runner bridge",
        "Studio 업무 지시가 기존 AIWorkflow Task lifecycle, PC Runner, 검증, 완료, git gate로 이어져야 합니다.",
        ["WorkOrder store", "WorkOrderTaskBinding", "Backlog task creation", "PC Runner", "VerificationReport", "CompletionReport", "FinalizationLog"],
        [
          ...missingFiles(["workOrderPlanner", "workOrderBindingSchema", "pcRunner", "verification", "completion", "finalization"]),
        ],
        ["WorkOrder planner와 PC Runner/Verification/Completion scripts를 복구하세요."]
      ),
      readinessGate(
        "C-staff-runtime",
        "C",
        "Persistent Staff Agent runtime",
        "AI 직원이 역할, 권한, 기억, 업무 지시를 받아 RoleRun 산출물을 만들고 검토 가능한 채택 후보를 남길 수 있어야 합니다.",
        ["StaffAgent registry", "StaffContextPacket builder", "Staff executor", "Staff runtime", "RoleRunOutput materializer", "materialization review"],
        [
          ...missingFiles(["staffRegistry", "contextBuilder", "staffExecutor", "staffRuntime", "outputMaterializer", "materializationReview"]),
        ],
        ["직원 registry, context builder, staff executor, materializer를 먼저 복구하세요."]
      ),
      readinessGate(
        "C-meeting-loop",
        "C",
        "Creative Meeting loop",
        "자문이 단순 메모가 아니라 발언, 반박, 질문, AI 직원 발언 요청, 후속 업무 후보, 감독자 판단으로 이어져야 합니다.",
        ["MeetingSession runtime", "meeting turn recording", "agent turn planning/run", "meeting to WorkOrder", "meeting to Decision"],
        [
          ...missingFiles(["meetingRuntime", "staffExecutor", "contextBuilder", "workOrderPlanner", "decisionStore"]),
        ],
        ["Meeting runtime, staff executor, WorkOrder/Decision store를 복구하세요."]
      ),
      readinessGate(
        "C-memory-decision-governance",
        "C",
        "Memory / Canon / Decision governance",
        "제안, 결정, 기억, canon이 구분되어야 하며 승인되지 않은 제안이 공식 설정처럼 굳지 않아야 합니다.",
        ["Proposal/Decision store", "Memory store", "canon conflict report", "decision to memory/canon path"],
        [
          ...missingFiles(["decisionStore", "memoryStore"]),
        ],
        ["Decision/Memory store를 복구하고 canon conflict check를 다시 실행하세요."]
      ),
      readinessGate(
        "C-tool-policy-execution-boundary",
        "C",
        "Tool adapter and approval boundary",
        "AI 직원은 도구를 바로 휘두르지 않고 ToolRunRequest, permission class, approval gate, 검증 자료 책임을 거쳐야 합니다.",
        ["ToolAdapter registry", "ToolRunRequest planner", "conditional automation policy", "approval impact plan"],
        [
          ...missingFiles(["toolRunPlanner", "automationPolicy"]),
          toolAdapters.length ? "" : "ToolAdapter registry has no adapters.",
        ],
        ["ToolAdapter registry와 ToolRun planner/policy scripts를 복구하세요."]
      ),
    ];

    const passCount = gates.filter((gate) => gate.status === "pass").length;
    const cGates = gates.filter((gate) => gate.stage === "C");
    const cPassCount = cGates.filter((gate) => gate.status === "pass").length;
    const conceptualComplete = passCount === gates.length;
    const activeTask = workflowCore.active_task || {};
    const runner = workflowCore.runner || {};

    return {
      company_runtime_readiness_report_id: makeStudioId("CRR", "company-runtime"),
      generated_at: studioTimestampParts().iso,
      overall_status: conceptualComplete ? "conceptually_complete" : "needs_attention",
      overall_label: conceptualComplete ? "C 단계 개념 완성" : "C 단계 점검 필요",
      conceptual_completion_boundary: {
        fixed_standard: "C: Personal AI Company v1",
        definition: "AI 직원, 자문, 업무 지시, 승인, 실행, 검증, 기억이 하나의 회사 런타임으로 닫힌 상태입니다.",
        after_c_is: "v1 안정화, 품질 개선, 역할/도구 확장, 운영 편의 개선입니다. C 이후 새 항목을 v1 미완성으로 재분류하지 않습니다.",
      },
      stage_summary: {
        total_gate_count: gates.length,
        passed_gate_count: passCount,
        c_gate_count: cGates.length,
        c_passed_gate_count: cPassCount,
        console_mvp: gates.find((gate) => gate.id === "A-console-mvp")?.status || "unknown",
        runtime_mvp: gates.find((gate) => gate.id === "B-workorder-task-runtime")?.status || "unknown",
        company_v1: cPassCount === cGates.length ? "pass" : "attention",
      },
      current_operational_snapshot: {
        active_task_id: activeTask.task_id || "",
        active_task_status: activeTask.status || "",
        runner_run_id: runner.runner_run_id || "",
        runner_stop_reason: runner.stop_reason || "",
        project_profile_count: Array.isArray(projectProfiles.profiles) ? projectProfiles.profiles.length : 0,
        department_count: staffDirectory.departments.length,
        staff_count: staffDirectory.staff.length,
        work_order_count: stores.work_orders || 0,
        meeting_count: stores.meetings || 0,
        decision_count: stores.decisions || 0,
        memory_count: stores.memories || 0,
        task_binding_count: stores.task_bindings || 0,
        role_run_count: stores.role_runs || 0,
      },
      gates,
      next_actions: conceptualComplete
        ? [
            "Studio를 C: Personal AI Company v1 개념 완성 상태로 취급합니다.",
            "이후 작업은 v1 안정화, UX polish, 역할/도구 확장, smoke 강화로 분류합니다.",
            "새로운 큰 개념이 나오면 v2 후보로 분리하고 v1 미완성으로 되돌리지 않습니다.",
          ]
        : [
            "attention gate의 missing_or_weak_items를 먼저 해결하세요.",
            "해결 후 C 단계 점검과 Studio smoke를 다시 실행하세요.",
            "C gate가 모두 pass가 되면 개념 완성으로 선언합니다.",
          ],
      safety: {
        read_only: true,
        task_state_changed: false,
        source_changed: false,
        staff_run_started: false,
        commit_or_push: false,
      },
    };
  }


  return {
    buildAutomationReadinessPlan,
    buildCanonConflictReport,
    buildModelRoutingPlan,
    buildProjectExecutionPlan,
    buildStudioRecoveryPlan,
    buildStudioSmokeReport,
    buildTraceabilityMap,
    buildCompanyRuntimeReadinessReport,
  };
}

module.exports = { createStudioOperationalPlanBuilders };

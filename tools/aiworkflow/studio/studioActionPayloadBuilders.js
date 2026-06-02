#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { getStaffDirectory } = require("./studioDataService");

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

function listFromText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(/\r?\n|,/u)
    .map((item) => item.trim())
    .filter(Boolean);
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

function approvalSummaryList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return item.trim();
    if (!item || typeof item !== "object") return "";
    const type = item.type ? "[" + item.type + "] " : "";
    return (type + (item.plain_language_summary || item.summary || item.what_will_change?.[0] || "")).trim();
  }).filter(Boolean);
}

function requireStudioText(value, label) {
  const text = String(value || "").trim();
  if (!text) throw new Error(String(label) + " is required.");
  return text;
}

function hasAnyText(text, keywords) {
  const lower = String(text || "").toLowerCase();
  return keywords.some((keyword) => lower.includes(String(keyword).toLowerCase()));
}

function uniqueList(items) {
  return Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean)));
}

function inferDirectorGoalRoute(goal, constraints = []) {
  const text = `${goal}\n${constraints.join("\n")}`;
  const departments = ["executive_production"];
  const staff = ["executive_producer"];
  const reasons = [];

  if (hasAnyText(text, ["story", "scenario", "narrative", "canon", "world", "character", "plot", "시나리오", "스토리", "세계관", "설정", "캐릭터", "서사"])) {
    departments.push("creative_direction", "narrative");
    staff.push("creative_director", "scenario_director", "scenario_writer");
    reasons.push("서사, 세계관, 캐릭터, canon 판단이 필요할 수 있습니다.");
  }
  if (hasAnyText(text, ["design", "loop", "balance", "combat", "system", "reward", "skill", "게임 디자인", "루프", "밸런스", "전투", "보상", "스킬"])) {
    departments.push("game_design");
    staff.push("game_designer", "system_designer", "balance_designer");
    reasons.push("게임 규칙, 루프, 밸런스 방향을 먼저 정리해야 합니다.");
  }
  if (hasAnyText(text, ["code", "runtime", "build", "loader", "schema", "save", "data", "json", "bug", "fix", "구현", "런타임", "빌드", "로더", "스키마", "저장", "데이터", "버그", "수정"])) {
    departments.push("engineering", "qa_testing");
    staff.push("technical_architect", "gameplay_programmer", "qa_tester");
    reasons.push("소스, 데이터, 런타임, 검증 경계를 명확히 해야 합니다.");
  }
  if (hasAnyText(text, ["art", "asset", "sprite", "vfx", "image", "concept", "ui", "아트", "에셋", "스프라이트", "이펙트", "이미지", "컨셉"])) {
    departments.push("art_assets", "creative_direction");
    staff.push("art_director", "concept_artist", "asset_curator");
    reasons.push("생성 에셋, 라이선스, 반입 승인 경계가 필요합니다.");
  }
  if (hasAnyText(text, ["doc", "guide", "manual", "devlog", "release", "문서", "가이드", "매뉴얼", "릴리즈", "기록"])) {
    departments.push("documentation_release");
    staff.push("documentation_keeper", "release_manager");
    reasons.push("사용자 가이드, 기록, 릴리즈 노트 갱신 여부를 봐야 합니다.");
  }
  if (hasAnyText(text, ["test", "verify", "qa", "smoke", "validation", "검증", "테스트", "스모크", "확인"])) {
    departments.push("qa_testing");
    staff.push("qa_tester", "regression_tester");
    reasons.push("검증 자료와 완료 판단 기준을 먼저 세워야 합니다.");
  }

  if (staff.length < 3) {
    departments.push("creative_direction", "qa_testing");
    staff.push("creative_director", "qa_tester", "documentation_keeper");
    reasons.push("목표가 넓으므로 방향 결정, 검증, 기록 담당을 함께 세웁니다.");
  }

  return {
    departments: uniqueList(departments),
    staff: uniqueList(staff),
    reasons: uniqueList(reasons),
  };
}

function meetingTypeForRoute(route) {
  if (route.departments.includes("engineering")) return "technical";
  if (route.departments.includes("qa_testing")) return "qa_triage";
  if (route.departments.includes("creative_direction") || route.departments.includes("narrative") || route.departments.includes("art_assets")) return "creative";
  return "production";
}

function buildDirectorGoalPlanPayload(body = {}) {
  const goal = requireStudioText(body.goal || body.text, "director goal");
  const constraints = listFromText(body.constraints);
  const targetProject = String(body.target_project_profile || "dustland_custom_cpp_prototype").trim() || "dustland_custom_cpp_prototype";
  const route = inferDirectorGoalRoute(goal, constraints);
  const goalId = makeStudioId("DGP", goal);
  const meetingType = meetingTypeForRoute(route);
  const coreScope = [
    `감독자 안건을 자문, 질문, 제안, 승인 항목, 후속 업무 후보로 분해: ${goal}`,
    "부서/직원/자문/업무지시/승인 항목을 분리해서 제안합니다.",
    "승인 전에는 공식 설정, 소스 수정, task 실행, commit/push를 하지 않습니다.",
  ];
  const nonGoals = [
    "이 Director Brief만으로 공식 설정을 확정하지 않습니다.",
    "이 Director Brief만으로 소스, 데이터, 에셋, 문서를 수정하지 않습니다.",
    "이 Director Brief만으로 AIWorkflow task를 done 처리하거나 commit/push하지 않습니다.",
    ...constraints.map((item) => `감독자 제약 유지: ${item}`),
  ];
  const approvalItems = [
    {
      type: "scope",
      plain_language_summary: "이 안건을 어떤 자문, 질문, 제안, 업무 후보로 이어갈지 승인해야 합니다.",
      what_will_change: [
        "자문 후보, 업무 지시 후보, 제안 후보가 Studio 기록으로 만들어질 수 있습니다.",
        "선택한 후보만 다음 단계의 WorkOrder 또는 MeetingSession으로 넘어갑니다.",
      ],
      what_will_not_change: nonGoals,
      files_or_memory_affected: ["_Docs/AIWorkflow/Studio/DirectorGoals", "_Docs/AIWorkflow/Studio/MeetingSessions", "_Docs/AIWorkflow/Studio/WorkOrders", "_Docs/AIWorkflow/Studio/Proposals"],
      risks: route.reasons.length ? route.reasons : ["목표 범위가 넓으면 후속 업무가 과하게 커질 수 있습니다."],
      rollback_plan: ["생성된 Studio 채택 후보를 superseded/rejected로 처리하거나 삭제 전 검토합니다."],
      evidence_required: ["DirectorGoalPlan JSON", "생성된 MeetingSession/WorkOrder/Proposal 후보"],
    },
  ];
  const meeting = buildMeetingPayload({
    topic: `Director goal planning: ${goal}`,
    meeting_type: meetingType,
    participants: route.staff.join(", "),
    chair_agent_id: route.staff.includes("executive_producer") ? "executive_producer" : route.staff[0],
    agenda: [
      "감독자 목표를 한 문장으로 재정의합니다.",
      "필요한 부서와 AI 직원 역할을 나눕니다.",
      "승인이 필요한 선택지를 분리합니다.",
      "후속 업무 후보를 정리합니다.",
    ],
    known_constraints: constraints,
    loaded_context_refs: [goalId, targetProject],
  });
  const workOrder = {
    ...buildWorkOrderPayload({
      objective: `Plan and scope Director goal: ${goal}`,
      department_id: route.departments[0] || "executive_production",
      assigned_agents: route.staff.join(", "),
      scope: coreScope,
      non_goals: nonGoals,
      expected_outputs: [
        "감독자가 읽을 수 있는 Director Brief",
        "승인 필요 항목 목록",
        "후속 자문/업무/제안 후보",
        "검증 자료 요구사항",
      ],
      approval_summary: "감독자 안건을 Studio 자문/업무/제안 후보로 분해하는 것만 승인합니다.",
      verification_plan: [
        "후보가 승인 전 실행/공식 설정/소스 수정/commit/push를 하지 않는지 확인합니다.",
        "부서/직원/승인 항목이 목표와 직접 연결되는지 확인합니다.",
        "후속 업무가 너무 크면 더 작은 WorkOrder로 나눕니다.",
      ],
      target_project_profile: targetProject,
      status: "director_review",
    }),
    source_type: "director_goal",
    source_ref: goalId,
  };
  const proposal = {
    ...buildProposalPayload({
      title: `Director agenda direction: ${goal}`,
      source_agent_id: route.staff.includes("creative_director") ? "creative_director" : "executive_producer",
      summary: `이 목표는 ${route.departments.join(", ")} 관점에서 분해하고, 감독자 승인이 필요한 항목을 먼저 분리해야 합니다.`,
      rationale: route.reasons.join(" ") || "Studio가 감독자 목표를 안전하게 업무 후보로 분해하기 위한 초기 제안입니다.",
      risks: approvalItems[0].risks,
      approval_items: approvalItems.map((item) => item.plain_language_summary),
      evidence_refs: [goalId],
    }),
    source_type: "director_goal",
    source_ref: goalId,
  };

  return {
    director_goal_plan_id: goalId,
    goal,
    target_project_profile: targetProject,
    status: "director_review",
    recommended_departments: route.departments,
    recommended_staff: route.staff,
    routing_reasons: route.reasons,
    constraints,
    approval_items: approvalItems,
    non_goals: nonGoals,
    meeting_recommendations: [meeting],
    work_order_candidates: [workOrder],
    proposal_candidates: [proposal],
    next_steps: [
      "브리프를 저장해 검토 기록으로 남깁니다.",
      "필요하면 브리프 + 다음 처리 후보 생성을 눌러 자문/질문/업무/제안 후보를 함께 만듭니다.",
      "생성된 후보 중 실제로 진행할 항목만 감독자가 승인합니다.",
    ],
    safety: {
      source_changed: false,
      task_state_changed: false,
      canon_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
    updated_at: studioTimestampParts().iso,
  };
}

async function buildStaffOperatingPlan(repoRoot, agentId) {
  const directory = await getStaffDirectory(repoRoot);
  const agent = directory.staff.find((item) => item.agent_id === agentId);
  if (!agent) {
    throw new Error(`Unknown staff agent: ${agentId}`);
  }
  const outputStates = [
    {
      state: "draft",
      meaning: "직원이 만든 초안입니다. 아직 제안, 결정, 공식 설정, 업무 지시가 아닙니다.",
      director_action: "읽고 버리거나, 채택 후보로 넘길지 결정합니다.",
    },
    {
      state: "proposal",
      meaning: "채택 여부를 판단할 아이디어입니다. 승인 전에는 canon이나 구현 범위가 아닙니다.",
      director_action: "채택, 수정 요청, 반려, 공식 설정 후보 중 하나로 판단합니다.",
    },
    {
      state: "approval_candidate",
      meaning: "사람 승인이 있어야 다음 단계로 넘어갈 수 있는 항목입니다.",
      director_action: "무엇이 바뀌는지 확인하고 승인하거나 수정 요청합니다.",
    },
    {
      state: "accepted",
      meaning: "Human Director가 받아들인 기록입니다. 그래도 실행, 완료, 커밋은 별도 gate입니다.",
      director_action: "필요하면 Memory, WorkOrder, AIWorkflow task로 넘깁니다.",
    },
    {
      state: "rejected",
      meaning: "채택하지 않기로 한 기록입니다. 이후 직원이 같은 방향을 반복하지 않도록 근거로 남깁니다.",
      director_action: "반려 이유가 충분한지 확인합니다.",
    },
  ];
  return {
    staff_operating_plan_id: makeStudioId("SOP", agent.agent_id),
    agent_id: agent.agent_id,
    display_name: agent.display_name_ko || agent.display_name || agent.agent_id,
    department_id: agent.department_id,
    department_name: agent.department_name_ko,
    role_title: agent.role_title_ko || agent.role_title,
    current_meaning: `${agent.display_name_ko || agent.agent_id}는 ${agent.department_name_ko || agent.department_id} 소속의 ${agent.role_title_ko || agent.role_title}입니다. 이 직원은 자기 역할 안에서 제안하고 반박할 수 있지만, 승인/공식 설정/실행/커밋 권한은 갖지 않습니다.`,
    identity: {
      mission: agent.mission_ko || agent.mission,
      stable_preferences: agent.stable_preferences,
      collaboration_style: agent.collaboration_style,
      anti_patterns: agent.anti_patterns,
    },
    authority_boundary: {
      can_do: agent.authority_ko || agent.authority,
      must_request_approval_for: agent.approval_required_actions_ko || agent.approval_required_actions,
      must_not_do: agent.forbidden_actions,
    },
    memory_boundary: {
      readable_scopes: agent.readable_memory_scopes,
      writable_scopes: agent.writable_memory_scopes,
      canon_write_permission: agent.canon_write_permission,
      plain_language_rule: agent.canon_write_permission === "none"
        ? "이 직원은 canon을 직접 쓰지 않습니다."
        : agent.canon_write_permission === "propose_only"
          ? "이 직원은 canon 후보를 제안할 수 있지만 확정은 Human Director 결정이 필요합니다."
          : "canon 기록에는 명시 승인 gate가 필요합니다.",
    },
    tool_boundary: {
      allowed_tools: agent.allowed_tools,
      approval_required_tools: agent.approval_required_tools,
      blocked_tools: agent.blocked_tools,
    },
    output_contract: {
      required_outputs: agent.output_contracts_ko || agent.output_contracts,
      optional_outputs: agent.optional_outputs,
      structured_schemas: agent.structured_schemas,
      output_states: outputStates,
    },
    meeting_behavior: {
      should_object_when: agent.meeting_must_object_when,
      should_ask_when: agent.meeting_must_ask_when,
    },
    handoff_behavior: {
      can_handoff_to: agent.handoff_targets,
      handoff_requires: agent.handoff_requires,
    },
    evidence_and_quality: {
      required_evidence: agent.required_evidence,
      cannot_claim_without_evidence: agent.cannot_claim_without_evidence,
      pass_conditions: agent.pass_conditions,
      failure_patterns: agent.failure_patterns,
    },
    director_checklist: [
      "이 직원에게 맡길 업무가 역할/부서 책임 안에 있는지 확인합니다.",
      "승인 없이 하면 안 되는 항목이 업무 범위에 숨어 있는지 확인합니다.",
      "산출물이 draft, proposal, approval_candidate, accepted 중 어느 상태인지 분리합니다.",
      "근거 없이 완료나 품질을 주장하지 않았는지 확인합니다.",
    ],
    safety: {
      read_only: true,
      staff_run_started: false,
      memory_written: false,
      canon_changed: false,
      task_state_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildMeetingPayload(body = {}) {
  const topic = requireStudioText(body.topic, "meeting topic");
  const participants = Array.isArray(body.participants)
    ? body.participants.map((item) => String(item || "").trim()).filter(Boolean)
    : listFromText(body.participants);
  const chair = String(body.chair_agent_id || participants[0] || "executive_producer").trim();
  const finalParticipants = Array.from(new Set([chair, ...participants].filter(Boolean)));
  const meetingId = makeStudioId("MEET", topic);
  return {
    meeting_id: meetingId,
    topic,
    meeting_type: String(body.meeting_type || "creative").trim() || "creative",
    participants: finalParticipants,
    chair_agent_id: chair,
    director_user_id: "human_director",
    agenda: listFromText(body.agenda).length ? listFromText(body.agenda) : ["Clarify the Director goal.", "List proposals, objections, and follow-up work."],
    known_constraints: listFromText(body.known_constraints),
    loaded_context_refs: listFromText(body.loaded_context_refs),
    discussion_turns: [],
    proposals: [],
    objections: [],
    unresolved_questions: [],
    director_decisions: [],
    accepted_directions: [],
    rejected_directions: [],
    follow_up_workorders: [],
    minutes_artifact: `_Docs/AIWorkflow/Studio/MeetingSessions/${meetingId}.json`,
    status: "draft",
  };
}

function buildWorkOrderPayload(body = {}) {
  const objective = requireStudioText(body.objective, "work order objective");
  const approvalSummary = String(body.approval_summary || "").trim();
  const scope = listFromText(body.scope).length ? listFromText(body.scope) : [objective];
  const verification = listFromText(body.verification_plan).length ? listFromText(body.verification_plan) : ["Review generated task scope before execution."];
  return {
    work_order_id: makeStudioId("WO", objective),
    source_type: "manual",
    source_ref: "studio_console",
    objective,
    department_id: String(body.department_id || "executive_production").trim(),
    assigned_agents: listFromText(body.assigned_agents),
    scope,
    non_goals: listFromText(body.non_goals),
    expected_outputs: listFromText(body.expected_outputs).length ? listFromText(body.expected_outputs) : ["업무 지시에서 파생된 작업 초안 또는 검토 가능한 산출물"],
    approval_items: approvalSummary ? [{
      type: "scope",
      plain_language_summary: approvalSummary,
      what_will_change: scope,
      what_will_not_change: listFromText(body.non_goals),
      files_or_memory_affected: listFromText(body.files_or_memory_affected),
      risks: listFromText(body.risks),
      rollback_plan: listFromText(body.rollback_plan),
      evidence_required: listFromText(body.evidence_requirements).length ? listFromText(body.evidence_requirements) : verification,
    }] : [],
    evidence_requirements: listFromText(body.evidence_requirements),
    verification_plan: verification,
    handoff_plan: listFromText(body.handoff_plan),
    target_project_profile: String(body.target_project_profile || "dustland_custom_cpp_prototype").trim(),
    status: String(body.status || "director_review").trim() || "director_review",
  };
}

function buildProposalPayload(body = {}) {
  const title = requireStudioText(body.title, "proposal title");
  const summary = requireStudioText(body.summary, "proposal summary");
  return {
    proposal_id: makeStudioId("PROP", title),
    source_agent_id: String(body.source_agent_id || "creative_director").trim(),
    source_type: "manual",
    source_ref: "studio_console",
    title,
    summary,
    rationale: String(body.rationale || "Created directly from Studio Console for Human Director review.").trim(),
    options: [{
      option_id: "option-a",
      title,
      summary,
      tradeoffs: listFromText(body.tradeoffs),
    }],
    risks: listFromText(body.risks),
    dependencies: listFromText(body.dependencies),
    approval_items: listFromText(body.approval_items).length ? listFromText(body.approval_items) : ["이 제안이 결정 또는 공식 설정이 되려면 Human Director 승인이 필요합니다."],
    evidence_refs: listFromText(body.evidence_refs).length ? listFromText(body.evidence_refs) : ["studio_console"],
    status: "submitted",
  };
}

function buildDecisionPayload(body = {}) {
  const targetRef = requireStudioText(body.target_ref, "decision target_ref");
  return {
    decision_id: makeStudioId("DEC", targetRef),
    decision_maker: "human_director",
    decision_type: String(body.decision_type || "approve").trim() || "approve",
    target_ref: targetRef,
    decision_summary: requireStudioText(body.decision_summary, "decision summary"),
    accepted_scope: listFromText(body.accepted_scope),
    rejected_scope: listFromText(body.rejected_scope),
    conditions: listFromText(body.conditions),
    timestamp: studioTimestampParts().iso,
    evidence_refs: listFromText(body.evidence_refs).length ? listFromText(body.evidence_refs) : [targetRef],
  };
}

function buildMemoryPayload(body = {}) {
  const content = requireStudioText(body.content, "memory content");
  const sourceRefs = listFromText(body.source_refs);
  return {
    memory_id: makeStudioId("MEM", content),
    project_id: String(body.project_id || "playground").trim(),
    scope: String(body.scope || "project").trim() || "project",
    type: String(body.type || "fact").trim() || "fact",
    status: String(body.status || "proposed").trim() || "proposed",
    content,
    source_refs: sourceRefs.length ? sourceRefs : ["studio_console"],
    confidence: String(body.confidence || "medium").trim() || "medium",
    owner_agent_id: String(body.owner_agent_id || "documentation_keeper").trim(),
    created_at: studioTimestampParts().iso,
    updated_at: studioTimestampParts().iso,
  };
}

function inferDepartmentFromAgents(agentIds, fallback = "executive_production") {
  const ids = stringList(agentIds).join(" ").toLowerCase();
  if (ids.includes("scenario") || ids.includes("narrative")) return "narrative";
  if (ids.includes("art") || ids.includes("artist")) return "art";
  if (ids.includes("qa") || ids.includes("tester")) return "qa_testing";
  if (ids.includes("engineer") || ids.includes("programmer") || ids.includes("technical")) return "engineering";
  if (ids.includes("producer") || ids.includes("project_manager")) return "production";
  return fallback;
}

function buildWorkOrderFromMeetingPayload(meeting = {}) {
  const topic = requireStudioText(meeting.topic || meeting.meeting_id, "meeting topic");
  const proposals = stringList(meeting.proposals);
  const accepted = stringList(meeting.accepted_directions);
  const unresolved = stringList(meeting.unresolved_questions);
  const objections = stringList(meeting.objections);
  const participants = stringList(meeting.participants);
  const objective = proposals[0]
    ? `Follow up meeting proposal: ${proposals[0]}`
    : `Resolve follow-up work from meeting: ${topic}`;
  const scope = [
    ...accepted,
    ...proposals.map((item) => `Prepare director-reviewable follow-up for: ${item}`),
    ...unresolved.map((item) => `Clarify unresolved question: ${item}`),
  ].filter(Boolean);
  const nonGoals = [
    "Human Director 결정 없이 자문에서 나온 말을 공식 설정으로 취급하지 않습니다.",
    "이 업무 지시만으로 소스, 데이터, 에셋 수정, task done, commit, push를 실행하지 않습니다.",
    ...objections.map((item) => `Respect meeting objection: ${item}`),
  ];
  return {
    work_order_id: makeStudioId("WO", objective),
    source_type: "meeting",
    source_ref: meeting.meeting_id || "meeting",
    objective,
    department_id: inferDepartmentFromAgents(participants),
    assigned_agents: participants,
    scope: scope.length ? scope : [`Summarize meeting outcome for Human Director review: ${topic}`],
    non_goals: nonGoals,
    expected_outputs: ["업무 지시 후속 계획", "승인 필요 항목", "검증 자료 참조"],
    approval_items: [{
      type: "scope",
      plain_language_summary: "Approve only the focused follow-up work described by this meeting.",
      what_will_change: scope.length ? scope : [objective],
      what_will_not_change: nonGoals,
      files_or_memory_affected: ["별도 task가 생성되고 승인되기 전까지는 Studio 업무 지시만 영향을 받습니다."],
      risks: unresolved.length ? unresolved : ["Meeting output may be incomplete without Human Director review."],
      rollback_plan: ["나중의 Human Director 결정으로 이 업무 지시를 반려하거나 대체합니다."],
      evidence_required: [meeting.meeting_id || "meeting", meeting.minutes_artifact || "MeetingSession JSON"],
    }],
    evidence_requirements: [meeting.meeting_id || "meeting", meeting.minutes_artifact || "MeetingSession JSON"],
    verification_plan: [
      "업무 지시가 자문 후속 범위 안에 머무르는지 확인합니다.",
      "공식 설정, 구현, task done, commit, push가 별도 gate로 남아 있는지 확인합니다.",
      "Confirm approval items state what may change and what must not change.",
    ],
    handoff_plan: participants.length ? participants.map((agent) => `${agent} contributes within role authority.`) : ["Assign a suitable StaffAgent before execution."],
    target_project_profile: "playground",
    status: "director_review",
  };
}

async function buildWorkOrderHandoffPlan(repoRoot, workOrder = {}) {
  const directory = await getStaffDirectory(repoRoot);
  const agentIds = stringList(workOrder.assigned_agents);
  const department = directory.departments.find((item) => item.department_id === workOrder.department_id);
  const agents = agentIds
    .map((agentId) => directory.staff.find((agent) => agent.agent_id === agentId))
    .filter(Boolean);
  const fallbackAgents = directory.staff
    .filter((agent) => agent.department_id === workOrder.department_id)
    .slice(0, 3);
  const recommendedAgents = agents.length ? agents : fallbackAgents;
  const missing = [];
  if (!stringList(workOrder.scope).length) missing.push("할 일이 비어 있습니다.");
  if (!stringList(workOrder.non_goals).length) missing.push("제약 조건이 비어 있습니다.");
  if (!stringList(workOrder.expected_outputs).length) missing.push("기대 산출물이 비어 있습니다.");
  if (!stringList(workOrder.verification_plan).length) missing.push("검증 계획이 비어 있습니다.");
  if (!recommendedAgents.length) missing.push("담당 AI 직원을 찾지 못했습니다.");
  if (!Array.isArray(workOrder.approval_items) || !workOrder.approval_items.length) missing.push("승인 항목이 없습니다. 저위험 읽기 작업이 아니라면 승인 범위를 보강해야 합니다.");

  return {
    work_order_handoff_plan_id: makeStudioId("WOH", workOrder.work_order_id || workOrder.objective || "workorder"),
    work_order_id: workOrder.work_order_id || "",
    source_type: workOrder.source_type || "",
    source_ref: workOrder.source_ref || "",
    objective: workOrder.objective || "",
    current_meaning: "업무 지시를 실제 AI 직원 실행, 후속 업무, 또는 AIWorkflow task로 넘기기 전에 인수인계 품질을 확인합니다.",
    target_department: {
      department_id: workOrder.department_id || "",
      name: department ? department.name_ko || department.name : workOrder.department_id || "",
      review_gates: department ? department.review_gate_labels || [] : [],
    },
    recommended_staff: recommendedAgents.map((agent) => ({
      agent_id: agent.agent_id,
      display_name: agent.display_name_ko || agent.display_name || agent.agent_id,
      role_title: agent.role_title_ko || agent.role_title,
      why: agentIds.includes(agent.agent_id)
        ? "업무 지시에 이미 배정된 직원입니다."
        : "같은 부서의 대체 담당 후보입니다.",
    })),
    handoff_contract: {
      inputs_required: [
        ...(workOrder.scope || []).map((item) => `할 일: ${item}`),
        ...(workOrder.non_goals || []).map((item) => `제약 조건: ${item}`),
      ],
      expected_outputs: stringList(workOrder.expected_outputs),
      approval_items: approvalSummaryList(workOrder.approval_items),
      evidence_required: stringList(workOrder.evidence_requirements).length
        ? stringList(workOrder.evidence_requirements)
        : stringList(workOrder.verification_plan),
    },
    missing_or_weak_items: missing,
    next_actions: missing.length
      ? ["업무 지시 내용을 보강한 뒤 직원 자료 미리보기 또는 직원 실행 계획을 다시 확인합니다."]
      : ["직원 자료 미리보기로 전달 문맥을 확인합니다.", "직원 실행 계획으로 모델/명령/권한을 확인합니다.", "필요하면 작업 목록에 넣어 AIWorkflow gate를 통과시킵니다."],
    safety: {
      read_only: true,
      context_packet_written: false,
      staff_run_started: false,
      task_created: false,
      source_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildDecisionFromMeetingPayload(meeting = {}, decisionType = "approve") {
  const topic = requireStudioText(meeting.topic || meeting.meeting_id, "meeting topic");
  const accepted = stringList(meeting.accepted_directions);
  const proposals = stringList(meeting.proposals);
  const rejected = [
    ...stringList(meeting.rejected_directions),
    ...stringList(meeting.objections),
  ];
  const unresolved = stringList(meeting.unresolved_questions);
  const turns = Array.isArray(meeting.discussion_turns) ? meeting.discussion_turns : [];
  const lastTurn = turns[turns.length - 1] || null;
  const fallbackAcceptedScope = [
    `자문 주제 검토: ${topic}`,
    lastTurn?.content ? `마지막 발언 참고: ${shortText(lastTurn.content, 240)}` : "",
  ].filter(Boolean);
  const acceptedScope = accepted.length ? accepted : (proposals.length ? proposals : fallbackAcceptedScope);
  return {
    decision_id: makeStudioId("DEC", meeting.meeting_id || topic),
    decision_maker: "human_director",
    decision_type: decisionType,
    target_ref: meeting.meeting_id || "meeting",
    decision_summary: accepted.length
      ? `자문에서 합의된 방향을 기록합니다: ${accepted.join("; ")}`
      : `자문 결과를 감독자 판단 기록으로 남깁니다: ${topic}`,
    accepted_scope: acceptedScope,
    rejected_scope: rejected,
    conditions: unresolved.length ? unresolved.map((item) => `아직 미해결: ${item}`) : ["구현, 공식 설정, task done, commit, push는 별도 gate가 필요합니다."],
    timestamp: studioTimestampParts().iso,
    evidence_refs: [meeting.meeting_id || "meeting", meeting.minutes_artifact || ""].filter(Boolean),
  };
}

function resolveMeetingAgent(meeting, requestedAgentId = "") {
  const requested = String(requestedAgentId || "").trim();
  if (requested) return requested;
  const participants = stringList(meeting.participants);
  const turns = Array.isArray(meeting.discussion_turns) ? meeting.discussion_turns : [];
  const spoken = new Set(turns.map((turn) => String(turn.speaker_id || "").trim()).filter(Boolean));
  const staffParticipants = participants.filter((id) => !["human_director", "executive_producer"].includes(id));
  return staffParticipants.find((id) => !spoken.has(id)) || staffParticipants[0] || participants[0] || "creative_director";
}

function buildMeetingAgentTurnWorkOrder(meeting = {}, agentId = "") {
  const topic = requireStudioText(meeting.topic || meeting.meeting_id, "meeting topic");
  const speaker = resolveMeetingAgent(meeting, agentId);
  const agenda = stringList(meeting.agenda);
  const constraints = stringList(meeting.known_constraints);
  const proposals = stringList(meeting.proposals);
  const objections = stringList(meeting.objections);
  const unresolved = stringList(meeting.unresolved_questions);
  const objective = `Prepare a meeting contribution from ${speaker}: ${topic}`;
  return {
    work_order_id: makeStudioId("WO", objective),
    source_type: "meeting_agent_turn",
    source_ref: meeting.meeting_id || "meeting",
    objective,
    department_id: inferDepartmentFromAgents([speaker]),
    assigned_agents: [speaker],
    scope: [
      `Contribute to the meeting topic: ${topic}`,
      "Write the meeting contribution in natural Korean for the Human Director.",
      ...agenda.map((item) => `Address agenda: ${item}`),
      ...proposals.map((item) => `React to proposal: ${item}`),
      ...objections.map((item) => `Respect objection: ${item}`),
      ...unresolved.map((item) => `Clarify unresolved question: ${item}`),
    ],
    non_goals: [
      "Do not finalize meeting decisions.",
      "Do not write English meeting summaries unless an English code identifier, command, file path, or schema key is required.",
      "공식 설정을 생성하거나 승인하지 않습니다.",
      "Do not create tasks, modify source/data/assets, mark done, commit, or push.",
      ...constraints.map((item) => `Keep constraint: ${item}`),
    ],
    expected_outputs: ["MeetingTurn", "OpenQuestions", "ApprovalItemsIfNeeded"],
    approval_items: [{
      type: "meeting_turn",
      plain_language_summary: `Ask ${speaker} for one role-scoped meeting contribution.`,
      what_will_change: ["A new Korean meeting turn may be appended to the stored MeetingSession."],
      what_will_not_change: ["소스/데이터/공식 설정/task/git 상태 변경은 승인되지 않았습니다."],
      files_or_memory_affected: [meeting.minutes_artifact || `_Docs/AIWorkflow/Studio/MeetingSessions/${meeting.meeting_id}.json`],
      risks: ["The staff contribution may need Human Director review before it becomes a decision."],
      rollback_plan: ["Remove or supersede the meeting turn through a later Director note if needed."],
      evidence_required: [meeting.meeting_id || "meeting", speaker],
    }],
    evidence_requirements: [meeting.meeting_id || "meeting", speaker],
    verification_plan: [
      "Confirm the generated contribution stays inside the agent role and meeting topic.",
      "Confirm the meeting contribution is written in natural Korean except for required IDs, commands, paths, or schema keys.",
      "결정, 공식 설정, task, 소스, commit, push 실행이 암시되지 않았는지 확인합니다.",
    ],
    handoff_plan: [`${speaker} contributes one meeting turn for Human Director review.`],
    target_project_profile: "playground",
    status: "director_review",
  };
}

function buildDecisionFromProposalPayload(proposal = {}, decisionType = "approve") {
  const title = requireStudioText(proposal.title || proposal.proposal_id, "proposal title");
  const decisionLabels = {
    approve: "채택",
    reject: "반려",
    defer: "보류",
    request_changes: "수정 요청",
    canonize: "공식 설정 후보",
  };
  const acceptedScope = decisionType === "reject"
    ? []
    : [proposal.summary || title, ...stringList(proposal.approval_items)];
  const rejectedScope = decisionType === "reject"
    ? [proposal.summary || title]
    : [];
  const conditions = [
    ...stringList(proposal.risks).map((item) => `Known risk: ${item}`),
    ...stringList(proposal.dependencies).map((item) => `Dependency: ${item}`),
  ];
  return {
    decision_id: makeStudioId("DEC", proposal.proposal_id || title),
    decision_maker: "human_director",
    decision_type: decisionType,
    target_ref: proposal.proposal_id || "proposal",
    decision_summary: `${decisionLabels[decisionType] || decisionType}: ${title}`,
    accepted_scope: acceptedScope,
    rejected_scope: rejectedScope,
    conditions: conditions.length ? conditions : ["후속 작업은 기존 업무 지시/task/승인 gate를 그대로 거쳐야 합니다."],
    timestamp: studioTimestampParts().iso,
    evidence_refs: [proposal.proposal_id || "", proposal.source_ref || "", ...stringList(proposal.evidence_refs)].filter(Boolean),
  };
}

function buildMemoryFromDecisionPayload(decision = {}, status = "") {
  const decisionId = requireStudioText(decision.decision_id, "decision_id");
  const memoryStatus = String(status || (decision.decision_type === "canonize" ? "canon" : "approved")).trim();
  const memoryType = memoryStatus === "canon" ? "canon" : (decision.decision_type === "reject" ? "rejection" : "decision");
  return {
    memory_id: makeStudioId("MEM", decisionId),
    project_id: "playground",
    scope: memoryStatus === "canon" ? "canon" : "project",
    type: memoryType,
    status: memoryStatus,
    content: decision.decision_summary || `${decision.decision_type} decision for ${decision.target_ref}`,
    source_refs: [decisionId, decision.target_ref || "", ...stringList(decision.evidence_refs)].filter(Boolean),
    confidence: "high",
    owner_agent_id: "documentation_keeper",
    created_at: studioTimestampParts().iso,
    updated_at: studioTimestampParts().iso,
  };
}

function resolveWorkOrderAgent(workOrder, requestedAgentId = "") {
  const requested = String(requestedAgentId || "").trim();
  if (requested) return requested;
  const assigned = stringList(workOrder.assigned_agents);
  if (assigned[0]) return assigned[0];
  const department = String(workOrder.department_id || "").trim();
  if (department === "narrative") return "scenario_director";
  if (department === "qa_testing") return "qa_tester";
  if (department === "engineering") return "technical_architect";
  if (department === "art") return "art_director";
  if (department === "production") return "producer";
  return "executive_producer";
}

function extractMeetingTurnFromStaffRun(repoRoot, runResult) {
  const outputPath = runResult?.role_run_output_path || "";
  const output = outputPath ? fs.existsSync(path.resolve(repoRoot, outputPath)) ? JSON.parse(fs.readFileSync(path.resolve(repoRoot, outputPath), "utf8")) : null : null;
  if (!output) return "";
  const parts = [];
  if (output.plain_language_summary) parts.push(output.plain_language_summary);
  if (Array.isArray(output.proposals) && output.proposals.length) {
    parts.push("제안: " + output.proposals.map((item) => item.title || item.summary || item.proposal_id || "").filter(Boolean).join("; "));
  }
  if (Array.isArray(output.approval_items) && output.approval_items.length) {
    parts.push("승인 필요: " + output.approval_items.map((item) => item.plain_language_summary || item.summary || item.title || String(item)).join("; "));
  }
  const questions = Array.isArray(output.questions) ? output.questions : output.open_questions;
  if (Array.isArray(questions) && questions.length) {
    parts.push("남은 질문: " + questions.map((item) => item.question || String(item)).join("; "));
  }
  if (Array.isArray(output.objections) && output.objections.length) {
    parts.push("우려/반론: " + output.objections.map((item) => item.summary || item.reason || String(item)).join("; "));
  }
  return parts.filter(Boolean).join("\n");
}

function buildToolRunRequestPayload(body) {
  const adapterId = requireStudioText(body.tool_adapter_id, "tool_adapter_id");
  const action = requireStudioText(body.requested_action, "requested_action");
  const purpose = requireStudioText(body.purpose, "purpose");
  const permission = String(body.permission_class || "read").trim() || "read";
  const requesterType = String(body.requester_type || "human_director").trim() || "human_director";
  const requesterRef = String(body.requester_ref || "studio-console").trim() || "studio-console";
  const id = makeStudioId("TRQ", `${adapterId}-${permission}`);
  return {
    tool_run_request_id: id,
    requester_type: requesterType,
    requester_ref: requesterRef,
    work_order_id: String(body.work_order_id || "").trim() || null,
    role_run_id: String(body.role_run_id || "").trim() || null,
    tool_adapter_id: adapterId,
    requested_action: action,
    command_id: String(body.command_id || "").trim() || null,
    permission_class: permission,
    purpose,
    input_refs: listFromText(body.input_refs),
    expected_outputs: listFromText(body.expected_outputs),
    evidence_requirements: listFromText(body.evidence_requirements),
    approval_ref: String(body.approval_ref || "").trim() || null,
    status: String(body.status || "director_review").trim() || "director_review",
    created_at: studioTimestampParts().iso,
    notes: [
      "Created from Studio Director Console.",
      "This record is a request only. It does not execute the adapter.",
    ],
  };
}

module.exports = {
  buildDecisionFromMeetingPayload,
  buildDecisionFromProposalPayload,
  buildDecisionPayload,
  buildDirectorGoalPlanPayload,
  buildMeetingAgentTurnWorkOrder,
  buildMeetingPayload,
  buildMemoryFromDecisionPayload,
  buildMemoryPayload,
  buildProposalPayload,
  buildStaffOperatingPlan,
  buildToolRunRequestPayload,
  buildWorkOrderFromMeetingPayload,
  buildWorkOrderHandoffPlan,
  buildWorkOrderPayload,
  extractMeetingTurnFromStaffRun,
  resolveMeetingAgent,
  resolveWorkOrderAgent,
};

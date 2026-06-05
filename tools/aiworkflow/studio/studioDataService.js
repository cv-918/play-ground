#!/usr/bin/env node
"use strict";

const {
  getConditionalAutomation,
  getContextPackets,
  getDecisions,
  getDevLogs,
  getDirectorGoalPlans,
  getHandoffCandidates,
  getMaterializations,
  getMeetings,
  getMemories,
  getProjectProfiles,
  getProposals,
  getReviewPackets,
  getStaffRuns,
  getToolAdapters,
  getToolRunRequests,
  getWorkOrders,
} = require("./studioDocumentDataLoaders");
const path = require("path");
const {
  readJsonIfExists,
  repoPath,
  toRepoRelative,
} = require("./studioDataUtils");
const { listExecutionRequestRecords } = require("./studioExecutionRequestStore");

const DEPARTMENT_UI = {
  executive_production: {
    name: "총괄 / 제작",
    mission: "감독 의도, 범위, 우선순위, 승인, 완료 흐름을 지키는 부서입니다.",
  },
  creative_direction: {
    name: "크리에이티브 디렉션",
    mission: "게임의 정체성, 톤, 플레이어 경험이 부서 사이에서 흔들리지 않게 정리합니다.",
  },
  game_design: {
    name: "게임 디자인",
    mission: "코어 루프, 시스템, 진행 구조, 전투/레벨, 플레이 동기를 설계합니다.",
  },
  narrative: {
    name: "내러티브 / 시나리오",
    mission: "스토리, 세계관, 캐릭터, 대사, 공식 설정 후보를 안전하게 제안합니다.",
  },
  engineering: {
    name: "엔지니어링",
    mission: "승인된 기술 작업을 구조와 검증 자료를 지키면서 설계하고 구현합니다.",
  },
  art_assets: {
    name: "아트 / 에셋",
    mission: "비주얼 방향, 생성 에셋, 라이선스/출처, 프로젝트 반입 준비를 검토합니다.",
  },
  qa_testing: {
    name: "QA / 테스트",
    mission: "버그 재현, 검증, 회귀 테스트, 완료 판단 자료를 맡습니다.",
  },
  documentation_release: {
    name: "문서 / 릴리즈",
    mission: "가이드, DevLog, 릴리즈 노트, 커밋/릴리즈 경계를 정확히 기록합니다.",
  },
};

const REVIEW_GATE_LABELS = {
  scope: "범위",
  approval: "승인",
  completion: "완료",
  git: "Git",
  direction: "방향성",
  canon: "공식 설정",
  player_experience: "플레이어 경험",
  core_loop: "코어 루프",
  system_fit: "시스템 적합성",
  balance_risk: "밸런스 위험",
  tone: "톤",
  character_motivation: "캐릭터 동기",
  architecture: "아키텍처",
  runtime: "런타임",
  data_schema: "데이터 스키마",
  build: "빌드",
  style_fit: "스타일 적합성",
  license_source: "라이선스/출처",
  asset_import: "에셋 반입",
  smoke: "스모크 테스트",
  regression: "회귀",
  evidence: "검증 자료",
  doc_drift: "문서 불일치",
  devlog: "DevLog",
  release_readiness: "릴리즈 준비",
};

const SENIORITY_LABELS = {
  director: "디렉터",
  lead: "리드",
  senior: "시니어",
};

const STAFF_UI = {
  executive_producer: {
    name: "총괄 프로듀서",
    role: "총괄 프로듀서",
    mission: "작업 범위, 우선순위, 승인 대기열, 완료 가능성을 관리합니다.",
    authority: ["범위 축소 제안", "명확화 질문 요청", "업무 순서 제안"],
    approvals: ["마일스톤 방향 변경", "고위험 유예 수용", "커밋 또는 릴리즈"],
    outputs: ["범위 권장안", "위험 목록", "승인 필요 항목"],
  },
  creative_director: {
    name: "크리에이티브 디렉터",
    role: "크리에이티브 디렉터",
    mission: "디자인, 스토리, 아트, 플레이 경험이 한 방향으로 맞는지 검토합니다.",
    authority: ["크리에이티브 방향 제안", "일관성 없는 제안에 우려 제기", "회의 요청"],
    approvals: ["공식 설정 변경", "큰 톤 변경", "장르 방향 변경"],
    outputs: ["크리에이티브 방향 브리프", "승인 필요 항목"],
  },
  game_designer: {
    name: "게임 디자이너",
    role: "게임 디자이너",
    mission: "방향성을 플레이 가능한 루프, 시스템, 진행 구조 제안으로 바꿉니다.",
    authority: ["메커닉 제안", "약한 플레이 루프 지적", "프로토타입 범위 요청"],
    approvals: ["코어 루프 변경", "진행 구조 변경", "구현 작업 생성"],
    outputs: ["게임 디자인 제안", "위험 목록", "승인 필요 항목"],
  },
  scenario_director: {
    name: "시나리오 디렉터",
    role: "시나리오 디렉터",
    mission: "스토리 방향, 세계관 제안, 캐릭터 갈등, 시나리오 작업 분해를 담당합니다.",
    authority: ["세계관 제안", "약한 캐릭터 동기 지적", "공식 설정 결정 요청"],
    approvals: ["핵심 세계관", "주인공 정의", "주요 캐릭터 공식 설정"],
    outputs: ["시나리오 피치", "스토리 흐름 계획", "캐릭터 브리프"],
  },
  technical_architect: {
    name: "기술 아키텍트",
    role: "기술 아키텍트",
    mission: "기술 경계, 런타임 안정성, 유지보수 가능한 구현 계획을 지킵니다.",
    authority: ["아키텍처 제약 제안", "저장소 분석 요청", "위험한 구현 계획 차단"],
    approvals: ["구조 리팩터", "스키마 변경", "저장/로드 동작 변경"],
    outputs: ["기술 설계 브리프", "구현 제약", "검증 계획"],
  },
  tools_engineer: {
    name: "툴 엔지니어",
    role: "툴 엔지니어",
    mission: "거버넌스를 약화하지 않으면서 워크플로우 도구와 자동화를 만듭니다.",
    authority: ["도구 명령 제안", "안전 검사 정의", "등록/재시작 검증 요청"],
    approvals: ["명령 동작 변경", "쓰기 실행 추가", "자동 승인 범위 확장"],
    outputs: ["도구 변경 계획", "안전 경계", "검증 자료"],
  },
  art_director: {
    name: "아트 디렉터",
    role: "아트 디렉터",
    mission: "생성 또는 반입 전에 비주얼 정체성과 에셋 품질을 검토합니다.",
    authority: ["스타일 방향 제안", "일관성 없는 비주얼 반려", "에셋 검증 요청"],
    approvals: ["생성 에셋 반입", "아트 스타일 공식 설정 변경", "추적 중인 에셋 교체"],
    outputs: ["아트 방향 브리프", "에셋 승인 항목"],
  },
  qa_tester: {
    name: "QA 테스터",
    role: "QA 테스터",
    mission: "승인된 작업이 실제로 완료 기준을 만족했는지 검증 자료로 확인합니다.",
    authority: ["검증 누락 표시", "재현 정보 요청", "BLOCKED/CONCERNS 권고"],
    approvals: ["건너뛴 검증 수용", "고위험 작업 done 처리", "테스트 정책 변경"],
    outputs: ["QA 보고서", "검증 메모", "남은 위험"],
  },
  documentation_keeper: {
    name: "문서 관리자",
    role: "문서 관리자",
    mission: "워크플로우, 프로젝트, DevLog, 가이드 문서가 실제 동작과 맞게 유지되도록 관리합니다.",
    authority: ["가이드 갱신 요청", "문서 불일치 지적", "알려진 위험 기록"],
    approvals: ["워크플로우 기준 문서 변경", "영구 문서 삭제", "검증 완료 주장"],
    outputs: ["문서 갱신", "가이드 갱신 판단", "알려진 위험"],
  },
};

function translateItems(values, labels) {
  return values.map((value) => labels[value] || value);
}

async function getStaffDirectory(repoRoot) {
  const registryRoot = repoPath(repoRoot, "_Docs/AIWorkflow/Studio/Registries");
  const departmentPath = path.join(registryRoot, "departments.initial.json");
  const staffPath = path.join(registryRoot, "staff_agents.initial.json");
  const departmentRegistry = (await readJsonIfExists(departmentPath)) || {};
  const staffRegistry = (await readJsonIfExists(staffPath)) || {};
  const staffAgents = Array.isArray(staffRegistry.staff_agents) ? staffRegistry.staff_agents : [];
  const plannedStaffAgents = Array.isArray(staffRegistry.planned_staff_agents) ? staffRegistry.planned_staff_agents : [];
  const staffById = new Map(staffAgents.map((agent) => [agent.agent_id, agent]));

  const departments = (Array.isArray(departmentRegistry.departments) ? departmentRegistry.departments : []).map((department) => {
    const departmentId = department.department_id || "";
    const ui = DEPARTMENT_UI[departmentId] || {};
    const lead = staffById.get(department.department_lead || "");
    const reviewGates = Array.isArray(department.default_review_gates) ? department.default_review_gates.slice(0, 4) : [];
    return {
      department_id: departmentId,
      name: department.name || "",
      name_ko: ui.name || department.name || "",
      mission: department.mission || "",
      mission_ko: ui.mission || department.mission || "",
      department_lead: department.department_lead || "",
      department_lead_name: lead ? lead.display_name || lead.agent_id : department.department_lead || "",
      staff_count: Array.isArray(department.staff_agents) ? department.staff_agents.length : 0,
      active_staff_count: Array.isArray(department.staff_agents)
        ? department.staff_agents.filter((agentId) => staffById.has(agentId)).length
        : 0,
      review_gates: reviewGates,
      review_gate_labels: translateItems(reviewGates, REVIEW_GATE_LABELS),
      owned_artifacts: Array.isArray(department.owned_artifacts) ? department.owned_artifacts.slice(0, 4) : [],
      path: toRepoRelative(repoRoot, departmentPath),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, departmentPath))}`,
    };
  });

  const staff = staffAgents.map((agent) => {
    const agentId = agent.agent_id || "";
    const ui = STAFF_UI[agentId] || {};
    const departmentId = agent.department_id || "";
    const departmentUi = DEPARTMENT_UI[departmentId] || {};
    const role = agent.role_charter || {};
    const identity = agent.identity || {};
    const expertise = agent.expertise || {};
    const memoryPolicy = agent.memory_policy || {};
    const toolPolicy = agent.tool_policy || {};
    const outputContracts = agent.output_contracts || {};
    const meetingBehavior = agent.meeting_behavior || {};
    const handoffBehavior = agent.handoff_behavior || {};
    const evidenceResponsibility = agent.evidence_responsibility || {};
    const qualityCriteria = agent.quality_criteria || {};
    const authority = Array.isArray(role.authority) ? role.authority.slice(0, 3) : [];
    const approvals = Array.isArray(role.approval_required_actions) ? role.approval_required_actions.slice(0, 3) : [];
    const outputs = Array.isArray(outputContracts.required_outputs) ? outputContracts.required_outputs.slice(0, 3) : [];
    return {
      agent_id: agentId,
      display_name: agent.display_name || "",
      display_name_ko: ui.name || agent.display_name || agentId,
      department_id: departmentId,
      department_name_ko: departmentUi.name || departmentId,
      role_title: agent.role_title || "",
      role_title_ko: ui.role || agent.role_title || "",
      seniority: agent.seniority || "",
      seniority_label: SENIORITY_LABELS[agent.seniority] || agent.seniority || "",
      mission: agent.role_charter && agent.role_charter.mission ? agent.role_charter.mission : "",
      mission_ko: ui.mission || (agent.role_charter && agent.role_charter.mission ? agent.role_charter.mission : ""),
      authority,
      authority_ko: ui.authority || authority,
      approval_required_actions: approvals,
      approval_required_actions_ko: ui.approvals || approvals,
      forbidden_actions: Array.isArray(role.forbidden_actions) ? role.forbidden_actions : [],
      responsibilities: Array.isArray(role.responsibilities) ? role.responsibilities : [],
      stable_preferences: Array.isArray(identity.stable_preferences) ? identity.stable_preferences : [],
      collaboration_style: identity.collaboration_style || "",
      anti_patterns: Array.isArray(expertise.anti_patterns) ? expertise.anti_patterns : [],
      readable_memory_scopes: Array.isArray(memoryPolicy.readable_memory_scopes) ? memoryPolicy.readable_memory_scopes : [],
      writable_memory_scopes: Array.isArray(memoryPolicy.writable_memory_scopes) ? memoryPolicy.writable_memory_scopes : [],
      canon_write_permission: memoryPolicy.canon_write_permission || "none",
      allowed_tools: Array.isArray(toolPolicy.allowed_tools) ? toolPolicy.allowed_tools : [],
      blocked_tools: Array.isArray(toolPolicy.blocked_tools) ? toolPolicy.blocked_tools : [],
      approval_required_tools: Array.isArray(toolPolicy.approval_required_tools) ? toolPolicy.approval_required_tools : [],
      output_contracts: outputs,
      output_contracts_ko: ui.outputs || outputs,
      optional_outputs: Array.isArray(outputContracts.optional_outputs) ? outputContracts.optional_outputs : [],
      structured_schemas: Array.isArray(outputContracts.structured_schemas) ? outputContracts.structured_schemas : [],
      meeting_must_object_when: Array.isArray(meetingBehavior.must_object_when) ? meetingBehavior.must_object_when : [],
      meeting_must_ask_when: Array.isArray(meetingBehavior.must_ask_when) ? meetingBehavior.must_ask_when : [],
      handoff_targets: Array.isArray(handoffBehavior.can_handoff_to) ? handoffBehavior.can_handoff_to : [],
      handoff_requires: Array.isArray(handoffBehavior.handoff_requires) ? handoffBehavior.handoff_requires : [],
      required_evidence: Array.isArray(evidenceResponsibility.required_evidence) ? evidenceResponsibility.required_evidence : [],
      cannot_claim_without_evidence: Array.isArray(evidenceResponsibility.cannot_claim_without_evidence) ? evidenceResponsibility.cannot_claim_without_evidence : [],
      pass_conditions: Array.isArray(qualityCriteria.pass_conditions) ? qualityCriteria.pass_conditions : [],
      failure_patterns: Array.isArray(qualityCriteria.failure_patterns) ? qualityCriteria.failure_patterns : [],
      path: toRepoRelative(repoRoot, staffPath),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, staffPath))}`,
    };
  });

  return {
    departments,
    staff,
    planned_staff_count: plannedStaffAgents.length,
  };
}

async function getExecutionRequestStore(repoRoot, options = {}) {
  return listExecutionRequestRecords(repoRoot, options);
}

async function getExecutionRequests(repoRoot, options = {}) {
  const store = await getExecutionRequestStore(repoRoot, options);
  return store.records;
}

module.exports = {
  getReviewPackets,
  getDirectorGoalPlans,
  getDevLogs,
  getStaffRuns,
  getContextPackets,
  getExecutionRequestStore,
  getExecutionRequests,
  getMaterializations,
  getWorkOrders,
  getProposals,
  getDecisions,
  getMemories,
  getMeetings,
  getProjectProfiles,
  getToolAdapters,
  getToolRunRequests,
  getConditionalAutomation,
  getStaffDirectory,
  getHandoffCandidates,
};

import { getRoleRouterRecommendationForTask } from "./roleRouterService.js";

const MAX_INTAKE_TEXT_LENGTH = 1200;

const TERMS = {
  wf: [
    "discord", "bot", "codex", "goal prompt", "role router", "automation",
    "script", "workflow", "backlog", "activetask", "orchestrator",
    "goal", "prompt", "validation condition",
    "디스코드", "봇", "코덱스", "목표 프롬프트", "역할 라우터", "자동화",
    "스크립트", "워크플로우", "오케스트레이터", "검증 조건", "프롬프트",
  ],
  unity: [
    "unity", "steam", "google play", "build profile", "validation profile", "porting",
    "유니티", "스팀", "구글 플레이", "빌드 프로필", "검증 프로필", "포팅",
  ],
  doc: [
    "doc", "docs", "readme", "guide", "policy", "instruction", "source of truth",
    "문서", "가이드", "정책", "지침", "설명서", "원천",
  ],
  val: [
    "validation", "smoke test", "qa", "runtime test", "semantic check", "regression check",
    "playtest", "play test", "manual test",
    "검증", "스모크", "테스트", "런타임 테스트", "의미 검사", "회귀",
    "플레이테스트", "수동 테스트", "재시작 테스트",
  ],
  game: [
    "gameplay", "runtime behavior", "combat", "stage", "skill", "enemy", "player",
    "scene", "dialogue", "reward", "save", "ui", "userdata",
    "게임플레이", "런타임", "전투", "스테이지", "스킬", "적", "플레이어",
    "씬", "장면", "대화", "보상", "보상 수집", "수집", "재시작",
    "저장", "세이브", "유저데이터", "user data",
  ],
  data: [
    "json", "schema", "data integrity", "data", "userdata", "id/reference", "enum",
    "invalid data", "bad data", "fallback", "default value",
    "데이터", "스키마", "무결성", "기본값", "기본 값", "참조", "열거형",
    "유저데이터", "이상", "비정상", "잘못된 데이터", "복구",
  ],
  refactor: ["refactor", "structure cleanup", "architecture cleanup", "리팩터", "리팩토링", "구조 정리"],
  maintenance: ["cleanup", "warning", "line ending", "dependency", "upkeep", "maintenance", "정리", "경고", "줄바꿈", "의존성", "유지보수"],
  prototype: ["prototype", "experiment", "spike", "proof of concept", "프로토타입", "실험"],
  implementation: ["implement", "feature", "behavior change", "fix", "recover", "fallback", "default", "구현", "기능", "수정", "복구", "기본값", "되게"],
  critical: ["critical", "blocker", "blocking", "corrupt", "save data", "data corruption", "치명", "블로커", "손상"],
  highRisk: ["schema", "save", "runtime", "external tool", "computer-use", "destructive", "migration", "userdata", "스키마", "저장", "세이브", "런타임", "마이그레이션", "유저데이터"],
};

const PATH_HINT_RULES = [
  {
    path: "PlayGround/Data/**",
    terms: TERMS.data,
    reminders: [
      "Check JSON syntax and parseability when JSON files are edited.",
      "Review ID/reference integrity, enum validity, defaults, and invalid-data behavior.",
      "Record semantic validation and runtime loader evidence when data behavior changes.",
    ],
  },
  {
    path: "PlayGround/Project/Gameplay/**",
    terms: TERMS.game,
    reminders: [
      "Run Debug x64 build for source behavior changes.",
      "Request manual runtime validation for player-visible behavior.",
      "Review lifecycle, state, animation, ownership, and cleanup assumptions.",
    ],
  },
  {
    path: "tools/discord-orchestrator/**",
    terms: ["discord", "bot", "slash command", "/ai", "goal prompt", "codex", "orchestrator", "디스코드", "봇", "명령", "목표 프롬프트", "코덱스", "오케스트레이터"],
    reminders: [
      "Run `npm --prefix tools\\discord-orchestrator run register` when command schema changes.",
      "Run bot restart/status validation when command runtime behavior changes.",
      "Run private file tracking checks and do not expose local Discord config.",
    ],
  },
  {
    path: "tools/aiworkflow/**",
    terms: ["tools/aiworkflow", "workflow script", "role_router_status", "json_smoke_check", "script", "automation", "워크플로우", "스크립트", "자동화", "역할 라우터"],
    reminders: [
      "Run changed script validation in text mode and JSON mode when affected.",
      "Verify read-only versus write behavior and output locations.",
      "Confirm no automatic approval, agent execution, commit, push, or source modification was added.",
    ],
  },
  {
    path: "_Docs/AIWorkflow/**",
    terms: ["_Docs/AIWorkflow", "doc", "docs", "readme", "guide", "policy", "instruction", "source of truth", "workflow", "문서", "가이드", "정책", "지침", "원천", "워크플로우"],
    reminders: [
      "Check document map updates when adding durable workflow docs.",
      "Review source-of-truth consistency across related workflow documents.",
      "Avoid stale or invented validation claims.",
    ],
  },
];

export function suggestTaskFromIntake(input = {}) {
  const interpretedRequest = normalizeIntakeText(input.text);
  const category = classifyCategory(interpretedRequest);
  const kind = classifyKind(interpretedRequest, category);
  const priority = classifyPriority(interpretedRequest, category);
  const risk = classifyRisk(interpretedRequest, kind, category);
  const workflowPath = classifyWorkflowPath(category);
  const suggestedTitle = buildSuggestedTitle(interpretedRequest, category, kind);
  const pathReminders = getPathScopedReminders(interpretedRequest, category, kind);

  const task = {
    id: `${category}-INTAKE`,
    item: suggestedTitle,
    status: "intake_suggestion",
    priority,
    kind,
    reason: interpretedRequest,
    tool_route: "Discord intake -> human review",
    validation: "Define exact validation after human accepts or edits the suggested task.",
  };
  const activeTask = {
    metadata: {
      task_id: task.id,
      title: suggestedTitle,
      status: "intake_suggestion",
      priority,
      risk_level: risk,
      workflow_path: workflowPath,
    },
  };
  const roleRecommendation = getRoleRouterRecommendationForTask({ task, activeTask });
  const recommendedRoles = normalizeRoles(roleRecommendation.recommended_roles, category, kind);
  const humanDecisionGates = normalizeGates(roleRecommendation.human_gates, interpretedRequest, risk);
  const requiredValidation = normalizeValidation(roleRecommendation.required_validation, interpretedRequest, category, kind, pathReminders);
  const executionRoute = normalizeRoute(roleRecommendation.execution_route, category, kind);
  const nextManualAction = "Review/edit the draft, then create a Backlog task manually if accepted. No task was created automatically.";

  return {
    ok: true,
    interpreted_request: interpretedRequest,
    suggested_task_title: suggestedTitle,
    suggested_category: category,
    suggested_kind: kind,
    suggested_priority: priority,
    suggested_risk: risk,
    suggested_workflow_path: workflowPath,
    recommended_roles: recommendedRoles,
    human_decision_gates: humanDecisionGates,
    required_validation: requiredValidation,
    suggested_execution_route: executionRoute,
    suggested_next_manual_action: nextManualAction,
    task_draft: {
      title: suggestedTitle,
      category,
      priority,
      kind,
      reason: interpretedRequest,
      suggested_risk: risk,
      workflow_path: workflowPath,
      recommended_roles: recommendedRoles,
      human_decision_gates: humanDecisionGates,
      required_validation: requiredValidation,
      suggested_next_manual_action: nextManualAction,
    },
    path_scoped_reminders: pathReminders,
    safety: {
      read_only: true,
      backlog_updated: false,
      active_task_updated: false,
      agents_executed: false,
      codex_executed: false,
    },
  };
}

function normalizeIntakeText(value) {
  const text = stripWrappingQuotes(String(value ?? "").replace(/\s+/g, " ").trim());
  if (!text) {
    throw new Error("Intake text is required.");
  }

  if (text.length > MAX_INTAKE_TEXT_LENGTH) {
    throw new Error(`Intake text is too long. Maximum length is ${MAX_INTAKE_TEXT_LENGTH} characters.`);
  }

  return text;
}

function stripWrappingQuotes(value) {
  return String(value ?? "")
    .trim()
    .replace(/^["']+/, "")
    .replace(/["']+$/, "")
    .trim();
}

function classifyCategory(text) {
  if (hasAny(text, TERMS.wf)) {
    return "WF";
  }
  if (hasAny(text, TERMS.unity)) {
    return "UNITY";
  }
  if (hasAny(text, TERMS.doc)) {
    return "DOC";
  }
  if (hasAny(text, TERMS.val)) {
    return "VAL";
  }
  if (hasAny(text, TERMS.game)) {
    return "GAME";
  }
  return "GAME";
}

function classifyWorkflowPath(category) {
  switch (category) {
    case "WF":
      return "discord_task_management";
    case "UNITY":
      return "unity_workflow";
    case "DOC":
      return "documentation";
    case "VAL":
      return "validation";
    default:
      return "gameplay";
  }
}

function classifyKind(text, category) {
  if (category === "UNITY" && hasAny(text, ["validation profile", "build profile", "검증 프로필", "빌드 프로필"])) {
    return "validation";
  }
  if (hasAny(text, TERMS.prototype)) {
    return "prototype";
  }
  if (hasAny(text, TERMS.doc)) {
    return "documentation";
  }
  if (hasAny(text, TERMS.wf)) {
    return "automation";
  }
  if (hasAny(text, TERMS.val)) {
    return "validation";
  }
  if (hasAny(text, TERMS.data)) {
    return "data";
  }
  if (hasAny(text, TERMS.refactor)) {
    return "refactoring";
  }
  if (hasAny(text, TERMS.maintenance)) {
    return "maintenance";
  }
  if (hasAny(text, TERMS.implementation)) {
    return "implementation";
  }

  if (category === "WF") {
    return "automation";
  }
  if (category === "DOC") {
    return "documentation";
  }
  if (category === "VAL") {
    return "validation";
  }
  return "implementation";
}

function classifyPriority(text, category) {
  if (hasAny(text, TERMS.critical)) {
    return "P0";
  }
  if (["WF", "UNITY"].includes(category) || hasAny(text, ["infrastructure", "high leverage", "important", "runtime", "save", "userdata", "중요", "런타임", "저장", "세이브", "유저데이터"])) {
    return "P1";
  }
  if (hasAny(text, ["optional", "later", "cleanup", "선택", "나중", "정리"])) {
    return "P3";
  }
  return "P2";
}

function classifyRisk(text, kind, category) {
  if (hasAny(text, TERMS.highRisk)) {
    return "high";
  }
  if (kind === "implementation" || category === "WF" || hasAny(text, ["source behavior", "command behavior", "bot behavior", "workflow command", "소스 동작", "명령 동작", "봇 동작"])) {
    return "medium";
  }
  return "low";
}

function buildSuggestedTitle(text, category, kind) {
  const clipped = text.length > 80 ? `${text.slice(0, 77).trim()}...` : text;
  return `${titlePrefix(category, kind)}: ${clipped}`;
}

function titlePrefix(category, kind) {
  if (category === "WF") {
    return "Workflow task";
  }
  if (category === "UNITY") {
    return "Unity workflow task";
  }
  if (category === "DOC") {
    return "Documentation task";
  }
  if (category === "VAL") {
    return "Validation task";
  }
  if (kind === "data") {
    return "Game data task";
  }
  return "Gameplay task";
}

function getPathScopedReminders(text, category, kind) {
  const matches = [];
  for (const rule of PATH_HINT_RULES) {
    if (hasAny(text, rule.terms)) {
      matches.push({
        path: rule.path,
        reminders: rule.reminders,
      });
    }
  }

  if (matches.length === 0 && category === "GAME") {
    matches.push(PATH_HINT_RULES.find((rule) => rule.path === "PlayGround/Project/Gameplay/**"));
  }
  if (matches.length === 0 && kind === "documentation") {
    matches.push(PATH_HINT_RULES.find((rule) => rule.path === "_Docs/AIWorkflow/**"));
  }

  return matches.filter(Boolean);
}

function normalizeRoles(values, category, kind) {
  const roles = [...arrayValues(values)];
  addUnique(roles, "Orchestrator");
  if (category === "UNITY") {
    addManyUnique(roles, ["Technical Architect", "Validator", "Documentation Keeper"]);
  }
  if (kind === "data") {
    addManyUnique(roles, ["Technical Architect", "Reviewer", "Validator"]);
  }
  if (kind === "documentation") {
    addManyUnique(roles, ["Documentation Keeper", "Reviewer"]);
  }
  addManyUnique(roles, ["Reviewer", "Validator"]);
  return roles;
}

function normalizeGates(values, text, risk) {
  const gates = [...arrayValues(values)];
  if (risk === "high") {
    addUnique(gates, "Human Decision Gate: high-risk schema/save/runtime/external-tool/destructive scope must be explicitly approved before implementation.");
  }
  if (hasAny(text, [...TERMS.wf, "command", "명령"])) {
    addUnique(gates, "Human Decision Gate: workflow or Discord command behavior changes require explicit approval.");
  }
  addUnique(gates, "Human Director must manually decide whether to create a Backlog task from this suggestion.");
  return gates;
}

function normalizeValidation(values, text, category, kind, pathReminders) {
  const validation = [...arrayValues(values)];
  addManyUnique(validation, [
    "Run git status --short.",
    "Run git diff --check.",
    "Run git diff --stat.",
    "Verify no forbidden paths were modified.",
  ]);

  if (category === "WF") {
    addManyUnique(validation, [
      "Run npm --prefix tools\\discord-orchestrator run register when Discord command schema changes.",
      "Run tools\\discord-orchestrator\\restart_bot.bat and tools\\discord-orchestrator\\status_bot.bat when bot behavior changes.",
    ]);
  }
  if (kind === "data" || hasAny(text, TERMS.data)) {
    addUnique(validation, "Run JSON syntax, ID/reference integrity, enum validity, and semantic validation for data-related changes.");
  }
  if (category === "GAME") {
    addUnique(validation, "Run Debug x64 build and manual runtime validation when gameplay/runtime behavior changes.");
  }

  for (const item of pathReminders) {
    for (const reminder of item.reminders) {
      addUnique(validation, reminder);
    }
  }

  return validation;
}

function normalizeRoute(values, category, kind) {
  const route = arrayValues(values).filter((value) => !/commit decision/i.test(value));
  addUnique(route, "Orchestrator");
  if (category === "WF") {
    addUnique(route, "Tool/Workflow Engineer");
  }
  if (category === "UNITY" || category === "GAME" || kind === "data") {
    addUnique(route, "Technical Architect");
  }
  if (kind === "documentation") {
    addUnique(route, "Documentation Keeper");
  }
  addManyUnique(route, ["Reviewer", "Validator", "Human Director task creation decision"]);
  return route;
}

function hasAny(text, terms) {
  const lower = String(text ?? "").toLowerCase();
  return terms.some((term) => lower.includes(String(term).toLowerCase()));
}

function arrayValues(values) {
  return Array.isArray(values) ? values.filter(Boolean) : [];
}

function addUnique(list, value) {
  const text = String(value ?? "").trim();
  if (text && !list.includes(text)) {
    list.push(text);
  }
}

function addManyUnique(list, values) {
  for (const value of values) {
    addUnique(list, value);
  }
}

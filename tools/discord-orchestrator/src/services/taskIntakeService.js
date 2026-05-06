import { getRoleRouterRecommendationForTask } from "./roleRouterService.js";

const MAX_INTAKE_TEXT_LENGTH = 1200;

const CATEGORY_RULES = [
  {
    category: "WF",
    workflowPath: "discord_task_management",
    patterns: [
      /discord|bot|codex|goal prompt|role router|automation|script|workflow|backlog|activetask|orchestrator/i,
      /디스코드|봇|코덱스|목표\s*프롬프트|역할\s*라우터|자동화|스크립트|워크플로우|오케스트레이터/i,
    ],
  },
  {
    category: "UNITY",
    workflowPath: "unity_workflow",
    patterns: [
      /unity|steam|google play|build profile|validation profile|porting/i,
      /유니티|스팀|구글\s*플레이|빌드\s*프로필|검증\s*프로필|포팅/i,
    ],
  },
  {
    category: "DOC",
    workflowPath: "documentation",
    patterns: [
      /docs?|readme|guide|policy|instructions?|source of truth/i,
      /문서|가이드|정책|지침|설명서|원천|소스\s*오브\s*트루스/i,
    ],
  },
  {
    category: "VAL",
    workflowPath: "validation",
    patterns: [
      /validation|smoke test|qa|runtime test|semantic check|regression check/i,
      /검증|스모크|테스트|QA|런타임\s*테스트|의미\s*검사|회귀/i,
    ],
  },
  {
    category: "GAME",
    workflowPath: "gameplay",
    patterns: [
      /gameplay|runtime behavior|combat|stage|skill|enemy|player|scene|dialogue|reward|save|ui|userdata/i,
      /게임플레이|런타임|전투|스테이지|스킬|적|플레이어|씬|장면|대화|보상|저장|세이브|UI|유저\s*데이터/i,
    ],
  },
];

const KIND_RULES = [
  {
    kind: "prototype",
    patterns: [/prototype|experiment|spike|proof of concept/i, /프로토타입|실험|검증용/i],
  },
  {
    kind: "documentation",
    patterns: [/docs?|readme|guide|policy|instructions?|source of truth/i, /문서|가이드|정책|지침|설명서|원천/i],
  },
  {
    kind: "automation",
    patterns: [/discord|bot|script|workflow tool|automation|command|orchestrator|role router|goal prompt|codex/i, /디스코드|봇|스크립트|자동화|명령|오케스트레이터|역할\s*라우터|목표\s*프롬프트|코덱스/i],
  },
  {
    kind: "validation",
    patterns: [/validation|smoke test|qa|runtime test|semantic check|regression check|test evidence|validation profile/i, /검증|스모크|테스트|QA|의미\s*검사|회귀|증거|검증\s*프로필/i],
  },
  {
    kind: "data",
    patterns: [/json|schema|data integrity|data|userdata|id\/reference|enum/i, /데이터|스키마|무결성|기본값|ID|참조|열거형|유저\s*데이터/i],
  },
  {
    kind: "refactoring",
    patterns: [/refactor|structure cleanup|architecture cleanup|cleanup structure/i, /리팩터|리팩토링|구조\s*정리|아키텍처\s*정리/i],
  },
  {
    kind: "maintenance",
    patterns: [/cleanup|warning|line ending|dependency|upkeep|maintenance/i, /정리|경고|줄바꿈|라인\s*엔딩|의존성|유지보수/i],
  },
  {
    kind: "implementation",
    patterns: [/implement|feature|runtime behavior|behavior change|fix|recover|fallback|default/i, /구현|기능|런타임|동작|수정|복구|기본값/i],
  },
];

const PATH_HINT_RULES = [
  {
    path: "PlayGround/Data/**",
    patterns: [/PlayGround[\\/]+Data|json|schema|data integrity|userdata|id\/reference|enum/i, /데이터|스키마|무결성|기본값|ID|참조|열거형|유저\s*데이터/i],
    reminders: [
      "Check JSON syntax and parseability when JSON files are edited.",
      "Review ID/reference integrity, enum validity, defaults, and invalid-data behavior.",
      "Record semantic validation and runtime loader evidence when data behavior changes.",
    ],
  },
  {
    path: "PlayGround/Project/Gameplay/**",
    patterns: [/gameplay|combat|stage|skill|enemy|player|scene|dialogue|reward|save|ui|runtime behavior|userdata/i, /게임플레이|전투|스테이지|스킬|적|플레이어|씬|장면|대화|보상|저장|세이브|UI|런타임|유저\s*데이터/i],
    reminders: [
      "Run Debug x64 build for source behavior changes.",
      "Request manual runtime validation for player-visible behavior.",
      "Review lifecycle, state, animation, ownership, and cleanup assumptions.",
    ],
  },
  {
    path: "tools/discord-orchestrator/**",
    patterns: [/discord|bot|slash command|\/ai|goal prompt|codex|orchestrator/i, /디스코드|봇|명령|목표\s*프롬프트|코덱스|오케스트레이터/i],
    reminders: [
      "Run `npm --prefix tools\\discord-orchestrator run register` when command schema changes.",
      "Run bot restart/status validation when command runtime behavior changes.",
      "Run private file tracking checks and do not expose local Discord config.",
    ],
  },
  {
    path: "tools/aiworkflow/**",
    patterns: [/tools[\\/]+aiworkflow|workflow script|role_router_status|json_smoke_check|script|automation/i, /워크플로우|스크립트|자동화|역할\s*라우터/i],
    reminders: [
      "Run changed script validation in text mode and JSON mode when affected.",
      "Verify read-only versus write behavior and output locations.",
      "Confirm no automatic approval, agent execution, commit, push, or source modification was added.",
    ],
  },
  {
    path: "_Docs/AIWorkflow/**",
    patterns: [/_Docs[\\/]+AIWorkflow|docs?|readme|guide|policy|instructions?|source of truth|workflow/i, /문서|가이드|정책|지침|원천|워크플로우/i],
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
  const workflowPath = classifyWorkflowPath(interpretedRequest, category);
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

  return {
    ok: true,
    interpreted_request: interpretedRequest,
    suggested_task_title: suggestedTitle,
    suggested_category: category,
    suggested_kind: kind,
    suggested_priority: priority,
    suggested_risk: risk,
    suggested_workflow_path: workflowPath,
    recommended_roles: normalizeRoles(roleRecommendation.recommended_roles, category, kind),
    human_decision_gates: normalizeGates(roleRecommendation.human_gates, interpretedRequest, risk),
    required_validation: normalizeValidation(roleRecommendation.required_validation, interpretedRequest, category, kind, pathReminders),
    suggested_execution_route: normalizeRoute(roleRecommendation.execution_route, category, kind),
    suggested_next_manual_action: "Review this suggestion, edit the title/category/kind/priority if needed, then create or approve a Backlog task manually. No task was created automatically.",
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
  let text = String(value ?? "").trim();
  text = text.replace(/^["'“”‘’]+/, "").replace(/["'“”‘’]+$/, "").trim();
  return text;
}

function classifyCategory(text) {
  for (const rule of CATEGORY_RULES) {
    if (matchesAny(text, rule.patterns)) {
      return rule.category;
    }
  }

  return "GAME";
}

function classifyWorkflowPath(text, category) {
  const categoryRule = CATEGORY_RULES.find((rule) => rule.category === category && matchesAny(text, rule.patterns));
  if (categoryRule) {
    return categoryRule.workflowPath;
  }

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
  if (category === "UNITY" && matchesAny(text, [/validation profile|build profile/i, /검증\s*프로필|빌드\s*프로필/i])) {
    return "validation";
  }

  for (const rule of KIND_RULES) {
    if (matchesAny(text, rule.patterns)) {
      return rule.kind;
    }
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
  if (matchesAny(text, [/critical|blocker|blocking|corrupt|save data|data corruption/i, /치명|블로커|막히|손상|저장.*오염|데이터.*오염/i])) {
    return "P0";
  }

  if (["WF", "UNITY"].includes(category) || matchesAny(text, [/infrastructure|high leverage|important|runtime|save|userdata/i, /중요|인프라|런타임|저장|세이브|유저\s*데이터/i])) {
    return "P1";
  }

  if (matchesAny(text, [/optional|later|cleanup/i, /선택|나중|정리/i])) {
    return "P3";
  }

  return "P2";
}

function classifyRisk(text, kind, category) {
  if (matchesAny(text, [/schema|save|runtime|external tool|computer-use|destructive|migration|userdata/i, /스키마|저장|세이브|런타임|외부\s*도구|파괴|마이그레이션|유저\s*데이터/i])) {
    return "high";
  }

  if (kind === "implementation" || category === "WF" || matchesAny(text, [/source behavior|command behavior|bot behavior|workflow command/i, /소스\s*동작|명령\s*동작|봇\s*동작/i])) {
    return "medium";
  }

  return "low";
}

function buildSuggestedTitle(text, category, kind) {
  const clipped = text.length > 80 ? `${text.slice(0, 77).trim()}...` : text;
  const prefix = titlePrefix(category, kind);
  return `${prefix}: ${clipped}`;
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
    if (matchesAny(text, rule.patterns)) {
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
  if (matchesAny(text, [/discord|bot|command|goal prompt|workflow/i, /디스코드|봇|명령|목표\s*프롬프트|워크플로우/i])) {
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

  if (kind === "data" || matchesAny(text, [/json|schema|userdata|data/i, /데이터|스키마|유저\s*데이터/i])) {
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

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
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

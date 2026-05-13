import { generateTaskDraftWithCodexCli } from "./codexCliIntakeService.js";
import { getRoleRouterRecommendationForTask } from "./roleRouterService.js";

const MAX_INTAKE_TEXT_LENGTH = 1200;

const TERMS = {
  wf: [
    "discord", "bot", "codex", "goal prompt", "role router", "automation",
    "script", "workflow", "backlog", "activetask", "orchestrator",
    "goal", "prompt", "validation condition", "slash command", "/ai",
    "디스코드", "봇", "코덱스", "목표 프롬프트", "역할 라우터",
    "자동화", "스크립트", "워크플로우", "백로그", "액티브태스크", "검증 조건",
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
    "validation", "smoke test", "qa", "runtime test", "semantic check",
    "regression check", "playtest", "play test", "manual test",
    "검증", "스모크", "테스트", "회귀", "플레이테스트", "수동 테스트",
  ],
  game: [
    "gameplay", "runtime behavior", "combat", "stage", "skill", "enemy", "player",
    "scene", "dialogue", "reward", "save", "ui", "userdata", "user data",
    "게임플레이", "런타임", "전투", "스테이지", "스킬", "적", "플레이어",
    "씬", "장면", "대화", "보상", "저장", "세이브", "유저데이터",
  ],
  data: [
    "json", "schema", "data integrity", "data", "userdata", "id/reference", "enum",
    "invalid data", "bad data", "fallback", "default value",
    "데이터", "스키마", "무결성", "기본값", "참조", "열거형", "복구",
  ],
  refactor: ["refactor", "structure cleanup", "architecture cleanup", "리팩터", "리팩토링", "구조 정리"],
  maintenance: ["cleanup", "warning", "line ending", "dependency", "upkeep", "maintenance", "정리", "경고", "유지보수"],
  prototype: ["prototype", "experiment", "spike", "proof of concept", "프로토타입", "실험"],
  implementation: ["implement", "feature", "behavior change", "fix", "recover", "fallback", "default", "구현", "기능", "수정", "복구", "기본값"],
  critical: ["critical", "blocker", "blocking", "corrupt", "save data", "data corruption", "치명", "블로커", "손상"],
  highRisk: ["schema", "save", "runtime", "external tool", "computer-use", "destructive", "migration", "userdata", "스키마", "저장", "세이브", "런타임", "마이그레이션", "유저데이터"],
};

const SAFE_VALIDATION_NO_CHANGE_TERMS = [
  "no source", "no data", "no schema", "no runtime", "no document",
  "without source", "without data", "without schema", "without runtime", "without document",
  "without changing source", "without changing data", "without changing schema", "without changing runtime", "without changing documents",
  "without changing source files", "without changing data files", "without changing source files, data files, schemas, runtime behavior, or documents",
  "source/data 변경 없이", "소스/데이터 변경 없이", "소스나 데이터 변경 없이", "소스, 데이터 변경 없이",
  "스키마 변경 없이", "런타임 변경 없이", "문서 변경 없이", "변경 없이", "수정 없이",
  "read-only", "검증만", "validation-only",
  "\uBCC0\uACBD \uC5C6\uC774", "\uC218\uC815 \uC5C6\uC774", "\uAC80\uC99D\uB9CC",
  "\uC18C\uC2A4 \uBCC0\uACBD \uC5C6\uC774", "\uB370\uC774\uD130 \uBCC0\uACBD \uC5C6\uC774",
  "\uC18C\uC2A4/\uB370\uC774\uD130 \uBCC0\uACBD \uC5C6\uC774",
  "\uC2A4\uD0A4\uB9C8 \uBCC0\uACBD \uC5C6\uC774", "\uB7F0\uD0C0\uC784 \uBCC0\uACBD \uC5C6\uC774",
  "\uBB38\uC11C \uBCC0\uACBD \uC5C6\uC774",
];

const SAFE_BUILD_VALIDATION_TERMS = [
  "visual studio", "msbuild", "debug x64", "x64 build", "visual studio build",
  "build validation", "debug visual studio build", "PlayGround Debug x64",
  "빌드", "빌드 검증", "visual studio 빌드",
];

const SAFE_GAME_DATA_READABILITY_TERMS = [
  "game data loader", "data loader", "loader/readability", "readability",
  "semantic validation", "loader validation", "game data readability",
  "game_data_loader_readability", "json readability",
  "데이터 로더", "로더 검증", "의미 검증", "가독성",
  "\uB370\uC774\uD130 \uB85C\uB354", "\uB85C\uB354 \uAC80\uC99D",
  "\uC758\uBBF8 \uAC80\uC99D", "\uAC00\uB3C5\uC131",
];

const INFERABLE_BUILD_ROUTE_QUESTION = /(command[_ -]?id|pc runner profile|runner profile|profile should be used|which exact command|which command|debug x64|visual studio build|msbuild)/i;
const INFERABLE_DATA_READABILITY_ROUTE_QUESTION = /(command[_ -]?id|pc runner profile|runner profile|profile should be used|which exact command|which command|data loader|loader\/readability|readability|semantic validation|game_data_loader_readability|데이터 로더|로더 검증|의미 검증|가독성)/i;

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
    terms: ["discord", "bot", "slash command", "/ai", "goal prompt", "codex", "orchestrator", "디스코드", "봇", "명령", "코덱스"],
    reminders: [
      "Run `npm --prefix tools\\discord-orchestrator run register` when command schema changes.",
      "Run bot restart/status validation when command runtime behavior changes.",
      "Run private file tracking checks and do not expose local Discord config.",
    ],
  },
  {
    path: "tools/aiworkflow/**",
    terms: ["tools/aiworkflow", "workflow script", "role_router_status", "json_smoke_check", "script", "automation", "워크플로우", "스크립트", "자동화"],
    reminders: [
      "Run changed script validation in text mode and JSON mode when affected.",
      "Verify read-only versus write behavior and output locations.",
      "Confirm no automatic approval, agent execution, commit, push, or source modification was added.",
    ],
  },
  {
    path: "_Docs/AIWorkflow/**",
    terms: ["_Docs/AIWorkflow", "doc", "docs", "readme", "guide", "policy", "instruction", "source of truth", "workflow", "문서", "가이드", "정책", "지침", "워크플로우"],
    reminders: [
      "Check document map updates when adding durable workflow docs.",
      "Review source-of-truth consistency across related workflow documents.",
      "Avoid stale or invented validation claims.",
    ],
  },
];

export async function suggestTaskFromIntake(configOrInput = {}, maybeInput = null) {
  const hasConfig = maybeInput !== null || Boolean(configOrInput?.llmIntake);
  const config = hasConfig ? configOrInput : null;
  const input = hasConfig ? maybeInput ?? {} : configOrInput;
  const ruleBased = suggestTaskFromIntakeRuleBased(input);

  if (!config) {
    return withLlmStatus(ruleBased, {
      used: false,
      fallback_used: true,
      status: "rule_based_only",
      reason: "No runtime config was provided.",
    });
  }
  const llmResult = await generateTaskDraftWithCodexCli(config, {
    text: ruleBased.interpreted_request,
    ruleBasedSuggestion: ruleBased,
  });

  if (!llmResult.ok) {
    if (config?.llmIntake?.fallbackOnError === false) {
      return {
        ok: false,
        error: llmResult.error,
        llm: {
          used: false,
          fallback_used: false,
          status: llmResult.code,
          provider: config?.llmIntake?.provider || "codex_cli",
          model: config?.llmIntake?.model || "gpt-5.5",
          run: llmResult.run,
        },
        safety: ruleBased.safety,
      };
    }

    return withLlmStatus(ruleBased, {
      used: false,
      fallback_used: true,
      status: llmResult.code,
      reason: llmResult.error,
      provider: config?.llmIntake?.provider || "codex_cli",
      model: config?.llmIntake?.model || "gpt-5.5",
      run: llmResult.run,
    });
  }

  return buildSuggestionFromDraft({
    interpretedRequest: ruleBased.interpreted_request,
    draft: llmResult.draft,
    ruleBased,
    llm: {
      used: true,
      fallback_used: false,
      status: "ok",
      provider: llmResult.provider,
      model: llmResult.model,
      reasoning_effort: llmResult.reasoning_effort,
      run: llmResult.run,
    },
  });
}

export function suggestTaskFromIntakeRuleBased(input = {}) {
  const interpretedRequest = normalizeIntakeText(input.text);
  const category = classifyCategory(interpretedRequest);
  const kind = classifyKind(interpretedRequest, category);
  const priority = classifyPriority(interpretedRequest, category, kind);
  const risk = classifyRisk(interpretedRequest, kind, category);
  const workflowPath = classifyWorkflowPath(category);
  const suggestedTitle = buildSuggestedTitle(interpretedRequest, category, kind);
  const draft = {
    title: suggestedTitle,
    category,
    priority,
    kind,
    reason: interpretedRequest,
    suggested_risk: risk,
    workflow_path: workflowPath,
    recommended_roles: [],
    human_decision_gates: [],
    required_validation: [],
    suggested_next_manual_action: "Review the generated Backlog task, then set active or approve manually if accepted.",
    clarifying_questions: [],
    confidence: 0.55,
  };

  return buildSuggestionFromDraft({
    interpretedRequest,
    draft,
    ruleBased: null,
    llm: {
      used: false,
      fallback_used: false,
      status: "not_requested",
    },
  });
}

function buildSuggestionFromDraft({ interpretedRequest, draft, ruleBased, llm }) {
  const normalizedDraft = normalizeDraftForKnownSafeRoutes(draft, interpretedRequest);
  const pathReminders = getPathScopedReminders(
    [interpretedRequest, normalizedDraft.title, normalizedDraft.reason, normalizedDraft.workflow_path].join(" "),
    normalizedDraft.category,
    normalizedDraft.kind,
  );
  const task = {
    id: `${normalizedDraft.category}-INTAKE`,
    item: normalizedDraft.title,
    status: "intake_suggestion",
    priority: normalizedDraft.priority,
    kind: normalizedDraft.kind,
    reason: normalizedDraft.reason,
    tool_route: llm?.used ? "Discord LLM-assisted intake -> human review" : "Discord rule-based intake -> human review",
    validation: "Define exact validation after human accepts or edits the suggested task.",
  };
  const activeTask = {
    metadata: {
      task_id: task.id,
      title: normalizedDraft.title,
      status: "intake_suggestion",
      priority: normalizedDraft.priority,
      risk_level: normalizedDraft.suggested_risk,
      workflow_path: normalizedDraft.workflow_path,
    },
  };
  const roleRecommendation = getRoleRouterRecommendationForTask({ task, activeTask });
  const recommendedRoles = mergeUnique(normalizedDraft.recommended_roles, roleRecommendation.recommended_roles, ["Orchestrator", "Reviewer", "Validator"]);
  const humanDecisionGates = normalizeGates(
    mergeUnique(normalizedDraft.human_decision_gates, roleRecommendation.human_gates),
    interpretedRequest,
    normalizedDraft.suggested_risk,
    normalizedDraft.category,
    normalizedDraft.kind,
  );
  const requiredValidation = normalizeValidation(
    mergeUnique(normalizedDraft.required_validation, roleRecommendation.required_validation),
    interpretedRequest,
    normalizedDraft.category,
    normalizedDraft.kind,
    pathReminders,
  );
  const executionRoute = normalizeRoute(roleRecommendation.execution_route, normalizedDraft.category, normalizedDraft.kind);
  const taskDraft = {
    ...normalizedDraft,
    recommended_roles: recommendedRoles,
    human_decision_gates: humanDecisionGates,
    required_validation: requiredValidation,
    suggested_next_manual_action: normalizedDraft.suggested_next_manual_action || "Review the generated Backlog task, then set active or approve manually if accepted.",
  };
  const crossCheck = buildCrossCheck(ruleBased, taskDraft);

  return {
    ok: true,
    interpreted_request: interpretedRequest,
    suggested_task_title: taskDraft.title,
    suggested_category: taskDraft.category,
    suggested_kind: taskDraft.kind,
    suggested_priority: taskDraft.priority,
    suggested_risk: taskDraft.suggested_risk,
    suggested_workflow_path: taskDraft.workflow_path,
    recommended_roles: recommendedRoles,
    human_decision_gates: humanDecisionGates,
    required_validation: requiredValidation,
    suggested_execution_route: executionRoute,
    suggested_next_manual_action: taskDraft.suggested_next_manual_action,
    task_draft: taskDraft,
    path_scoped_reminders: pathReminders,
    llm: llm ?? { used: false, fallback_used: false, status: "not_requested" },
    rule_based_cross_check: crossCheck,
    safety: {
      read_only: true,
      backlog_updated: false,
      active_task_updated: false,
      agents_executed: false,
      codex_executed: false,
      codex_intake_executed: llm?.used === true,
      implementation_codex_executed: false,
      approved: false,
      committed: false,
      pushed: false,
    },
  };
}

function normalizeDraftForKnownSafeRoutes(draft, interpretedRequest) {
  const contextText = [
    interpretedRequest,
    draft.title,
    draft.reason,
    draft.workflow_path,
    ...(Array.isArray(draft.required_validation) ? draft.required_validation : []),
  ].join(" ");

  const safeBuildValidation = isSafeBuildValidationRequest(contextText, draft);
  const safeDataReadabilityValidation = isSafeGameDataReadabilityValidationRequest(contextText, draft);
  if (!safeBuildValidation && !safeDataReadabilityValidation) {
    return draft;
  }

  const profile = safeBuildValidation ? "build" : "validation";
  const commandId = safeBuildValidation ? "debug_visual_studio_build" : "game_data_loader_readability";
  const routeQuestionPattern = safeBuildValidation
    ? INFERABLE_BUILD_ROUTE_QUESTION
    : INFERABLE_DATA_READABILITY_ROUTE_QUESTION;
  const clarifyingQuestions = arrayValues(draft.clarifying_questions)
    .filter((question) => !routeQuestionPattern.test(String(question ?? "")));
  const routeValidation = safeBuildValidation
    ? [
      "PC Runner route is deterministic for this request: profile=build, executor=local_cli, command_id=debug_visual_studio_build.",
      "Run PlayGround Debug x64 Visual Studio build through PC Runner build/local_cli.",
    ]
    : [
      "PC Runner route is deterministic for this request: profile=validation, executor=local_cli, command_id=game_data_loader_readability.",
      "Run GameDataLoader expected-file, JSON shape, ID/reference, and readability validation through PC Runner validation/local_cli.",
    ];
  const requiredValidation = mergeUnique(draft.required_validation, [
    ...routeValidation,
    "Confirm no source, data, schema, runtime behavior, or document files were changed.",
  ]);

  return {
    ...draft,
    category: "VAL",
    kind: "validation",
    priority: "P2",
    suggested_risk: "low",
    workflow_path: "validation",
    required_validation: requiredValidation,
    clarifying_questions: clarifyingQuestions,
    suggested_next_manual_action: `Auto-handoff may start PC Runner ${profile}/local_cli with command_id=${commandId} when no other clarifying questions remain.`,
  };
}

function needsUnknownGameDataValidationRoute(text) {
  return hasAny(text, [
    "data loader", "loader/readability", "readability", "semantic validation",
    "loader validation", "데이터 로더", "로더 검증", "의미 검증",
  ]) && !hasAny(text, ["json_smoke", "json smoke", "debug_visual_studio_build"]);
}

function withLlmStatus(ruleBased, llmStatus) {
  return {
    ...ruleBased,
    llm: llmStatus,
    rule_based_cross_check: {
      mismatches: [],
      requires_human_review: true,
      summary: "Using rule-based fallback; human review is required before task creation or approval.",
    },
  };
}

function buildCrossCheck(ruleBased, draft) {
  if (!ruleBased?.task_draft) {
    return {
      mismatches: [],
      requires_human_review: false,
      summary: "No rule-based baseline comparison was needed.",
    };
  }

  const baseline = ruleBased.task_draft;
  const mismatches = [];
  compareField(mismatches, "category", baseline.category, draft.category);
  compareField(mismatches, "kind", baseline.kind, draft.kind);
  compareField(mismatches, "priority", baseline.priority, draft.priority);
  compareField(mismatches, "suggested_risk", baseline.suggested_risk, draft.suggested_risk);
  const deterministicSafeRoute = isDeterministicSafeValidationRoute(draft);
  if (deterministicSafeRoute && draft.clarifying_questions.length === 0) {
    return {
      mismatches,
      requires_human_review: false,
      summary: "Known safe deterministic validation route normalized the intake draft; human review is not required by cross-check.",
    };
  }

  return {
    mismatches,
    requires_human_review: mismatches.length > 0 || draft.suggested_risk === "high" || draft.clarifying_questions.length > 0,
    summary: mismatches.length > 0
      ? "LLM draft differs from the local rule-based baseline; review before creating or approving."
      : "LLM draft matches the main rule-based category, kind, priority, and risk signals.",
  };
}

function isDeterministicSafeValidationRoute(draft) {
  const text = [
    draft.title,
    draft.reason,
    draft.workflow_path,
    ...(Array.isArray(draft.required_validation) ? draft.required_validation : []),
  ].join(" ");
  return String(draft.category ?? "").toUpperCase() === "VAL"
    && String(draft.kind ?? "").toLowerCase() === "validation"
    && ["P2", "P3"].includes(String(draft.priority ?? "").toUpperCase())
    && String(draft.suggested_risk ?? "").toLowerCase() === "low"
    && (isSafeBuildValidationRequest(text, draft) || isSafeGameDataReadabilityValidationRequest(text, draft));
}

function compareField(mismatches, field, baseline, candidate) {
  if (!crossCheckValuesMatch(field, baseline, candidate)) {
    mismatches.push(`${field}: rule=${baseline || "unknown"}; llm=${candidate || "unknown"}`);
  }
}

function crossCheckValuesMatch(field, baseline, candidate) {
  const left = String(baseline ?? "");
  const right = String(candidate ?? "");
  if (left === right) {
    return true;
  }

  if (field === "priority") {
    const autoAllowedPriorities = new Set(["P2", "P3"]);
    return autoAllowedPriorities.has(left.toUpperCase()) && autoAllowedPriorities.has(right.toUpperCase());
  }

  return false;
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
  const explicitCategory = classifyExplicitCategory(text);
  if (explicitCategory) return explicitCategory;

  if (hasAny(text, TERMS.wf)) return "WF";
  if (hasAny(text, TERMS.unity)) return "UNITY";
  if (hasAny(text, TERMS.val)) return "VAL";
  if (hasAny(text, TERMS.doc)) return "DOC";
  if (hasAny(text, TERMS.game)) return "GAME";
  return "GAME";
}

function classifyExplicitCategory(text) {
  const match = String(text ?? "")
    .trim()
    .match(/^(WF|DOC|VAL|GAME|UNITY)\s*(?:task|작업)?\s*:/i);
  return match ? match[1].toUpperCase() : "";
}

function classifyWorkflowPath(category) {
  switch (category) {
    case "WF": return "discord_task_management";
    case "UNITY": return "unity_workflow";
    case "DOC": return "documentation";
    case "VAL": return "validation";
    default: return "gameplay";
  }
}

function classifyKind(text, category) {
  if (category === "VAL") return "validation";
  if (category === "DOC") return "documentation";
  if (category === "WF" && hasAny(text, TERMS.doc)) return "documentation";
  if (category === "WF" && hasAny(text, TERMS.maintenance)) return "maintenance";
  if (category === "WF") return "automation";
  if (category === "UNITY" && hasAny(text, ["validation profile", "build profile", "검증 프로필", "빌드 프로필"])) return "validation";
  if (hasAny(text, TERMS.prototype)) return "prototype";
  if (hasAny(text, TERMS.doc)) return "documentation";
  if (hasAny(text, TERMS.wf)) return "automation";
  if (hasAny(text, TERMS.val)) return "validation";
  if (hasAny(text, TERMS.data)) return "data";
  if (hasAny(text, TERMS.refactor)) return "refactoring";
  if (hasAny(text, TERMS.maintenance)) return "maintenance";
  if (hasAny(text, TERMS.implementation)) return "implementation";
  if (category === "WF") return "automation";
  if (category === "DOC") return "documentation";
  if (category === "VAL") return "validation";
  return "implementation";
}

function classifyPriority(text, category, kind) {
  if (hasAny(text, TERMS.critical)) return "P0";
  if (isSafeBuildValidationRequest(text, { category, kind })) return "P2";
  if (isSafeGameDataReadabilityValidationRequest(text, { category, kind })) return "P2";
  if (category === "WF" && ["documentation", "maintenance"].includes(kind)) return "P2";
  if (["WF", "UNITY"].includes(category) || hasAny(text, ["infrastructure", "high leverage", "important", "runtime", "save", "userdata", "중요", "런타임", "저장", "세이브", "유저데이터"])) return "P1";
  if (hasAny(text, ["optional", "later", "cleanup", "선택", "나중", "정리"])) return "P3";
  return "P2";
}

function classifyRisk(text, kind, category) {
  if (isSafeBuildValidationRequest(text, { category, kind })) return "low";
  if (isSafeGameDataReadabilityValidationRequest(text, { category, kind })) return "low";
  if (hasAny(text, TERMS.highRisk)) return "high";
  if (
    category === "WF"
    && ["documentation", "maintenance"].includes(kind)
    && !hasAny(text, ["source behavior", "command behavior", "bot behavior", "workflow command", "discord command", "prompt generation", "/ai"])
  ) {
    return "low";
  }
  if (kind === "implementation" || category === "WF" || hasAny(text, ["source behavior", "command behavior", "bot behavior", "workflow command", "소스 동작", "명령 동작", "봇 동작"])) return "medium";
  return "low";
}

function isSafeBuildValidationRequest(text, draft = {}) {
  const normalized = String(text ?? "");
  const category = String(draft.category ?? "").toUpperCase();
  const kind = String(draft.kind ?? "").toLowerCase();
  const validationClass = category === "VAL" || category === "GAME" || kind === "validation";
  return validationClass
    && hasAny(normalized, SAFE_BUILD_VALIDATION_TERMS)
    && hasAny(normalized, SAFE_VALIDATION_NO_CHANGE_TERMS)
    && !hasAny(normalized, [
      "change source", "change data", "edit source", "edit data",
      "modify source", "modify data", "schema change", "runtime behavior change",
      "gameplay behavior change", "소스를 변경", "데이터를 변경", "스키마를 변경", "런타임 동작 변경", "게임플레이 동작 변경",
    ]);
}

function isSafeGameDataReadabilityValidationRequest(text, draft = {}) {
  const normalized = String(text ?? "");
  const category = String(draft.category ?? "").toUpperCase();
  const kind = String(draft.kind ?? "").toLowerCase();
  const validationClass = category === "VAL" || category === "GAME" || kind === "validation";
  return validationClass
    && hasAny(normalized, SAFE_GAME_DATA_READABILITY_TERMS)
    && hasAny(normalized, SAFE_VALIDATION_NO_CHANGE_TERMS)
    && !hasAny(normalized, [
      "change source", "change data", "edit source", "edit data",
      "modify source", "modify data", "schema change", "runtime behavior change",
      "gameplay behavior change",
      "소스 변경", "데이터 변경", "스키마 변경", "런타임 동작 변경", "게임플레이 동작 변경",
    ]);
}

function buildSuggestedTitle(text, category, kind) {
  const clipped = text.length > 80 ? `${text.slice(0, 77).trim()}...` : text;
  return `${titlePrefix(category, kind)}: ${clipped}`;
}

function titlePrefix(category, kind) {
  if (category === "WF") return "Workflow task";
  if (category === "UNITY") return "Unity workflow task";
  if (category === "DOC") return "Documentation task";
  if (category === "VAL") return "Validation task";
  if (kind === "data") return "Game data task";
  return "Gameplay task";
}

function getPathScopedReminders(text, category, kind) {
  const matches = [];
  for (const rule of PATH_HINT_RULES) {
    if (hasAny(text, rule.terms)) {
      matches.push({ path: rule.path, reminders: rule.reminders });
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

function normalizeGates(values, text, risk, category, kind) {
  const gates = [...arrayValues(values)];
  if (risk === "high") {
    addUnique(gates, "Human Decision Gate: high-risk schema/save/runtime/external-tool/destructive scope must be explicitly approved before implementation.");
  }
  if (
    category === "WF"
    && ["documentation", "maintenance"].includes(kind)
    && !hasAny(text, ["command", "workflow command", "bot behavior", "discord command", "prompt generation"])
  ) {
    addUnique(gates, "Human Director must manually decide whether to create a Backlog task from this suggestion.");
    return gates;
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
  if (category === "WF") addUnique(route, "Tool/Workflow Engineer");
  if (category === "UNITY" || category === "GAME" || kind === "data") addUnique(route, "Technical Architect");
  if (kind === "documentation") addUnique(route, "Documentation Keeper");
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

function mergeUnique(...groups) {
  const list = [];
  for (const group of groups) {
    addManyUnique(list, arrayValues(group));
  }
  return list;
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

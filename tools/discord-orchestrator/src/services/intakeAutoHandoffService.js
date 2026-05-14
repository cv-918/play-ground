import { setActiveTaskWithSafety } from "./activeTaskActivationService.js";
import { startPcRunnerDetached } from "./pcRunnerService.js";
import { approveTaskWithSafety } from "./taskApprovalSafetyService.js";

const AUTO_PRIORITY_VALUES = new Set(["P2", "P3"]);
const AUTO_RISK_VALUES = new Set(["low"]);
const AUTO_CATEGORY_VALUES = new Set(["DOC", "VAL"]);
const AUTO_KIND_VALUES = new Set(["documentation", "validation"]);
const AUTO_WF_KIND_VALUES = new Set(["documentation", "maintenance"]);
const GAME_STRICT_NO_MUTATION_TERMS = [
  "no source/data", "without source/data",
  "without changing source and data", "without changing source or data",
  "without changing source files and data files", "without changing source files or data files",
  "without changing source files, data files, schemas, runtime behavior, or documents",
  "source/data 변경 없이", "소스/데이터 변경 없이", "소스나 데이터 변경 없이", "소스, 데이터 변경 없이",
  "source/data/schema/runtime 변경 없음", "source/data/schema/runtime/document 변경 없음",
  "source/data/schema/runtime 변경 없이", "source/data/schema/runtime/document 변경 없이",
  "소스/데이터/schema/runtime 변경 없이", "소스/데이터/스키마/런타임 변경 없이",
];
const GAME_MUTATION_TERMS = [
  "implement", "fix", "modify", "change source", "change data", "edit data", "data task",
  "data fix", "data change", "json change", "json fix", "minimal fix",
  "schema change", "runtime behavior change", "gameplay behavior change",
  "구현", "수정", "고쳐", "소스를 변경", "데이터를 변경", "데이터 수정", "data 수정",
  "json 수정", "필요한 최소 수정", "스키마를 변경", "런타임 동작 변경", "게임플레이 동작 변경",
];
const GAME_CONTEXT_TERMS = [
  "game", "gameplay", "userdata", "user data", "stage_progress", "node state",
  "gamedataloader", "game data loader", "playground/data", "json/userdatamanager",
  "게임", "게임플레이", "유저데이터", "사용자 데이터", "데이터 로더", "노드 상태",
];
const BUILD_TERMS = [
  "visual studio", "msbuild", "debug x64", "x64 build", "build validation",
  "빌드", "빌드 검증",
];

const GAME_DATA_READABILITY_TERMS = [
  "game data loader", "data loader", "loader/readability", "readability",
  "semantic validation", "loader validation", "game_data_loader_readability",
  "데이터 로더", "로더 검증", "의미 검증", "가독성",
  "\uB370\uC774\uD130 \uB85C\uB354", "\uB85C\uB354 \uAC80\uC99D",
  "\uC758\uBBF8 \uAC80\uC99D", "\uAC00\uB3C5\uC131",
];

export async function runIntakeAutoHandoff(config, input = {}) {
  const policy = evaluateIntakeAutoHandoffPolicy(config, input);
  const result = {
    ...policy,
    actions: [],
    active_task_updated: false,
    approved: false,
    runner_started: false,
  };

  if (!policy.eligible) {
    return result;
  }

  const taskId = input.task?.id;
  const activation = await setActiveTaskWithSafety(config, taskId);
  result.actions.push(summarizeAction("set_active", activation));
  if (!activation.ok) {
    return {
      ...result,
      decision: "blocked",
      reason: activation.error || "ActiveTask update failed.",
    };
  }
  result.active_task_updated = true;

  const approval = await approveTaskWithSafety(config, {
    id: taskId,
    note: buildApprovalNote(policy),
  });
  result.actions.push(summarizeAction("approve", approval));
  if (!approval.ok) {
    return {
      ...result,
      decision: "blocked",
      reason: approval.error || "Task approval failed.",
    };
  }
  result.approved = true;

  const runnerStart = await startPcRunnerDetached(config, {
    id: taskId,
    profile: policy.profile,
    executor: policy.executor,
  });
  result.actions.push(summarizeAction("runner_start", runnerStart));
  result.runner_start = summarizeRunnerStart(runnerStart);
  result.runner_started = runnerStart.ok === true;

  return {
    ...result,
    decision: runnerStart.ok ? "runner_started" : "runner_blocked",
    reason: runnerStart.ok
      ? "Low-risk intake task was automatically activated, approved, and handed to PC Runner."
      : runnerStart.error || runnerStart.data?.human_gate || "PC Runner start did not complete.",
  };
}

export function evaluateIntakeAutoHandoffPolicy(config, input = {}) {
  const task = input.task ?? {};
  const draft = input.draft ?? {};
  const suggestion = input.suggestion ?? {};
  const priority = String(task.priority ?? draft.priority ?? "").toUpperCase();
  const risk = String(draft.suggested_risk ?? "").toLowerCase();
  const category = String(draft.category ?? categoryFromTaskId(task.id)).toUpperCase();
  const kind = String(task.kind ?? draft.kind ?? "").toLowerCase();
  const contextText = buildPolicyContextText({ task, draft, suggestion });
  const clarifyingQuestions = Array.isArray(draft.clarifying_questions)
    ? draft.clarifying_questions.filter((item) => String(item ?? "").trim())
    : [];
  const crossCheck = suggestion.rule_based_cross_check ?? {};
  const enabled = config?.intakeAutoHandoff?.enabled !== false;
  const autoStartLowRisk = config?.intakeAutoHandoff?.autoStartLowRisk !== false;
  const execution = chooseExecution(category, kind, contextText);

  const blockers = [];
  if (!enabled) blockers.push("intake_auto_handoff_disabled");
  if (!autoStartLowRisk) blockers.push("low_risk_auto_start_disabled");
  if (!AUTO_PRIORITY_VALUES.has(priority)) blockers.push("priority_requires_human_approval");
  if (!AUTO_RISK_VALUES.has(risk)) blockers.push("risk_requires_human_approval");
  if (!isAutoHandoffClassAllowed(category, kind, contextText)) blockers.push("category_or_kind_requires_human_approval");
  if (hasGameMutationScope(contextText)) blockers.push("game_data_or_runtime_mutation_requires_human_approval");
  if (category === "GAME" && kind === "validation" && hasUnsafeGameValidationScope(contextText)) blockers.push("game_validation_scope_requires_human_approval");
  if (clarifyingQuestions.length > 0) blockers.push("clarification_required");
  if (crossCheck.requires_human_review === true) blockers.push("rule_based_cross_check_requires_review");
  if (!execution.profile || !execution.executor) blockers.push("no_supported_runner_profile");

  return {
    decision: blockers.length === 0 ? "auto_start_allowed" : "needs_human_approval",
    eligible: blockers.length === 0,
    reason: blockers.length === 0
      ? "Deterministic policy allows low-risk documentation/validation/WF-maintenance intake handoff."
      : blockers.join(", "),
    blockers,
    priority,
    risk,
    category,
    kind,
    profile: execution.profile,
    executor: execution.executor,
  };
}

function chooseExecution(category, kind, contextText = "") {
  const dataReadabilityRequested = hasAny(contextText, GAME_DATA_READABILITY_TERMS);
  const buildRequested = hasAny(contextText, BUILD_TERMS);
  if (category === "VAL" || kind === "validation") {
    return {
      profile: dataReadabilityRequested ? "validation" : (buildRequested ? "build" : "validation"),
      executor: "local_cli",
    };
  }

  if (category === "DOC" || kind === "documentation") {
    return {
      profile: "documentation",
      executor: "codex_cli",
    };
  }

  if (category === "WF" && kind === "maintenance") {
    return {
      profile: "implementation",
      executor: "codex_cli",
    };
  }

  return {
    profile: "",
    executor: "",
  };
}

function isAutoHandoffClassAllowed(category, kind, contextText = "") {
  return AUTO_CATEGORY_VALUES.has(category)
    || AUTO_KIND_VALUES.has(kind)
    || (category === "WF" && AUTO_WF_KIND_VALUES.has(kind))
    || (category === "GAME" && kind === "validation" && isSafeGameValidationContext(contextText));
}

function isSafeGameValidationContext(text) {
  const normalized = String(text ?? "");
  return hasExplicitNoGameMutationScope(normalized)
    || (hasAny(normalized, ["validation", "smoke", "build", "검증", "스모크", "빌드", ...GAME_DATA_READABILITY_TERMS]) && !hasUnsafeGameValidationScope(normalized));
}

function hasUnsafeGameValidationScope(text) {
  const normalized = String(text ?? "");
  return hasGameContext(normalized) && hasAny(normalized, GAME_MUTATION_TERMS) && !hasExplicitNoGameMutationScope(normalized);
}

function hasGameMutationScope(text) {
  const normalized = String(text ?? "");
  return hasGameContext(normalized) && hasAny(normalized, GAME_MUTATION_TERMS) && !hasExplicitNoGameMutationScope(normalized);
}

function hasGameContext(text) {
  return hasAny(text, GAME_CONTEXT_TERMS) || hasAny(text, GAME_DATA_READABILITY_TERMS);
}

function hasExplicitNoGameMutationScope(text) {
  const normalized = String(text ?? "");
  const lower = normalized.toLowerCase();
  const hasStrictPhrase = hasAny(normalized, GAME_STRICT_NO_MUTATION_TERMS);
  const hasNoSource = lower.includes("no source")
    || lower.includes("without source")
    || lower.includes("without changing source")
    || normalized.includes("소스/데이터 변경 없이")
    || normalized.includes("소스나 데이터 변경 없이")
    || normalized.includes("소스, 데이터 변경 없이")
    || normalized.includes("소스 변경 없이");
  const hasNoData = lower.includes("no data")
    || lower.includes("without data")
    || lower.includes("without changing data")
    || normalized.includes("소스/데이터 변경 없이")
    || normalized.includes("소스나 데이터 변경 없이")
    || normalized.includes("소스, 데이터 변경 없이")
    || normalized.includes("데이터 변경 없이");
  return hasStrictPhrase || (hasNoSource && hasNoData);
}

function buildPolicyContextText({ task = {}, draft = {}, suggestion = {} }) {
  return [
    task.id,
    task.title,
    task.kind,
    task.reason,
    task.validation,
    draft.title,
    draft.reason,
    draft.workflow_path,
    ...(Array.isArray(draft.required_validation) ? draft.required_validation : []),
    suggestion?.interpreted_request,
  ].filter(Boolean).join(" ");
}

function hasAny(text, terms) {
  const lower = String(text ?? "").toLowerCase();
  return terms.some((term) => lower.includes(String(term).toLowerCase()));
}

function buildApprovalNote(policy) {
  return [
    "Auto-handoff approved by deterministic low-risk intake policy.",
    `category=${policy.category}`,
    `kind=${policy.kind}`,
    `priority=${policy.priority}`,
    `risk=${policy.risk}`,
    `runner=${policy.profile}/${policy.executor}`,
  ].join(" ");
}

function summarizeAction(name, result) {
  return {
    name,
    ok: result?.ok === true,
    error: result?.ok ? "" : result?.error || "",
  };
}

function summarizeRunnerStart(result) {
  const data = result?.data ?? {};
  const run = data.runner_run ?? {};
  return {
    ok: result?.ok === true,
    command: result?.command || "start",
    detached: result?.detached === true,
    process_id: data.process_id ?? "",
    stdout_log: data.stdout_log ?? "",
    stderr_log: data.stderr_log ?? "",
    status: data.status || run.status || "",
    stop_reason: data.stop_reason || run.human_gate_state?.stop_reason || "",
    human_gate: data.human_gate || run.human_gate_state?.human_gate || "",
    runner_run_id: data.runner_run_id || run.runner_run_id || "",
    runner_run_path: data.runner_run_path || "",
    report_ids: data.report_ids || run.report_ids || {},
    error: result?.ok ? "" : result?.error || "",
  };
}

function categoryFromTaskId(taskId) {
  const match = String(taskId ?? "").match(/^([A-Za-z]+)-/);
  return match ? match[1] : "";
}

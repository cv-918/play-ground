import { setActiveTaskWithSafety } from "./activeTaskActivationService.js";
import { startPcRunnerDetached } from "./pcRunnerService.js";
import { approveTaskWithSafety } from "./taskApprovalSafetyService.js";

const AUTO_PRIORITY_VALUES = new Set(["P2", "P3"]);
const AUTO_RISK_VALUES = new Set(["low"]);
const AUTO_CATEGORY_VALUES = new Set(["DOC", "VAL"]);
const AUTO_KIND_VALUES = new Set(["documentation", "validation"]);
const AUTO_WF_KIND_VALUES = new Set(["documentation", "maintenance"]);
const GAME_NO_CHANGE_TERMS = [
  "no source", "no data", "without source", "without data", "no source/data",
  "no schema", "no runtime", "no document", "without schema", "without runtime", "without document",
  "without changing source", "without changing data", "without changing schema", "without changing runtime", "without changing documents",
  "without changing source files", "without changing data files", "without changing source files, data files, schemas, runtime behavior, or documents",
  "source/data 변경 없이", "소스/데이터 변경 없이", "변경 없이", "수정 없이",
  "소스나 데이터 변경 없이", "소스, 데이터 변경 없이", "스키마 변경 없이", "런타임 변경 없이", "문서 변경 없이",
  "read-only", "검증만", "validation-only",
  "\uBCC0\uACBD \uC5C6\uC774", "\uC218\uC815 \uC5C6\uC774", "\uAC80\uC99D\uB9CC",
  "\uC18C\uC2A4 \uBCC0\uACBD \uC5C6\uC774", "\uB370\uC774\uD130 \uBCC0\uACBD \uC5C6\uC774",
  "\uC18C\uC2A4/\uB370\uC774\uD130 \uBCC0\uACBD \uC5C6\uC774",
  "\uC2A4\uD0A4\uB9C8 \uBCC0\uACBD \uC5C6\uC774", "\uB7F0\uD0C0\uC784 \uBCC0\uACBD \uC5C6\uC774",
  "\uBB38\uC11C \uBCC0\uACBD \uC5C6\uC774",
];
const GAME_MUTATION_TERMS = [
  "implement", "fix", "modify", "change source", "change data", "edit data",
  "schema change", "runtime behavior change", "gameplay behavior change",
  "구현", "수정", "고쳐", "소스를 변경", "데이터를 변경", "스키마를 변경", "런타임 동작 변경", "게임플레이 동작 변경",
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
  return hasAny(normalized, GAME_NO_CHANGE_TERMS)
    || (hasAny(normalized, ["validation", "smoke", "build", "검증", "스모크", "빌드", ...GAME_DATA_READABILITY_TERMS]) && !hasUnsafeGameValidationScope(normalized));
}

function hasUnsafeGameValidationScope(text) {
  const normalized = String(text ?? "");
  return hasAny(normalized, GAME_MUTATION_TERMS) && !hasAny(normalized, GAME_NO_CHANGE_TERMS);
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

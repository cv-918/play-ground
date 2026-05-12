import { setActiveTaskWithSafety } from "./activeTaskActivationService.js";
import { startPcRunner } from "./pcRunnerService.js";
import { approveTaskWithSafety } from "./taskApprovalSafetyService.js";

const AUTO_PRIORITY_VALUES = new Set(["P2", "P3"]);
const AUTO_RISK_VALUES = new Set(["low"]);
const AUTO_CATEGORY_VALUES = new Set(["DOC", "VAL"]);
const AUTO_KIND_VALUES = new Set(["documentation", "validation"]);

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

  const runnerStart = await startPcRunner(config, {
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
  const clarifyingQuestions = Array.isArray(draft.clarifying_questions)
    ? draft.clarifying_questions.filter((item) => String(item ?? "").trim())
    : [];
  const crossCheck = suggestion.rule_based_cross_check ?? {};
  const enabled = config?.intakeAutoHandoff?.enabled !== false;
  const autoStartLowRisk = config?.intakeAutoHandoff?.autoStartLowRisk !== false;
  const execution = chooseExecution(category, kind);

  const blockers = [];
  if (!enabled) blockers.push("intake_auto_handoff_disabled");
  if (!autoStartLowRisk) blockers.push("low_risk_auto_start_disabled");
  if (!AUTO_PRIORITY_VALUES.has(priority)) blockers.push("priority_requires_human_approval");
  if (!AUTO_RISK_VALUES.has(risk)) blockers.push("risk_requires_human_approval");
  if (!AUTO_CATEGORY_VALUES.has(category) && !AUTO_KIND_VALUES.has(kind)) blockers.push("category_or_kind_requires_human_approval");
  if (clarifyingQuestions.length > 0) blockers.push("clarification_required");
  if (crossCheck.requires_human_review === true) blockers.push("rule_based_cross_check_requires_review");
  if (!execution.profile || !execution.executor) blockers.push("no_supported_runner_profile");

  return {
    decision: blockers.length === 0 ? "auto_start_allowed" : "needs_human_approval",
    eligible: blockers.length === 0,
    reason: blockers.length === 0
      ? "Deterministic policy allows low-risk documentation/validation intake handoff."
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

function chooseExecution(category, kind) {
  if (category === "VAL" || kind === "validation") {
    return {
      profile: "validation",
      executor: "local_cli",
    };
  }

  if (category === "DOC" || kind === "documentation") {
    return {
      profile: "documentation",
      executor: "codex_cli",
    };
  }

  return {
    profile: "",
    executor: "",
  };
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

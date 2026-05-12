import { runScript } from "./commandRunner.js";

const DEFAULT_TIMEOUT_MS = 30000;
const TASK_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*-[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const COMPLETION_REPORT_ID_PATTERN = /^completion-[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const FINALIZATION_LOG_ID_PATTERN = /^finalization-[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const POLICY_EVALUATION_ID_PATTERN = /^autoeval-[A-Za-z0-9][A-Za-z0-9_.-]*$/;

export async function getAutoApprovalStatus(config, input = {}) {
  try {
    const taskId = validateId(input.id, TASK_ID_PATTERN, "task id");
    const raw = await runAutoApprovalScript(config, ["status", taskId, "--json"]);
    const parsed = parseScriptJson("auto_approval_policy status", raw);
    return {
      ok: parsed.ok,
      command: "status",
      data: parsed.data,
      raw,
      error: parsed.error,
    };
  } catch (error) {
    return buildFailure("status", error);
  }
}

export async function evaluateAutoApprovalPolicy(config, input = {}) {
  try {
    const taskId = validateId(input.id, TASK_ID_PATTERN, "task id");
    const completionReportId = normalizeOptionalId(
      input.completionReportId,
      COMPLETION_REPORT_ID_PATTERN,
      "completion report id",
    );
    const finalizationLogId = normalizeOptionalId(
      input.finalizationLogId,
      FINALIZATION_LOG_ID_PATTERN,
      "finalization log id",
    );
    const policyEvaluationId = normalizeOptionalId(
      input.policyEvaluationId,
      POLICY_EVALUATION_ID_PATTERN,
      "policy evaluation id",
    );

    const args = ["evaluate", taskId];
    if (completionReportId) {
      args.push(completionReportId);
    }
    if (finalizationLogId) {
      args.push(finalizationLogId);
    }
    if (policyEvaluationId) {
      args.push(policyEvaluationId);
    }
    args.push("--json");

    const raw = await runAutoApprovalScript(config, args);
    const parsed = parseScriptJson("auto_approval_policy evaluate", raw);
    return {
      ok: parsed.ok,
      command: "evaluate",
      data: parsed.data,
      raw,
      error: parsed.error,
    };
  } catch (error) {
    return buildFailure("evaluate", error);
  }
}

export async function readAutoApprovalPolicy(config, input = {}) {
  try {
    const taskId = validateId(input.id, TASK_ID_PATTERN, "task id");
    const policyEvaluationId = normalizeOptionalId(
      input.policyEvaluationId,
      POLICY_EVALUATION_ID_PATTERN,
      "policy evaluation id",
    );
    const args = ["read", taskId];
    if (policyEvaluationId) {
      args.push(policyEvaluationId);
    }
    args.push("--json");

    const raw = await runAutoApprovalScript(config, args);
    const parsed = parseScriptJson("auto_approval_policy read", raw);
    return {
      ok: parsed.ok,
      command: "read",
      data: parsed.data,
      raw,
      error: parsed.error,
    };
  } catch (error) {
    return buildFailure("read", error);
  }
}

function runAutoApprovalScript(config, args) {
  return runScript(config, "tools/aiworkflow/auto_approval_policy.bat", args, { timeoutMs: DEFAULT_TIMEOUT_MS });
}

function validateId(value, pattern, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`Missing ${label}.`);
  }
  if (!pattern.test(normalized) || normalized.includes("..")) {
    throw new Error(`Invalid ${label}. Use a safe workflow id without spaces, slashes, or shell characters.`);
  }
  return normalized;
}

function normalizeOptionalId(value, pattern, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "";
  }
  if (!pattern.test(normalized) || normalized.includes("..")) {
    throw new Error(`Invalid ${label}.`);
  }
  return normalized;
}

function parseScriptJson(label, raw) {
  if (!raw.stdout) {
    return {
      ok: false,
      data: null,
      error: buildRawFailure(label, raw, "Script produced empty stdout."),
    };
  }

  try {
    const data = JSON.parse(raw.stdout);
    return {
      ok: raw.ok && data?.ok !== false,
      data,
      error: raw.ok && data?.ok !== false ? "" : data?.error || buildRawFailure(label, raw),
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: buildRawFailure(label, raw, `Failed to parse script JSON: ${error.message}`),
    };
  }
}

function buildRawFailure(label, raw, prefix = "Script failed.") {
  return [
    prefix,
    `Command: ${label}`,
    `Script: ${raw.script}`,
    `Exit code: ${raw.code}`,
    raw.timedOut ? "Timed out: yes" : "Timed out: no",
    raw.stderr ? `stderr: ${raw.stderr.slice(0, 800)}` : "",
    raw.stdout ? `stdout: ${raw.stdout.slice(0, 800)}` : "",
  ].filter(Boolean).join("\n");
}

function buildFailure(command, error) {
  return {
    ok: false,
    command,
    error: error.message,
  };
}

import { runScript } from "./commandRunner.js";

const DEFAULT_TIMEOUT_MS = 30000;
const TASK_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*-[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const COMPLETION_REPORT_ID_PATTERN = /^completion-[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const FINALIZATION_LOG_ID_PATTERN = /^finalization-[A-Za-z0-9][A-Za-z0-9_.-]*$/;

const DECISION_BY_COMMAND = Object.freeze({
  accept: "accept_completion",
  "accept-concerns": "accept_with_concerns",
  reject: "reject_completion",
  "request-changes": "request_changes",
  defer: "defer_completion",
});

export async function getFinalizationStatus(config, input = {}) {
  try {
    const taskId = validateId(input.id, TASK_ID_PATTERN, "task id");
    const raw = await runFinalizationScript(config, ["status", taskId, "--json"]);
    const parsed = parseScriptJson("finalization_log status", raw);
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

export async function readFinalizationLog(config, input = {}) {
  try {
    const taskId = validateId(input.id, TASK_ID_PATTERN, "task id");
    const finalizationLogId = normalizeOptionalId(
      input.finalizationLogId,
      FINALIZATION_LOG_ID_PATTERN,
      "finalization log id",
    );
    const args = ["read", taskId];
    if (finalizationLogId) {
      args.push(finalizationLogId);
    }
    args.push("--json");

    const raw = await runFinalizationScript(config, args);
    const parsed = parseScriptJson("finalization_log read", raw);
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

export async function recordFinalizationDecision(config, input = {}) {
  try {
    const taskId = validateId(input.id, TASK_ID_PATTERN, "task id");
    const decision = DECISION_BY_COMMAND[input.command];
    if (!decision) {
      throw new Error(`Unsupported finalization command: ${input.command}`);
    }

    const completionReportId = normalizeOptionalId(
      input.completionReportId,
      COMPLETION_REPORT_ID_PATTERN,
      "completion report id",
    );
    const actor = normalizeActor(input.actor);
    const args = ["record", taskId, decision];
    if (completionReportId) {
      args.push(completionReportId);
    }
    args.push(actor, "--json");

    const raw = await runFinalizationScript(config, args);
    const parsed = parseScriptJson("finalization_log record", raw);
    return {
      ok: parsed.ok,
      command: input.command,
      decision,
      data: parsed.data,
      raw,
      error: parsed.error,
    };
  } catch (error) {
    return buildFailure(input.command || "record", error);
  }
}

function runFinalizationScript(config, args) {
  return runScript(config, "tools/aiworkflow/finalization_log.bat", args, { timeoutMs: DEFAULT_TIMEOUT_MS });
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

function normalizeActor(value) {
  const digits = String(value ?? "").replaceAll(/\D/g, "");
  if (!digits) {
    return "actor_discord_unknown";
  }
  return `actor_discord_${digits}`;
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

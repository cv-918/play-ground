import { runScript } from "./commandRunner.js";

const DEFAULT_TIMEOUT_MS = 30000;
const TASK_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*-[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const VERIFICATION_REPORT_ID_PATTERN = /^verification-[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const COMPLETION_REPORT_ID_PATTERN = /^completion-[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const COMPLETION_CARD_ID_PATTERN = /^card-[A-Za-z0-9][A-Za-z0-9_.-]*$/;

export async function getCompletionStatus(config, input = {}) {
  try {
    const taskId = validateId(input.id, TASK_ID_PATTERN, "task id");
    const reportRaw = await runCompletionReportScript(config, ["status", taskId, "--json"]);
    const cardRaw = await runCompletionCardScript(config, ["status", taskId, "--json"]);
    const reportResult = parseScriptJson("completion_report status", reportRaw);
    const cardResult = parseScriptJson("completion_card status", cardRaw);

    return {
      ok: reportResult.ok && cardResult.ok,
      command: "status",
      data: {
        task_id: taskId,
        report_status: reportResult.data,
        card_status: cardResult.data,
      },
      raw: { report: reportRaw, card: cardRaw },
      error: [reportResult.error, cardResult.error].filter(Boolean).join("\n"),
    };
  } catch (error) {
    return buildFailure("status", error);
  }
}

export async function generateCompletionReport(config, input = {}) {
  try {
    const taskId = validateId(input.id, TASK_ID_PATTERN, "task id");
    const args = ["generate", taskId];
    const verificationReportId = normalizeOptionalId(
      input.verificationReportId,
      VERIFICATION_REPORT_ID_PATTERN,
      "verification report id",
    );
    const completionReportId = normalizeOptionalId(
      input.completionReportId,
      COMPLETION_REPORT_ID_PATTERN,
      "completion report id",
    );

    if (verificationReportId) {
      args.push(verificationReportId);
    }
    if (completionReportId) {
      args.push(completionReportId);
    }
    args.push("--json");

    const raw = await runCompletionReportScript(config, args);
    const parsed = parseScriptJson("completion_report generate", raw);
    return {
      ok: parsed.ok,
      command: "report",
      data: parsed.data,
      raw,
      error: parsed.error,
    };
  } catch (error) {
    return buildFailure("report", error);
  }
}

export async function generateCompletionCard(config, input = {}) {
  try {
    const taskId = validateId(input.id, TASK_ID_PATTERN, "task id");
    const completionCardId = normalizeOptionalId(
      input.completionCardId,
      COMPLETION_CARD_ID_PATTERN,
      "completion card id",
    );
    let completionReportId = normalizeOptionalId(
      input.completionReportId,
      COMPLETION_REPORT_ID_PATTERN,
      "completion report id",
    );
    let generatedReport = null;

    if (!completionReportId) {
      const ensured = await ensureCompletionReport(config, taskId);
      completionReportId = ensured.completionReportId;
      generatedReport = ensured.generatedReport;
    }

    const args = ["generate", taskId, completionReportId];
    if (completionCardId) {
      args.push("--completion-card-id", completionCardId);
    }
    args.push("--json");

    const raw = await runCompletionCardScript(config, args);
    const parsed = parseScriptJson("completion_card generate", raw);
    return {
      ok: parsed.ok,
      command: "card",
      data: parsed.data,
      generated_report: generatedReport,
      raw,
      error: parsed.error,
    };
  } catch (error) {
    return buildFailure("card", error);
  }
}

async function ensureCompletionReport(config, taskId) {
  const statusRaw = await runCompletionReportScript(config, ["status", taskId, "--json"]);
  const status = parseScriptJson("completion_report status", statusRaw);
  if (!status.ok) {
    throw new Error(status.error);
  }

  const latest = status.data?.latest_completion_report_id;
  if (latest) {
    return { completionReportId: latest, generatedReport: null };
  }

  const raw = await runCompletionReportScript(config, ["generate", taskId, "--json"]);
  const generated = parseScriptJson("completion_report generate", raw);
  if (!generated.ok) {
    throw new Error(generated.error);
  }

  return {
    completionReportId: generated.data.completion_report_id,
    generatedReport: generated.data,
  };
}

function runCompletionReportScript(config, args) {
  return runScript(config, "tools/aiworkflow/completion_report.bat", args, { timeoutMs: DEFAULT_TIMEOUT_MS });
}

function runCompletionCardScript(config, args) {
  return runScript(config, "tools/aiworkflow/completion_card.bat", args, { timeoutMs: DEFAULT_TIMEOUT_MS });
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

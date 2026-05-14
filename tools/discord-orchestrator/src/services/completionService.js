import { readFile } from "node:fs/promises";
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
      args.push(completionCardId);
    }
    args.push("--json");

    const raw = await runCompletionCardScript(config, args);
    const parsed = parseScriptJson("completion_card generate", raw);
    const evidenceContext = parsed.ok
      ? await loadCompletionEvidenceContext(parsed.data)
      : null;

    return {
      ok: parsed.ok,
      command: "card",
      data: parsed.data,
      evidence_context: evidenceContext,
      generated_report: generatedReport,
      raw,
      error: parsed.error,
    };
  } catch (error) {
    return buildFailure("card", error);
  }
}

async function loadCompletionEvidenceContext(data = {}) {
  const card = data.completion_card ?? {};
  const completionReportPath = card.sources?.completion_report_path;
  const completionReport = await readJsonArtifact(completionReportPath);
  const verificationPath = completionReport?.sources?.verification_report?.verification_report_path;
  const verification = await readJsonArtifact(verificationPath);
  const resultPath = verification?.sources?.execution_result?.result_path;
  const result = await readJsonArtifact(resultPath);

  const sessions = Array.isArray(result?.sessions)
    ? await Promise.all(result.sessions.map((session) => summarizeSession(session)))
    : [];

  return {
    completion_report_path: completionReportPath || "",
    verification_report_path: verificationPath || "",
    execution_result_path: resultPath || "",
    observed_exit_state: verification?.gates?.execution_result_gate?.evidence?.observed_exit_state || "",
    diff_attention_signals: verification?.gates?.diff_gate?.evidence?.attention_signals ?? [],
    expected_categories: verification?.gates?.diff_gate?.evidence?.expected_categories ?? [],
    sessions: sessions.filter(Boolean),
  };
}

async function summarizeSession(session = {}) {
  const stderrText = await readShortLog(session.outputs?.stderr_log);
  const stdoutText = await readShortLog(session.outputs?.stdout_log);
  return {
    session_id: session.session_id || "",
    status: session.status || "",
    executor_type: session.executor_type || "",
    command_line: session.command_line || "",
    exit_code: session.process?.exit_code ?? null,
    last_activity: session.last_activity || "",
    stderr_summary: stderrText,
    stdout_summary: stdoutText,
  };
}

async function readShortLog(filePath) {
  const text = await readTextArtifact(filePath);
  if (!text) {
    return "";
  }
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 2).join(" ");
}

async function readJsonArtifact(filePath) {
  const text = await readTextArtifact(filePath);
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readTextArtifact(filePath) {
  const normalized = String(filePath ?? "").replaceAll("\\", "/").trim();
  if (!normalized || normalized.includes("..") || !normalized.startsWith("_Temp/AIWorkflowRuntime/")) {
    return "";
  }
  try {
    return await readFile(normalized, "utf8");
  } catch {
    return "";
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

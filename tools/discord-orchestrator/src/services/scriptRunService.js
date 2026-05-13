import { runScript } from "./commandRunner.js";
import { validateProjectId } from "../safety/validation.js";

const DEFAULT_TIMEOUT_MS = 30000;
const LONG_TIMEOUT_MS = 60000;

export const RUN_SCRIPT_REGISTRY = Object.freeze({
  "workflow-status": Object.freeze({
    script: "tools/aiworkflow/workflow_status.bat",
    baseArgs: ["--json"],
    output: "json",
    timeoutMs: DEFAULT_TIMEOUT_MS,
  }),
  "active-project": Object.freeze({
    script: "tools/aiworkflow/active_project_status.bat",
    baseArgs: ["--json"],
    output: "json",
    timeoutMs: DEFAULT_TIMEOUT_MS,
  }),
  "project-profile": Object.freeze({
    script: "tools/aiworkflow/project_profile_status.bat",
    output: "json",
    timeoutMs: DEFAULT_TIMEOUT_MS,
    buildArgs: ({ id }) => {
      if (!id) {
        return ["--json"];
      }

      const projectId = id.trim();
      if (!validateProjectId(projectId)) {
        throw new Error("Invalid project id. Allowed characters: A-Z, a-z, 0-9, underscore, hyphen.");
      }

      return ["--project", projectId, "--json"];
    },
  }),
  "json-smoke": Object.freeze({
    script: "tools/aiworkflow/json_smoke_check.bat",
    baseArgs: [],
    output: "json-smoke-text",
    timeoutMs: LONG_TIMEOUT_MS,
  }),
  "game-data-readability": Object.freeze({
    script: "tools/aiworkflow/game_data_loader_readability_check.bat",
    baseArgs: [],
    output: "game-data-readability-text",
    timeoutMs: LONG_TIMEOUT_MS,
  }),
  "capture-diff": Object.freeze({
    script: "tools/aiworkflow/capture_diff.bat",
    output: "capture-diff-text",
    timeoutMs: LONG_TIMEOUT_MS,
    buildArgs: ({ includeUntracked }) => (includeUntracked ? ["--include-untracked"] : []),
  }),
});

export function getAllowedRunScriptKeys() {
  return Object.keys(RUN_SCRIPT_REGISTRY);
}

export async function executeRunCommand(config, key, options = {}) {
  const entry = RUN_SCRIPT_REGISTRY[key];
  if (!entry) {
    return {
      ok: false,
      key,
      error: `Unsupported run command: ${key}`,
    };
  }

  let args;
  try {
    args = entry.buildArgs ? entry.buildArgs(options) : [...entry.baseArgs];
  } catch (error) {
    return {
      ok: false,
      key,
      error: error.message,
    };
  }

  const raw = await runScript(config, entry.script, args, { timeoutMs: entry.timeoutMs });
  const parsed = parseRunOutput(entry.output, raw);

  if (entry.output === "json" && !parsed.ok) {
    return {
      ok: false,
      key,
      entry,
      raw,
      error: parsed.error,
    };
  }

  return {
    ok: raw.ok,
    key,
    entry,
    raw,
    data: parsed.data,
    error: raw.ok ? "" : buildScriptFailure(raw),
  };
}

function parseRunOutput(outputType, raw) {
  if (outputType === "json") {
    if (!raw.stdout) {
      return { ok: false, error: buildScriptFailure(raw, "Script produced empty stdout.") };
    }

    try {
      return { ok: true, data: JSON.parse(raw.stdout) };
    } catch (error) {
      return {
        ok: false,
        error: [
          `Failed to parse script JSON: ${error.message}`,
          `Script: ${raw.script}`,
          `Exit code: ${raw.code}`,
          raw.stderr ? `stderr: ${raw.stderr.slice(0, 800)}` : "",
          "stdout preview:",
          raw.stdout.slice(0, 800),
        ].filter(Boolean).join("\n"),
      };
    }
  }

  if (outputType === "json-smoke-text") {
    return { ok: true, data: parseValidationText(raw.stdout, raw.stderr) };
  }

  if (outputType === "game-data-readability-text") {
    return { ok: true, data: parseValidationText(raw.stdout, raw.stderr) };
  }

  if (outputType === "capture-diff-text") {
    return { ok: true, data: parseCaptureDiffText(raw.stdout, raw.stderr) };
  }

  return { ok: true, data: {} };
}

function parseValidationText(stdout, stderr) {
  const output = [stdout, stderr].filter(Boolean).join("\n");
  return {
    total: parseIntegerMatch(output, /^Total:\s*(\d+)/im),
    expectedFiles: parseIntegerMatch(output, /^Expected loader files:\s*(\d+)/im),
    parsedFiles: parseIntegerMatch(output, /^Parsed loader files:\s*(\d+)/im),
    warnings: parseIntegerMatch(output, /^Warnings:\s*(\d+)/im),
    failed: parseIntegerMatch(output, /^Failed:\s*(\d+)/im),
    reportPath: parseStringMatch(output, /^Report:\s*(.+)$/im),
    relevantLines: getLastRelevantLines(stdout || stderr),
  };
}

function parseCaptureDiffText(stdout, stderr) {
  const output = [stdout, stderr].filter(Boolean).join("\n");
  return {
    mode: parseStringMatch(output, /^Mode:\s*(.+)$/im),
    statusPath: parseStringMatch(output, /^Status:\s*(.+)$/im),
    diffPath: parseStringMatch(output, /^Diff:\s*(.+)$/im),
    checkPath: parseStringMatch(output, /^Check:\s*(.+)$/im),
    relevantLines: getLastRelevantLines(stdout || stderr),
  };
}

function parseIntegerMatch(output, pattern) {
  const value = parseStringMatch(output, pattern);
  return value === "" ? null : Number.parseInt(value, 10);
}

function parseStringMatch(output, pattern) {
  const match = output.match(pattern);
  return match ? match[1].trim() : "";
}

function getLastRelevantLines(output, maxLines = 8) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-maxLines);
}

function buildScriptFailure(raw, prefix = "Script failed.") {
  return [
    prefix,
    `Script: ${raw.script}`,
    `Exit code: ${raw.code}`,
    raw.timedOut ? "Timed out: yes" : "Timed out: no",
    raw.stderr ? `stderr: ${raw.stderr.slice(0, 800)}` : "",
    raw.stdout ? `stdout: ${raw.stdout.slice(0, 800)}` : "",
  ].filter(Boolean).join("\n");
}

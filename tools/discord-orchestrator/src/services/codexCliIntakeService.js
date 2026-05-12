import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { TASK_DRAFT_JSON_SCHEMA, validateTaskDraft } from "./taskDraftSchema.js";

const DEFAULT_TIMEOUT_MS = 60000;

export async function generateTaskDraftWithCodexCli(config, input = {}) {
  const llmConfig = config?.llmIntake ?? {};
  const runtime = selectCodexIntakeRuntime(llmConfig, input);
  if (llmConfig.enabled === false) {
    return failure("disabled", "Codex CLI intake is disabled by config.");
  }
  if ((llmConfig.provider || "codex_cli") !== "codex_cli") {
    return failure("unsupported_provider", `Unsupported intake provider: ${llmConfig.provider}`);
  }

  const run = await prepareRunFiles(config, input);
  const args = buildCodexArgs(config, run.schemaPath, run.outputPath, runtime);
  const startedAt = new Date().toISOString();
  const result = await runCodexProcess({
    command: llmConfig.command || "codex",
    args,
    cwd: config.repoRoot,
    stdin: buildPrompt(input),
    timeoutMs: Number(llmConfig.timeoutMs) || DEFAULT_TIMEOUT_MS,
  });
  const endedAt = new Date().toISOString();

  await fs.writeFile(run.stdoutPath, result.stdout, "utf8");
  await fs.writeFile(run.stderrPath, result.stderr, "utf8");

  if (result.exitCode !== 0) {
    return failure(
      "codex_cli_failed",
      `Codex CLI intake failed with exit code ${result.exitCode}. stderr log: ${toRepoRelative(config, run.stderrPath)}`,
      runMetadata(config, run, args, startedAt, endedAt, result, runtime),
    );
  }

  const rawOutput = await readTextIfExists(run.outputPath);
  if (!rawOutput.trim()) {
    return failure(
      "empty_response",
      `Codex CLI returned an empty TaskDraft response. stdout log: ${toRepoRelative(config, run.stdoutPath)}`,
      runMetadata(config, run, args, startedAt, endedAt, result, runtime),
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(extractJsonObject(rawOutput));
  } catch (error) {
    return failure(
      "invalid_json",
      `Codex CLI TaskDraft was not valid JSON: ${error.message}`,
      runMetadata(config, run, args, startedAt, endedAt, result, runtime),
    );
  }

  const validation = validateTaskDraft(parsed);
  if (!validation.ok) {
    return failure(
      "schema_validation_failed",
      `Codex CLI TaskDraft failed schema validation: ${validation.errors.join("; ")}`,
      runMetadata(config, run, args, startedAt, endedAt, result, runtime),
    );
  }

  return {
    ok: true,
    provider: "codex_cli",
    model: runtime.model,
    reasoning_effort: runtime.reasoningEffort,
    draft: validation.draft,
    run: runMetadata(config, run, args, startedAt, endedAt, result, runtime),
  };
}

export async function getCodexIntakeEngineStatus(config) {
  const llmConfig = config?.llmIntake ?? {};
  const command = llmConfig.command || "codex";
  const result = await runCodexProcess({
    command,
    args: [...baseArgs(llmConfig), "--version"],
    cwd: config.repoRoot,
    stdin: "",
    timeoutMs: 10000,
  });

  return {
    ok: result.exitCode === 0,
    data: {
      enabled: llmConfig.enabled !== false,
      provider: llmConfig.provider || "codex_cli",
      command,
      model: llmConfig.model || "gpt-5.5",
      reasoning_effort: llmConfig.reasoningEffort || "medium",
      ephemeral: llmConfig.ephemeral === true,
      model_routes_enabled: Array.isArray(llmConfig.modelRoutes) && llmConfig.modelRoutes.length > 0,
      model_route_count: Array.isArray(llmConfig.modelRoutes) ? llmConfig.modelRoutes.length : 0,
      sandbox: llmConfig.sandbox || "read-only",
      approval_policy: llmConfig.approvalPolicy || "never",
      timeout_ms: Number(llmConfig.timeoutMs) || DEFAULT_TIMEOUT_MS,
      output_dir: llmConfig.outputDir || "_Temp/AIWorkflowDiscordBot/intake",
      version: result.stdout.trim() || result.stderr.trim(),
      executable_ok: result.exitCode === 0,
      error: result.exitCode === 0 ? "" : result.stderr.trim() || result.stdout.trim(),
    },
  };
}

function buildCodexArgs(config, schemaPath, outputPath, runtime) {
  const llmConfig = config?.llmIntake ?? {};
  const args = [
    ...baseArgs(llmConfig),
    "--ask-for-approval",
    llmConfig.approvalPolicy || "never",
    "exec",
    "--sandbox",
    llmConfig.sandbox || "read-only",
    "--cd",
    config.repoRoot,
    "--output-schema",
    schemaPath,
    "--output-last-message",
    outputPath,
    "--json",
  ];

  if (llmConfig.skipGitRepoCheck === true) {
    args.push("--skip-git-repo-check");
  }

  if (runtime.ephemeral) {
    args.push("--ephemeral");
  }

  if (runtime.model) {
    args.push("--model", runtime.model);
  }

  if (runtime.reasoningEffort) {
    args.push("-c", `model_reasoning_effort="${runtime.reasoningEffort}"`);
  }

  args.push("-");
  return args;
}

function selectCodexIntakeRuntime(llmConfig, input = {}) {
  const base = {
    model: String(llmConfig.model || "gpt-5.5").trim(),
    reasoningEffort: normalizeReasoningEffort(llmConfig.reasoningEffort || "medium"),
    ephemeral: llmConfig.ephemeral === true,
    routeId: "default",
  };

  const route = findMatchingModelRoute(llmConfig.modelRoutes, input?.ruleBasedSuggestion);
  if (!route) {
    return base;
  }

  return {
    model: String(route.model || base.model).trim(),
    reasoningEffort: normalizeReasoningEffort(route.reasoning_effort || route.reasoningEffort || base.reasoningEffort),
    ephemeral: route.ephemeral === undefined ? base.ephemeral : route.ephemeral === true,
    routeId: String(route.id || "matched_route").trim(),
  };
}

function findMatchingModelRoute(routes, suggestion) {
  if (!Array.isArray(routes) || routes.length === 0 || !suggestion?.task_draft) {
    return null;
  }

  const draft = suggestion.task_draft;
  const facts = {
    category: String(draft.category || suggestion.suggested_category || "").toUpperCase(),
    kind: String(draft.kind || suggestion.suggested_kind || "").toLowerCase(),
    risk: String(draft.suggested_risk || suggestion.suggested_risk || "").toLowerCase(),
    priority: String(draft.priority || suggestion.suggested_priority || "").toUpperCase(),
    workflowPath: String(draft.workflow_path || suggestion.suggested_workflow_path || "").toLowerCase(),
  };

  return routes.find((route) => route?.enabled !== false && routeMatchesFacts(route, facts)) || null;
}

function routeMatchesFacts(route, facts) {
  return matchesList(route.categories, facts.category, "upper")
    && matchesList(route.kinds, facts.kind, "lower")
    && matchesList(route.risks, facts.risk, "lower")
    && matchesList(route.priorities, facts.priority, "upper")
    && matchesList(route.workflow_paths || route.workflowPaths, facts.workflowPath, "lower");
}

function matchesList(values, actual, mode) {
  if (!Array.isArray(values) || values.length === 0) {
    return true;
  }
  const normalizedActual = normalizeForMatch(actual, mode);
  return values.map((value) => normalizeForMatch(value, mode)).includes(normalizedActual);
}

function normalizeForMatch(value, mode) {
  const text = String(value ?? "").trim();
  return mode === "upper" ? text.toUpperCase() : text.toLowerCase();
}

function normalizeReasoningEffort(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return ["none", "minimal", "low", "medium", "high", "xhigh"].includes(text) ? text : "medium";
}

function baseArgs(llmConfig) {
  return Array.isArray(llmConfig.args) ? llmConfig.args.map(String) : [];
}

async function prepareRunFiles(config, input) {
  const outputDir = path.resolve(config.repoRoot, config?.llmIntake?.outputDir || "_Temp/AIWorkflowDiscordBot/intake");
  await fs.mkdir(outputDir, { recursive: true });

  const stamp = formatStamp(new Date());
  const prefix = `intake_${stamp}`;
  const schemaPath = path.join(outputDir, `${prefix}.schema.json`);
  const promptPath = path.join(outputDir, `${prefix}.prompt.md`);
  const outputPath = path.join(outputDir, `${prefix}.output.json`);
  const stdoutPath = path.join(outputDir, `${prefix}.stdout.jsonl`);
  const stderrPath = path.join(outputDir, `${prefix}.stderr.log`);

  await fs.writeFile(schemaPath, JSON.stringify(TASK_DRAFT_JSON_SCHEMA, null, 2), "utf8");
  await fs.writeFile(promptPath, buildPrompt(input), "utf8");

  return { outputDir, schemaPath, promptPath, outputPath, stdoutPath, stderrPath };
}

function buildPrompt(input) {
  const request = String(input.text ?? "").trim();
  const baseline = input.ruleBasedSuggestion?.task_draft ?? {};
  return [
    "You are the AIWorkflow intake classifier for this repository.",
    "Return exactly one JSON object matching the provided TaskDraft schema.",
    "Do not edit files. Do not create Backlog rows. Do not approve tasks. Do not execute implementation.",
    "",
    "Classify the user's request into an actionable AIWorkflow task draft.",
    "Prefer final-form architecture and explicit validation evidence.",
    "If the request is ambiguous, still produce the best draft and include clarifying questions.",
    "",
    "TaskDraft field guidance:",
    "- category: WF for workflow/harness/tooling, GAME for game/runtime/data work, DOC for documentation, VAL for validation, UNITY for Unity migration/release work.",
    "- priority: P0 blocker/data loss, P1 important workflow/runtime/schema work, P2 normal, P3 optional cleanup.",
    "- suggested_risk: high for schema/save/runtime/tool execution risks, medium for source/workflow behavior changes, low for docs or narrow maintenance.",
    "",
    "Rule-based baseline for cross-check:",
    JSON.stringify(baseline, null, 2),
    "",
    "User request:",
    request,
  ].join("\n");
}

function runCodexProcess({ command, args, cwd, stdin, timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        stderr += `\nCodex CLI intake timed out after ${timeoutMs}ms.`;
        child.kill();
        resolve({ exitCode: -1, stdout, stderr });
      }
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ exitCode: -1, stdout, stderr: `${stderr}\n${error.message}`.trim() });
      }
    });
    child.on("close", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ exitCode: code ?? -1, stdout, stderr });
      }
    });

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

async function readTextIfExists(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function extractJsonObject(text) {
  const value = String(text ?? "").trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (value.startsWith("{") && value.endsWith("}")) {
    return value;
  }

  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return value.slice(start, end + 1);
  }

  return value;
}

function runMetadata(config, run, args, startedAt, endedAt, result, runtime = {}) {
  return {
    command_line: `${config?.llmIntake?.command || "codex"} ${args.join(" ")}`,
    model: runtime.model || config?.llmIntake?.model || "gpt-5.5",
    reasoning_effort: runtime.reasoningEffort || config?.llmIntake?.reasoningEffort || "medium",
    ephemeral: runtime.ephemeral === true,
    model_route_id: runtime.routeId || "default",
    started_at: startedAt,
    ended_at: endedAt,
    exit_code: result.exitCode,
    prompt_file: toRepoRelative(config, run.promptPath),
    schema_file: toRepoRelative(config, run.schemaPath),
    output_file: toRepoRelative(config, run.outputPath),
    stdout_log: toRepoRelative(config, run.stdoutPath),
    stderr_log: toRepoRelative(config, run.stderrPath),
  };
}

function failure(code, error, run = null) {
  return {
    ok: false,
    code,
    error,
    provider: "codex_cli",
    run,
  };
}

function toRepoRelative(config, filePath) {
  const relative = path.relative(config.repoRoot, filePath).replaceAll(path.sep, "/");
  return relative || ".";
}

function formatStamp(date) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
    "_",
    pad2(date.getHours()),
    pad2(date.getMinutes()),
    pad2(date.getSeconds()),
    "_",
    String(date.getMilliseconds()).padStart(3, "0"),
  ].join("");
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { runScript } from "./commandRunner.js";

const DEFAULT_TIMEOUT_MS = 30000;
const LONG_TIMEOUT_MS = 900000;
const TASK_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*-[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const RUNNER_RUN_ID_PATTERN = /^runner-run-[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const PROFILE_VALUES = new Set(["analysis", "implementation", "validation", "build", "documentation"]);
const EXECUTOR_VALUES = new Set(["codex_cli", "local_cli"]);

export async function getPcRunnerStatus(config, input = {}) {
  return runPcRunner(config, "status", input, { timeoutMs: DEFAULT_TIMEOUT_MS });
}

export async function planPcRunner(config, input = {}) {
  return runPcRunner(config, "plan", input, { timeoutMs: DEFAULT_TIMEOUT_MS, includeProfile: true, includeExecutor: true });
}

export async function startPcRunner(config, input = {}) {
  return runPcRunner(config, "start", input, { timeoutMs: LONG_TIMEOUT_MS, includeProfile: true, includeExecutor: true });
}

export async function startPcRunnerDetached(config, input = {}) {
  try {
    const taskId = validateId(input.id, TASK_ID_PATTERN, "task id");

    const profile = normalizeOptionalChoice(input.profile, PROFILE_VALUES, "profile");
    const executor = normalizeOptionalChoice(input.executor, EXECUTOR_VALUES, "executor");

    const processInfo = await spawnDetachedPcRunner(config, { taskId, profile, executor });

    return {
      ok: true,
      command: "start",
      detached: true,
      data: {
        task_id: taskId,
        process_id: processInfo.pid,
        stdout_log: processInfo.stdoutLog,
        stderr_log: processInfo.stderrLog,
      },
      raw: null,
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      command: "start",
      detached: true,
      data: null,
      raw: null,
      error: error.message,
    };
  }
}

export async function continuePcRunner(config, input = {}) {
  return runPcRunner(config, "continue", input, { timeoutMs: LONG_TIMEOUT_MS, includeRunnerRunId: true });
}

export async function stopPcRunner(config, input = {}) {
  return runPcRunner(config, "stop", input, { timeoutMs: DEFAULT_TIMEOUT_MS, includeRunnerRunId: true });
}

export async function readPcRunner(config, input = {}) {
  return runPcRunner(config, "read", input, { timeoutMs: DEFAULT_TIMEOUT_MS, includeRunnerRunId: true });
}

async function runPcRunner(config, command, input = {}, options = {}) {
  try {
    const taskId = validateId(input.id, TASK_ID_PATTERN, "task id");
    const args = [command, taskId];

    if (options.includeProfile) {
      const profile = normalizeOptionalChoice(input.profile, PROFILE_VALUES, "profile");
      if (profile) {
        args.push("--profile", profile);
      }
    }

    if (options.includeExecutor) {
      const executor = normalizeOptionalChoice(input.executor, EXECUTOR_VALUES, "executor");
      if (executor) {
        args.push("--executor", executor);
      }
    }

    if (options.includeRunnerRunId) {
      const runnerRunId = normalizeOptionalId(input.runnerRunId, RUNNER_RUN_ID_PATTERN, "runner run id");
      if (runnerRunId) {
        args.push("--runner-run-id", runnerRunId);
      }
    }

    args.push("--json");
    const raw = await runScript(config, "tools/aiworkflow/pc_runner.bat", args, { timeoutMs: options.timeoutMs });
    const parsed = parseScriptJson(`pc_runner ${command}`, raw);
    return {
      ok: parsed.ok,
      command,
      data: parsed.data,
      raw,
      error: parsed.error,
    };
  } catch (error) {
    return {
      ok: false,
      command,
      data: null,
      error: error.message,
    };
  }
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

function normalizeOptionalChoice(value, allowed, label) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (!allowed.has(normalized)) {
    throw new Error(`Invalid ${label}.`);
  }
  return normalized;
}

async function spawnDetachedPcRunner(config, input) {
  const taskId = input.taskId;
  const profile = input.profile || "";
  const executor = input.executor || "";
  const scriptPath = path.join(config.repoRoot, "tools", "aiworkflow", "pc_runner.ps1");
  const logsDir = path.join(config.repoRoot, "_Temp", "AIWorkflowDiscordBot", "runner_start");
  fs.mkdirSync(logsDir, { recursive: true });

  const stamp = new Date().toISOString().replaceAll(/[-:.TZ]/g, "").slice(0, 17);
  const safeTask = taskId.replaceAll(/[^A-Za-z0-9_.-]/g, "-").toLowerCase();
  const stdoutPath = path.join(logsDir, `pc_runner_start_${safeTask}_${stamp}.stdout.log`);
  const stderrPath = path.join(logsDir, `pc_runner_start_${safeTask}_${stamp}.stderr.log`);
  const runnerArgs = buildPcRunnerStartArgs({
    scriptPath,
    taskId,
    profile,
    executor,
    repoRoot: config.repoRoot,
  });
  const launcher = [
    "$ErrorActionPreference = 'Stop'",
    `$argList = @(${runnerArgs.map(toPowerShellSingleQuoted).join(", ")})`,
    `$process = Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -WorkingDirectory ${toPowerShellSingleQuoted(config.repoRoot)} -RedirectStandardOutput ${toPowerShellSingleQuoted(stdoutPath)} -RedirectStandardError ${toPowerShellSingleQuoted(stderrPath)} -WindowStyle Hidden -PassThru`,
    "Write-Output $process.Id",
  ].join("\n");
  const encoded = Buffer.from(launcher, "utf16le").toString("base64");
  const result = await runPowerShellLauncher(config.repoRoot, encoded);
  if (!result.ok) {
    throw new Error(result.stderr || result.stdout || "Failed to start PC Runner background process.");
  }

  return {
    pid: Number(result.stdout.trim()) || 0,
    stdoutLog: toRepoRelativePath(config.repoRoot, stdoutPath),
    stderrLog: toRepoRelativePath(config.repoRoot, stderrPath),
  };
}

function buildPcRunnerStartArgs({ scriptPath, taskId, profile, executor, repoRoot }) {
  const args = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath,
    "-Command",
    "start",
    "-TaskId",
    taskId,
  ];

  if (profile) {
    args.push("-Profile", profile);
  }
  if (executor) {
    args.push("-Executor", executor);
  }

  args.push("-RepoRoot", repoRoot, "-Json");
  return args;
}

function runPowerShellLauncher(cwd, encodedCommand) {
  return new Promise((resolve) => {
    const child = spawn("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-EncodedCommand",
      encodedCommand,
    ], {
      cwd,
      windowsHide: true,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
    });

    const stdoutChunks = [];
    const stderrChunks = [];
    child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
    child.on("error", (error) => {
      resolve({ ok: false, stdout: "", stderr: error.message });
    });
    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        stdout: Buffer.concat(stdoutChunks).toString("utf8").trim(),
        stderr: Buffer.concat(stderrChunks).toString("utf8").trim(),
      });
    });
  });
}

function toPowerShellSingleQuoted(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function toRepoRelativePath(repoRoot, targetPath) {
  const root = path.resolve(repoRoot);
  const full = path.resolve(targetPath);
  return path.relative(root, full).replaceAll(path.sep, "/");
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
      error: raw.ok && data?.ok !== false ? "" : data?.error || data?.stop_reason || buildRawFailure(label, raw),
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: buildRawFailure(label, raw, `Failed to parse JSON: ${error.message}`),
    };
  }
}

function buildRawFailure(label, raw, prefix = "Script failed.") {
  return [
    `${label}: ${prefix}`,
    `exit=${raw.code}`,
    raw.timedOut ? "timed_out=yes" : "timed_out=no",
    raw.stderr ? `stderr=${raw.stderr.slice(0, 800)}` : "",
    raw.stdout ? `stdout=${raw.stdout.slice(0, 800)}` : "",
  ].filter(Boolean).join("\n");
}

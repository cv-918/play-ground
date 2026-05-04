import { spawn } from "node:child_process";
import path from "node:path";

function decodeBuffer(buffer) {
  if (!buffer || buffer.length === 0) {
    return "";
  }

  let zeroCount = 0;
  const sampleLength = Math.min(buffer.length, 200);
  for (let i = 0; i < sampleLength; i += 1) {
    if (buffer[i] === 0) {
      zeroCount += 1;
    }
  }

  if (zeroCount > sampleLength / 4) {
    return buffer.toString("utf16le");
  }

  return buffer.toString("utf8");
}

function validateScriptPath(relativeScriptPath) {
  if (typeof relativeScriptPath !== "string" || relativeScriptPath.length === 0) {
    throw new Error("Script path is empty.");
  }

  if (path.isAbsolute(relativeScriptPath)) {
    throw new Error(`Absolute script paths are not allowed: ${relativeScriptPath}`);
  }

  if (relativeScriptPath.includes("..")) {
    throw new Error(`Parent path traversal is not allowed: ${relativeScriptPath}`);
  }

  if (!relativeScriptPath.startsWith("tools/aiworkflow/")) {
    throw new Error(`Script path is not in the AIWorkflow tools allowlist root: ${relativeScriptPath}`);
  }

  if (!relativeScriptPath.toLowerCase().endsWith(".bat")) {
    throw new Error(`Only .bat scripts are allowed by Discord Bot v1: ${relativeScriptPath}`);
  }
}

function validateArgs(args) {
  for (const arg of args) {
    if (typeof arg !== "string") {
      throw new Error("Script arguments must be strings.");
    }

    // Keep Discord v1 script arguments intentionally narrow.
    // Existing commands use values such as --json, --list, --project, and validated project IDs.
    if (!/^(--[A-Za-z0-9_-]+|[A-Za-z0-9_-]+)$/.test(arg)) {
      throw new Error(`Unsafe script argument rejected: ${arg}`);
    }
  }
}

function quoteCmdPath(arg) {
  return `"${String(arg).replaceAll('"', '\\"')}"`;
}

export function runScript(config, relativeScriptPath, args = [], options = {}) {
  validateScriptPath(relativeScriptPath);
  validateArgs(args);

  const scriptPath = path.join(config.repoRoot, relativeScriptPath);
  const timeoutMs = Number.isInteger(options.timeoutMs)
    ? options.timeoutMs
    : config.limits.scriptTimeoutMs;
  const commandLine = [quoteCmdPath(scriptPath), ...args].join(" ");

  return new Promise((resolve) => {
    const child = spawn("cmd.exe", ["/d", "/c", commandLine], {
      cwd: config.repoRoot,
      windowsHide: true,
      windowsVerbatimArguments: true,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
    });

    const stdoutChunks = [];
    const stderrChunks = [];
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(Buffer.from(chunk));
    });

    child.stderr.on("data", (chunk) => {
      stderrChunks.push(Buffer.from(chunk));
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        code: -2,
        stdout: "",
        stderr: error.message,
        stdoutLength: 0,
        stderrLength: error.message.length,
        timedOut,
        script: relativeScriptPath,
        args,
        command: `${scriptPath} ${args.join(" ")}`.trim(),
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);

      const stdout = decodeBuffer(Buffer.concat(stdoutChunks)).trim();
      const stderr = decodeBuffer(Buffer.concat(stderrChunks)).trim();

      resolve({
        ok: code === 0 && !timedOut,
        code: timedOut ? -1 : code,
        stdout,
        stderr,
        stdoutLength: stdout.length,
        stderrLength: stderr.length,
        timedOut,
        script: relativeScriptPath,
        args,
        command: `${scriptPath} ${args.join(" ")}`.trim(),
      });
    });
  });
}

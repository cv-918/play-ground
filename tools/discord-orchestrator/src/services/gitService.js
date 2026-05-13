import { spawn } from "node:child_process";
import path from "node:path";

const DEFAULT_TIMEOUT_MS = 60000;

export async function commitWorkflowChanges(config, input = {}) {
  const status = await readGitStatus(config);
  if (!status.ok) {
    return failure("commit", status.error, { status });
  }

  const safety = evaluateGitSafety(status.files);
  if (!safety.ok) {
    return failure("commit", safety.error, { status, safety });
  }

  const message = normalizeCommitMessage(input.message, status.files);
  if (!message.ok) {
    return failure("commit", message.error, { status, safety });
  }

  if (status.files.length === 0) {
    return {
      ok: true,
      command: "commit",
      stage: "no_changes",
      data: {
        message: message.value,
        message_generated: message.generated,
        status,
        safety,
        committed: false,
        pushed: false,
        note: "No git changes to commit.",
      },
    };
  }

  const add = await runGit(config, ["add", "-A", "--", ...status.files.map((file) => file.path)]);
  if (!add.ok) {
    return failure("commit", "git add failed.", { status, safety, add });
  }

  const diffCheck = await runGit(config, ["diff", "--cached", "--check"]);
  if (!diffCheck.ok) {
    return failure("commit", "git diff --cached --check failed.", { status, safety, diffCheck });
  }

  const staged = await runGit(config, ["diff", "--cached", "--name-only"]);
  const stagedFiles = splitLines(staged.stdout);
  if (stagedFiles.length === 0) {
    return {
      ok: true,
      command: "commit",
      stage: "nothing_staged",
      data: {
        message: message.value,
        message_generated: message.generated,
        status,
        safety,
        committed: false,
        pushed: false,
        note: "No staged changes after safety filtering.",
      },
    };
  }

  const commit = await runGit(config, ["commit", "-m", message.value]);
  if (!commit.ok) {
    return failure("commit", "git commit failed.", { status, safety, staged_files: stagedFiles, commit });
  }

  const head = await runGit(config, ["rev-parse", "--short", "HEAD"]);
  return {
    ok: true,
    command: "commit",
    stage: "committed",
    data: {
      message: message.value,
      message_generated: message.generated,
      status,
      safety,
      staged_files: stagedFiles,
      committed: true,
      pushed: false,
      commit_sha: head.ok ? head.stdout.trim() : "",
      git: commit,
    },
  };
}

export async function pushWorkflowChanges(config) {
  const branch = await runGit(config, ["branch", "--show-current"]);
  if (!branch.ok) {
    return failure("push", "git branch --show-current failed.", { branch });
  }

  const push = await runGit(config, ["push"]);
  if (!push.ok) {
    return failure("push", "git push failed.", { branch: branch.stdout.trim(), push });
  }

  return {
    ok: true,
    command: "push",
    stage: "pushed",
    data: {
      branch: branch.stdout.trim(),
      committed: false,
      pushed: true,
      git: push,
    },
  };
}

export async function commitAndPushWorkflowChanges(config, input = {}) {
  const commit = await commitWorkflowChanges(config, input);
  if (!commit.ok) {
    return {
      ...commit,
      command: "commit-push",
    };
  }

  const push = await pushWorkflowChanges(config);
  return {
    ok: push.ok === true,
    command: "commit-push",
    stage: push.ok ? "committed_and_pushed" : "push_failed",
    data: {
      commit: commit.data,
      push: push.data,
      committed: commit.data?.committed === true,
      pushed: push.ok === true,
    },
    error: push.ok ? "" : push.error || "Commit succeeded, but push failed.",
  };
}

async function readGitStatus(config) {
  const raw = await runGit(config, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  if (!raw.ok) {
    return { ok: false, error: "git status failed.", raw, files: [] };
  }

  return {
    ok: true,
    raw,
    files: parsePorcelainStatus(raw.stdout),
  };
}

function evaluateGitSafety(files) {
  const forbidden = files.filter((file) => isForbiddenGitPath(file.path));
  if (forbidden.length > 0) {
    return {
      ok: false,
      forbidden,
      error: `Forbidden path(s) present in git status: ${forbidden.map((file) => file.path).join(", ")}`,
    };
  }

  return {
    ok: true,
    forbidden: [],
    checked_file_count: files.length,
  };
}

function parsePorcelainStatus(stdout) {
  const records = String(stdout ?? "").split("\0").filter(Boolean);
  const files = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const status = record.slice(0, 2);
    const filePath = normalizeRepoPath(record.slice(2).trimStart());
    if (!filePath) {
      continue;
    }

    files.push({ status, path: filePath });

    if (status.includes("R") || status.includes("C")) {
      const oldPath = normalizeRepoPath(records[index + 1] || "");
      if (oldPath) {
        files.push({ status: `${status} old`, path: oldPath });
        index += 1;
      }
    }
  }

  return dedupeFiles(files);
}

function dedupeFiles(files) {
  const seen = new Set();
  const result = [];
  for (const file of files) {
    const key = file.path.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(file);
  }
  return result;
}

function isForbiddenGitPath(filePath) {
  const normalized = normalizeRepoPath(filePath).toLowerCase();
  const baseName = path.posix.basename(normalized);
  return normalized.startsWith("_temp/")
    || normalized.startsWith("_local/")
    || normalized === "node_modules"
    || normalized.startsWith("node_modules/")
    || normalized.includes("/node_modules/")
    || baseName === ".env"
    || baseName.startsWith(".env.")
    || normalized.endsWith(".local.json");
}

function normalizeRepoPath(filePath) {
  return String(filePath ?? "").replaceAll("\\", "/").replace(/^\.\/+/, "").trim();
}

function normalizeCommitMessage(message, files = []) {
  const value = String(message ?? "").replace(/\s+/g, " ").trim();
  const generated = !value;
  const normalized = generated ? generateCommitMessage(files) : value;
  if (normalized.length > 180) {
    return { ok: false, error: "Commit message must be 180 characters or fewer." };
  }
  return { ok: true, value: normalized, generated };
}

function generateCommitMessage(files = []) {
  const paths = files.map((file) => normalizeRepoPath(file.path));
  if (paths.length === 0) {
    return "No workflow changes";
  }

  const all = (predicate) => paths.every(predicate);
  const any = (predicate) => paths.some(predicate);

  if (all((filePath) => filePath === "_Docs/AIWorkflow/ActiveTask.md" || filePath === "_Docs/AIWorkflow/Backlog.md")) {
    return "Record workflow task state";
  }

  if (any((filePath) => filePath.startsWith("tools/discord-orchestrator/"))) {
    return "Update Discord orchestrator workflow";
  }

  if (any((filePath) => filePath.startsWith("tools/aiworkflow/"))) {
    return "Update AIWorkflow runner tooling";
  }

  if (all((filePath) => filePath.startsWith("_Docs/") || filePath.startsWith("_DevLog/"))) {
    return "Update workflow documentation";
  }

  if (any((filePath) => filePath.startsWith("PlayGround/"))) {
    return "Update PlayGround project files";
  }

  return "Update workflow files";
}

function runGit(config, args, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd: config.repoRoot,
      windowsHide: true,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutChunks = [];
    const stderrChunks = [];
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        code: -2,
        stdout: "",
        stderr: error.message,
        timedOut,
        args,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const stdout = Buffer.concat(stdoutChunks).toString("utf8").trim();
      const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();
      resolve({
        ok: code === 0 && !timedOut,
        code: timedOut ? -1 : code,
        stdout,
        stderr,
        timedOut,
        args,
      });
    });
  });
}

function splitLines(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function failure(command, error, data = {}) {
  return {
    ok: false,
    command,
    stage: "failed",
    data,
    error,
  };
}

#!/usr/bin/env node
"use strict";

const path = require("path");
const { spawn } = require("child_process");

function slash(value) {
  return String(value || "").replace(/\\/g, "/");
}

function runGit(repoRoot, args, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd: repoRoot,
      windowsHide: true,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      stderr += `\nProcess timed out after ${timeoutMs} ms.`;
      child.kill();
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

function parseGitShortStatus(text) {
  return String(text || "")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const match = String(line).match(/^(.{1,2})\s+(.+)$/u);
      const status = (match ? match[1] : line.slice(0, 2)).trim() || "??";
      const rawPath = (match ? match[2] : line.slice(2)).trim();
      const filePath = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop().trim() : rawPath;
      return {
        status,
        path: slash(filePath),
        label: `${status} ${slash(filePath)}`,
      };
    })
    .filter((entry) => entry.path);
}

function isForbiddenGitPath(filePath) {
  const normalized = slash(filePath).toLowerCase();
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

function suggestCommitMessage(files = []) {
  const paths = files.map((file) => slash(file));
  if (paths.length === 0) return "No selected workflow changes";
  const all = (predicate) => paths.every(predicate);
  const any = (predicate) => paths.some(predicate);
  if (all((filePath) => filePath.startsWith("_Docs/AIWorkflow/") || filePath.startsWith("tools/aiworkflow/"))) {
    return "Update AIWorkflow Studio";
  }
  if (any((filePath) => filePath.startsWith("tools/aiworkflow/"))) {
    return "Update AIWorkflow tooling";
  }
  if (all((filePath) => filePath.startsWith("_Docs/") || filePath.startsWith("_DevLog/"))) {
    return "Update project documentation";
  }
  if (any((filePath) => filePath.startsWith("PlayGround/"))) {
    return "Update PlayGround game files";
  }
  return "Update selected project files";
}

function validateSelectedGitFiles(currentEntries, files = []) {
  const current = new Set(currentEntries.map((entry) => slash(entry.path)));
  const selected = Array.from(new Set((Array.isArray(files) ? files : [])
    .map((file) => slash(file).trim())
    .filter(Boolean)));
  if (selected.length === 0) {
    throw new Error("No files selected.");
  }
  for (const filePath of selected) {
    if (!current.has(filePath)) {
      throw new Error(`Selected file is not in current git status: ${filePath}`);
    }
    if (filePath.includes("..") || path.isAbsolute(filePath) || isForbiddenGitPath(filePath)) {
      throw new Error(`Refusing to stage forbidden or unsafe path: ${filePath}`);
    }
  }
  return selected;
}

async function getGitStatusEntries(repoRoot) {
  const status = await runGit(repoRoot, ["status", "--short"]);
  if (!status.ok) {
    throw new Error(status.stderr || "git status --short failed.");
  }
  return parseGitShortStatus(status.stdout);
}

async function commitSelectedFiles(repoRoot, input = {}) {
  const entries = await getGitStatusEntries(repoRoot);
  const files = validateSelectedGitFiles(entries, input.files);
  const message = String(input.message || "").replace(/\s+/g, " ").trim() || suggestCommitMessage(files);
  if (message.length > 180) {
    throw new Error("Commit message must be 180 characters or fewer.");
  }

  const selected = new Set(files);
  const preStaged = await runGit(repoRoot, ["diff", "--cached", "--name-only"], 30000);
  const preStagedFiles = preStaged.stdout ? preStaged.stdout.split(/\r?\n/u).filter(Boolean).map(slash) : [];
  const unexpectedPreStaged = preStagedFiles.filter((filePath) => !selected.has(filePath));
  if (unexpectedPreStaged.length > 0) {
    throw new Error(`Refusing selected commit while unrelated files are already staged: ${unexpectedPreStaged.join(", ")}`);
  }

  const add = await runGit(repoRoot, ["add", "--", ...files], 30000);
  if (!add.ok) {
    throw new Error(add.stderr || "git add failed.");
  }
  const diffCheck = await runGit(repoRoot, ["diff", "--cached", "--check"], 30000);
  if (!diffCheck.ok) {
    throw new Error(diffCheck.stderr || "git diff --cached --check failed.");
  }
  const staged = await runGit(repoRoot, ["diff", "--cached", "--name-only"], 30000);
  const stagedFiles = staged.stdout ? staged.stdout.split(/\r?\n/u).filter(Boolean).map(slash) : [];
  const unexpectedStaged = stagedFiles.filter((filePath) => !selected.has(filePath));
  if (unexpectedStaged.length > 0) {
    throw new Error(`Refusing to commit files outside current Studio selection: ${unexpectedStaged.join(", ")}`);
  }
  if (stagedFiles.length === 0) {
    return { committed: false, message, staged_files: [], note: "No staged changes after selection." };
  }
  const commit = await runGit(repoRoot, ["commit", "-m", message], 60000);
  if (!commit.ok) {
    throw new Error(commit.stderr || commit.stdout || "git commit failed.");
  }
  const head = await runGit(repoRoot, ["rev-parse", "--short", "HEAD"], 10000);
  return {
    committed: true,
    pushed: false,
    message,
    staged_files: stagedFiles,
    commit_sha: head.ok ? head.stdout.trim() : "",
    git: commit,
  };
}

async function pushCurrentBranch(repoRoot) {
  const branch = await runGit(repoRoot, ["branch", "--show-current"], 10000);
  if (!branch.ok) {
    throw new Error(branch.stderr || "git branch --show-current failed.");
  }
  const push = await runGit(repoRoot, ["push"], 120000);
  if (!push.ok) {
    throw new Error(push.stderr || push.stdout || "git push failed.");
  }
  return {
    pushed: true,
    branch: branch.stdout.trim(),
    git: push,
  };
}

module.exports = {
  runGit,
  parseGitShortStatus,
  getGitStatusEntries,
  commitSelectedFiles,
  pushCurrentBranch,
};

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

async function getGitStatusEntries(repoRoot) {
  const status = await runGit(repoRoot, ["status", "--short"]);
  if (!status.ok) {
    throw new Error(status.stderr || "git status --short failed.");
  }
  return parseGitShortStatus(status.stdout);
}

module.exports = {
  runGit,
  parseGitShortStatus,
  isForbiddenGitPath,
  suggestCommitMessage,
  getGitStatusEntries,
};

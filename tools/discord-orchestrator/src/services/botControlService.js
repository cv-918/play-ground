import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const RESTART_DELAY_MS = 1000;
const execFileAsync = promisify(execFile);

export async function prepareBotRestart(config) {
  const paths = getBotControlPaths(config);
  const state = await readState(paths.stateFile);
  if (!state?.pid) {
    return {
      ok: false,
      error: "봇 재시작은 start_bot.bat가 만든 관리 상태 파일이 필요합니다. 먼저 tools\\discord-orchestrator\\start_bot.bat로 봇을 시작하세요.",
      data: { managed: false, state_file: toRepoRelative(config, paths.stateFile) },
    };
  }

  const recordedPid = Number(state.pid);
  if (recordedPid !== process.pid) {
    return {
      ok: false,
      error: `기록된 봇 PID(${recordedPid})가 현재 프로세스 PID(${process.pid})와 다릅니다. 잘못된 프로세스를 멈추지 않도록 Discord 재시작을 거부했습니다.`,
      data: {
        managed: false,
        recorded_pid: recordedPid,
        current_pid: process.pid,
        state_file: toRepoRelative(config, paths.stateFile),
      },
    };
  }

  return {
    ok: true,
    data: {
      managed: true,
      current_pid: process.pid,
      restart_script: toRepoRelative(config, paths.restartScript),
      delay_ms: RESTART_DELAY_MS,
    },
  };
}

export function scheduleBotRestart(config) {
  const paths = getBotControlPaths(config);
  setTimeout(() => {
    const child = spawn("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      paths.restartScript,
    ], {
      cwd: paths.botRoot,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  }, RESTART_DELAY_MS);
}

export async function getManagedBotStatus(config) {
  const paths = getBotControlPaths(config);
  const state = await readState(paths.stateFile);
  const currentGit = await readCurrentGitState(config);
  const freshness = evaluateRuntimeFreshness(state, currentGit);
  return {
    ok: true,
    data: {
      managed: Number(state?.pid) === process.pid,
      current_pid: process.pid,
      recorded_pid: state?.pid ?? null,
      started_at: state?.started_at ?? "",
      process_started_at: state?.process_started_at ?? "",
      state_git_branch: state?.git_branch ?? "",
      state_git_head: state?.git_head ?? "",
      state_git_head_short: state?.git_head_short ?? "",
      state_git_head_committed_at: state?.git_head_committed_at ?? "",
      current_git_branch: currentGit.branch,
      current_git_head: currentGit.head,
      current_git_head_short: currentGit.headShort,
      current_git_head_committed_at: currentGit.committedAt,
      restart_recommended: freshness.restartRecommended,
      restart_reason: freshness.reason,
      state_file: toRepoRelative(config, paths.stateFile),
      restart_script: toRepoRelative(config, paths.restartScript),
    },
  };
}

async function readCurrentGitState(config) {
  const [branch, head, headShort, committedAt] = await Promise.all([
    runGit(config, ["branch", "--show-current"]),
    runGit(config, ["rev-parse", "HEAD"]),
    runGit(config, ["rev-parse", "--short", "HEAD"]),
    runGit(config, ["log", "-1", "--format=%cI"]),
  ]);

  return {
    branch: branch.ok ? branch.stdout : "",
    head: head.ok ? head.stdout : "",
    headShort: headShort.ok ? headShort.stdout : "",
    committedAt: committedAt.ok ? committedAt.stdout : "",
  };
}

async function runGit(config, args) {
  try {
    const result = await execFileAsync("git", args, {
      cwd: config.repoRoot,
      windowsHide: true,
      timeout: 10000,
    });
    return { ok: true, stdout: result.stdout.trim() };
  } catch {
    return { ok: false, stdout: "" };
  }
}

function evaluateRuntimeFreshness(state, currentGit) {
  if (!state) {
    return {
      restartRecommended: true,
      reason: "bot state file is missing or unreadable",
    };
  }

  const stateHead = String(state.git_head ?? "").trim();
  if (stateHead && currentGit.head && stateHead !== currentGit.head) {
    return {
      restartRecommended: true,
      reason: "bot started from an older Git HEAD",
    };
  }

  if (!stateHead && state.process_started_at && currentGit.committedAt) {
    const processStartedAt = Date.parse(state.process_started_at);
    const headCommittedAt = Date.parse(currentGit.committedAt);
    if (Number.isFinite(processStartedAt) && Number.isFinite(headCommittedAt) && headCommittedAt > processStartedAt) {
      return {
        restartRecommended: true,
        reason: "current Git HEAD is newer than the running bot process",
      };
    }
  }

  return {
    restartRecommended: false,
    reason: "running bot matches current Git HEAD",
  };
}

function getBotControlPaths(config) {
  const botRoot = path.resolve(config.repoRoot, "tools/discord-orchestrator");
  return {
    botRoot,
    stateFile: path.resolve(config.repoRoot, "_Temp/AIWorkflowDiscordBot/state.json"),
    restartScript: path.join(botRoot, "scripts", "restart_bot.ps1"),
  };
}

async function readState(stateFile) {
  try {
    const text = await fs.readFile(stateFile, "utf8");
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

function toRepoRelative(config, filePath) {
  return path.relative(config.repoRoot, filePath).replaceAll(path.sep, "/");
}

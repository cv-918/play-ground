import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";
import { createTaskFromIntake } from "../src/services/intakeTaskCreationService.js";
import { getPcRunnerStatus } from "../src/services/pcRunnerService.js";
import { acceptCompletionAndContinueRunner } from "../src/services/runnerCompletionService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

async function main() {
  const baseConfig = loadConfig();
  const smokeId = `auto-workflow-${stamp()}`;
  const smokeRoot = path.join(os.tmpdir(), "AIWorkflowDiscordBotSmoke", smokeId);
  const reportRoot = path.join(repoRoot, "_Temp", "AIWorkflowDiscordBot", "smoke", smokeId);
  const smokeRepo = path.join(smokeRoot, "repo");
  await prepareSmokeRepo(smokeRepo);

  const config = {
    ...baseConfig,
    repoRoot: smokeRepo,
    llmIntake: {
      ...baseConfig.llmIntake,
      outputDir: path.join(smokeRoot, "intake"),
      skipGitRepoCheck: true,
    },
    intakeAutoHandoff: {
      enabled: true,
      autoStartLowRisk: true,
    },
  };

  const request = [
    "VAL task: Run a safe local validation smoke for the intake auto-handoff workflow.",
    "No source or document changes in the real repository.",
    "Confirm intake creates a Backlog task, auto handoff starts PC Runner, and completion acceptance can continue the runner.",
  ].join(" ");

  const intake = await createTaskFromIntake(config, { text: request });
  if (!intake.ok) {
    return fail(reportRoot, smokeRoot, "intake", { intake });
  }

  const taskId = intake.data.task.id;
  const runnerStart = intake.data.auto_handoff?.runner_start ?? {};
  if (intake.data.auto_handoff?.decision !== "runner_started") {
    return fail(reportRoot, smokeRoot, "auto_handoff", { taskId, auto_handoff: intake.data.auto_handoff });
  }
  if (runnerStart.detached !== true) {
    return fail(reportRoot, smokeRoot, "runner_detached_start", { taskId, runnerStart });
  }

  const completionGate = await waitForCompletionGate(config, taskId);
  if (!completionGate.ok) {
    return fail(reportRoot, smokeRoot, "completion_gate", { taskId, runnerStart, completionGate });
  }

  const completionReportId = completionGate.completionReportId;
  const runnerRunId = completionGate.runnerRunId;
  if (!completionReportId || !runnerRunId) {
    return fail(reportRoot, smokeRoot, "runner_artifacts", { taskId, runnerStart, completionGate });
  }

  const accept = await acceptCompletionAndContinueRunner(config, {
    id: taskId,
    completionReportId,
    runnerRunId,
    decision: "accept",
    actor: "smoke_auto_workflow",
  });
  if (!accept.ok) {
    return fail(reportRoot, smokeRoot, "accept_completion", { taskId, completionReportId, runnerRunId, accept });
  }

  const continueData = accept.data.runner_continue?.data ?? {};
  const stopReason = continueData.stop_reason || continueData.runner_run?.human_gate_state?.stop_reason;
  if (stopReason !== "done_or_commit_decision") {
    return fail(reportRoot, smokeRoot, "post_finalization_gate", { taskId, accept, stopReason });
  }

  const report = {
    ok: true,
    report_root: toRepoRelative(reportRoot),
    smoke_root: smokeRoot,
    smoke_repo: smokeRepo,
    task_id: taskId,
    intake_decision: intake.data.auto_handoff.decision,
    runner_start_detached: runnerStart.detached === true,
    runner_start_process_id: runnerStart.process_id,
    runner_start_stdout_log: runnerStart.stdout_log,
    runner_start_stderr_log: runnerStart.stderr_log,
    runner_start_stop_reason: completionGate.stopReason,
    completion_report_id: completionReportId,
    runner_run_id: runnerRunId,
    finalization_log_id: accept.data.finalization_log_id,
    final_stop_reason: stopReason,
    real_repo_state_modified: false,
    source_or_doc_files_modified_in_real_repo: false,
  };
  await writeReport(reportRoot, report);
  console.log(JSON.stringify(report, null, 2));
}

async function waitForCompletionGate(config, taskId) {
  const startedAt = Date.now();
  const timeoutMs = 180000;
  let last = null;

  while (Date.now() - startedAt < timeoutMs) {
    const status = await getPcRunnerStatus(config, { id: taskId });
    last = status;
    const data = status.data ?? {};
    const run = data.runner_run ?? data.latest_runner_run ?? {};
    const reports = data.report_ids ?? run.report_ids ?? {};
    const stopReason = data.stop_reason || run.human_gate_state?.stop_reason;
    const runnerRunId = data.runner_run_id || run.runner_run_id;

    if (status.ok && stopReason === "completion_review_required") {
      return {
        ok: true,
        status,
        stopReason,
        runnerRunId,
        completionReportId: reports.completion_report_id,
      };
    }

    await sleep(1000);
  }

  return {
    ok: false,
    error: "Timed out waiting for completion_review_required.",
    last,
  };
}

async function prepareSmokeRepo(smokeRepo) {
  await fs.rm(smokeRepo, { recursive: true, force: true });
  await fs.mkdir(smokeRepo, { recursive: true });
  await fs.cp(path.join(repoRoot, "_Docs"), path.join(smokeRepo, "_Docs"), { recursive: true });
  await fs.cp(path.join(repoRoot, "PlayGround", "Data"), path.join(smokeRepo, "PlayGround", "Data"), { recursive: true });
  await fs.cp(path.join(repoRoot, "tools", "aiworkflow"), path.join(smokeRepo, "tools", "aiworkflow"), { recursive: true });
  runGit(smokeRepo, ["init", "-q"]);
  runGit(smokeRepo, ["add", "."]);
  runGit(smokeRepo, ["-c", "user.name=AIWorkflow Smoke", "-c", "user.email=aiworkflow-smoke@example.invalid", "commit", "-q", "-m", "smoke baseline"]);
}

async function fail(reportRoot, smokeRoot, stage, details) {
  const report = {
    ok: false,
    stage,
    report_root: toRepoRelative(reportRoot),
    smoke_root: smokeRoot,
    details,
    real_repo_state_modified: false,
  };
  await writeReport(reportRoot, report);
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
}

async function writeReport(smokeRoot, report) {
  await fs.mkdir(smokeRoot, { recursive: true });
  await fs.writeFile(path.join(smokeRoot, "auto_workflow_e2e_smoke.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function stamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
    "-",
    String(now.getMilliseconds()).padStart(3, "0"),
  ].join("");
}

function toRepoRelative(value) {
  return path.relative(repoRoot, value).replaceAll(path.sep, "/") || ".";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runGit(cwd, args) {
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});

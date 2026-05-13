import { recordFinalizationDecision } from "./finalizationService.js";
import { continuePcRunner } from "./pcRunnerService.js";
import { completeTask } from "./taskService.js";

export async function acceptCompletionAndContinueRunner(config, input = {}) {
  const finalizationCommand = normalizeDecision(input.decision);
  const finalization = await recordFinalizationDecision(config, {
    id: input.id,
    command: finalizationCommand,
    completionReportId: input.completionReportId,
    actor: input.actor,
  });

  if (!finalization.ok) {
    return {
      ok: false,
      command: "accept-completion",
      stage: "finalization",
      data: {
        task_id: input.id,
        finalization,
        runner_continue: null,
      },
      error: finalization.error || "Failed to record finalization decision.",
    };
  }

  const runnerContinue = await continuePcRunner(config, {
    id: input.id,
    runnerRunId: input.runnerRunId,
  });
  const shouldMarkDone = input.markDone === true;
  const taskDone = runnerContinue.ok === true && shouldMarkDone
    ? await completeTask(config, {
      id: input.id,
      evidence: buildDoneEvidence(finalizationCommand, finalization.data?.finalization_log_id, runnerContinue),
    })
    : null;

  return {
    ok: runnerContinue.ok === true && (!shouldMarkDone || taskDone?.ok === true),
    command: "accept-completion",
    stage: runnerContinue.ok
      ? (shouldMarkDone ? (taskDone?.ok === true ? "continued_and_done" : "task_done") : "continued")
      : "runner_continue",
    data: {
      task_id: input.id,
      decision: finalizationCommand,
      finalization_log_id: finalization.data?.finalization_log_id,
      finalization,
      runner_continue: runnerContinue,
      task_done: taskDone,
      task_done_requested: shouldMarkDone,
      runner_run_id: runnerContinue.data?.runner_run_id || runnerContinue.data?.runner_run?.runner_run_id || input.runnerRunId || "",
      report_ids: runnerContinue.data?.report_ids || runnerContinue.data?.runner_run?.report_ids || {},
    },
    error: runnerContinue.ok
      ? (shouldMarkDone && taskDone?.ok !== true ? taskDone?.error || "Runner continued, but task done failed." : "")
      : runnerContinue.error || "Finalization was recorded, but runner continue failed.",
  };
}

function normalizeDecision(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "accept-concerns") {
    return "accept-concerns";
  }
  return "accept";
}

function buildDoneEvidence(decision, finalizationLogId, runnerContinue) {
  const runnerRunId = runnerContinue?.data?.runner_run_id || runnerContinue?.data?.runner_run?.runner_run_id || "";
  const stopReason = runnerContinue?.data?.stop_reason || runnerContinue?.data?.runner_run?.human_gate_state?.stop_reason || "";
  return [
    `Completion ${decision} recorded`,
    finalizationLogId ? `FinalizationLog ${finalizationLogId}` : "",
    runnerRunId ? `Runner ${runnerRunId}` : "",
    stopReason ? `stopped at ${stopReason}` : "",
  ].filter(Boolean).join("; ");
}

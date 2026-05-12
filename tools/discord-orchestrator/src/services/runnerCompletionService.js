import { recordFinalizationDecision } from "./finalizationService.js";
import { continuePcRunner } from "./pcRunnerService.js";

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

  return {
    ok: runnerContinue.ok === true,
    command: "accept-completion",
    stage: runnerContinue.ok ? "continued" : "runner_continue",
    data: {
      task_id: input.id,
      decision: finalizationCommand,
      finalization_log_id: finalization.data?.finalization_log_id,
      finalization,
      runner_continue: runnerContinue,
      runner_run_id: runnerContinue.data?.runner_run_id || runnerContinue.data?.runner_run?.runner_run_id || input.runnerRunId || "",
      report_ids: runnerContinue.data?.report_ids || runnerContinue.data?.runner_run?.report_ids || {},
    },
    error: runnerContinue.ok ? "" : runnerContinue.error || "Finalization was recorded, but runner continue failed.",
  };
}

function normalizeDecision(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "accept-concerns") {
    return "accept-concerns";
  }
  return "accept";
}

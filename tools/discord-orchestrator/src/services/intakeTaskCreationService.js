import { suggestTaskFromIntake } from "./taskIntakeService.js";
import { runIntakeAutoHandoff } from "./intakeAutoHandoffService.js";
import { createTask } from "./taskService.js";

export async function createTaskFromIntake(config, input = {}) {
  const suggestion = await suggestTaskFromIntake(config, { text: input.text });
  if (!suggestion.ok) {
    return suggestion;
  }
  if (suggestion.llm?.used !== true) {
    return {
      ok: false,
      error: "Codex CLI intake did not produce a validated TaskDraft. Backlog was not updated.",
      suggestion,
    };
  }
  const draft = suggestion.task_draft ?? {};

  const taskResult = await createTask(config, {
    title: draft.title,
    category: draft.category,
    priority: draft.priority,
    kind: draft.kind,
    reason: draft.reason,
    toolRoute: "Discord intake -> Codex CLI TaskDraft -> human review",
    validation: buildValidationNote(draft, suggestion),
  });

  if (!taskResult.ok) {
    return taskResult;
  }

  const autoHandoff = await runIntakeAutoHandoff(config, {
    task: taskResult.data,
    draft,
    suggestion,
  });

  return {
    ok: true,
    data: {
      task: taskResult.data,
      draft,
      suggestion,
      auto_handoff: autoHandoff,
      safety: {
        backlog_updated: true,
        active_task_updated: autoHandoff.active_task_updated === true,
        approved: autoHandoff.approved === true,
        agents_executed: false,
        codex_executed: didRunImplementationCodex(autoHandoff),
        codex_intake_executed: true,
        implementation_codex_executed: didRunImplementationCodex(autoHandoff),
        pc_runner_started: autoHandoff.runner_started === true,
      },
    },
  };
}

function didRunImplementationCodex(autoHandoff) {
  return autoHandoff?.runner_started === true
    && autoHandoff?.profile === "implementation"
    && autoHandoff?.executor === "codex_cli";
}

function buildValidationNote(draft, suggestion) {
  const risk = String(draft.suggested_risk ?? "unknown").trim();
  const path = String(draft.workflow_path ?? "unknown").trim();
  const validationCount = Array.isArray(draft.required_validation)
    ? draft.required_validation.length
    : 0;
  const outputFile = String(suggestion.llm?.run?.output_file ?? "").trim();
  const outputRef = outputFile ? `; taskdraft_output=${outputFile}` : "";
  const review = suggestion.rule_based_cross_check?.requires_human_review ? "; needs review" : "";
  const questions = Array.isArray(draft.clarifying_questions) && draft.clarifying_questions.length > 0
    ? "; has clarifying questions"
    : "";
  return `codex intake draft: risk=${risk}; workflow_path=${path}; required_validation_count=${validationCount}${outputRef}${review}${questions}; validation pending human approval`;
}

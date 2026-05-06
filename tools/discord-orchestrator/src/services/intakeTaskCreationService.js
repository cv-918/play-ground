import { suggestTaskFromIntake } from "./taskIntakeService.js";
import { createTask } from "./taskService.js";

export async function createTaskFromIntake(config, input = {}) {
  const suggestion = suggestTaskFromIntake({ text: input.text });
  const draft = suggestion.task_draft ?? {};

  const taskResult = await createTask(config, {
    title: draft.title,
    category: draft.category,
    priority: draft.priority,
    kind: draft.kind,
    reason: draft.reason,
    toolRoute: "Discord intake-create -> human review",
    validation: buildValidationNote(draft),
  });

  if (!taskResult.ok) {
    return taskResult;
  }

  return {
    ok: true,
    data: {
      task: taskResult.data,
      draft,
      suggestion,
      safety: {
        backlog_updated: true,
        active_task_updated: false,
        approved: false,
        agents_executed: false,
        codex_executed: false,
      },
    },
  };
}

function buildValidationNote(draft) {
  const risk = String(draft.suggested_risk ?? "unknown").trim();
  const path = String(draft.workflow_path ?? "unknown").trim();
  return `intake draft: risk=${risk}; workflow_path=${path}; validation pending human approval`;
}

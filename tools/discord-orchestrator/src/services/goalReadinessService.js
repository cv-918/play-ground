export function evaluateGoalExecutionReadiness(input = {}) {
  const task = input.task ?? {};
  const activeMetadata = input.activeTask?.metadata ?? {};
  const mode = String(input.mode ?? "implementation").toLowerCase();
  const roleRecommendation = input.roleRecommendation ?? {};
  const taskStatus = String(task.status ?? "").toLowerCase();
  const activeTaskId = String(activeMetadata.task_id ?? "").trim();
  const isActiveTask = activeTaskId !== "" && activeTaskId === String(task.id ?? "").trim();
  const approval = evaluateApprovalStatus(task, mode);
  const activeTaskStatus = {
    is_active_task: isActiveTask,
    active_task_id: activeTaskId || "unknown",
    active_task_status: activeMetadata.status || "unknown",
  };
  const gateReviewNote = buildGateReviewNote(roleRecommendation.human_gates);
  const readiness = classifyReadiness({
    taskStatus,
    mode,
    approval,
  });

  return {
    execution_readiness: {
      status: readiness.status,
      reason: [readiness.reason, gateReviewNote].filter(Boolean).join(" "),
    },
    approval_status: approval,
    active_task_status: activeTaskStatus,
    included_guidance: {
      contract_v2_included: true,
      role_aware_routing_included: true,
      path_scoped_reminders_included: true,
      validation_plan_included: true,
      completion_audit_included: true,
    },
    human_decision_gates: roleRecommendation.human_gates ?? [],
    required_validation: roleRecommendation.required_validation ?? [],
    safety_note: [
      "Goal request file was generated for manual review only.",
      "Discord did not execute Codex CLI, agents, approval, ActiveTask changes, done status, commit, push, or game source modifications.",
    ].join(" "),
    next_manual_action: [
      "Open the generated markdown file.",
      "Review the first-line /goal command and request body.",
      "Paste into Codex CLI manually only if accepted.",
      "Return Codex result to Discord/ChatGPT for review.",
      "Do not commit until validation passes.",
    ],
  };
}

function evaluateApprovalStatus(task, mode) {
  const status = String(task.status ?? "").toLowerCase();
  const validation = String(task.validation ?? "").toLowerCase();
  const approved = status === "ready_for_implementation"
    || status === "in_progress"
    || validation.startsWith("approved:");

  return {
    approved,
    status: status || "unknown",
    mode,
    summary: approved
      ? "Task appears approved or already active for bounded manual execution."
      : "Task is not approved for implementation yet.",
  };
}

function classifyReadiness({ taskStatus, mode, approval }) {
  if (taskStatus === "blocked") {
    return {
      status: "not_ready",
      reason: "Task is blocked; resolve the blocker before manual Codex execution.",
    };
  }

  if (mode === "implementation" && !approval.approved) {
    return {
      status: "needs_human_review",
      reason: "Implementation mode requires explicit task approval before manual Codex execution.",
    };
  }

  if (taskStatus === "todo" || taskStatus === "partial_done" || taskStatus === "analysis" || taskStatus === "review") {
    return {
      status: "needs_human_review",
      reason: "Task status indicates more human review is needed before manual Codex execution.",
    };
  }

  if (taskStatus === "ready_for_implementation" || taskStatus === "in_progress") {
    return {
      status: "ready_for_manual_execution",
      reason: "Task status is ready for manual Codex execution after reviewing the generated file.",
    };
  }

  return {
    status: "needs_human_review",
    reason: "Task status is not a clear execution-ready state; review before using the generated goal request.",
  };
}

function buildGateReviewNote(gates) {
  const values = Array.isArray(gates) ? gates : [];
  const hasHighRiskGate = values.some((value) => /high-risk|schema|save|runtime|destructive|computer-use/i.test(String(value)));
  return hasHighRiskGate
    ? "Human Director review is required for high-risk or runtime/schema-related gates."
    : "";
}

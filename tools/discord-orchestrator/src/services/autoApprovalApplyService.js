import { readAutoApprovalPolicy } from "./autoApprovalPolicyService.js";
import { completeTask } from "./taskService.js";

export async function applyAutoApprovalPolicy(config, input = {}) {
  const policy = await readAutoApprovalPolicy(config, {
    id: input.id,
    policyEvaluationId: input.policyEvaluationId,
  });

  if (!policy.ok) {
    return {
      ok: false,
      command: "apply",
      stage: "read_policy",
      data: {
        task_id: input.id,
        policy_read: policy,
        applied: false,
        reason: policy.error || "AutoApprovalPolicy read failed.",
      },
      error: policy.error || "AutoApprovalPolicy read failed.",
    };
  }

  const evaluation = policy.data?.policy_evaluation?.evaluation ?? {};
  const applyEnabled = config?.autoApprovalApply?.enabled === true;
  const canApply = applyEnabled
    && evaluation.decision === "eligible_candidate"
    && evaluation.can_auto_approve_now === true
    && evaluation.eligible_for_conditional_auto_approval === true;

  if (!canApply) {
    const reasons = [];
    if (!applyEnabled) reasons.push("auto_approval_apply_disabled");
    if (evaluation.decision !== "eligible_candidate") reasons.push(`decision=${evaluation.decision || "unknown"}`);
    if (evaluation.can_auto_approve_now !== true) reasons.push("can_auto_approve_now=false");
    if (evaluation.eligible_for_conditional_auto_approval !== true) reasons.push("eligible=false");

    return {
      ok: false,
      command: "apply",
      stage: "policy_gate",
      data: {
        task_id: policy.data.task_id,
        policy_evaluation_id: policy.data.policy_evaluation_id,
        decision: evaluation.decision || "unknown",
        applied: false,
        reasons,
        no_commit_or_push: true,
      },
      error: reasons.join(", ") || "Auto approval apply gate blocked.",
    };
  }

  const taskDone = await completeTask(config, {
    id: policy.data.task_id,
    evidence: `AutoApprovalPolicy ${policy.data.policy_evaluation_id} eligible_candidate applied by explicit Discord command.`,
  });

  return {
    ok: taskDone.ok === true,
    command: "apply",
    stage: "task_done",
    data: {
      task_id: policy.data.task_id,
      policy_evaluation_id: policy.data.policy_evaluation_id,
      decision: evaluation.decision,
      applied: taskDone.ok === true,
      task_done: taskDone,
      no_commit_or_push: true,
    },
    error: taskDone.ok ? "" : taskDone.error || "Task done failed.",
  };
}

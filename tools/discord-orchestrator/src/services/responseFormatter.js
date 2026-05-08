import { koBool, koListValue, koPassFail, koStatus, koText } from "./koreanOutput.js";

export function truncateForDiscord(text, maxChars = 1800) {
  const value = String(text ?? "");
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxChars - 40))}\n... [잘림]`;
}

export function formatStatus(status) {
  const task = status.active_task ?? {};
  const backlog = status.backlog ?? {};
  const workflow = status.workflow ?? {};

  const lines = [
    "**AIWorkflow 상태**",
    `AIWorkflow 운영 단계: ${workflow.actual ?? "unknown"} → ${workflow.target_next ?? "unknown"}`,
    `현재 작업(ActiveTask): ${task.task_id ?? "unknown"} / ${koStatus(task.status)}`,
    `제목: ${task.title ?? "unknown"}`,
    `우선순위/위험도: ${task.priority ?? "unknown"} / ${task.risk_level ?? "unknown"}`,
    `Backlog: open=${backlog.open_count ?? "?"} (미완료), blocked=${backlog.blocked_count ?? "?"} (차단)`,
    `Git 변경사항 있음: ${koBool(status.worktree_dirty)}`,
  ];

  const top = Array.isArray(backlog.top_items) ? backlog.top_items.slice(0, 3) : [];
  if (top.length > 0) {
    lines.push("");
    lines.push("참고용 상위 Backlog 항목:");
    for (const item of top) {
      lines.push(`- ${item.id} [${item.priority}/${koStatus(item.status)}] ${item.item}`);
    }
  }

  return lines.join("\n");
}

export function formatActive(status) {
  const task = status.active_task ?? {};
  return [
    "**현재 작업(ActiveTask)**",
    `ID: ${task.task_id ?? "unknown"}`,
    `제목: ${task.title ?? "unknown"}`,
    `상태: ${koStatus(task.status)}`,
    `경로: ${task.workflow_path ?? "unknown"}`,
    `우선순위/위험도: ${task.priority ?? "unknown"} / ${task.risk_level ?? "unknown"}`,
    "",
    "**사람 조치 필요**",
    cleanKo(task.human_action_required || "(none found)"),
  ].join("\n");
}

export function formatBacklog(status) {
  const items = status?.backlog?.top_items ?? [];
  const lines = [
    "**Backlog 요약**",
    `Open: ${status?.backlog?.open_count ?? "?"}`,
    `Blocked: ${status?.backlog?.blocked_count ?? "?"}`,
    "",
    "**상위 Open 항목**",
  ];

  if (items.length === 0) {
    lines.push("(없음)");
  } else {
    for (const item of items.slice(0, 8)) {
      lines.push(`- ${item.id} [${item.priority}/${koStatus(item.status)}] ${item.item}`);
    }
  }

  return lines.join("\n");
}

export function formatNext(status) {
  const task = status.active_task ?? {};
  return [
    "**다음 권장 작업**",
    cleanKo(task.next_recommended_task || "(none found)"),
    "",
    "**현재 사람 조치**",
    cleanKo(task.human_action_required || "(none found)"),
  ].join("\n");
}

export function formatBlockers(status) {
  const blockedCount = status?.backlog?.blocked_count ?? 0;
  return [
    "**Blocker 요약**",
    `Blocked Backlog 항목: ${blockedCount}`,
    "",
    blockedCount > 0
      ? koText("Use local workflow files for full blocker details. v1 only reports summary count.")
      : koText("No blocked backlog items reported by workflow_status."),
  ].join("\n");
}

export function formatProjectList(data) {
  const profiles = data.profiles ?? [];
  const lines = ["**Project Profiles 목록**"];

  if (profiles.length === 0) {
    lines.push("(없음)");
  } else {
    for (const p of profiles) {
      lines.push(`- ${p.project_id} | ${p.engine} | ${p.project_type}`);
    }
  }

  if (Array.isArray(data.load_failures) && data.load_failures.length > 0) {
    lines.push("");
    lines.push("로드 실패:");
    for (const fail of data.load_failures) {
      lines.push(`- ${fail.file}: ${fail.error}`);
    }
  }

  return lines.join("\n");
}

export function formatProjectProfile(data) {
  const project = data.project ?? {};
  const counts = data.counts ?? {};
  const releaseTargets = data.release_targets ?? [];
  const forbidden = data.forbidden_operations ?? [];

  const sourceLabel = data.resolved_from_active_project === true
    ? "ActiveProject.json"
    : "explicit project id";

  const lines = [
    "**Project Profile 요약**",
    `ID: ${project.project_id ?? "unknown"}`,
    `이름: ${project.display_name ?? "unknown"}`,
    `Engine: ${project.engine ?? "unknown"}`,
    `Type: ${project.project_type ?? "unknown"}`,
    `Source: ${sourceLabel}`,
    `Build profiles: ${counts.build_profiles ?? 0}`,
    `Validation profiles: ${counts.validation_profiles ?? 0}`,
    `Release targets: ${counts.release_targets ?? 0}`,
  ];

  if (releaseTargets.length > 0) {
    lines.push("");
    lines.push("Release targets:");
    for (const r of releaseTargets.slice(0, 5)) {
      lines.push(`- ${r.id} (${r.type})`);
    }
  }

  if (forbidden.length > 0) {
    lines.push("");
    lines.push("금지된 작업:");
    for (const op of forbidden.slice(0, 6)) {
      lines.push(`- ${op}`);
    }
  }

  return lines.join("\n");
}

export function formatDocs() {
  return [
    "**AIWorkflow 문서**",
    "- AGENTS.md",
    "- .github/copilot-instructions.md",
    "- _Docs/AIWorkflow/README.md",
    "- _Docs/AIWorkflow/ProjectStatus.md",
    "- _Docs/AIWorkflow/Backlog.md",
    "- _Docs/AIWorkflow/ActiveTask.md",
    "- _Docs/AIWorkflow/Task_State_Model.md",
    "- _Docs/AIWorkflow/Project_Profile_Schema.md",
    "- _Docs/AIWorkflow/Active_Project_Selector.md",
    "- _Docs/AIWorkflow/Discord_ReadOnly_Bot_v1_Implementation_Plan.md",
    "- _Docs/AIWorkflow/Discord_Task_Management_Commands.md",
    "- _Docs/AIWorkflow/Discord_Task_Status_Commands.md",
    "- _Docs/AIWorkflow/Discord_Safe_Script_Execution_Commands.md",
    "- _Docs/AIWorkflow/Discord_Codex_Task_Routing_Commands.md",
    "- _Docs/AIWorkflow/Discord_Goal_Task_Routing_Commands.md",
    "- _Docs/AIWorkflow/Discord_Role_Recommendation_Command.md",
  ].join("\n");
}

export function formatRoleRouterStatus(data) {
  const task = data?.task ?? {};
  const lines = [
    "**AI Role Router 상태**",
    "",
    "**1. 현재 작업**",
    `ID: ${task.task_id ?? "unknown"}`,
    `제목: ${task.title ?? "unknown"}`,
    `상태: ${koStatus(task.status)}`,
    `우선순위/위험도: ${task.priority ?? "unknown"} / ${task.risk_level ?? "unknown"}`,
    `경로: ${task.workflow_path ?? "unknown"}`,
    "",
    "**2. 권장 역할**",
  ];

  appendList(lines, data?.recommended_roles);
  lines.push("", "**3. 역할 추천 이유**");
  appendList(lines, data?.role_rationale);
  lines.push("", "**4. 사람 결정 필요 항목**");
  appendList(lines, data?.human_gates);
  lines.push("", "**5. 필수 검증**");
  appendList(lines, data?.required_validation);
  lines.push("", "**6. 권장 실행 경로**");
  appendList(lines, data?.execution_route);
  lines.push("", "**7. 판정 형식**");
  lines.push(cleanKo(data?.verdict_format || "(none found)"));
  lines.push("", "**8. 다음 수동 조치**");
  lines.push(cleanKo(data?.next_manual_action || "(none found)"));

  return lines.join("\n");
}

export function formatRunCommandResult(result) {
  const hasTextSummary = ["json-smoke", "capture-diff"].includes(result.key) && result.data && result.raw;
  if (!result.ok && !hasTextSummary) {
    return [
      `**run 명령 실패: ${result.key ?? "unknown"}**`,
      cleanKo(result.error || "Unknown failure."),
    ].join("\n");
  }

  switch (result.key) {
    case "workflow-status":
      return formatRunWorkflowStatus(result.data);
    case "active-project":
      return formatRunActiveProject(result.data);
    case "project-profile":
      return formatRunProjectProfile(result.data);
    case "json-smoke":
      return formatRunJsonSmoke(result.data, result.raw);
    case "capture-diff":
      return formatRunCaptureDiff(result.data, result.raw);
    default:
      return "알 수 없는 run 명령 결과입니다.";
  }
}

export function formatCodexPrepareResult(result) {
  if (!result.ok) {
    return [
      "**Codex prompt 생성 실패**",
      cleanKo(result.error || "Unknown failure."),
    ].join("\n");
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  return [
    "**Codex prompt 생성 완료**",
    `작업: ${task.id ?? "unknown"} - ${task.item ?? "unknown"}`,
    `모드/컨텍스트: ${data.mode ?? "unknown"} / ${data.context_level ?? "unknown"}`,
    `모델(Model): ${data.recommended_model ?? "unknown"}`,
    `추론 수준: ${data.recommended_reasoning ?? "unknown"}`,
    `경로: ${formatInlineCode(data.generated_path || "unknown")}`,
    "",
    "다음 수동 단계:",
    "1. 생성된 markdown 파일을 여세요.",
    "2. Codex App에 붙여 넣기 전에 검토하세요.",
    "3. Codex 결과를 ChatGPT/Discord로 가져와 review하세요.",
  ].join("\n");
}

export function formatGoalPrepareResult(result) {
  if (!result.ok) {
    return [
      "**goal 요청서 생성 실패**",
      cleanKo(result.error || "Unknown failure."),
    ].join("\n");
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  const readiness = data.readiness ?? {};
  const execution = readiness.execution_readiness ?? {};
  return [
    "**goal 요청서 생성 완료**",
    `작업: ${task.id ?? "unknown"} - ${task.item ?? "unknown"}`,
    `모드/컨텍스트: ${data.mode ?? "unknown"} / ${data.context_level ?? "unknown"}`,
    `준비 상태: ${koStatus(execution.status)}`,
    `경로: ${formatInlineCode(data.generated_path || "unknown")}`,
    data.prompt_length_warning ? `크기 경고: ${cleanKo(data.prompt_length_warning)}` : "",
    "",
    "**실행 준비 안내**",
    cleanKo(execution.reason || "Review generated request before manual Codex execution."),
    "",
    "**다음 수동 조치**",
    summarizeList(readiness.next_manual_action, 3),
    "",
    "**안전 안내**",
    cleanKo(readiness.safety_note || "Generated request only. Discord did not execute Codex CLI, agents, approval, task state changes, commit, or push."),
    koText("Detailed role, path-rule, validation, and completion guidance is in the generated markdown file. Use `/ai role status` only when full routing detail is needed."),
  ].join("\n");
}

export function formatIntakeSuggestion(result) {
  if (!result?.ok) {
    return [
      "**task intake 실패**",
      cleanKo(result?.error || "Unknown failure."),
    ].join("\n");
  }

  const draft = result.task_draft ?? {};
  const lines = [
    "**AI task intake 제안**",
    "",
    "**1. 해석된 요청**",
    cleanKo(result.interpreted_request),
    "",
    "**2. 제안 task 제목**",
    cleanKo(result.suggested_task_title),
    "",
    "**3. 제안 분류(category)**",
    cleanKo(result.suggested_category),
    "",
    "**4. 제안 종류(kind)**",
    cleanKo(result.suggested_kind),
    "",
    "**5. 제안 우선순위/위험도**",
    `${result.suggested_priority ?? "unknown"} / ${result.suggested_risk ?? "unknown"}`,
    "",
    "**6. 제안 workflow 경로**",
    cleanKo(result.suggested_workflow_path),
    "",
    "**7. 권장 역할**",
    summarizeList(result.recommended_roles, 4),
    "",
    "**8. 사람 결정 필요 항목**",
    summarizeList(result.human_decision_gates, 1),
    "",
    "**9. 필수 검증**",
    summarizeList(result.required_validation, 1),
    "",
    "**10. 권장 실행 경로**",
    summarizeList(result.suggested_execution_route, 4),
    "",
    "**11. 다음 수동 조치 제안**",
    cleanKo(result.suggested_next_manual_action),
    "",
    "**작업 초안**",
    `제목: ${cleanKo(draft.title)}`,
    `분류(category): ${cleanKo(draft.category)}`,
    `우선순위(priority): ${cleanKo(draft.priority)}`,
    `종류(kind): ${cleanKo(draft.kind)}`,
    `이유: ${cleanKo(draft.reason)}`,
    `제안 위험도: ${cleanKo(draft.suggested_risk)}`,
    `workflow 경로: ${cleanKo(draft.workflow_path)}`,
    `권장 역할: ${summarizeList(draft.recommended_roles, 4)}`,
    `사람 결정 필요 항목: ${summarizeList(draft.human_decision_gates, 1)}`,
    `필수 검증: ${summarizeList(draft.required_validation, 1)}`,
    "다음 수동 조치 제안: 사람이 검토한 뒤 받아들일 경우 task를 생성하세요.",
  ];

  appendPathReminderSummary(lines, result.path_scoped_reminders);
  lines.push("", "**읽기 전용 안전 상태**");
  lines.push(koText("No Backlog/ActiveTask changes. No agents or Codex CLI."));

  return lines.join("\n");
}

export function formatIntakeTaskCreated(result) {
  if (!result?.ok) {
    return [
      "**intake task 생성 실패**",
      cleanKo(result?.error || "Unknown failure."),
    ].join("\n");
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  const draft = data.draft ?? {};
  const safety = data.safety ?? {};

  return [
    "**intake task 생성 완료**",
    `ID: ${task.id ?? "unknown"}`,
    `제목: ${task.item ?? draft.title ?? "unknown"}`,
    `분류(category): ${draft.category ?? "unknown"}`,
    `우선순위/위험도: ${task.priority ?? draft.priority ?? "unknown"} / ${draft.suggested_risk ?? "unknown"}`,
    `종류(kind): ${task.kind ?? draft.kind ?? "unknown"}`,
    `Workflow 경로: ${draft.workflow_path ?? "unknown"}`,
    "",
    "**작업 초안 출처**",
    `이유: ${cleanKo(draft.reason)}`,
    `권장 역할: ${summarizeList(draft.recommended_roles, 4)}`,
    `필수 검증: ${summarizeList(draft.required_validation, 1)}`,
    "",
    "**다음 수동 조치**",
    koText("Review the created Backlog task, edit it if needed, then approve or set active manually."),
    "",
    "**안전 상태**",
    `Backlog.md 업데이트: ${koBool(safety.backlog_updated)}`,
    `ActiveTask.md 업데이트: ${koBool(safety.active_task_updated)}`,
    `task 승인: ${koBool(safety.approved)}`,
    koText("No agents or Codex CLI were executed."),
  ].join("\n");
}

export function formatIntakeTaskReview(result) {
  if (!result?.ok) {
    return [
      "**intake task 검토 실패**",
      cleanKo(result?.error || "Unknown failure."),
    ].join("\n");
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  const source = data.intake_source_check ?? {};
  const readiness = data.activation_readiness ?? {};
  const safety = data.safety ?? {};

  return [
    "**intake task 활성화 검토**",
    "",
    "**1. 작업 요약**",
    `${task.id ?? "unknown"} [${task.priority ?? "?"}/${koStatus(task.status)}/${task.kind ?? "?"}] ${task.item ?? "unknown"}`,
    `이유: ${cleanKo(task.reason)}`,
    "",
    "**2. intake 출처 확인**",
    `${source.intake_created ? "intake-created" : "generic"} (${source.confidence ?? "unknown"} confidence)`,
    cleanKo(source.source),
    "",
    "**3. 활성화 준비 상태**",
    `${koStatus(readiness.verdict)}: ${cleanKo(readiness.reason)}`,
    `권장 조치: ${cleanKo(readiness.recommended_action)}`,
    "",
    "**4. 권장 역할**",
    summarizeList(data.recommended_roles, 4),
    "",
    "**5. 사람 결정 필요 항목**",
    summarizeList(data.human_decision_gates, 2),
    "",
    "**6. 필수 검증**",
    summarizeList(data.required_validation, 2),
    "",
    "**7. 권장 실행 경로**",
    summarizeList(data.suggested_execution_route, 5),
    "",
    "**8. 다음 권장 수동 명령**",
    summarizeList(data.suggested_next_manual_commands, 3),
    "",
    "**9. 안전 상태**",
    `Backlog 업데이트: ${koBool(safety.backlog_updated)}`,
    `ActiveTask 업데이트: ${koBool(safety.active_task_updated)}`,
    `task 승인/상태 변경: ${koBool(safety.task_approved || safety.task_status_changed)}`,
    koText("No agents or Codex CLI executed."),
    "",
    "**판정 안내**",
    cleanKo(data.verdict_guidance || "Use Review_Validation_Verdict_Format_v1.md before accepting implementation or validation results."),
  ].join("\n");
}

export function formatResultAudit(result) {
  if (!result?.ok) {
    return [
      "**goal 결과 감사 실패**",
      cleanKo(result?.error || "Unknown failure."),
    ].join("\n");
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  const intake = data.result_intake_summary ?? {};
  const files = data.claimed_files_changed ?? {};
  const safety = data.safety ?? {};

  return [
    "**결과 감사**",
    "",
    "**작업 요약**",
    `${task.id ?? "unknown"} [${task.priority ?? "?"}/${koStatus(task.status)}/${task.kind ?? "?"}] ${task.item ?? "unknown"}`,
    "",
    "**결과 요약**",
    cleanKo(intake.summary || "No result summary classified."),
    `원문 발췌: ${truncateAuditText(cleanupBlock(intake.excerpt || ""), 120)}`,
    "",
    "**변경 파일**",
    formatAuditFiles(files.files),
    "",
    "**검증 요약**",
    compactList(data.validation_evidence, 3),
    "",
    "**누락/위험**",
    compactList([...(data.missing_evidence ?? []), ...(data.risk_notes ?? [])], 3),
    "",
    "**완료 판정**",
    koStatus(data.completion_verdict || "NEEDS_REVIEW"),
    "",
    "**커밋 권고**",
    koStatus(data.commit_recommendation || "DO_NOT_COMMIT_YET"),
    "",
    "**다음 조치**",
    compactList(data.suggested_next_manual_commands, 3),
    "",
    "**안전 상태**",
    `읽기 전용: ${koBool(safety.read_only)}`,
    `상태 변경/실행/커밋 없음: ${koBool(!safety.backlog_updated && !safety.active_task_updated && !safety.task_marked_done && !safety.codex_executed && !safety.agents_executed && !safety.committed && !safety.pushed)}`,
  ].join("\n");
}

function formatAuditFiles(files) {
  const values = Array.isArray(files) ? files.map(cleanupBlock).filter(Boolean) : [];
  if (values.length === 0) {
    return "(없음)";
  }

  const visible = values.slice(0, 3).map((value) => `- ${formatInlineCode(value)}`);
  if (values.length > 3) {
    visible.push(`- +${values.length - 3}개 더 있음`);
  }
  return visible.join("\n");
}

function compactList(items, maxCount) {
  const values = Array.isArray(items) ? items.map(cleanupBlock).filter(Boolean) : [];
  if (values.length === 0) {
    return "(없음)";
  }

  const visible = values.slice(0, maxCount).map((value) => `- ${koListValue(truncateAuditText(value, 120))}`);
  if (values.length > maxCount) {
    visible.push(`- +${values.length - maxCount}개 더 있음`);
  }
  return visible.join("\n");
}

function truncateAuditText(text, maxLength) {
  const value = String(text ?? "").trim();
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function formatRunWorkflowStatus(data) {
  const task = data.active_task ?? {};
  const backlog = data.backlog ?? {};

  return [
    "**실행 결과: workflow-status**",
    `ActiveTask: ${task.task_id ?? "unknown"} / ${koStatus(task.status)}`,
    `제목: ${task.title ?? "unknown"}`,
    `Backlog: open=${backlog.open_count ?? "?"}, blocked=${backlog.blocked_count ?? "?"}`,
    `Git 변경 있음: ${koBool(data.worktree_dirty)}`,
  ].join("\n");
}

function formatRunActiveProject(data) {
  const active = data.active_project ?? {};
  const validation = data.validation ?? {};
  const issues = Array.isArray(validation.issues) ? validation.issues : [];
  const lines = [
    "**실행 결과: active-project**",
    `active_project_id: ${active.active_project_id ?? "unknown"}`,
    `profile_path: ${formatInlineCode(active.profile_path || "unknown")}`,
    `validation: ${koPassFail(validation.passed)}`,
  ];

  if (issues.length > 0) {
    lines.push("문제:");
    for (const issue of issues.slice(0, 6)) {
      lines.push(`- ${issue}`);
    }
  }

  return lines.join("\n");
}

function formatRunProjectProfile(data) {
  const project = data.project ?? {};
  return [
    "**실행 결과: project-profile**",
    `project_id: ${project.project_id ?? "unknown"}`,
    `display_name: ${project.display_name ?? "unknown"}`,
    `engine: ${project.engine ?? "unknown"}`,
    `project_type: ${project.project_type ?? "unknown"}`,
    `resolved_from_active_project: ${koBool(data.resolved_from_active_project === true)}`,
  ].join("\n");
}

function formatRunJsonSmoke(data, raw) {
  const failed = data.failed;
  const passed = raw.ok && (failed === 0 || failed === null);
  const lines = [
    "**실행 결과: json-smoke**",
    `Result: ${koPassFail(passed)}`,
    `Total: ${data.total ?? "unknown"}`,
    `Failed: ${data.failed ?? "unknown"}`,
    `Report: ${formatInlineCode(data.reportPath || "unknown")}`,
  ];

  appendRelevantLines(lines, data.relevantLines);
  return lines.join("\n");
}

function formatRunCaptureDiff(data, raw) {
  const includeUntracked = raw.args?.includes("--include-untracked") === true;
  const lines = [
    "**실행 결과: capture-diff**",
    `Result: ${koPassFail(raw.ok)}`,
    `Mode: ${data.mode || (includeUntracked ? "include-untracked" : "default")}`,
    `Include untracked: ${koBool(includeUntracked)}`,
    `상태 파일: ${formatInlineCode(data.statusPath || "unknown")}`,
    `Diff: ${formatInlineCode(data.diffPath || "unknown")}`,
    `Check: ${formatInlineCode(data.checkPath || "unknown")}`,
  ];

  appendRelevantLines(lines, data.relevantLines);
  return lines.join("\n");
}

function appendRelevantLines(lines, relevantLines) {
  if (!Array.isArray(relevantLines) || relevantLines.length === 0) {
    return;
  }

  lines.push("");
  lines.push("마지막 출력:");
  for (const line of relevantLines) {
    lines.push(`- ${formatOutputLinePaths(line)}`);
  }
}

function appendList(lines, items) {
  if (!Array.isArray(items) || items.length === 0) {
    lines.push("- 없음.");
    return;
  }

  for (const item of items) {
    lines.push(`- ${koListValue(cleanupBlock(item))}`);
  }
}

function appendPathReminderSummary(lines, reminders) {
  const items = Array.isArray(reminders) ? reminders : [];
  if (items.length === 0) {
    return;
  }

  lines.push("", "경로별 주의사항:");
  for (const item of items.slice(0, 1)) {
    const reminderText = Array.isArray(item.reminders) && item.reminders.length > 0
      ? item.reminders[0]
      : "Review path-scoped rules before implementation.";
    lines.push(`- ${item.path}: ${cleanKo(reminderText)}`);
  }
}

function summarizeList(items, maxCount) {
  const values = Array.isArray(items) ? items.map(cleanupBlock).filter(Boolean) : [];
  if (values.length === 0) {
    return "(없음)";
  }

  const visible = values.slice(0, maxCount).map(koListValue);
  const suffix = values.length > maxCount ? `; +${values.length - maxCount}개 더 있음` : "";
  return `${visible.join("; ")}${suffix}`;
}

function formatOutputLinePaths(line) {
  return String(line).replace(
    /^(Report|Status|Diff|Check):\s*(.+)$/i,
    (_, label, value) => `${formatOutputLabel(label)}: ${formatInlineCode(value)}`,
  );
}

function formatOutputLabel(label) {
  const labels = {
    Report: "보고서",
    Status: "상태",
    Diff: "Diff",
    Check: "검사",
  };
  return labels[label] ?? label;
}

function formatInlineCode(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "unknown") {
    return "unknown";
  }

  if (text.includes("`")) {
    return `\`\` ${text} \`\``;
  }

  return `\`${text}\``;
}

export function formatTaskCurrent(data) {
  const task = data.metadata ?? {};
  const lines = [
    "**현재 작업**",
    `ID: ${task.task_id ?? "unknown"}`,
    `제목: ${task.title ?? "unknown"}`,
    `상태: ${koStatus(task.status)}`,
    `우선순위/위험도: ${task.priority ?? "unknown"} / ${task.risk_level ?? "unknown"}`,
    `경로: ${task.workflow_path ?? "unknown"}`,
  ];

  if (data.next_recommended_task) {
    lines.push("");
    lines.push("**다음 권장 작업**");
    lines.push(cleanKo(data.next_recommended_task));
  }

  return lines.join("\n");
}

export function formatTaskList(data) {
  const tasks = Array.isArray(data.tasks) ? data.tasks.slice(0, 10) : [];
  const filters = data.filters ?? {};
  const lines = ["**작업 Backlog 목록**"];

  const activeFilters = [
    filters.status ? `status=${filters.status}` : "",
    filters.kind ? `kind=${filters.kind}` : "",
  ].filter(Boolean);

  if (activeFilters.length > 0) {
    lines.push(`필터: ${activeFilters.join(", ")}`);
  } else {
    lines.push("상위 open task");
  }

  lines.push("");

  if (tasks.length === 0) {
    lines.push("(없음)");
  } else {
    for (const task of tasks) {
      lines.push(`- ${task.id} [${task.priority}/${koStatus(task.status)}/${task.kind}] ${task.item}`);
    }
  }

  return lines.join("\n");
}

export function formatTaskCreated(task) {
  return [
    "**작업 생성 완료**",
    `ID: ${task.id}`,
    `제목: ${task.item}`,
  ].join("\n");
}

export function formatTaskSetActive(data) {
  const task = data.task ?? {};
  const safety = data.activation_safety ?? {};
  const lines = [
    "**현재 작업 업데이트**",
    `ID: ${task.id ?? "unknown"}`,
    `제목: ${task.item ?? "unknown"}`,
    `상태: ${koStatus("in_progress")}`,
    "Backlog row status는 변경하지 않았습니다.",
    "",
    "**안전 안내**",
    cleanKo(safety.safety_note || "Task selected only. No approval, Codex, agents, done status, commit, or push was performed."),
    "",
    "**다음 권장 명령**",
    summarizeList(safety.next_recommended_commands, 4),
    "",
    koText("For details: `/ai role status` shows full routing; `/ai task approve` records the approval gate; `/ai prepare goal` performs the final execution readiness check."),
  ];

  return lines.join("\n");
}

export function formatTaskStatusUpdated(data) {
  const task = data.task ?? {};
  const approval = data.approval_safety;

  if (!approval) {
    return [
      "**작업 상태 업데이트**",
      `ID: ${task.id}`,
      `상태: ${koStatus(data.status)}`,
      `메모: ${cleanKo(data.note)}`,
      `ActiveTask.md 업데이트: ${koBool(data.active_task_updated)}`,
    ].join("\n");
  }

  return [
    "**작업 상태 업데이트**",
    `ID: ${task.id ?? "unknown"}`,
    `제목: ${task.item ?? "unknown"}`,
    `상태: ${koStatus(data.status ?? task.status)}`,
    `ActiveTask.md 업데이트: ${koBool(data.active_task_updated)}`,
    "",
    "**승인 요약**",
    cleanKo(approval.approval_summary || data.note || "approved"),
    "",
    "**안전 안내**",
    cleanKo(approval.safety_note || "Approval only. No Codex, agents, done status, commit, or push was executed."),
    "",
    "**다음 권장 명령**",
    summarizeList(approval.next_recommended_commands, 4),
    "",
    koText("Use `/ai prepare goal` as the final execution readiness check. Use `/ai role status` only when full routing detail is needed."),
  ].join("\n");
}

function cleanupBlock(text) {
  return String(text)
    .replaceAll("```text", "")
    .replaceAll("```yaml", "")
    .replaceAll("```", "")
    .trim();
}

function cleanKo(text) {
  return koText(cleanupBlock(text));
}

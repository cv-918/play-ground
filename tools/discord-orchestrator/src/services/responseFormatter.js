import { koBool, koListValue, koPassFail, koStatus, koText } from "./koreanOutput.js";

export function truncateForDiscord(text, maxChars = 1800) {
  const value = String(text ?? "");
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxChars - 40))}\n... [잘림]`;
}

export function formatTextCardPayload(title, text, options = {}) {
  const sections = splitCardSections(text);
  const description = sections.intro.length > 0
    ? compactText(sections.intro.join("\n"), 700)
    : undefined;
  const fields = sections.fields.slice(0, 8).map((section) =>
    embedField(section.name, section.lines.join("\n"), section.inline === true),
  );

  if (fields.length === 0) {
    fields.push(embedField("내용", compactText(String(text ?? ""), 1000)));
  }

  return {
    content: "",
    embeds: [{
      title,
      color: options.color ?? 0x1565c0,
      description,
      fields,
      footer: options.footer ? { text: options.footer } : undefined,
    }],
  };
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
      "**작업 접수 실패**",
      koText(result?.error || "Unknown failure."),
    ].join("\n");
  }

  const draft = result.task_draft ?? {};
  const lines = [
    "**AI 작업 접수 제안**",
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
    summarizeIntakeValidation(result.required_validation),
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
    `필수 검증: ${summarizeIntakeValidation(draft.required_validation)}`,
    "다음 수동 조치 제안: 사람이 검토한 뒤 받아들일 경우 task를 생성하세요.",
  ];

  appendLlmIntakeSummary(lines, result);
  appendClarifyingQuestions(lines, draft.clarifying_questions);
  appendRuleBasedCrossCheck(lines, result.rule_based_cross_check);
  appendPathReminderSummary(lines, result.path_scoped_reminders);
  lines.push("", "**읽기 전용 안전 상태**");
  lines.push(koText("No Backlog/ActiveTask changes. No agents or implementation Codex run."));

  return lines.join("\n");
}

export function formatIntakeSuggestionPayload(result) {
  if (!result?.ok) {
    return { content: formatIntakeSuggestion(result) };
  }

  const draft = result.task_draft ?? {};
  return {
    content: "",
    embeds: [{
      title: "작업 접수 미리보기",
      color: 0x1565c0,
      description: [
        `${result.suggested_category ?? "unknown"} · ${result.suggested_priority ?? "unknown"}/${result.suggested_risk ?? "unknown"} · ${result.suggested_kind ?? "unknown"}`,
        compactText(result.suggested_task_title ?? draft.title ?? "unknown", 160),
        "읽기 전용 미리보기입니다. Backlog와 ActiveTask는 변경하지 않았습니다.",
      ].join("\n"),
      fields: [
        embedField("해석된 요청", compactText(cleanKo(result.interpreted_request), 260)),
        embedField("초안 요약", [
          `이유: ${compactText(cleanKo(draft.reason), 220)}`,
          `역할: ${summarizeCompactList(draft.recommended_roles, 4)}`,
          `LLM 접수: ${formatLlmIntakeStatus(result)}`,
        ]),
        embedField("필수 검증", summarizeValidationLines(draft.required_validation ?? result.required_validation).join("\n")),
        embedField("다음 조치", "제안 내용을 검토한 뒤 받아들일 경우 `/ai intake`로 Backlog task를 생성하세요."),
        embedField("안전 상태", [
          "Backlog: no (아니오)",
          "ActiveTask: no (아니오)",
          "승인: no (아니오)",
          "agents/구현용 Codex 실행 없음",
        ], true),
      ].filter(Boolean),
      footer: {
        text: `workflow: ${draft.workflow_path ?? result.suggested_workflow_path ?? "unknown"}`,
      },
    }],
  };
}

export function formatIntakeTaskCreated(result) {
  if (!result?.ok) {
    return [
      "**작업 접수 task 생성 실패**",
      koText(result?.error || "Unknown failure."),
    ].join("\n");
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  const draft = data.draft ?? {};
  const suggestion = data.suggestion ?? {};
  const safety = data.safety ?? {};
  const autoHandoff = data.auto_handoff ?? {};
  const testMode = data.test_mode === true;
  const nextCommands = buildIntakeAutoHandoffNextCommands(task.id, autoHandoff);

  return [
    testMode ? "**작업 접수 생성 완료 양식 테스트**" : "**작업 접수 task 생성 완료**",
    testMode ? "이 메시지는 표시 양식 테스트입니다. Backlog, ActiveTask, Codex 실행은 발생하지 않았습니다." : "",
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
    `필수 검증: ${summarizeIntakeValidation(draft.required_validation)}`,
    `LLM 접수: ${formatLlmIntakeStatus(suggestion)}`,
    `자동 진행: ${formatAutoHandoffInline(autoHandoff)}`,
    "",
    autoHandoff.eligible ? "**다음 확인 지점**" : "**다음 수동 조치**",
    formatAutoHandoffNextAction(autoHandoff),
    nextCommands.length > 0 ? "**다음 명령**" : "",
    nextCommands.length > 0 ? summarizeCommandLines(nextCommands).join("\n") : "",
    "",
    "**안전 상태**",
    `Backlog.md 업데이트: ${koBool(safety.backlog_updated)}`,
    `ActiveTask.md 업데이트: ${koBool(safety.active_task_updated)}`,
    `task 승인: ${koBool(safety.approved)}`,
    `PC Runner 시작: ${koBool(safety.pc_runner_started)}`,
    `Codex 접수 실행: ${koBool(safety.codex_intake_executed)}`,
    safety.implementation_codex_executed
      ? "PC Runner를 통해 구현용 Codex handoff가 시작되었습니다."
      : koText("No agents or implementation Codex run was executed."),
  ].filter((line) => line !== "").join("\n");
}

export function formatIntakeTaskCreatedPayload(result) {
  if (!result?.ok) {
    return { content: formatIntakeTaskCreated(result) };
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  const draft = data.draft ?? {};
  const suggestion = data.suggestion ?? {};
  const safety = data.safety ?? {};
  const autoHandoff = data.auto_handoff ?? {};
  const testMode = data.test_mode === true;
  const taskId = task.id ?? "unknown";
  const title = task.item ?? draft.title ?? "unknown";
  const priority = task.priority ?? draft.priority ?? "unknown";
  const risk = draft.suggested_risk ?? "unknown";
  const category = draft.category ?? "unknown";
  const kind = task.kind ?? draft.kind ?? "unknown";
  const nextCommands = buildIntakeAutoHandoffNextCommands(taskId, autoHandoff);

  return {
    content: "",
    embeds: [{
      title: testMode ? "작업 접수 양식 테스트" : "작업 접수 완료",
      color: testMode ? 0x607d8b : 0x2e7d32,
      description: [
        `\`${taskId}\` · ${category} · ${priority}/${risk} · ${kind}`,
        compactText(title, 160),
        testMode ? "표시 양식 테스트입니다. workflow 상태는 변경하지 않았습니다." : "",
      ].filter(Boolean).join("\n"),
      fields: [
        embedField("초안 요약", [
          `이유: ${compactText(cleanKo(draft.reason), 220)}`,
          `역할: ${summarizeCompactList(draft.recommended_roles, 4)}`,
          `LLM 접수: ${formatLlmIntakeStatus(suggestion)}`,
        ]),
        embedField("필수 검증", summarizeValidationLines(draft.required_validation).join("\n")),
        embedField("다음 조치", testMode
          ? "이 화면의 가독성만 확인하세요. Backlog task는 생성되지 않았습니다."
          : formatAutoHandoffNextAction(autoHandoff)),
        nextCommands.length > 0
          ? embedField("다음 명령", summarizeCommandLines(nextCommands).join("\n"))
          : null,
        embedField("자동 진행", formatAutoHandoffDetails(autoHandoff)),
        embedField("안전 상태", [
          `Backlog: ${koBool(safety.backlog_updated)}`,
          `ActiveTask: ${koBool(safety.active_task_updated)}`,
          `승인: ${koBool(safety.approved)}`,
          `PC Runner: ${koBool(safety.pc_runner_started)}`,
          `Codex 접수 실행: ${koBool(safety.codex_intake_executed)}`,
          safety.implementation_codex_executed
            ? "PC Runner를 통해 구현용 Codex handoff 시작"
            : "agents/구현용 Codex 실행 없음",
        ], true),
      ].filter(Boolean),
      footer: {
        text: `workflow: ${draft.workflow_path ?? "unknown"}`,
      },
    }],
  };
}

function formatAutoHandoffInline(autoHandoff) {
  if (!autoHandoff || Object.keys(autoHandoff).length === 0) {
    return "not evaluated";
  }
  return `${autoHandoff.decision ?? "unknown"}; ${autoHandoff.profile ?? "none"}/${autoHandoff.executor ?? "none"}`;
}

function formatAutoHandoffNextAction(autoHandoff) {
  const decision = autoHandoff?.decision ?? "";
  const runner = autoHandoff?.runner_start ?? {};
  if (decision === "runner_started") {
    return [
      "저위험 작업으로 판단되어 ActiveTask 선택, 승인, PC Runner 시작까지 자동 진행했습니다.",
      runner.human_gate ? `다음 확인: ${cleanKo(runner.human_gate)}` : "완료 카드 또는 Runner 결과를 확인하세요.",
    ].join("\n");
  }
  if (decision === "runner_blocked" || decision === "blocked") {
    return [
      "자동 handoff를 시도했지만 중간에서 멈췄습니다.",
      `이유: ${cleanKo(autoHandoff?.reason || runner.error || "unknown")}`,
    ].join("\n");
  }
  return "승인이 필요한 작업입니다. 생성된 Backlog task를 검토한 뒤 approve/set-active/runner start를 진행하세요.";
}

function buildIntakeAutoHandoffNextCommands(taskId, autoHandoff) {
  const decision = autoHandoff?.decision ?? "";
  const runner = autoHandoff?.runner_start ?? {};
  if (decision === "runner_started") {
    return buildPcRunnerNextCommands({
      taskId,
      command: "start",
      stopReason: runner.stop_reason,
      reports: runner.report_ids,
      runnerRunId: runner.runner_run_id,
    });
  }

  if (decision === "needs_human_approval") {
    const id = String(taskId ?? "").trim() || "<task_id>";
    return [
      `/ai task review-intake id:${id}`,
      `/ai task set-active id:${id}`,
      `/ai task approve id:${id} note:<승인 범위>`,
      `/ai runner start id:${id}`,
    ];
  }

  return [];
}

function formatAutoHandoffDetails(autoHandoff) {
  if (!autoHandoff || Object.keys(autoHandoff).length === 0) {
    return "자동 handoff 평가 없음";
  }

  const lines = [
    `판정: ${autoHandoff.decision ?? "unknown"}`,
    `대상: ${(autoHandoff.profile || "none")}/${(autoHandoff.executor || "none")}`,
    `이유: ${cleanKo(autoHandoff.reason || "none")}`,
  ];

  const actions = Array.isArray(autoHandoff.actions) ? autoHandoff.actions : [];
  if (actions.length > 0) {
    lines.push(`실행: ${actions.map((item) => `${item.name}=${item.ok ? "ok" : "fail"}`).join(", ")}`);
  }

  const runner = autoHandoff.runner_start ?? {};
  if (runner.runner_run_id) {
    lines.push(`Runner: ${formatInlineCode(runner.runner_run_id)}`);
  }
  if (runner.stop_reason) {
    lines.push(`중단 이유: ${formatInlineCode(runner.stop_reason)}`);
  }

  return compactText(lines.join("\n"), 900);
}

export function formatIntakeEngineStatus(result) {
  const data = result?.data ?? {};
  return [
    result?.ok ? "**Codex 접수 엔진 준비 완료**" : "**Codex 접수 엔진 준비 안 됨**",
    `활성화: ${koBool(data.enabled)}`,
    `제공자: ${data.provider ?? "unknown"}`,
    `명령: ${data.command ?? "unknown"}`,
    `모델: ${data.model ?? "unknown"}`,
    `추론: ${data.reasoning_effort ?? "unknown"}`,
    `ephemeral: ${koBool(data.ephemeral)}`,
    `모델 라우팅: ${koBool(data.model_routes_enabled)} (${data.model_route_count ?? 0})`,
    `격리 모드: ${data.sandbox ?? "unknown"}`,
    `승인 정책: ${data.approval_policy ?? "unknown"}`,
    `제한 시간(ms): ${data.timeout_ms ?? "unknown"}`,
    `출력 경로: ${formatInlineCode(data.output_dir || "unknown")}`,
    `실행 파일 확인: ${koBool(data.executable_ok)}`,
    data.version ? `버전: ${cleanKo(data.version)}` : "",
    data.error ? `오류: ${koText(data.error)}` : "",
  ].filter(Boolean).join("\n");
}

export function formatIntakeEngineStatusPayload(result) {
  const data = result?.data ?? {};
  return {
    content: "",
    embeds: [{
      title: result?.ok ? "Codex 접수 엔진 준비 완료" : "Codex 접수 엔진 준비 안 됨",
      color: result?.ok ? 0x2e7d32 : 0xc62828,
      fields: [
        embedField("실행 설정", [
          `활성화: ${koBool(data.enabled)}`,
          `제공자: ${data.provider ?? "unknown"}`,
          `모델: ${data.model ?? "unknown"}`,
          `추론: ${data.reasoning_effort ?? "unknown"}`,
          `ephemeral: ${koBool(data.ephemeral)}`,
          `모델 라우팅: ${koBool(data.model_routes_enabled)} (${data.model_route_count ?? 0})`,
          `명령: ${compactText(data.command ?? "unknown", 180)}`,
        ]),
        embedField("실행 정책", [
          `격리 모드: ${data.sandbox ?? "unknown"}`,
          `승인 정책: ${data.approval_policy ?? "unknown"}`,
          `제한 시간: ${data.timeout_ms ?? "unknown"}ms`,
          `실행 파일 확인: ${koBool(data.executable_ok)}`,
        ], true),
        embedField("출력", [
          `경로: ${formatInlineCode(data.output_dir || "unknown")}`,
          data.version ? `버전: ${compactText(cleanKo(data.version), 220)}` : "",
          data.error ? `오류: ${compactText(koText(data.error), 220)}` : "",
        ].filter(Boolean)),
      ],
    }],
  };
}

export function formatBotControlResult(result) {
  if (!result?.ok) {
    return [
      "**봇 제어 실패**",
      cleanKo(result?.error || "Unknown failure."),
      result?.data?.state_file ? `state_file: ${formatInlineCode(result.data.state_file)}` : "",
    ].filter(Boolean).join("\n");
  }

  const data = result.data ?? {};
  const botVersionLines = buildBotVersionLines(data);
  const lines = [
    data.delay_ms ? "**봇 재시작 예약됨**" : "**봇 제어 상태**",
    `관리 스크립트로 실행 중: ${koBool(data.managed)}`,
    `현재 PID: ${data.current_pid ?? "unknown"}`,
    data.recorded_pid !== undefined ? `기록된 PID: ${data.recorded_pid ?? "none"}` : "",
    data.restart_script ? `재시작 스크립트: ${formatInlineCode(data.restart_script)}` : "",
    data.delay_ms ? `재시작 대기 시간(ms): ${data.delay_ms}` : "",
  ].filter(Boolean);

  lines.push(...botVersionLines);

  if (data.restart_recommended) {
    lines.push(`다음 명령: ${formatInlineCode("/ai bot restart")}`);
  }

  if (data.delay_ms) {
    lines.push("기존 로컬 재시작 스크립트로 봇을 다시 시작합니다. workflow task 상태, source file, commit, push는 변경하지 않습니다.");
  }

  return lines.join("\n");
}

function buildBotVersionLines(data) {
  const lines = [];
  if (data.started_at) {
    lines.push(`시작 시각: ${data.started_at}`);
  }
  if (data.current_git_head_short || data.state_git_head_short) {
    lines.push(`Git HEAD: running=${data.state_git_head_short || "unknown"}, current=${data.current_git_head_short || "unknown"}`);
  }
  if (data.current_git_branch || data.state_git_branch) {
    lines.push(`branch: running=${data.state_git_branch || "unknown"}, current=${data.current_git_branch || "unknown"}`);
  }
  if (data.restart_recommended !== undefined) {
    lines.push(`재시작 권장: ${koBool(data.restart_recommended)}`);
  }
  if (data.restart_reason) {
    lines.push(`이유: ${cleanKo(data.restart_reason)}`);
  }
  return lines;
}

export function formatIntakeTaskReview(result) {
  if (!result?.ok) {
    return [
      "**작업 접수 task 검토 실패**",
      koText(result?.error || "Unknown failure."),
    ].join("\n");
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  const source = data.intake_source_check ?? {};
  const readiness = data.activation_readiness ?? {};
  const safety = data.safety ?? {};

  return [
    "**작업 접수 task 활성화 검토**",
    "",
    "**1. 작업 요약**",
    `${task.id ?? "unknown"} [${task.priority ?? "?"}/${koStatus(task.status)}/${task.kind ?? "?"}] ${task.item ?? "unknown"}`,
    `이유: ${cleanKo(task.reason)}`,
    "",
    "**2. 작업 접수 출처 확인**",
    `${source.intake_created ? "intake 생성 작업" : "일반 작업"} (신뢰도 ${source.confidence ?? "unknown"})`,
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

export function formatIntakeTaskReviewPayload(result) {
  if (!result?.ok) {
    return { content: formatIntakeTaskReview(result) };
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  const source = data.intake_source_check ?? {};
  const readiness = data.activation_readiness ?? {};
  const safety = data.safety ?? {};
  const title = task.item ?? "unknown";
  const taskId = task.id ?? "unknown";
  const priority = task.priority ?? "?";
  const kind = task.kind ?? "?";
  const status = koStatus(task.status);
  const ready = ["ready", "ready_for_manual_activation_review", "generic_review_ready"].includes(String(readiness.verdict ?? ""));

  return {
    content: "",
    embeds: [{
      title: "작업 접수 활성화 검토",
      color: ready ? 0x1565c0 : 0xf9a825,
      description: [
        `\`${taskId}\` · ${priority} · ${status} · ${kind}`,
        compactText(title, 180),
      ].join("\n"),
      fields: [
        embedField("요약", [
          `이유: ${compactText(cleanKo(task.reason), 260)}`,
          `출처: ${source.intake_created ? "intake 계열 명령 생성" : "일반 Backlog 작업"} (신뢰도 ${source.confidence ?? "unknown"})`,
          compactText(koText(source.source), 180),
        ]),
        embedField("활성화 준비", [
          `${koStatusLabel(readiness.verdict)}: ${compactText(koText(readiness.reason), 260)}`,
          `권장 조치: ${compactText(koText(readiness.recommended_action), 220)}`,
        ]),
        embedField("권장 역할", summarizeCompactList(data.recommended_roles, 5), true),
        embedField("사람 결정", summarizeCompactList(data.human_decision_gates, 2), true),
        embedField("필수 검증", summarizeValidationLines(data.required_validation).join("\n")),
        embedField("다음 명령", summarizeCommandLines(data.suggested_next_manual_commands).join("\n")),
        embedField("안전 상태", [
          `현재 ActiveTask: ${koBool(data.active_task_match)}`,
          `Backlog: ${koBool(safety.backlog_updated)}`,
          `ActiveTask: ${koBool(safety.active_task_updated)}`,
          `승인/상태 변경: ${koBool(safety.task_approved || safety.task_status_changed)}`,
          "agents/Codex CLI 실행 없음",
        ], true),
        embedField("판정 안내", compactText(koText(data.verdict_guidance || "Use Review_Validation_Verdict_Format_v1.md before accepting implementation or validation results."), 300)),
      ],
      footer: {
        text: "읽기 전용 검토입니다. Backlog/ActiveTask는 변경하지 않았습니다.",
      },
    }],
  };
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

export function formatCompletionStatusPayload(result) {
  if (!result?.ok) {
    return {
      content: [
        "**완료 보고 상태 확인 실패**",
        cleanKo(result?.error || "Unknown failure."),
      ].join("\n"),
    };
  }

  const report = result.data?.report_status ?? {};
  const card = result.data?.card_status ?? {};
  return {
    content: "",
    embeds: [{
      title: "완료 보고 상태",
      color: 0x1565c0,
      description: formatInlineCode(result.data?.task_id || "unknown"),
      fields: [
        embedField("CompletionReport", [
          `개수: ${report.completion_report_count ?? 0}`,
          `최신 ID: ${formatInlineCode(report.latest_completion_report_id || "none")}`,
          `경로: ${formatInlineCode(report.latest_completion_report_path || report.completion_manifest_path || "none")}`,
        ]),
        embedField("Completion Card", [
          `개수: ${card.completion_card_count ?? 0}`,
          `최신 ID: ${formatInlineCode(card.latest_completion_card_id || "none")}`,
          `경로: ${formatInlineCode(card.latest_completion_card_path || card.completion_card_manifest_path || "none")}`,
        ]),
        embedField("안전 상태", [
          "Backlog/ActiveTask 변경 없음",
          "승인, 완료 처리, finalization, commit, push 없음",
        ], true),
      ],
    }],
  };
}

export function formatCompletionReportPayload(result) {
  if (!result?.ok) {
    return {
      content: [
        "**CompletionReport 생성 실패**",
        cleanKo(result?.error || "Unknown failure."),
      ].join("\n"),
    };
  }

  const data = result.data ?? {};
  const report = data.completion_report ?? {};
  const task = report.task_context ?? {};
  const readiness = report.completion_readiness ?? {};
  const verification = report.verification_summary ?? {};
  const risks = report.remaining_risks ?? {};

  return {
    content: "",
    embeds: [{
      title: "CompletionReport 생성 완료",
      color: completionColor(report.completion_state),
      description: [
        `${formatInlineCode(data.completion_report_id || report.completion_report_id || "unknown")}`,
        `${data.task_id ?? report.task_id ?? "unknown"} · ${task.priority ?? "?"} · ${completionStateKo(report.completion_state)}`,
        compactText(task.title ?? "unknown", 180),
      ].join("\n"),
      fields: [
        embedField("완료 준비", [
          `상태: ${completionStateKo(report.completion_state)}`,
          `판정: ${readinessKo(readiness.level)}`,
          `수동 done 가능: ${koBool(readiness.can_mark_task_done_manually)}`,
          `사람 결정 필요: ${koBool(readiness.human_decision_required)}`,
        ]),
        embedField("검증 요약", [
          `VerificationReport: ${formatInlineCode(report.sources?.verification_report?.verification_report_id || "none")}`,
          `verdict: ${verification.verdict ?? "unknown"}`,
          `warnings/concerns/blockers/failed: ${verification.warning_count ?? 0}/${verification.concern_count ?? 0}/${verification.blocker_count ?? 0}/${verification.failed_check_count ?? 0}`,
        ]),
        embedField("남은 이슈", summarizeCompletionRisks(risks)),
        embedField("다음 명령", summarizeCompactList(report.suggested_next_manual_commands, 3)),
        embedField("안전 상태", [
          "Backlog/ActiveTask 변경 없음",
          "승인, 완료 처리, finalization, auto approval, commit/push 없음",
        ], true),
      ],
      footer: {
        text: `path: ${data.completion_report_path || "unknown"}`,
      },
    }],
  };
}

export function formatCompletionCardPayload(result) {
  if (!result?.ok) {
    return {
      content: [
        "**완료 카드 생성 실패**",
        cleanKo(result?.error || "Unknown failure."),
      ].join("\n"),
    };
  }

  const data = result.data ?? {};
  const card = data.completion_card ?? {};
  const presentation = card.presentation ?? {};
  const generatedReport = result.generated_report?.completion_report_id;
  const generatedLine = generatedReport
    ? `새 CompletionReport 생성: ${formatInlineCode(generatedReport)}`
    : "기존 CompletionReport 사용";

  return {
    content: "",
    embeds: [{
      title: "작업 완료 검토 카드",
      color: completionColor(presentation.state),
      description: [
        `${formatInlineCode(data.completion_card_id || card.completion_card_id || "unknown")}`,
        `${card.task_id ?? data.task_id ?? "unknown"} · ${readinessKo(presentation.readiness_level)} · ${presentation.verdict ?? "unknown"}`,
        compactText(presentation.task_line ?? "unknown", 180),
      ].join("\n"),
      fields: [
        embedField("요약", [
          completionStateKo(presentation.state),
          compactText(cleanKo(presentation.summary), 260),
          generatedLine,
        ]),
        embedField("남은 이슈", summarizeCompletionCardIssues(presentation)),
        embedField("다음 명령", summarizeCompactList(presentation.next_manual_commands, 3)),
        embedField("안전 상태", [
          `수동 done 가능: ${koBool(presentation.can_mark_task_done_manually)}`,
          `커밋 검토 가능: ${koBool(presentation.can_commit_after_review)}`,
          "표시용 artifact만 생성. 승인/완료/finalization/commit/push 없음",
        ], true),
      ],
      footer: {
        text: `report: ${card.sources?.completion_report_id || "unknown"} · path: ${data.completion_card_path || "unknown"}`,
      },
    }],
  };
}

export function formatFinalizationStatusPayload(result) {
  if (!result?.ok) {
    return {
      content: [
        "**최종화 상태 확인 실패**",
        cleanKo(result?.error || "Unknown failure."),
      ].join("\n"),
    };
  }

  const data = result.data ?? {};
  return {
    content: "",
    embeds: [{
      title: "최종화 기록 상태",
      color: 0x1565c0,
      description: formatInlineCode(data.task_id || "unknown"),
      fields: [
        embedField("ApprovalHistory", [
          `개수: ${data.approval_record_count ?? 0}`,
          `최신 ID: ${formatInlineCode(data.latest_approval_record_id || "none")}`,
          `manifest: ${formatInlineCode(data.approval_history_manifest_path || "none")}`,
        ]),
        embedField("FinalizationLog", [
          `개수: ${data.finalization_log_count ?? 0}`,
          `최신 ID: ${formatInlineCode(data.latest_finalization_log_id || "none")}`,
          `manifest: ${formatInlineCode(data.finalization_manifest_path || "none")}`,
        ]),
        embedField("안전 상태", [
          "Backlog/ActiveTask lifecycle 변경 없음",
          "task done, auto approval, commit/push 없음",
        ], true),
      ],
    }],
  };
}

export function formatFinalizationRecordPayload(result) {
  if (!result?.ok) {
    return {
      content: [
        "**최종화 기록 실패**",
        cleanKo(result?.error || "Unknown failure."),
      ].join("\n"),
    };
  }

  const data = result.data ?? {};
  const log = data.finalization_log ?? {};
  const approval = data.approval_record ?? {};
  const source = log.sources?.completion_report ?? {};
  return {
    content: "",
    embeds: [{
      title: "최종화 기록 완료",
      color: finalizationColor(log.finalization_state),
      description: [
        `${formatInlineCode(data.finalization_log_id || log.finalization_log_id || "unknown")}`,
        `${data.task_id ?? log.task_id ?? "unknown"} · ${finalizationStateKo(log.finalization_state)}`,
        `decision: ${approval.decision ?? log.final_decision ?? "unknown"}`,
      ].join("\n"),
      fields: [
        embedField("기록", [
          `ApprovalHistory: ${formatInlineCode(data.approval_record_id || approval.approval_record_id || "unknown")}`,
          `CompletionReport: ${formatInlineCode(source.completion_report_id || "none")}`,
          `결정자: ${approval.decision_by ?? log.final_decision_by ?? "unknown"}`,
        ]),
        embedField("다음 명령", summarizeCompactList(log.suggested_next_manual_commands, 3)),
        embedField("안전 상태", [
          "task done 처리 안 함",
          "auto approval 생성 안 함",
          "commit/push 안 함",
        ], true),
      ],
      footer: {
        text: `path: ${data.finalization_log_path || "unknown"}`,
      },
    }],
  };
}

export function formatFinalizationReadPayload(result) {
  if (!result?.ok) {
    return {
      content: [
        "**최종화 기록 읽기 실패**",
        cleanKo(result?.error || "Unknown failure."),
      ].join("\n"),
    };
  }

  const data = result.data ?? {};
  const log = data.finalization_log ?? {};
  return {
    content: "",
    embeds: [{
      title: "FinalizationLog",
      color: finalizationColor(log.finalization_state),
      description: [
        `${formatInlineCode(data.finalization_log_id || log.finalization_log_id || "unknown")}`,
        `${data.task_id ?? log.task_id ?? "unknown"} · ${finalizationStateKo(log.finalization_state)}`,
      ].join("\n"),
      fields: [
        embedField("결정", [
          `decision: ${log.final_decision ?? "unknown"}`,
          `by: ${log.final_decision_by ?? "unknown"}`,
          `time: ${log.decision_time ?? "unknown"}`,
        ]),
        embedField("다음 명령", summarizeCompactList(log.suggested_next_manual_commands, 3)),
        embedField("안전 상태", [
          `state files updated: ${koBool(log.state_files_updated)}`,
          `task done 없음: ${koBool(log.invariants?.no_task_done)}`,
          `commit/push 없음: ${koBool(log.invariants?.no_commit_or_push)}`,
        ], true),
      ],
      footer: {
        text: `path: ${data.finalization_log_path || "unknown"}`,
      },
    }],
  };
}

export function formatAutoApprovalStatusPayload(result) {
  if (!result?.ok) {
    return {
      content: [
        "**자동 승인 정책 상태 확인 실패**",
        cleanKo(result?.error || "Unknown failure."),
      ].join("\n"),
    };
  }

  const data = result.data ?? {};
  return {
    content: "",
    embeds: [{
      title: "자동 승인 정책 상태",
      color: 0x1565c0,
      description: formatInlineCode(data.task_id || "unknown"),
      fields: [
        embedField("평가 기록", [
          `개수: ${data.policy_evaluation_count ?? 0}`,
          `최신 ID: ${formatInlineCode(data.latest_policy_evaluation_id || "none")}`,
          `manifest: ${formatInlineCode(data.auto_approval_policy_manifest_path || "none")}`,
        ]),
        embedField("안전 상태", [
          "Backlog/ActiveTask lifecycle 변경 없음",
          "task approve/done, finalization, follow-up, commit/push 없음",
        ], true),
      ],
    }],
  };
}

export function formatAutoApprovalEvaluatePayload(result) {
  if (!result?.ok) {
    return {
      content: [
        "**자동 승인 정책 평가 실패**",
        cleanKo(result?.error || "Unknown failure."),
      ].join("\n"),
    };
  }

  const data = result.data ?? {};
  const policy = data.policy_evaluation ?? {};
  const evaluation = policy.evaluation ?? {};
  const sources = policy.sources ?? {};
  return {
    content: "",
    embeds: [{
      title: "자동 승인 정책 평가 완료",
      color: autoApprovalColor(evaluation.decision),
      description: [
        `${formatInlineCode(data.policy_evaluation_id || policy.policy_evaluation_id || "unknown")}`,
        `${data.task_id ?? policy.task_id ?? "unknown"} · ${autoApprovalDecisionKo(evaluation.decision)}`,
        compactText(evaluation.recommended_action ?? "No recommendation.", 180),
      ].join("\n"),
      fields: [
        embedField("판정", [
          `후보 적합: ${koBool(evaluation.eligible_for_conditional_auto_approval)}`,
          `지금 자동 승인 가능: ${koBool(evaluation.can_auto_approve_now)}`,
          `신뢰도: ${evaluation.confidence ?? "unknown"}`,
        ]),
        embedField("근거", summarizePolicyRules(evaluation.rule_results)),
        embedField("참조", [
          `CompletionReport: ${formatInlineCode(sources.completion_report?.completion_report_id || "none")}`,
          `FinalizationLog: ${formatInlineCode(sources.finalization_log?.finalization_log_id || "none")}`,
          `ApprovalHistory: ${formatInlineCode(sources.approval_history?.approval_record_id || "none")}`,
        ]),
        embedField("사람 결정 필요", summarizeCompactList(evaluation.human_decisions_required, 3)),
        embedField("다음 명령", summarizeCompactList(policy.suggested_next_manual_commands, 3)),
        embedField("안전 상태", [
          "정책 평가만 수행",
          "task approve/done 처리 없음",
          "commit/push 없음",
        ], true),
      ],
      footer: {
        text: `path: ${data.policy_evaluation_path || "unknown"}`,
      },
    }],
  };
}

export function formatAutoApprovalReadPayload(result) {
  if (!result?.ok) {
    return {
      content: [
        "**자동 승인 정책 평가 읽기 실패**",
        cleanKo(result?.error || "Unknown failure."),
      ].join("\n"),
    };
  }

  const data = result.data ?? {};
  const policy = data.policy_evaluation ?? {};
  const evaluation = policy.evaluation ?? {};
  return {
    content: "",
    embeds: [{
      title: "AutoApprovalPolicy",
      color: autoApprovalColor(evaluation.decision),
      description: [
        `${formatInlineCode(data.policy_evaluation_id || policy.policy_evaluation_id || "unknown")}`,
        `${data.task_id ?? policy.task_id ?? "unknown"} · ${autoApprovalDecisionKo(evaluation.decision)}`,
      ].join("\n"),
      fields: [
        embedField("판정", [
          `decision: ${evaluation.decision ?? "unknown"}`,
          `eligible: ${koBool(evaluation.eligible_for_conditional_auto_approval)}`,
          `can_auto_approve_now: ${koBool(evaluation.can_auto_approve_now)}`,
        ]),
        embedField("차단 사유", summarizeCompactList(evaluation.blockers, 4)),
        embedField("규칙 결과", summarizePolicyRules(evaluation.rule_results)),
        embedField("안전 상태", [
          `lifecycle 변경 없음: ${koBool(policy.invariants?.task_lifecycle_unchanged)}`,
          `task approve 없음: ${koBool(policy.invariants?.no_task_approval)}`,
          `commit/push 없음: ${koBool(policy.invariants?.no_commit_or_push)}`,
        ], true),
      ],
      footer: {
        text: `path: ${data.policy_evaluation_path || "unknown"}`,
      },
    }],
  };
}

export function formatFollowUpStatusPayload(result) {
  if (!result?.ok) {
    return {
      content: [
        "**후속 작업 상태 확인 실패**",
        cleanKo(result?.error || "Unknown failure."),
      ].join("\n"),
    };
  }

  const data = result.data ?? {};
  return {
    content: "",
    embeds: [{
      title: "후속 작업 후보 상태",
      color: 0x1565c0,
      description: formatInlineCode(data.task_id || "unknown"),
      fields: [
        embedField("생성 기록", [
          `개수: ${data.follow_up_plan_count ?? 0}`,
          `최신 ID: ${formatInlineCode(data.latest_follow_up_plan_id || "none")}`,
          `manifest: ${formatInlineCode(data.follow_up_manifest_path || "none")}`,
        ]),
        embedField("안전 상태", [
          "Backlog/ActiveTask lifecycle 변경 없음",
          "task 생성/승인/done, commit/push 없음",
        ], true),
      ],
    }],
  };
}

export function formatFollowUpGeneratePayload(result) {
  if (!result?.ok) {
    return {
      content: [
        "**후속 작업 후보 생성 실패**",
        cleanKo(result?.error || "Unknown failure."),
      ].join("\n"),
    };
  }

  const data = result.data ?? {};
  const plan = data.follow_up_plan ?? {};
  return {
    content: "",
    embeds: [{
      title: "후속 작업 후보 생성 완료",
      color: followUpColor(plan.plan_state),
      description: [
        `${formatInlineCode(data.follow_up_plan_id || plan.follow_up_plan_id || "unknown")}`,
        `${data.task_id ?? plan.task_id ?? "unknown"} · ${followUpStateKo(plan.plan_state)} · 후보 ${plan.candidate_count ?? 0}개`,
        compactText(plan.summary ?? "No summary.", 180),
      ].join("\n"),
      fields: [
        embedField("후보 요약", formatFollowUpCandidates(plan.candidates, 4)),
        embedField("참조", [
          `CompletionReport: ${formatInlineCode(plan.sources?.completion_report?.completion_report_id || "none")}`,
          `FinalizationLog: ${formatInlineCode(plan.sources?.finalization_log?.finalization_log_id || "none")}`,
          `AutoApproval: ${formatInlineCode(plan.sources?.auto_approval_policy?.policy_evaluation_id || "none")}`,
        ]),
        embedField("다음 명령", summarizeCompactList(plan.suggested_next_manual_commands, 3)),
        embedField("안전 상태", [
          "후보 기록만 생성",
          "Backlog task 생성 없음",
          "approve/done/commit/push 없음",
        ], true),
      ],
      footer: {
        text: `path: ${data.follow_up_plan_path || "unknown"}`,
      },
    }],
  };
}

export function formatFollowUpReadPayload(result) {
  if (!result?.ok) {
    return {
      content: [
        "**후속 작업 후보 읽기 실패**",
        cleanKo(result?.error || "Unknown failure."),
      ].join("\n"),
    };
  }

  const data = result.data ?? {};
  const plan = data.follow_up_plan ?? {};
  return {
    content: "",
    embeds: [{
      title: "FollowUpPlan",
      color: followUpColor(plan.plan_state),
      description: [
        `${formatInlineCode(data.follow_up_plan_id || plan.follow_up_plan_id || "unknown")}`,
        `${data.task_id ?? plan.task_id ?? "unknown"} · ${followUpStateKo(plan.plan_state)} · 후보 ${plan.candidate_count ?? 0}개`,
      ].join("\n"),
      fields: [
        embedField("후보", formatFollowUpCandidates(plan.candidates, 6)),
        embedField("다음 명령", summarizeCompactList(plan.suggested_next_manual_commands, 3)),
        embedField("안전 상태", [
          `Backlog write 없음: ${koBool(plan.invariants?.no_backlog_write)}`,
          `task 생성 없음: ${koBool(plan.invariants?.no_task_created)}`,
          `commit/push 없음: ${koBool(plan.invariants?.no_commit_or_push)}`,
        ], true),
      ],
      footer: {
        text: `path: ${data.follow_up_plan_path || "unknown"}`,
      },
    }],
  };
}

export function formatPcRunnerPayload(result) {
  if (!result?.ok) {
    const data = result?.data ?? {};
    const run = data.runner_run ?? data.latest_runner_run ?? {};
    const reports = data.report_ids ?? run.report_ids ?? {};
    const nextCommands = buildPcRunnerNextCommands({
      taskId: data.task_id || run.task_id,
      command: result?.command,
      stopReason: data.stop_reason || run.human_gate_state?.stop_reason,
      reports,
      runnerRunId: data.runner_run_id || run.runner_run_id,
    });
    return {
      content: "",
      embeds: [{
        title: "PC Runner 중단 또는 실패",
        color: 0xc62828,
        description: [
          `${formatInlineCode(data.task_id || "unknown")}`,
          cleanKo(result?.error || data.stop_reason || "Unknown failure."),
          `지금 할 일: ${pcRunnerNextActionSummary(data.stop_reason || run.human_gate_state?.stop_reason, result?.command)}`,
        ].join("\n"),
        fields: [
          embedField("사람 확인 지점", data.human_gate || data.runner_run?.human_gate_state?.human_gate || "(none)"),
          embedField("다음 명령", summarizeCommandLines(nextCommands).join("\n")),
          embedField("안전 상태", [
            `task lifecycle 변경 없음: ${koBool(data.task_lifecycle_unchanged !== false)}`,
            `task done 없음: ${koBool(data.no_task_done !== false)}`,
            `commit/push 없음: ${koBool(data.no_commit_or_push !== false)}`,
          ], true),
        ],
      }],
    };
  }

  const data = result.data ?? {};
  const run = data.runner_run ?? data.latest_runner_run ?? {};
  const gate = data.human_gate || run.human_gate_state?.human_gate || "(none)";
  const reports = data.report_ids ?? run.report_ids ?? {};
  const stopReason = data.stop_reason || run.human_gate_state?.stop_reason;
  const taskId = data.task_id || run.task_id;
  const runnerRunId = data.runner_run_id || run.runner_run_id;
  const nextCommands = buildPcRunnerNextCommands({
    taskId,
    command: result.command,
    stopReason,
    reports,
    runnerRunId,
    canStart: data.can_start,
  });
  return {
    content: "",
    embeds: [{
      title: pcRunnerTitle(result.command, data),
      color: pcRunnerColor(data.status || run.status || data.stop_reason),
      description: [
        `${formatInlineCode(taskId || "unknown")}`,
        runnerRunId ? `Runner: ${formatInlineCode(runnerRunId)}` : "",
        `지금 할 일: ${pcRunnerNextActionSummary(stopReason, result.command)}`,
        stopReason ? `중단 이유: ${formatInlineCode(stopReason)}` : "",
      ].filter(Boolean).join("\n"),
      fields: [
        embedField("상태", [
          `workspace: ${koBool(data.workspace_exists ?? true)}`,
          `run 상태: ${run.status || data.status || "unknown"}`,
          `단계: ${(run.current_phase || "unknown")} / ${(run.current_step || "unknown")}`,
        ]),
        embedField("사람 확인 지점", gate),
        embedField("다음 명령", summarizeCommandLines(nextCommands).join("\n")),
        embedField("보고서", [
          reports.verification_report_id ? `검증: ${formatInlineCode(reports.verification_report_id)}` : "",
          reports.completion_report_id ? `완료 보고서: ${formatInlineCode(reports.completion_report_id)}` : "",
          reports.completion_card_id ? `완료 카드: ${formatInlineCode(reports.completion_card_id)}` : "",
          reports.auto_approval_evaluation_id ? `자동 승인 평가: ${formatInlineCode(reports.auto_approval_evaluation_id)}` : "",
          reports.follow_up_plan_id ? `후속 후보: ${formatInlineCode(reports.follow_up_plan_id)}` : "",
        ].filter(Boolean)),
        embedField("안전 상태", [
          `task lifecycle 변경 없음: ${koBool(data.task_lifecycle_unchanged !== false)}`,
          `task done 없음: ${koBool(data.no_task_done !== false)}`,
          `commit/push 없음: ${koBool(data.no_commit_or_push !== false)}`,
        ], true),
      ],
      footer: {
        text: data.runner_run_path || data.runner_manifest_path || data.runner_plan_path || "PC Runner artifact",
      },
    }],
  };
}

export function formatRunnerAcceptCompletionPayload(result) {
  const data = result?.data ?? {};
  const runnerResult = data.runner_continue ?? {};
  const runnerData = runnerResult.data ?? {};
  const run = runnerData.runner_run ?? {};
  const reports = runnerData.report_ids ?? run.report_ids ?? data.report_ids ?? {};
  const stopReason = runnerData.stop_reason || run.human_gate_state?.stop_reason;
  const taskId = data.task_id || runnerData.task_id || run.task_id;
  const runnerRunId = data.runner_run_id || runnerData.runner_run_id || run.runner_run_id;
  const nextCommands = buildPcRunnerNextCommands({
    taskId,
    command: "continue",
    stopReason,
    reports,
    runnerRunId,
  });

  if (!result?.ok) {
    return {
      content: "",
      embeds: [{
        title: "Completion 승인/Runner 계속 진행 실패",
        color: 0xc62828,
        description: [
          `${formatInlineCode(taskId || "unknown")}`,
          cleanKo(result?.error || "Unknown failure."),
          `지금 할 일: ${pcRunnerNextActionSummary(stopReason, "continue")}`,
        ].join("\n"),
        fields: [
          embedField("진행 단계", result?.stage || "unknown"),
          embedField("FinalizationLog", data.finalization_log_id ? formatInlineCode(data.finalization_log_id) : "(none)"),
          embedField("다음 명령", summarizeCommandLines(nextCommands).join("\n")),
          embedField("안전 상태", [
            "task done 없음",
            "commit/push 없음",
          ], true),
        ],
      }],
    };
  }

  return {
    content: "",
    embeds: [{
      title: "Completion 승인 후 Runner 계속 진행 완료",
      color: pcRunnerColor(runnerData.status || run.status || stopReason),
      description: [
        `${formatInlineCode(taskId || "unknown")}`,
        runnerRunId ? `Runner: ${formatInlineCode(runnerRunId)}` : "",
        stopReason ? `중단 이유: ${formatInlineCode(stopReason)}` : "",
      ].filter(Boolean).join("\n"),
      fields: [
        embedField("처리 내용", [
          `FinalizationLog: ${formatInlineCode(data.finalization_log_id || "unknown")}`,
          `decision: ${data.decision || "accept"}`,
          `runner continue: ${koBool(runnerResult.ok === true)}`,
        ]),
        embedField("현재 위치", [
          `run 상태: ${run.status || runnerData.status || "unknown"}`,
          `단계: ${(run.current_phase || "unknown")} / ${(run.current_step || "unknown")}`,
        ]),
        embedField("다음 명령", summarizeCommandLines(nextCommands).join("\n")),
        embedField("안전 상태", [
          `task lifecycle 변경 없음: ${koBool(runnerData.task_lifecycle_unchanged !== false)}`,
          `task done 없음: ${koBool(runnerData.no_task_done !== false)}`,
          `commit/push 없음: ${koBool(runnerData.no_commit_or_push !== false)}`,
        ], true),
      ],
      footer: {
        text: runnerData.runner_run_path || "PC Runner artifact",
      },
    }],
  };
}

function pcRunnerNextActionSummary(stopReason, command) {
  if (command === "plan") {
    return "계획을 확인한 뒤 실행 가능하면 `/ai runner start`를 누르세요.";
  }

  switch (stopReason) {
    case "approval_required":
      return "작업을 선택하고 승인한 뒤 Runner를 시작하세요.";
    case "active_task_mismatch":
      return "ActiveTask를 이 작업으로 맞춘 뒤 Runner를 다시 시작하세요.";
    case "completion_review_required":
      return "완료 카드와 검증 결과를 보고, 문제가 없으면 `accept-completion`으로 마무리 검토를 통과시키세요.";
    case "finalization_required":
      return "완료 카드를 확인하고 최종 결정을 기록하세요.";
    case "finalization_not_accepted":
      return "최종 결정이 accept 계열이 아닙니다. 수정 요청/반려/보류를 처리하거나 결정을 바꾸세요.";
    case "done_or_commit_decision":
      return "작업 완료 처리와 commit/push 여부만 남았습니다.";
    case "executor_not_ready":
      return "실행기 상태를 확인하고 설정 또는 경로 문제를 먼저 해결하세요.";
    case "":
    case undefined:
    case null:
      return "Runner 상태와 기록을 확인하세요.";
    default:
      return `Runner가 ${stopReason} 상태에서 멈췄습니다. 아래 명령으로 상태를 확인하세요.`;
  }
}

function buildPcRunnerNextCommands({ taskId, command, stopReason, reports, runnerRunId, canStart }) {
  const id = String(taskId ?? "").trim() || "<task_id>";
  const completionReportId = reports?.completion_report_id;
  const autoApprovalId = reports?.auto_approval_evaluation_id;
  const followUpPlanId = reports?.follow_up_plan_id;
  const runArg = runnerRunId ? ` runner-run-id:${runnerRunId}` : "";

  if (command === "plan" && canStart !== false) {
    return [`/ai runner start id:${id}`];
  }

  switch (stopReason) {
    case "approval_required":
      return [
        `/ai task set-active id:${id}`,
        `/ai task approve id:${id} note:<승인 범위>`,
        `/ai runner start id:${id}`,
      ];
    case "active_task_mismatch":
      return [
        `/ai task set-active id:${id}`,
        `/ai runner start id:${id}`,
      ];
    case "completion_review_required":
      return [
        `/ai runner read id:${id}${runArg}`,
        completionReportId
          ? `/ai completion card id:${id} completion-report-id:${completionReportId}`
          : `/ai completion card id:${id}`,
        completionReportId
          ? `/ai runner accept-completion id:${id} completion-report-id:${completionReportId}${runArg}`
          : `/ai runner accept-completion id:${id}${runArg}`,
      ];
    case "finalization_required":
      return [
        completionReportId
          ? `/ai completion card id:${id} completion-report-id:${completionReportId}`
          : `/ai completion card id:${id}`,
        completionReportId
          ? `/ai runner accept-completion id:${id} completion-report-id:${completionReportId}${runArg}`
          : `/ai runner accept-completion id:${id}${runArg}`,
      ];
    case "finalization_not_accepted":
      return [
        `/ai finalization status id:${id}`,
        completionReportId
          ? `/ai finalization accept-concerns id:${id} completion-report-id:${completionReportId}`
          : `/ai finalization accept-concerns id:${id}`,
        `/ai runner continue id:${id}${runArg}`,
      ];
    case "done_or_commit_decision":
      return [
        `/ai runner read id:${id}${runArg}`,
        autoApprovalId ? `/ai auto-approval read id:${id} policy-evaluation-id:${autoApprovalId}` : `/ai auto-approval status id:${id}`,
        followUpPlanId ? `/ai follow-up read id:${id} follow-up-plan-id:${followUpPlanId}` : `/ai follow-up status id:${id}`,
        `/ai task done id:${id} evidence:<완료 근거>`,
        `/ai git commit-push message:<commit message>`,
      ];
    case "executor_not_ready":
      return [
        `/ai runner plan id:${id}`,
        "/ai intake-engine status",
      ];
    default:
      return [
        `/ai runner status id:${id}`,
        `/ai runner read id:${id}${runArg}`,
      ];
  }
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

export function formatGitCommandPayload(result) {
  const data = result?.data ?? {};
  const commit = data.commit ?? data;
  const push = data.push ?? data;
  const status = commit.status ?? data.status ?? {};
  const safety = commit.safety ?? data.safety ?? {};
  const files = status.files ?? [];
  const forbidden = safety.forbidden ?? [];

  if (!result?.ok) {
    return {
      content: "",
      embeds: [{
        title: "Git 명령 실패",
        color: 0xc62828,
        description: [
          `명령: ${formatInlineCode(result?.command || "unknown")}`,
          cleanKo(result?.error || "Unknown failure."),
        ].join("\n"),
        fields: [
          embedField("변경 파일", summarizeGitFiles(files)),
          forbidden.length > 0 ? embedField("차단된 경로", summarizeGitFiles(forbidden)) : null,
          embedField("다음 명령", [
            "/ai run capture-diff",
            "/ai run workflow-status",
          ].map(formatInlineCode).join("\n")),
        ].filter(Boolean),
      }],
    };
  }

  const lines = [];
  if (data.committed || commit.committed) {
    lines.push(`commit: ${formatInlineCode(commit.commit_sha || "created")}`);
  }
  if (data.pushed || push.pushed) {
    lines.push(`push: ${push.branch || "ok"}`);
  }
  if (commit.note) {
    lines.push(cleanKo(commit.note));
  }

  return {
    content: "",
    embeds: [{
      title: "Git 명령 완료",
      color: 0x2e7d32,
      description: [
        `명령: ${formatInlineCode(result.command || "unknown")}`,
        lines.length > 0 ? lines.join("\n") : "처리할 변경이 없습니다.",
      ].join("\n"),
      fields: [
        embedField("커밋 메시지", commit.message ? formatInlineCode(commit.message) : "(없음)"),
        embedField("변경 파일", summarizeGitFiles(files)),
        embedField("안전 확인", [
          `금지 경로 없음: ${koBool(forbidden.length === 0)}`,
          `commit 실행: ${koBool(data.committed || commit.committed)}`,
          `push 실행: ${koBool(data.pushed || push.pushed)}`,
        ], true),
      ],
    }],
  };
}

function pcRunnerTitle(command, data) {
  const labels = {
    status: "PC Runner 상태",
    plan: "PC Runner 계획 생성 완료",
    start: "PC Runner 실행 결과",
    continue: "PC Runner 이어서 실행 결과",
    stop: "PC Runner 중단 기록",
    read: "PC Runner 실행 기록",
  };
  if (command === "plan" && data?.can_start === false) {
    return "PC Runner 계획 생성 완료: 시작 전 확인 필요";
  }
  return labels[command] || "PC Runner";
}

function pcRunnerColor(state) {
  switch (state) {
    case "stopped":
    case "completion_review_required":
    case "done_or_commit_decision":
      return 0xf9a825;
    case "completed":
    case "ready":
      return 0x2e7d32;
    case "running":
      return 0x1565c0;
    default:
      return 0x607d8b;
  }
}

function completionColor(state) {
  switch (state) {
    case "ready_for_human_completion_review":
      return 0x2e7d32;
    case "ready_for_human_completion_review_with_notes":
      return 0xf9a825;
    case "needs_human_decision":
      return 0xef6c00;
    case "failed_verification":
      return 0xc62828;
    default:
      return 0x607d8b;
  }
}

function completionStateKo(state) {
  switch (state) {
    case "ready_for_human_completion_review":
      return "완료 검토 가능";
    case "ready_for_human_completion_review_with_notes":
      return "메모 검토 후 완료 가능";
    case "needs_human_decision":
      return "사람 결정 필요";
    case "failed_verification":
      return "검증 실패";
    case "blocked_by_missing_verification":
      return "VerificationReport 없음";
    case "blocked_by_verification":
      return "검증 근거 부족";
    default:
      return state || "unknown";
  }
}

function readinessKo(level) {
  switch (level) {
    case "READY":
      return "준비 완료";
    case "READY_WITH_NOTES":
      return "메모 있음";
    case "NEEDS_DECISION":
      return "결정 필요";
    case "FAILED":
      return "실패";
    case "BLOCKED":
      return "차단";
    default:
      return level || "unknown";
  }
}

function summarizeCompletionRisks(risks) {
  const values = [
    ...prefixItems("warning", risks?.warnings),
    ...prefixItems("concern", risks?.concerns),
    ...prefixItems("blocker", risks?.blockers),
    ...prefixItems("failed", risks?.failed_checks),
  ];
  if (values.length === 0) {
    return "없음";
  }
  return summarizeCompactList(values, 3);
}

function summarizeCompletionCardIssues(presentation) {
  const values = [
    ...prefixItems("warning", presentation?.warnings),
    ...prefixItems("concern", presentation?.concerns),
    ...prefixItems("blocker", presentation?.blockers),
    ...prefixItems("failed", presentation?.failed_checks),
    ...prefixItems("decision", presentation?.human_decisions),
  ];
  if (values.length === 0) {
    return "없음";
  }
  return summarizeCompactList(values, 3);
}

function prefixItems(prefix, values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((value) => cleanKo(value))
    .filter(Boolean)
    .map((value) => `${prefix}: ${value}`);
}

function finalizationColor(state) {
  switch (state) {
    case "completion_accepted_pending_task_done":
    case "completion_accepted_with_concerns_pending_task_done":
      return 0x2e7d32;
    case "changes_requested":
      return 0xef6c00;
    case "completion_rejected":
      return 0xc62828;
    case "completion_deferred":
      return 0x607d8b;
    default:
      return 0x1565c0;
  }
}

function finalizationStateKo(state) {
  switch (state) {
    case "completion_accepted_pending_task_done":
      return "완료 수락됨, task done 대기";
    case "completion_accepted_with_concerns_pending_task_done":
      return "우려 수락됨, task done 대기";
    case "changes_requested":
      return "수정 요청됨";
    case "completion_rejected":
      return "완료 반려됨";
    case "completion_deferred":
      return "완료 검토 보류";
    default:
      return state || "unknown";
  }
}

function autoApprovalColor(decision) {
  switch (decision) {
    case "eligible_candidate":
      return 0x2e7d32;
    case "needs_human_review":
      return 0xf9a825;
    case "human_approval_required":
      return 0xef6c00;
    default:
      return 0x607d8b;
  }
}

function autoApprovalDecisionKo(decision) {
  switch (decision) {
    case "eligible_candidate":
      return "조건부 자동 승인 후보";
    case "needs_human_review":
      return "사람 검토 필요";
    case "human_approval_required":
      return "사람 승인 필요";
    default:
      return decision || "unknown";
  }
}

function summarizePolicyRules(rules) {
  const values = Array.isArray(rules) ? rules : [];
  if (values.length === 0) {
    return "(없음)";
  }

  const visible = values.slice(0, 5).map((rule) => {
    const mark = rule.status === "pass" ? "PASS" : "FAIL";
    return `${mark} ${rule.id}: ${compactText(cleanKo(rule.summary), 140)}`;
  });
  if (values.length > visible.length) {
    visible.push(`+${values.length - visible.length}개 더 있음`);
  }
  return visible.join("\n");
}

function followUpColor(state) {
  switch (state) {
    case "follow_up_recommended":
      return 0xef6c00;
    case "no_follow_up_recommended":
      return 0x2e7d32;
    case "insufficient_follow_up_signal":
      return 0x607d8b;
    default:
      return 0x1565c0;
  }
}

function followUpStateKo(state) {
  switch (state) {
    case "follow_up_recommended":
      return "후속 작업 후보 있음";
    case "no_follow_up_recommended":
      return "후속 작업 불필요";
    case "insufficient_follow_up_signal":
      return "근거 부족";
    default:
      return state || "unknown";
  }
}

function formatFollowUpCandidates(candidates, maxCount) {
  const values = Array.isArray(candidates) ? candidates : [];
  if (values.length === 0) {
    return "(없음)";
  }

  const visible = values.slice(0, maxCount).map((candidate) => {
    const title = compactText(cleanKo(candidate.title), 140);
    const priority = candidate.suggested_priority ?? "?";
    const type = candidate.candidate_type ?? "follow_up";
    return `${candidate.candidate_id ?? "candidate"} · ${priority} · ${type}\n${title}`;
  });
  if (values.length > visible.length) {
    visible.push(`+${values.length - visible.length}개 더 있음`);
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

function summarizeGitFiles(files, maxCount = 8) {
  const values = Array.isArray(files)
    ? files.map((file) => (typeof file === "string" ? file : file.path)).filter(Boolean)
    : [];
  if (values.length === 0) {
    return "(없음)";
  }

  const visible = values.slice(0, maxCount).map((file) => formatInlineCode(file));
  if (values.length > visible.length) {
    visible.push(`+${values.length - visible.length}개 더 있음`);
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

function appendLlmIntakeSummary(lines, result) {
  const llmText = formatLlmIntakeStatus(result);
  lines.push("", "**LLM 접수 상태**");
  lines.push(llmText);
}

function appendClarifyingQuestions(lines, questions) {
  const values = Array.isArray(questions) ? questions.map(cleanupBlock).filter(Boolean) : [];
  if (values.length === 0) {
    return;
  }

  lines.push("", "**확인 질문 후보**");
  for (const question of values.slice(0, 3)) {
    lines.push(`- ${cleanKo(question)}`);
  }
}

function appendRuleBasedCrossCheck(lines, crossCheck) {
  if (!crossCheck) {
    return;
  }

  lines.push("", "**rule-based 교차 확인**");
  lines.push(koText(crossCheck.summary || "No cross-check summary."));
  if (Array.isArray(crossCheck.mismatches) && crossCheck.mismatches.length > 0) {
    for (const mismatch of crossCheck.mismatches.slice(0, 4)) {
      lines.push(`- ${formatCrossCheckMismatch(mismatch)}`);
    }
  }
}

function formatCrossCheckMismatch(value) {
  return koText(value)
    .replace(/^category:/, "분류:")
    .replace(/^kind:/, "종류:")
    .replace(/^priority:/, "우선순위:")
    .replace(/^suggested_risk:/, "제안 위험도:")
    .replaceAll("rule=", "rule 기준=")
    .replaceAll("llm=", "LLM=");
}

function formatLlmIntakeStatus(result) {
  const llm = result?.llm ?? {};
  if (llm.used) {
    return [
      `사용=${koBool(true)}`,
      `제공자=${llm.provider ?? "codex_cli"}`,
      `모델=${llm.model ?? "unknown"}`,
      llm.reasoning_effort ? `추론=${llm.reasoning_effort}` : "",
      llm.run?.model_route_id ? `라우트=${llm.run.model_route_id}` : "",
      llm.run?.ephemeral ? "ephemeral=yes" : "",
      `신뢰도=${result?.task_draft?.confidence ?? "unknown"}`,
      llm.run?.output_file ? `출력=${llm.run.output_file}` : "",
    ].filter(Boolean).join("; ");
  }

  if (llm.fallback_used) {
    return [
      `사용=${koBool(false)}`,
      "대체=rule-based",
      `상태=${llm.status ?? "unknown"}`,
      llm.reason ? `이유=${koText(llm.reason)}` : "",
    ].filter(Boolean).join("; ");
  }

  return `사용=${koBool(false)}; 상태=${llm.status ?? "not_requested"}`;
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

function summarizeCompactList(items, maxCount) {
  const values = Array.isArray(items) ? items.map(cleanupBlock).filter(Boolean) : [];
  if (values.length === 0) {
    return "(없음)";
  }

  const visible = values.slice(0, maxCount).map(koListValue);
  const suffix = values.length > maxCount ? ` 외 ${values.length - maxCount}개` : "";
  return `${visible.join(", ")}${suffix}`;
}

function summarizeValidationLines(items) {
  const values = Array.isArray(items) ? items.map(cleanupBlock).filter(Boolean) : [];
  if (values.length === 0) {
    return ["(없음)"];
  }

  const lines = values.slice(0, 3).map((item, index) => `${index + 1}. ${compactText(koListValue(item), 180)}`);
  if (values.length > lines.length) {
    lines.push("상세 검증 항목은 TaskDraft 출력 파일 또는 생성된 Backlog task에서 확인하세요.");
  }
  return lines;
}

function summarizeCommandLines(items) {
  const values = Array.isArray(items) ? items.map(cleanupBlock).filter(Boolean) : [];
  if (values.length === 0) {
    return ["(없음)"];
  }

  return values.slice(0, 5).map((item) => formatInlineCode(compactText(item, 220)));
}

function summarizeIntakeValidation(items) {
  const values = Array.isArray(items) ? items.map(cleanupBlock).filter(Boolean) : [];
  if (values.length === 0) {
    return "(없음)";
  }

  const visible = values.slice(0, 3).map(koListValue);
  if (values.length > visible.length) {
    visible.push("상세 검증 항목은 TaskDraft 출력 파일 또는 생성된 Backlog task에서 확인하세요.");
  }
  return visible.join("; ");
}

function splitCardSections(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const intro = [];
  const fields = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const heading = line.match(/^\*\*(.+?)\*\*$/);
    if (heading) {
      current = {
        name: heading[1].replace(/^\d+\.\s*/, "").trim() || "내용",
        lines: [],
      };
      fields.push(current);
      continue;
    }

    if (!current) {
      if (line.trim()) {
        intro.push(line);
      }
      continue;
    }

    if (line.trim()) {
      current.lines.push(line);
    }
  }

  return {
    intro,
    fields: fields
      .map((field) => ({
        ...field,
        lines: field.lines.length > 0 ? field.lines : ["(없음)"],
      }))
      .filter((field) => field.name),
  };
}

function embedField(name, value, inline = false) {
  const raw = Array.isArray(value) ? value.filter(Boolean).join("\n") : String(value ?? "");
  return {
    name,
    value: compactText(raw || "(없음)", 1024),
    inline,
  };
}

function koStatusLabel(value) {
  const status = koStatus(value);
  const match = status.match(/^[^(]+\(([^)]+)\)$/);
  return match ? match[1].trim() : status;
}

function compactText(value, maxLength) {
  const text = cleanupBlock(value);
  if (text.length <= maxLength) {
    return text || "(없음)";
  }
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
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

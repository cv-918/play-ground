const STATUS_LABELS = new Map([
  ["todo", "대기"],
  ["analysis", "분석 중"],
  ["awaiting_approval", "승인 대기"],
  ["ready_for_implementation", "구현 준비 완료"],
  ["in_progress", "진행 중"],
  ["review", "리뷰 중"],
  ["validation", "검증 중"],
  ["blocked", "차단됨"],
  ["done", "완료"],
  ["deferred", "보류됨"],
  ["partial_done", "부분 완료"],
  ["needs_human_review", "사람 검토 필요"],
  ["ready_for_manual_execution", "수동 실행 준비 완료"],
  ["not_ready", "준비 안 됨"],
  ["READY_TO_MARK_DONE", "done 처리 검토 가능"],
  ["NEEDS_REVIEW", "리뷰 필요"],
  ["NEEDS_VALIDATION", "검증 필요"],
  ["FAILED", "실패"],
  ["BLOCKED", "차단됨"],
  ["COMMIT_RECOMMENDED", "커밋 검토 가능"],
  ["COMMIT_AFTER_REVIEW", "리뷰 후 커밋 검토"],
  ["DO_NOT_COMMIT_YET", "아직 커밋하지 말 것"],
  ["NO_COMMIT_NEEDED", "커밋 불필요"],
]);

const TEXT_REPLACEMENTS = new Map([
  ["(none found)", "(없음)"],
  ["(none)", "(없음)"],
  ["None.", "없음."],
  ["unknown", "unknown"],
  ["Review generated request before manual Codex execution.", "수동 Codex 실행 전에 생성된 요청서를 검토하세요."],
  ["Generated request only. Discord did not execute Codex CLI, agents, approval, task state changes, commit, or push.", "요청서만 생성했습니다. Discord는 Codex CLI, agents, 승인, 작업 상태 변경, commit, push를 실행하지 않았습니다."],
  ["Generated request only. Discord did not execute Codex CLI, agents, approval, task state changes, commit, or push.", "요청서만 생성했습니다. Discord는 Codex CLI, agents, 승인, 작업 상태 변경, commit, push를 실행하지 않았습니다."],
  ["ActiveTask.md was updated for manual task selection. Backlog row status was not changed by set-active. The task was not approved, marked done, or sent to Codex or agents.", "수동 작업 선택을 위해 ActiveTask.md를 업데이트했습니다. Backlog row status는 set-active로 변경하지 않았습니다. task는 승인, done 처리, Codex/agents 전달되지 않았습니다."],
  ["Task appears approved or already active for bounded manual execution.", "작업이 승인되었거나 제한된 수동 실행을 위해 이미 active 상태로 보입니다."],
  ["Task is not approved for implementation yet.", "작업이 아직 구현을 위해 승인되지 않았습니다."],
  ["Task status is not a clear execution-ready state; review before using the generated goal request.", "작업 상태가 명확한 실행 준비 상태가 아닙니다. 생성된 goal 요청서를 사용하기 전에 검토하세요."],
  ["Human Director review is required for high-risk or runtime/schema-related gates.", "고위험 작업 또는 런타임/스키마 관련 게이트가 있는 경우 Human Director 검토가 필요합니다."],
  ["Backlog row appears to come from explicit intake-create.", "Backlog row가 명시적 intake-create에서 생성된 것으로 보입니다."],
  ["No intake-create marker found; using generic activation review.", "intake-create marker를 찾지 못했습니다. 일반 activation review를 사용합니다."],
  ["Task is closed and should not be activated without reopening or creating a new task.", "닫힌 작업입니다. 다시 열거나 새 작업을 만들지 않고 활성화하면 안 됩니다."],
  ["Review history before creating a replacement task.", "대체 task를 만들기 전에 이력을 검토하세요."],
  ["Task is blocked and should not be activated until the blocker is resolved.", "작업이 blocked 상태입니다. blocker가 해결되기 전에는 활성화하면 안 됩니다."],
  ["Resolve or update the blocker before setting active.", "set-active 전에 blocker를 해결하거나 업데이트하세요."],
  ["Task is already marked ready_for_implementation.", "작업이 이미 ready_for_implementation 상태입니다."],
  ["Human Director may set active manually if this is the next task.", "이 작업이 다음 작업이라면 Human Director가 수동으로 set-active 할 수 있습니다."],
  ["Task can be reviewed for activation, but priority/risk requires explicit Human Director approval before implementation.", "활성화 검토는 가능하지만 우선순위/위험도상 구현 전 명시적 Human Director approval이 필요합니다."],
  ["Approve manually before implementation, then set active if selected.", "구현 전에 수동 approve하고, 선택된 작업이면 set-active 하세요."],
  ["No blocking status was found. Human Director still controls activation and approval.", "blocking status는 발견되지 않았습니다. activation과 approval은 여전히 Human Director가 결정합니다."],
  ["Set active manually only after confirming scope and priority.", "scope와 priority를 확인한 뒤에만 수동으로 set-active 하세요."],
  ["Detailed role, path-rule, validation, and completion guidance is in the generated markdown file. Use `/ai role status` only when full routing detail is needed.", "상세 역할, 경로 규칙, 검증, 완료 안내는 생성된 markdown 파일에 있습니다. 전체 라우팅 세부 정보가 필요할 때만 `/ai role status`를 사용하세요."],
  ["No Backlog/ActiveTask changes. No agents or Codex CLI.", "Backlog/ActiveTask 변경 없음. agents 또는 Codex CLI 실행 없음."],
  ["No agents or Codex CLI were executed.", "agents 또는 Codex CLI를 실행하지 않았습니다."],
  ["No agents or Codex CLI executed.", "agents 또는 Codex CLI 실행 없음."],
  ["Task selected only. No approval, Codex, agents, done status, commit, or push was performed.", "작업 선택만 수행했습니다. 승인, Codex, agents, done 상태, commit, push는 수행하지 않았습니다."],
  ["Approval only. No Codex, agents, done status, commit, or push was executed.", "승인 기록만 수행했습니다. Codex, agents, done 상태, commit, push는 실행하지 않았습니다."],
  ["For details: `/ai role status` shows full routing; `/ai task approve` records the approval gate; `/ai prepare goal` performs the final execution readiness check.", "상세 확인: `/ai role status`는 전체 routing을 보여주고, `/ai task approve`는 승인 게이트를 기록하며, `/ai prepare goal`은 최종 실행 준비 상태를 확인합니다."],
  ["Use `/ai prepare goal` as the final execution readiness check. Use `/ai role status` only when full routing detail is needed.", "`/ai prepare goal`을 최종 실행 준비 확인으로 사용하세요. 전체 routing 세부 정보가 필요할 때만 `/ai role status`를 사용하세요."],
  ["Review the created Backlog task, edit it if needed, then approve or set active manually.", "생성된 Backlog task를 검토하고 필요하면 수정한 뒤, 수동으로 approve 또는 set-active 하세요."],
  ["Use Review_Validation_Verdict_Format_v1.md before accepting implementation or validation results.", "구현 또는 검증 결과를 받아들이기 전에 Review_Validation_Verdict_Format_v1.md를 사용하세요."],
  ["No result summary classified.", "분류된 결과 요약이 없습니다."],
  ["No changed-file summary available.", "변경 파일 요약이 없습니다."],
  ["No blocked backlog items reported by workflow_status.", "workflow_status가 보고한 blocked Backlog 항목이 없습니다."],
  ["Use local workflow files for full blocker details. v1 only reports summary count.", "전체 blocker 세부 정보는 local workflow 파일에서 확인하세요. v1은 요약 개수만 보고합니다."],
  ["Review/edit the draft, then create a Backlog task manually if accepted. No task was created automatically.", "초안을 검토/수정한 뒤 받아들일 경우 Backlog 작업을 수동으로 생성하세요. 작업은 자동 생성되지 않았습니다."],
  ["Human Director must manually decide whether to create a Backlog task from this suggestion.", "Human Director가 이 제안으로 Backlog 작업을 만들지 수동으로 결정해야 합니다."],
  ["Goal request file was generated for manual review only. Discord did not execute Codex CLI, agents, approval, ActiveTask changes, done status, commit, push, or game source modifications.", "수동 검토용 goal 요청서 파일만 생성했습니다. Discord는 Codex CLI, agents, 승인, ActiveTask 변경, done 상태, commit, push, game source 수정을 실행하지 않았습니다."],
  ["Task status is ready for manual Codex execution after reviewing the generated file.", "생성된 파일을 검토한 뒤 수동으로 Codex 실행을 진행할 수 있는 상태입니다."],
  ["Task status is ready for manual Codex execution after reviewing the generated file. Human Director review is required for high-risk or runtime/schema-related gates.", "생성된 파일을 검토한 뒤 수동으로 Codex 실행을 진행할 수 있는 상태입니다. 고위험 작업 또는 런타임/스키마 관련 게이트가 있는 경우 Human Director 검토가 필요합니다."],
  ["Implementation mode requires explicit task approval before manual Codex execution.", "implementation mode에서는 수동 Codex 실행 전에 명시적 task approval이 필요합니다."],
  ["Task status indicates more human review is needed before manual Codex execution.", "작업 상태상 수동 Codex 실행 전에 추가 사람 검토가 필요합니다."],
  ["Task is blocked; resolve the blocker before manual Codex execution.", "작업이 blocked 상태입니다. 수동 Codex 실행 전에 blocker를 해결하세요."],
  ["Open the generated markdown file.", "생성된 markdown 파일을 여세요."],
  ["Review the first-line /goal command and request body.", "첫 줄 `/goal` 명령과 요청 본문을 검토하세요."],
  ["Paste into Codex CLI manually only if accepted.", "내용을 받아들일 때만 Codex CLI에 수동으로 붙여 넣으세요."],
  ["Return Codex result to Discord/ChatGPT for review.", "Codex 결과를 Discord/ChatGPT로 가져와 review하세요."],
  ["Do not commit until validation passes.", "validation이 통과하기 전에는 commit하지 마세요."],
  ["Review path-scoped rules before implementation.", "구현 전에 경로별 규칙을 검토하세요."],
  ["Check JSON syntax and parseability when JSON files are edited.", "JSON 파일을 수정한 경우 JSON 문법과 파싱 가능 여부를 확인하세요."],
  ["Review ID/reference integrity, enum validity, defaults, and invalid-data behavior.", "ID/reference 무결성, enum 유효성, 기본값, invalid-data 동작을 검토하세요."],
  ["Run Debug x64 build for source behavior changes.", "source behavior 변경 시 Debug x64 build를 실행하세요."],
  ["Request manual runtime validation for player-visible behavior.", "플레이어에게 보이는 동작은 수동 runtime validation을 요청하세요."],
  ["Review lifecycle, state, animation, ownership, and cleanup assumptions.", "lifecycle, state, animation, ownership, cleanup 가정을 검토하세요."],
  ["Run git status --short.", "`git status --short`를 실행하세요."],
  ["Run git diff --check.", "`git diff --check`를 실행하세요."],
  ["Run git diff --stat.", "`git diff --stat`를 실행하세요."],
  ["Verify no forbidden paths were modified.", "금지된 경로가 수정되지 않았는지 확인하세요."],
  ["No files changed claimed.", "변경 파일이 있다고 주장하지 않았습니다."],
  ["No concrete changed file paths found.", "구체적인 변경 파일 경로를 찾지 못했습니다."],
  ["Result includes expected rejection/failure evidence for adapter validation.", "adapter 검증을 위한 예상된 거부/실패 evidence가 포함되어 있습니다."],
  ["expected rejection evidence", "예상 거부/실패 evidence"],
  ["Result summary is too vague; include what changed, validation run, and remaining risks.", "결과 요약이 너무 모호합니다. 변경 내용, 실행한 validation, 남은 risk를 포함하세요."],
  ["Result says required validation was not run or was skipped.", "결과가 required validation 미실행 또는 생략을 보고했습니다."],
  ["Task is currently blocked in Backlog; unblock or create follow-up before completion.", "현재 작업이 Backlog에서 blocked 상태입니다. 완료 전에 unblock하거나 follow-up을 만드세요."],
  ["Private/local/secret-like path or token wording was mentioned; verify nothing private is tracked or exposed.", "private/local/secret 유사 경로나 token 표현이 언급되었습니다. private 파일이 추적되거나 노출되지 않았는지 확인하세요."],
  ["Workflow docs/dev log path was mentioned; verify source-of-truth consistency and avoid stale validation claims.", "workflow 문서/dev log 경로가 언급되었습니다. source-of-truth 일관성과 오래된 validation 주장 여부를 확인하세요."],
  ["Game source path was mentioned; confirm this was expected for the task and required build/runtime validation exists.", "game source 경로가 언급되었습니다. 작업 범위에 맞는지와 필요한 build/runtime validation이 있는지 확인하세요."],
  ["Game data path was mentioned; confirm JSON syntax, reference integrity, and semantic validation evidence.", "game data 경로가 언급되었습니다. JSON 문법, reference 무결성, semantic validation evidence를 확인하세요."],
  ["Result mentions a commit; this workflow expects commit decisions to remain manual.", "결과에 commit이 언급되었습니다. 이 workflow에서는 commit 결정이 수동으로 남아야 합니다."],
  ["High-priority or high-risk task; Human Director review is required before done/commit decisions.", "우선순위 또는 위험도가 높은 작업입니다. done/commit 결정 전에 Human Director 검토가 필요합니다."],
  ["Human Decision Gate: high-risk schema/save/runtime/external-tool/destructive scope must be explicitly approved before implementation.", "사람 결정 gate: high-risk schema/save/runtime/external-tool/destructive 범위는 구현 전에 명시적으로 승인되어야 합니다."],
  ["general validation pass", "일반 검증 통과"],
  ["Resolve the blocker or failed result before marking done.", "done 처리 전에 blocker 또는 실패 결과를 해결하세요."],
]);

export function koStatus(value) {
  const raw = String(value ?? "unknown").trim() || "unknown";
  const label = STATUS_LABELS.get(raw);
  return label ? `${raw} (${label})` : raw;
}

export function koBool(value) {
  return value ? "yes (예)" : "no (아니오)";
}

export function koPassFail(value) {
  return value ? "pass (통과)" : "fail (실패)";
}

export function koText(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  const exact = TEXT_REPLACEMENTS.get(text);
  if (exact) {
    return exact;
  }

  return text
    .replaceAll("Task selected only. No approval, Codex, agents, done status, commit, or push was performed.", "작업 선택만 수행했습니다. 승인, Codex, agents, done 상태, commit, push는 수행하지 않았습니다.")
    .replaceAll("Task status is ready for manual Codex execution after reviewing the generated file.", "생성된 파일을 검토한 뒤 수동으로 Codex 실행을 진행할 수 있는 상태입니다.")
    .replaceAll("Human Director review is required for high-risk or runtime/schema-related gates.", "고위험 작업 또는 런타임/스키마 관련 게이트가 있는 경우 Human Director 검토가 필요합니다.")
    .replaceAll("Approval records Human Director scope acceptance only.", "승인은 Human Director가 범위를 받아들였다는 기록만 의미합니다.")
    .replaceAll("No Codex CLI, agents, implementation, done status, commit, push, or game source modification was executed.", "Codex CLI, agents, 구현, done 상태, commit, push, game source 수정은 실행하지 않았습니다.")
    .replaceAll("Status set to", "상태 설정:")
    .replaceAll("Approval note recorded:", "승인 메모 기록:")
    .replaceAll("ActiveTask.md updated:", "ActiveTask.md 업데이트:")
    .replaceAll("Result reports a failure or unresolved error.", "결과가 실패 또는 미해결 오류를 보고했습니다.")
    .replaceAll("Result reports a blocker.", "결과가 blocker를 보고했습니다.")
    .replaceAll("Result reports incomplete or missing validation.", "결과가 불완전하거나 누락된 validation을 보고했습니다.")
    .replaceAll("Result claims implementation or file changes completed.", "결과가 구현 또는 파일 변경 완료를 주장합니다.")
    .replaceAll("Result claims analysis/review completed without implementation changes.", "결과가 구현 변경 없이 analysis/review 완료를 주장합니다.")
    .replaceAll("Result is too vague to classify confidently.", "결과가 너무 모호해서 확실히 분류할 수 없습니다.")
    .replaceAll("Validation evidence is missing or too vague.", "검증 근거가 없거나 너무 모호합니다.")
    .replaceAll("Changed-file evidence is missing; state files changed or explicitly say no files changed.", "변경 파일 근거가 없습니다. 변경 파일을 명시하거나 변경 파일이 없다고 분명히 쓰세요.")
    .replaceAll("Files changed but validation evidence is incomplete.", "파일 변경이 있지만 검증 근거가 불완전합니다.")
    .replaceAll("Review the selected active task.", "선택된 현재 작업을 검토하세요.")
    .replaceAll("Approve architecture and scope before implementation if source or runtime behavior will change.", "소스 또는 런타임 동작이 바뀌면 구현 전에 구조와 범위를 승인하세요.")
    .replaceAll("Review Backlog.md for the next highest-priority open task after this task is complete.", "이 task가 완료된 뒤 Backlog.md에서 다음 highest-priority open task를 검토하세요.")
    .replaceAll("Run npm --prefix tools\\discord-orchestrator run register when Discord command schema changes.", "Discord command schema가 바뀐 경우 `npm --prefix tools\\discord-orchestrator run register`를 실행하세요.")
    .replaceAll("Run tools\\discord-orchestrator\\restart_bot.bat and tools\\discord-orchestrator\\status_bot.bat when bot behavior changes.", "bot behavior가 바뀐 경우 `tools\\discord-orchestrator\\restart_bot.bat`와 `tools\\discord-orchestrator\\status_bot.bat`를 실행하세요.")
    .replaceAll("Run JSON syntax, ID/reference integrity, enum validity, and semantic validation for data-related changes.", "data 관련 변경에는 JSON 문법, ID/reference 무결성, enum 유효성, semantic validation을 실행하세요.")
    .replaceAll("Run Debug x64 build and manual runtime validation when gameplay/runtime behavior changes.", "gameplay/runtime behavior가 바뀐 경우 Debug x64 build와 manual runtime validation을 실행하세요.")
    .replaceAll("Review git diff and commit manually only after validation is accepted.", "검증이 받아들여진 뒤에만 git diff를 검토하고 수동 commit하세요.")
    .replaceAll("Run missing validation manually, then paste updated evidence into /ai result audit.", "누락된 검증을 수동으로 실행한 뒤 갱신된 근거를 `/ai result audit`에 붙여 넣으세요.")
    .replace(/Compact goal request is (\d+) characters; target is below (\d+)\./g, "compact goal 요청서가 $1자입니다. 목표는 $2자 미만입니다.")
    .replace(/(\d+) claimed file\(s\) changed\./g, "$1개 변경 파일이 있다고 보고했습니다.");
}

export function koListValue(value) {
  return koText(value) || "(없음)";
}

#!/usr/bin/env node
"use strict";

function renderClientWorkflowResultScript() {
  return `    function workflowActionButton(label, decision, className, markDone = false) {
      const core = state.workflow_core || {};
      const task = core.active_task || {};
      const runner = core.runner || {};
      const completion = core.completion || {};
      if (!task.task_id || !runner.runner_run_id || !completion.path) return "";
      return '<button class="' + esc(className) + '" data-workflow-finalize="' + esc(decision) + '" data-mark-done="' + esc(markDone ? "true" : "false") + '">' + esc(label) + '</button>';
    }
    function workflowStartButton(label, taskId, className = "good") {
      if (!taskId) return "";
      return '<button class="' + esc(className) + '" data-workflow-start="' + esc(taskId) + '">' + esc(label) + '</button>';
    }
    function completionCurrentReportId(completion) {
      return String(completion?.id || completion?.path || "")
        .replace(/\\\\/g, "/")
        .split("/")
        .pop()
        .replace(/\.json$/i, "");
    }
    function completionVerdictLevel(core) {
      return String(core?.verification?.verdict || core?.completion?.readiness || "").toUpperCase();
    }
    function completionNeedsDirectorChoice(core) {
      const completion = core?.completion || {};
      const verdict = completionVerdictLevel(core);
      return completion.state === "needs_human_decision"
        || completion.readiness === "NEEDS_DECISION"
        || ["CONCERNS", "BLOCKED", "FAIL"].includes(verdict);
    }
    function completionPlainAcceptAllowed(core) {
      const verdict = completionVerdictLevel(core);
      return !completionNeedsDirectorChoice(core) && (verdict === "PASS" || verdict === "PASS_WITH_NOTES" || verdict === "");
    }
    function completionChangesAlreadyRequested(core) {
      const completion = core?.completion || {};
      const finalization = core?.finalization || {};
      const decision = String(finalization.decision || "").replace(/_/g, "-");
      const stateValue = String(finalization.state || "");
      const currentReportId = completionCurrentReportId(completion);
      const finalizedReportId = String(finalization.completion_report_id || "");
      const sameReport = !currentReportId || !finalizedReportId || currentReportId === finalizedReportId;
      return sameReport && (decision === "request-changes" || stateValue === "changes_requested");
    }
    function completionDecisionStatusLines(core) {
      if (completionChangesAlreadyRequested(core)) {
        return [
          "수정 요청이 이미 기록되어 있습니다.",
          "같은 완료 보고서를 다시 승인하지 말고, 수정 작업을 진행한 뒤 새 완료 보고서를 확인하세요.",
        ];
      }
      if (completionNeedsDirectorChoice(core)) {
        return [
          "검증 우려가 남아 있어 일반 완료 승인은 사용할 수 없습니다.",
          "문제를 감수하고 끝낼지, 수정 요청할지, 판단을 보류할지 선택하세요.",
        ];
      }
      return [];
    }
    function completionDecisionActionItems(core) {
      const completion = core?.completion || {};
      const items = [
        completion.card_href ? '<a href="' + esc(completion.card_href) + '" target="_blank">완료 카드</a>' : "",
        completion.href ? '<a href="' + esc(completion.href) + '" target="_blank">결과 보기</a>' : "",
      ];
      if (completionChangesAlreadyRequested(core)) return items;
      if (completionPlainAcceptAllowed(core)) {
        items.push(workflowActionButton("완료 승인", "accept", "good", true));
      }
      if (completionNeedsDirectorChoice(core)) {
        items.push(workflowActionButton("우려 감수 후 완료", "accept-concerns", "warn", true));
      }
      items.push(workflowActionButton("수정 요청", "request-changes", "danger", false));
      items.push(workflowActionButton("판단 보류", "defer", "secondary", false));
      return items;
    }
    function completionFollowUpActionItems(core) {
      const items = completionDecisionActionItems(core);
      if (completionChangesAlreadyRequested(core)) {
        items.push(button("수정 실행 요청 만들기", "completion-create-fix-workorder", "", "good"));
        items.push('<button class="secondary" data-nav-jump="work">실행 요청으로 이동</button>');
      }
      return items;
    }
    function completionDecisionStateLabel(core) {
      if (completionChangesAlreadyRequested(core)) return "수정 요청 기록됨";
      if (completionNeedsDirectorChoice(core)) return "사람 판단 필요";
      if (completionPlainAcceptAllowed(core)) return "완료 승인 가능";
      return "보고서 확인 필요";
    }
    function completionDirectorDecisionSummary(core) {
      if (completionChangesAlreadyRequested(core)) {
        return "이미 수정 요청을 남긴 결과입니다. 같은 결과를 다시 완료 처리하지 말고, 수정 실행 요청으로 넘긴 뒤 새 검토 결과를 확인하세요.";
      }
      if (completionNeedsDirectorChoice(core)) {
        return "그냥 완료 처리하기에는 우려가 남아 있습니다. 받아들일 수 있는 우려면 감수 후 완료, 고쳐야 하면 수정 요청, 아직 모르겠으면 판단 보류를 선택하세요.";
      }
      if (completionPlainAcceptAllowed(core)) {
        return "완료로 받아도 되는 상태입니다. 그래도 완료 카드와 보고서를 빠르게 확인한 뒤 완료 승인하세요.";
      }
      return "완료 카드와 보고서를 먼저 확인한 뒤 완료, 수정, 보류 중 하나를 고르세요.";
    }
    function reviewPacketRoleLabel(packet) {
      const id = String(packet?.id || "");
      const match = id.match(/^RRO-\d{8}-\d{6}-(.+)$/u);
      if (match) return staffName(match[1].replace(/-/g, "_"));
      return "검토 보고서";
    }
    function reviewPacketBreakdownHtml(packets) {
      const counts = {};
      asArray(packets).forEach((packet) => {
        const label = reviewPacketRoleLabel(packet);
        counts[label] = (counts[label] || 0) + 1;
      });
      const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
      if (!rows.length) return '<p class="small muted">참고 보고서가 없습니다.</p>';
      const more = Object.keys(counts).length > rows.length ? '<li>+' + esc(Object.keys(counts).length - rows.length) + '종류 더 있음</li>' : "";
      return '<ul class="small">' + rows.map(([label, count]) => '<li>' + esc(label) + ' 보고서 ' + esc(count) + '개</li>').join("") + more + '</ul>';
    }
    function formatWorkflowFinalizationFailure(value) {
      const failedFinalization = value?.ok === false && (
        value?.command === "accept-completion"
        || value?.stage === "finalization"
        || value?.data?.finalization
      );
      if (!failedFinalization) return "";
      const errorText = String(value?.error || value?.data?.finalization?.error || value?.data?.finalization?.data?.error || "");
      const notReady = /not ready for accept_completion/i.test(errorText);
      const needsDecision = /needs_human_decision/i.test(errorText);
      const reasonLines = notReady
        ? [
            needsDecision ? "현재 상태: 사람 판단 필요" : "현재 완료 보고서가 일반 완료 승인 가능한 상태가 아닙니다.",
            "일반 완료 승인은 우려가 없는 PASS/READY 상태에서만 사용합니다.",
            "우려가 남은 보고서는 감수, 수정 요청, 보류 중 하나로 결정해야 합니다.",
          ]
        : [translateStudioMessage(errorText || value?.reason || "완료 판단 처리 중 오류가 발생했습니다.")];
      const actionLines = notReady
        ? [
            "문제를 알고도 이번 작업을 끝낼 거면 우려 감수 후 완료를 누르세요.",
            "고쳐야 할 문제가 있으면 수정 요청을 누르세요.",
            "아직 판단 근거가 부족하면 판단 보류를 누르세요.",
          ]
        : ["완료 카드와 실행 기록을 다시 확인한 뒤 필요한 판단 버튼을 선택하세요."];
      return '<div class="item danger"><h3>완료 승인 실패</h3>' +
        '<p class="summary">' + esc(notReady ? "이 완료 보고서는 우려가 남아 있어 일반 완료 승인을 사용할 수 없습니다." : "완료 판단을 처리하지 못했습니다.") + '</p>' +
        reportSection("왜 실패했나", reasonLines) +
        reportSection("다음 행동", actionLines) +
        actionsHtml(completionDecisionActionItems(state.workflow_core || {})) +
        rawJsonDetails(value) +
        '</div>';
    }
    function formatMaterializationDecisionFailure(value) {
      const command = String(value?.command || "");
      const errorText = String(value?.error || value?.plan?.error || "");
      const plan = value?.plan || {};
      const decisions = asArray(plan.decisions || value?.decisions);
      const missingTargets = decisions.filter((decision) => !String(decision?.target_ref || "").trim()).length;
      const isMaterializationDecisionFailure = value?.ok === false
        && (command === "record" || command === "plan")
        && /Nothing was written|Decision plan failed|Decision validation failed/i.test(errorText);
      if (!isMaterializationDecisionFailure) return "";
      const reasonLines = [
        missingTargets
          ? "저장하려는 판단 후보에 대상 ID가 비어 있습니다. 무엇에 대한 판단인지 알 수 없어 기록하지 않았습니다."
          : "판단 기록 검증을 통과하지 못해 저장하지 않았습니다.",
        "아무 파일도 쓰지 않았고, 참고 기록이나 공식 설정도 생기지 않았습니다.",
      ];
      const nextLines = [
        "대상이 명확한 제안/결정 카드에서 다시 시도하세요.",
        "오래된 테스트 후보라면 읽고 넘어가거나 정리 대상으로 보면 됩니다.",
        "이 화면에서 같은 버튼이 계속 보이면 UI가 숨겨야 하는 오래된 후보입니다.",
      ];
      return '<div class="item danger"><h3>판단 기록 저장 실패</h3>' +
        '<p class="summary">저장 대상이 불완전해서 아무것도 저장하지 않았습니다.</p>' +
        reportSection("왜 실패했나", reasonLines) +
        reportSection("대상", [
          "후보 묶음: " + (plan.materialization_id || value.materialization_id || ""),
          "판단 종류: " + optionLabel(plan.decision_type || value.decision_type || ""),
          "대상 ID 누락 후보: " + missingTargets + "개",
        ]) +
        reportSection("다음 행동", nextLines) +
        safetySection({
          decision_written: false,
          memory_written: false,
          canon_written: false,
          source_changed: false,
          commit_push: false,
        }) +
        rawJsonDetails(value, "내부 원본 JSON") +
        '</div>';
    }
`;
}

module.exports = { renderClientWorkflowResultScript };

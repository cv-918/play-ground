#!/usr/bin/env node
"use strict";

function renderClientGenericResultScript() {
  return `    function rawJsonDetails(value, label = "Raw JSON") {
      return '<details class="internal-links"><summary>' + esc(label) + '</summary><pre class="log-json">' + esc(JSON.stringify(value, null, 2)) + '</pre></details>';
    }
    function recordLine(item) {
      if (item === null || item === undefined) return "";
      if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") return String(item);
      if (Array.isArray(item)) return item.map(recordLine).filter(Boolean).join(", ");
      const title = item.label || item.name || item.title || item.schema || item.page_id || item.decision || item.action || item.id || item.kind || item.status || item.field || "";
      const status = item.status && item.status !== title ? " (" + item.status + ")" : "";
      const detail = item.meaning || item.purpose || item.when_to_use || item.effect || item.summary || item.ref || item.path || item.note || "";
      const extra = item.exists !== undefined ? "exists=" + (item.exists ? "yes" : "no") : "";
      return [title ? title + status : "", detail, extra].filter(Boolean).join(" - ");
    }
    function reportLines(items) {
      return asArray(items).map(recordLine).filter(Boolean);
    }
    function translateStudioMessage(message) {
      const text = String(message || "").trim();
      if (!text) return "";
      if (text.includes("Nothing was written")) return "아무 기록도 저장하지 않았습니다. Studio 기록은 변경되지 않았습니다.";
      return text;
    }
    function reportValue(report, key) {
      if (!key || typeof key !== "string") return undefined;
      return key.split(".").reduce((current, part) => {
        if (current === undefined || current === null) return undefined;
        return current[part];
      }, report);
    }
    function reportSection(title, items, emptyText = "none") {
      return '<h3>' + esc(title) + '</h3>' + compactListHtml(reportLines(items), emptyText);
    }
    function reportStatusLines(report, keys) {
      return keys.map((entry) => {
        const label = entry[0];
        const key = entry[1];
        const value = reportValue(report, key);
        if (value === undefined || value === null || value === "") return "";
        return label + ": " + String(value);
      }).filter(Boolean);
    }
    function safetySection(safety) {
      if (!safety || typeof safety !== "object") return "";
      return reportSection("Safety", Object.keys(safety).map((key) => key + ": " + (safety[key] ? "yes" : "no")));
    }
    function meaningfulMeetingItems(items) {
      return asArray(items).filter((item) => String(item || "").trim());
    }
    function meetingBoardLastTurnLine(turn) {
      if (!turn || typeof turn !== "object") return "No recorded turn yet.";
      const speaker = staffName(turn.speaker_id || "");
      const type = optionLabel(turn.turn_type || turn.type || "brief");
      const content = short(turn.content || turn.summary || "", 160);
      return [speaker, type, content].filter(Boolean).join(" - ");
    }
    function formatMeetingBoardLog(board, safety) {
      if (!board || typeof board !== "object") return "";
      const questions = asArray(board.remaining_questions);
      const concerns = asArray(board.concerns_or_blockers);
      const decisions = meaningfulMeetingItems(board.decision_candidates);
      const handoffs = meaningfulMeetingItems(board.handoff_candidates);
      const hasOpenItems = questions.length || concerns.length || decisions.length;
      const nextSpeaker = board.next_speaker_id || board.next_speaker_recommendation || "";
      const nextSpeakerLine = nextSpeaker ? staffName(nextSpeaker) : "No recommendation yet.";
      return '<div class="item good"><h3>Meeting Board</h3>' +
        '<p class="summary">' + esc(board.current_meaning || "Review meeting state and next action.") + '</p>' +
        reportSection("Current State", [
          "meeting: " + (board.meeting_id || board.topic || ""),
          "status: " + optionLabel(board.status || "draft"),
          "turns: " + (board.turn_count ?? 0),
          "last turn: " + meetingBoardLastTurnLine(board.last_turn),
          "next speaker: " + nextSpeakerLine,
        ]) +
        reportSection("Next Actions", board.director_next_actions || board.next_actions || []) +
        (hasOpenItems ? reportSection("Open Items", [...questions, ...concerns, ...decisions]) : reportSection("Open Items", ["none"])) +
        (handoffs.length ? reportSection("Follow-up Candidates", handoffs) : "") +
        safetySection(safety || board.safety) + rawJsonDetails({ meeting_board: board, safety: safety || board.safety }) + '</div>';
    }
    function formatDirectorReportLog(value) {
      if (value?.meeting_board) return formatMeetingBoardLog(value.meeting_board, value.safety || value.meeting_board.safety);
      const specs = [
        { key: "director_goal_plan", title: "Director Goal Plan", status: [["plan", "director_goal_plan_id"], ["status", "status"]], sections: [["Departments", "recommended_departments"], ["Staff", "recommended_staff"], ["Approval Items", "approval_items"], ["Constraints", "non_goals"], ["Next Actions", "next_steps"]] },
        { key: "staff_operating_plan", title: "Staff Operating Plan", status: [["agent", "agent_id"], ["department", "department_name"], ["role", "role_title"]], sections: [["Can Do", (r) => r.authority_boundary?.can_do], ["Needs Approval", (r) => r.authority_boundary?.must_request_approval_for], ["Must Not Do", (r) => r.authority_boundary?.must_not_do], ["Outputs", (r) => r.output_contract?.required_outputs], ["Evidence", (r) => r.evidence_and_quality?.required_evidence]] },
        { key: "meeting_board", title: "Meeting Board", status: [["meeting", "meeting_id"], ["status", "status"], ["next", "next_speaker_recommendation"]], sections: [["Next Actions", "next_actions"], ["Questions", "remaining_questions"], ["Concerns", "concerns_or_blockers"], ["Decision Candidates", "decision_candidates"], ["Handoff Candidates", "handoff_candidates"], ["Close Criteria", "close_criteria"], ["Director Checklist", "director_checklist"]] },
        { key: "meeting_facilitation_plan", title: "Meeting Facilitation Plan", status: [["meeting", "meeting_id"], ["status", "status"]], sections: [["Recommended Actions", "recommended_actions"], ["Decision Options", "director_decision_options"], ["Blockers", "blockers"]] },
        { key: "meeting_runbook", title: "Meeting Runbook", status: [["meeting", "meeting_id"], ["status", "status"]], sections: [["Next Turn Queue", "next_turn_queue"], ["Decision Candidates", "decision_candidates"], ["Handoff Candidates", "handoff_candidates"], ["Close Criteria", "close_criteria"], ["Blockers", "blockers"], ["Director Checklist", "director_checklist"]] },
        { key: "work_order_handoff_plan", title: "Work Order Handoff Plan", status: [["work order", "work_order_id"], ["source", "source_ref"]], sections: [["Recommended Staff", "recommended_staff"], ["Missing Items", "missing_or_weak_items"], ["Inputs", (r) => r.handoff_contract?.inputs_required], ["Outputs", (r) => r.handoff_contract?.expected_outputs], ["Approval Items", (r) => r.handoff_contract?.approval_items], ["Evidence", (r) => r.handoff_contract?.evidence_required], ["Next Actions", "next_actions"]] },
        { key: "knowledge_transition_plan", title: "Reference Record Transition", status: [["source", "source_ref"], ["kind", "source_kind"], ["category", "category"]], sections: [["Possible Actions", "possible_actions"], ["Changes If Accepted", "what_changes_if_accepted"], ["Does Not Change", "what_does_not_change"], ["Director Checklist", "director_checklist"]] },
        { key: "external_knowledge_plan_disabled", title: "External Knowledge Deferred", status: [["source", "source_ref"], ["category", "current_category"], ["recommendation", "recommended_label"]], sections: [["Meaning", (r) => [r.current_meaning]], ["Reason", (r) => [r.recommendation_reason]], ["Targets", "candidate_targets"], ["Changes", "what_changes_if_promoted"], ["Does Not Change", "what_does_not_change"], ["Director Checklist", "director_checklist"]] },
        { key: "canon_conflict_report", title: "Canon Conflict Report", status: [["proposals", "counts.proposals"], ["decisions", "counts.decisions"], ["memories", "counts.memories"]], sections: [["Conflicts", "conflicts"], ["Review Needed", "review_needed"], ["Next Actions", "next_actions"]] },
      ];
      for (const spec of specs) {
        const record = value?.[spec.key];
        if (!record || typeof record !== "object") continue;
        const statusLines = spec.status.map(([label, path]) => label + ": " + readPath(record, path)).filter((line) => !line.endsWith(": "));
        const sections = spec.sections.map(([label, pathOrFn]) => {
          const sectionValue = typeof pathOrFn === "function" ? pathOrFn(record) : readPath(record, pathOrFn);
          return reportSection(label, sectionValue);
        }).join("");
        return '<div class="item ' + (value.ok === false ? "danger" : "good") + '"><h3>' + esc(spec.title) + '</h3>' +
          '<p class="summary">' + esc(record.summary || record.current_meaning || value.summary || "Studio record rendered.") + '</p>' +
          reportSection("Target", statusLines) + sections + safetySection(value.safety || record.safety) + rawJsonDetails(value) + '</div>';
      }
      return "";
    }
    function formatMemoryLog(value) {
      const summary = value?.summary || {};
      const memoryId = value?.memory_id || summary.memory_id || "";
      const isMemoryResult = memoryId || String(value?.target_path || "").includes("MemoryRecords");
      if (!isMemoryResult) return "";
      const ok = value?.ok !== false;
      const displayTitle = ok ? "참고 기록 저장 완료" : "참고 기록 저장 실패";
      const displaySourceRefs = asArray(summary.source_refs || value?.record?.source_refs);
      const displaySafety = value?.safety || {};
      const displaySafetyLines = [
        "참고 기록 저장: " + (displaySafety.memory_written ? "yes (예)" : "no (아니오)"),
        "Backlog/task 변경: " + (displaySafety.backlog_written || displaySafety.active_task_changed ? "yes (예)" : "no (아니오)"),
        "승인/실행 변경: " + (displaySafety.approval_changed || displaySafety.runner_started ? "yes (예)" : "no (아니오)"),
        "소스/git 변경: " + (displaySafety.source_changed || displaySafety.git_changed ? "yes (예)" : "no (아니오)"),
      ];
      const displayValidationErrors = asArray(value?.validation?.errors);
      return '<div class="item ' + (ok ? "good" : "danger") + '"><h3>' + esc(displayTitle) + '</h3>' +
        '<p class="summary">' + esc(ok ? "Studio 기록함에 참고/검증 자료를 저장했습니다." : translateStudioMessage(value?.error || "참고 기록을 저장하지 못했습니다.")) + '</p>' +
        reportSection("저장한 내용", [
          memoryId ? "ID: " + memoryId : "",
          summary.status || value?.status ? "상태: " + optionLabel(summary.status || value?.status) : "",
          summary.type || value?.type ? "종류: " + optionLabel(summary.type || value?.type) : "",
          summary.owner_agent_id ? "담당: " + staffName(summary.owner_agent_id) : "",
          summary.content_preview ? "요약: " + summary.content_preview : "",
        ]) +
        reportSection("출처", displaySourceRefs, "출처 정보 없음") +
        (displayValidationErrors.length ? reportSection("확인할 오류", displayValidationErrors) : "") +
        reportSection("안전 상태", displaySafetyLines) +
        (value?.target_path ? '<p class="small muted">저장 위치: ' + esc(value.target_path) + '</p>' : "") +
        rawJsonDetails(value, "원본 JSON") +
        '</div>';
      const title = ok ? "참고 기록 저장 완료" : "참고 기록 저장 실패";
      const sourceRefs = asArray(summary.source_refs || value?.record?.source_refs);
      const safety = value?.safety || {};
      const safetyLines = [
        "참고 기록 저장: " + (safety.memory_written ? "yes (예)" : "no (아니오)"),
        "Backlog/task 변경: " + (safety.backlog_written || safety.active_task_changed ? "yes (예)" : "no (아니오)"),
        "승인/실행 변경: " + (safety.approval_changed || safety.runner_started ? "yes (예)" : "no (아니오)"),
        "소스/git 변경: " + (safety.source_changed || safety.git_changed ? "yes (예)" : "no (아니오)"),
      ];
      const validationErrors = asArray(value?.validation?.errors);
      return '<div class="item ' + (ok ? "good" : "danger") + '"><h3>' + esc(title) + '</h3>' +
        '<p class="summary">' + esc(ok ? "Studio 기록함에 참고/검증 자료를 저장했습니다." : translateStudioMessage(value?.error || "참고 기록을 저장하지 못했습니다.")) + '</p>' +
        reportSection("저장한 내용", [
          memoryId ? "ID: " + memoryId : "",
          summary.status || value?.status ? "상태: " + optionLabel(summary.status || value?.status) : "",
          summary.type || value?.type ? "종류: " + optionLabel(summary.type || value?.type) : "",
          summary.owner_agent_id ? "담당: " + staffName(summary.owner_agent_id) : "",
          summary.content_preview ? "요약: " + summary.content_preview : "",
        ]) +
        reportSection("출처", sourceRefs, "출처 정보 없음") +
        (validationErrors.length ? reportSection("확인할 오류", validationErrors) : "") +
        reportSection("안전 상태", safetyLines) +
        (value?.target_path ? '<p class="small muted">저장 위치: ' + esc(value.target_path) + '</p>' : "") +
        '</div>';
    }
    function formatWorkOrderLog(value) {
      const record = value?.work_order || value?.work_order_handoff || value?.handoff || value?.context_packet || null;
      if (!record || typeof record !== "object") return "";
      const title = record.title || record.objective || record.summary || record.reason || "Work order result";
      const lines = ["id: " + (record.work_order_id || record.handoff_id || record.context_packet_id || value.work_order_id || ""), "source: " + (record.source_ref || record.memory_query || value.source_ref || ""), "status: " + optionLabel(record.status || value.status || "")].filter((line) => !line.endsWith(": "));
      return '<div class="item ' + (value.ok === false ? "danger" : "good") + '"><h3>Work Order Result</h3>' + '<p class="summary">' + esc(title) + '</p>' + reportSection("Target", lines) + reportSection("Scope", record.approved_scope || record.scope || record.inputs_required || []) + reportSection("Constraints", record.non_goals || record.constraints || record.must_not_do || []) + reportSection("Expected Outputs", record.expected_outputs || record.required_outputs || []) + reportSection("Next Actions", record.next_actions || value.next_actions || []) + safetySection(value.safety || record.safety) + rawJsonDetails(value) + '</div>';
    }
    function formatWorkflowFinalizationFailure(value) {
      if (!value || value.ok !== false) return "";
      const text = String(value.error || value.reason || "");
      if (!/finalization|completion|task done|runner/i.test(text)) return "";
      return '<div class="item danger"><h3>Completion Failed</h3><p class="summary">' + esc(translateStudioMessage(text || "Completion failed.")) + '</p>' + reportSection("Next Actions", value.next_actions || ["Review completion card and verification material."]) + safetySection(value.safety) + rawJsonDetails(value) + '</div>';
    }
    function formatMaterializationDecisionFailure(value) {
      if (!value || value.ok !== false) return "";
      const text = String(value.error || value.reason || "");
      if (!/materialization|decision plan/i.test(text)) return "";
      return '<div class="item danger"><h3>Record Conversion Failed</h3><p class="summary">' + esc(translateStudioMessage(text || "Record conversion failed.")) + '</p>' + reportSection("Next Actions", value.next_actions || ["Check the selected record and decision type."]) + safetySection(value.safety) + rawJsonDetails(value) + '</div>';
    }
    function formatGenericLogObject(value) {
      const directorReport = formatDirectorReportLog(value);
      if (directorReport) return directorReport;
      const memoryReport = formatMemoryLog(value);
      if (memoryReport) return memoryReport;
      const workOrderReport = formatWorkOrderLog(value);
      if (workOrderReport) return workOrderReport;
      const workflowFinalizationFailure = formatWorkflowFinalizationFailure(value);
      if (workflowFinalizationFailure) return workflowFinalizationFailure;
      const materializationDecisionFailure = formatMaterializationDecisionFailure(value);
      if (materializationDecisionFailure) return materializationDecisionFailure;
      if (value?.ok === false || value?.error || value?.reason) {
        return '<div class="item danger"><h3>Command Failed</h3><p class="summary">' + esc(translateStudioMessage(value.reason || value.error || "A command failed.")) + '</p>' + rawJsonDetails(value) + '</div>';
      }
      if (value?.ok === true) {
        return '<div class="item good"><h3>Command Complete</h3><p class="summary">The action completed.</p>' + rawJsonDetails(value) + '</div>';
      }
      return '<pre class="log-json">' + esc(JSON.stringify(value, null, 2)) + '</pre>';
    }    function revealResultPanel(panel) {
      if (!panel || typeof panel.getBoundingClientRect !== "function") return;
      const rect = panel.getBoundingClientRect();
      const margin = 24;
      const belowViewport = rect.top >= 0 && rect.bottom > window.innerHeight - margin;
      if (belowViewport) panel.scrollIntoView({ behavior:"smooth", block:"nearest" });
    }
    function writeResult(html) {
      const meetingPanel = el("meetingResultPanel");
      const meetingBody = el("meetingResult");
      if ((activePage === "sessions" || activePage === "meetings") && meetingPanel && meetingBody) {
        meetingBody.innerHTML = html;
        meetingPanel.hidden = false;
        revealResultPanel(meetingPanel);
        return;
      }
      const evidenceBody = el("evidenceResult");
      if (activePage === "evidence" && evidenceBody) {
        evidenceBody.innerHTML = html;
        revealResultPanel(evidenceBody);
        return;
      }
      const globalPanel = el("globalResultPanel");
      const globalBody = el("globalResult");
      if (globalPanel && globalBody) {
        globalBody.innerHTML = html;
        globalPanel.hidden = false;
        revealResultPanel(globalPanel);
      }
    }
    const log = (value) => {
      const rendered = typeof value === "string"
        ? '<div class="log-message">' + esc(value) + '</div>'
        : formatGenericLogObject(value);
      writeResult(rendered);
    };
    function notifyTeamDataPublish(value) {
      const result = value?.toolbox_result || {};
      const publish = result.publish_summary || {};
      const ok = value?.ok === true;
      const lines = [
        ok ? "Team data publish completed." : "Team data publish failed.",
        "",
        ok
          ? "A versioned zip was uploaded and the latest manifest was updated."
          : "Upload stopped before completing the latest manifest update. Check the details below.",
      ];
      if (publish.data_version) lines.push("data version: " + publish.data_version);
      if (publish.archive_name) lines.push("archive zip: " + publish.archive_name);
      if (publish.archive_file_id) lines.push("zip file ID: " + publish.archive_file_id);
      if (publish.manifest_file_id) lines.push("latest manifest ID: " + publish.manifest_file_id);
      if (publish.backup_manifest_file_id) lines.push("backup manifest ID: " + publish.backup_manifest_file_id);
      if (publish.failure_stage) lines.push("failed stage: " + publish.failure_stage);
      if (!ok && result.exit_code !== undefined) lines.push("exit code: " + result.exit_code);
      if (!ok && !publish.failure_stage) {
        const message = value?.error || value?.message || result.summary || "Open the generated log for details.";
        lines.push("reason: " + message);
      }
      if (publish.log_path) {
        lines.push("");
        lines.push("log: " + publish.log_path);
      }
      lines.push("");
      lines.push("The detailed result is also shown in the Studio result panel.");
      alert(lines.join("\\n"));
    }
    async function api(path, options) {
      const res = await fetch(path, options);
      const json = await res.json();
      if (!res.ok || json.ok === false) throw json;
      return json;
    }
    function post(path, body) {
      return api(path, { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify(body || {}) });
    }
    function metric(label, value) {
      return '<div class="card metric-card"><div class="metric-label">' + esc(label) + '</div><div class="metric">' + esc(value) + '</div></div>';
    }
    function button(label, action, filePath, className = "secondary", extra = "") {
      return '<button class="' + esc(className) + '" data-action="' + esc(action) + '" data-path="' + esc(filePath) + '" ' + extra + '>' + esc(label) + '</button>';
    }
    function link(label, href) {
      return href ? '<a href="' + esc(href) + '" target="_blank">' + esc(label) + '</a>' : "";
    }
    function short(text, max = 180) {
      const clean = String(text || "").replace(/\\s+/g, " ").trim();
      return clean.length > max ? clean.slice(0, max - 3).trimEnd() + "..." : clean;
    }
    function asArray(value) {
      return Array.isArray(value) ? value.filter(Boolean) : [];
    }
    function internalLinksHtml(links, label = "Internal links") {
      const visibleLinks = asArray(links).filter(Boolean);
      if (!visibleLinks.length) return "";
      return '<details class="internal-links"><summary>' + esc(label) + '</summary><div class="row">' + visibleLinks.join("") + '</div></details>';
    }
    function actionsHtml(items, className = "action-row primary") {
      const visibleItems = asArray(items).filter(Boolean);
      return visibleItems.length ? '<div class="' + esc(className) + '">' + visibleItems.join("") + '</div>' : "";
    }
    function listHtml(items, emptyText = "") {
      const allValues = asArray(items);
      const values = allValues.slice(0, 4);
      if (!values.length) return emptyText ? '<p class="small muted">' + esc(emptyText) + '</p>' : "";
      const more = allValues.length > values.length ? '<li>+' + esc(allValues.length - values.length) + '개 더 있음</li>' : "";
      return '<ul class="small">' + values.map((item) => '<li>' + esc(short(item, 110)) + '</li>').join("") + more + '</ul>';
    }
    function inlineList(items, emptyText = "-") {
      const values = asArray(items);
      return values.length ? values.slice(0, 3).join(", ") + (values.length > 3 ? " +" + (values.length - 3) : "") : emptyText;
    }    function selectedGitFiles() {
      return Array.from(new Set(Array.from(document.querySelectorAll('input[data-git-file]:checked')).map((input) => input.dataset.gitFile)));
    }
    function isWorkflowPath(filePath) {
      return String(filePath || "").startsWith("_Docs/AIWorkflow/") || String(filePath || "").startsWith("tools/aiworkflow/");
    }
    function filePurpose(filePath) {
      const value = String(filePath || "");
      if (!value) return "파일 경로를 알 수 없습니다.";
      if (value.includes("_Docs/AIWorkflow/Backlog.md")) return "작업 목록 상태 파일입니다. task 상태 변경이 의도한 것인지 확인하세요.";
      if (value.includes("_Docs/AIWorkflow/ActiveTask.md")) return "현재 선택된 작업 상태 파일입니다. 완료/진행 상태 변경을 특히 조심해서 봐야 합니다.";
      if (value.includes("_Docs/AIWorkflow/")) return "AIWorkflow 문서나 Studio 운영 정책 파일입니다.";
      if (value.includes("PlayGround/Data/")) return "게임 데이터 파일입니다. 데이터 변경 범위와 로더 검증이 맞는지 확인하세요.";
      if (value.includes("PlayGround/Project/")) return "게임 소스 파일입니다. 런타임 동작과 빌드 검증이 필요할 수 있습니다.";
      if (value.includes("tools/")) return "로컬 워크플로우 또는 Studio 도구 파일입니다.";
      return "저장소 파일입니다. 이번 작업 범위에 속하는지 확인하세요.";
    }
    function explainConcern(text) {
      const value = String(text || "");
      const failed = value.match(/failed or cancelled session\(s\):\s*(.+)$/i);
      if (failed) return "이전 실행 세션이 실패했거나 취소됐습니다. 완료로 받기 전에 어떤 실행이었는지 확인해야 합니다.";
      const outside = value.match(/outside expected task category:\s*(.+)$/i);
      if (outside) return "예상 작업 범위 밖 파일 변경 신호가 있습니다. 이 파일이 정말 이번 작업에 필요한지 확인해야 합니다.";
      if (/mixed/i.test(value)) return "성공/실패 신호가 섞여 있습니다. 완료 여부를 사람이 판단해야 합니다.";
      return value;
    }
    function translateConcernDetail(text) {
      const value = String(text || "");
      const failed = value.match(/failed or cancelled session\(s\):\s*(.+)$/i);
      if (failed) return "실패/취소된 실행: " + failed[1] + ". 이 실행이 무엇을 검증하던 것인지, 실패가 현재 완료 판단에 영향을 주는지 확인하세요.";
      const outside = value.match(/outside expected task category:\s*(.+)$/i);
      if (outside) return "파일: " + outside[1] + " - " + filePurpose(outside[1]);
      if (/observed exit state is mixed/i.test(value)) return "일부 실행은 성공했고 일부 실행은 실패/취소됐습니다. 완료 처리 전에 실패한 실행이 중요한지 확인하세요.";
      return value;
    }
    function translateCompletionSummary(text) {
      const value = String(text || "");
      if (/Verification reported concerns/i.test(value)) return "검증에서 우려 사항이 보고됐습니다. 완료 처리 전에 Human Director 판단이 필요합니다.";
      if (/Verification passed/i.test(value)) return "검증이 통과했습니다. 완료로 받을지 검토할 수 있습니다.";
      if (/Completion review can proceed/i.test(value)) return "완료 검토를 진행할 수 있습니다.";
      return value;
    }
`;
}

module.exports = { renderClientGenericResultScript };

#!/usr/bin/env node
"use strict";

function renderClientGenericResultScript() {
  return `    function rawJsonDetails(value) {
      return '<details class="internal-links"><summary>원본 JSON</summary><pre class="log-json">' + esc(JSON.stringify(value, null, 2)) + '</pre></details>';
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
      const invalidOutput = text.match(/^Invalid output_id:\s*(.+)$/);
      if (invalidOutput) return "보고서 ID 형식이 현재 규칙과 맞지 않습니다: " + invalidOutput[1];
      const invalidRoleRun = text.match(/^Invalid role_run_id:\s*(.+)$/);
      if (invalidRoleRun) return "직원 실행 ID 형식이 현재 규칙과 맞지 않습니다: " + invalidRoleRun[1];
      if (text.includes("Output has no materializable proposals")) {
        return "이 보고서에는 채택 후보로 넘길 아이디어 제안, 프로젝트 기억, 업무 지시, 직원 인수인계가 없습니다.";
      }
      if (text.includes("RoleRunOutput validation failed")) {
        return "직원 보고서 검증에 실패해서 아무것도 저장하지 않았습니다.";
      }
      if (text.includes("RoleRunOutput has no adoption candidates")) {
        return "채택 후보가 없어 아무것도 저장하지 않았습니다.";
      }
      if (text.includes("Target materialization records already exist")) {
        return "이미 같은 채택 후보가 있어서 새로 저장하지 않았습니다.";
      }
      if (text.includes("Nothing was written")) {
        return text.replace("Nothing was written.", "아무것도 저장하지 않았습니다.");
      }
      return text;
    }
    function reportValue(report, key) {
      if (!key || typeof key !== "string") return undefined;
      return key.split(".").reduce((current, part) => {
        if (current === undefined || current === null) return undefined;
        return current[part];
      }, report);
    }
    function reportSection(title, items, emptyText = "없음") {
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
      return reportSection("안전 상태", Object.keys(safety).map((key) => key + ": " + (safety[key] ? "yes" : "no")));
    }
    function meaningfulMeetingItems(items) {
      return asArray(items).filter((item) => {
        const value = String(item || "");
        return value && !value.includes("즉시 판단할 제안/우려/질문이 없습니다");
      });
    }
    function meetingBoardLastTurnLine(turn) {
      if (!turn || typeof turn !== "object") return "아직 기록된 발언이 없습니다.";
      const speaker = staffName(turn.speaker_id || "");
      const type = optionLabel(turn.turn_type || turn.type || "brief");
      const content = short(turn.content || turn.summary || "", 160);
      return [speaker, type, content].filter(Boolean).join(" · ");
    }
    function formatMeetingBoardLog(board, safety) {
      if (!board || typeof board !== "object") return "";
      const questions = asArray(board.remaining_questions);
      const concerns = asArray(board.concerns_or_blockers);
      const decisions = meaningfulMeetingItems(board.decision_candidates);
      const handoffs = meaningfulMeetingItems(board.handoff_candidates);
      const hasOpenItems = questions.length || concerns.length || decisions.length;
      const nextSpeaker = board.next_speaker_id || board.next_speaker_recommendation || "";
      const nextSpeakerLine = nextSpeaker
        ? staffName(nextSpeaker) + (board.next_speaker_reason ? " - " + short(board.next_speaker_reason, 120) : "")
        : "추천 발언자가 아직 없습니다.";
      const safetyLines = [
        "읽기 전용: 이 버튼은 자문 기록, task, git을 바꾸지 않습니다.",
        safety?.read_only || board.safety?.read_only ? "검토용 카드입니다." : "상태 변경 가능성이 있으면 별도 버튼에서 다시 확인합니다.",
      ];
      return '<div class="item good">' +
        '<h3>자문판</h3>' +
        '<p class="summary">' + esc(board.current_meaning || "자문 상태와 다음 행동을 확인합니다.") + '</p>' +
        reportSection("지금 상황", [
          "자문: " + (board.meeting_id || board.topic || ""),
          "상태: " + optionLabel(board.status || "draft"),
          "발언 수: " + (board.turn_count ?? 0) + "개",
          "마지막 발언: " + meetingBoardLastTurnLine(board.last_turn),
          "다음 추천: " + nextSpeakerLine,
        ]) +
        reportSection("다음에 누를 것", board.director_next_actions || board.next_actions || []) +
        (hasOpenItems
          ? reportSection("남은 쟁점", [
              ...questions.map((item) => "질문: " + item),
              ...concerns.map((item) => "우려/막힘: " + item),
              ...decisions.map((item) => "판단 후보: " + item),
            ])
          : reportSection("남은 쟁점", ["남은 질문, 우려, 즉시 판단할 제안이 없습니다."])) +
        (handoffs.length ? reportSection("후속 업무 후보", handoffs) : reportSection("후속 업무 후보", ["후속 업무로 넘길 내용이 아직 명확하지 않습니다."])) +
        reportSection("종료 전 확인", board.close_checklist || [
          "핵심 역할이 필요한 관점을 냈는지 확인합니다.",
          "결정할 내용과 후속 업무로 넘길 내용을 분리합니다.",
          "공식 설정/canon 또는 구현 task로 확정하지 않았는지 확인합니다.",
        ]) +
        reportSection("안전 상태", safetyLines) +
        rawJsonDetails({ meeting_board: board, safety: safety || board.safety }) +
        '</div>';
    }
    function formatDirectorReportLog(value) {
      if (value?.meeting_board) return formatMeetingBoardLog(value.meeting_board, value.safety || value.meeting_board.safety);
      const specs = [
        {
          key: "director_goal_plan",
          title: "Director Brief",
          status: [["plan", "director_goal_plan_id"], ["상태", "status"]],
          sections: [
            ["추천 부서", "recommended_departments"],
            ["추천 직원", "recommended_staff"],
            ["승인할 때 볼 것", "approval_items"],
            ["안전 경계", "non_goals"],
            ["다음 행동", "next_steps"],
          ],
        },
        {
          key: "staff_operating_plan",
          title: "AI 직원 운영 계획",
          status: [["직원", "agent_id"], ["부서", "department_name"], ["직책", "role_title"]],
          sections: [
            ["할 수 있는 일", (r) => r.authority_boundary?.can_do],
            ["승인 필요한 일", (r) => r.authority_boundary?.must_request_approval_for],
            ["하지 않는 일", (r) => r.authority_boundary?.must_not_do],
            ["필수 산출물", (r) => r.output_contract?.required_outputs],
            ["검증 자료/품질 기준", (r) => r.evidence_and_quality?.required_evidence],
          ],
        },
        {
          key: "meeting_board",
          title: "자문판",
          status: [["자문", "meeting_id"], ["상태", "status"], ["다음 발언자", "next_speaker_recommendation"]],
          sections: [
            ["다음 행동", "next_actions"],
            ["남은 질문", "remaining_questions"],
            ["우려/막는 항목", "concerns_or_blockers"],
            ["판단 후보", "decision_candidates"],
            ["후속 업무 후보", "handoff_candidates"],
            ["자문 종료 기준", "close_criteria"],
            ["감독자 체크리스트", "director_checklist"],
          ],
        },
        {
          key: "meeting_facilitation_plan",
          title: "자문 진행안",
          status: [["자문", "meeting_id"], ["상태", "status"], ["다음 발언자", "next_speaker_recommendation"]],
          sections: [
            ["추천 행동", "recommended_actions"],
            ["감독자 선택지", "director_decision_options"],
            ["막는 항목", "blockers"],
          ],
        },
        {
          key: "meeting_runbook",
          title: "자문 운영판",
          status: [["자문", "meeting_id"], ["상태", "status"]],
          sections: [
            ["다음 발언 순서", "next_turn_queue"],
            ["판단 후보", "decision_candidates"],
            ["인수인계 후보", "handoff_candidates"],
            ["닫기 기준", "close_criteria"],
            ["막는 항목", "blockers"],
            ["감독자 체크리스트", "director_checklist"],
          ],
        },
        {
          key: "work_order_handoff_plan",
          title: "업무 인수인계 점검",
          status: [["업무", "work_order_id"], ["출처", "source_ref"]],
          sections: [
            ["추천 담당 직원", "recommended_staff"],
            ["빠지거나 약한 항목", "missing_or_weak_items"],
            ["필수 입력", (r) => r.handoff_contract?.inputs_required],
            ["기대 산출물", (r) => r.handoff_contract?.expected_outputs],
            ["승인 항목", (r) => r.handoff_contract?.approval_items],
            ["필수 검증 자료", (r) => r.handoff_contract?.evidence_required],
            ["다음 행동", "next_actions"],
          ],
        },
        {
          key: "knowledge_transition_plan",
          title: "기록 전환 계획",
          status: [["대상", "source_ref"], ["종류", "source_kind"], ["분류", "category"]],
          sections: [
            ["가능한 행동", "possible_actions"],
            ["받아들이면 바뀌는 것", "what_changes_if_accepted"],
            ["바뀌지 않는 것", "what_does_not_change"],
            ["감독자 체크리스트", "director_checklist"],
          ],
        },
        {
          key: "wiki_promotion_plan",
          title: "Wiki 승격 계획",
          status: [["대상", "source_ref"], ["현재 위치", "current_category"], ["추천", "recommended_label"]],
          sections: [
            ["현재 의미", (r) => [r.current_meaning]],
            ["추천 이유", (r) => [r.recommendation_reason]],
            ["다른 후보", "candidate_targets"],
            ["승격하면 바뀌는 것", "what_changes_if_promoted"],
            ["바뀌지 않는 것", "what_does_not_change"],
            ["감독자 체크리스트", "director_checklist"],
          ],
        },
        {
          key: "canon_conflict_report",
          title: "공식 설정 충돌 점검",
          status: [["제안", "counts.proposals"], ["결정", "counts.decisions"], ["기억", "counts.memories"]],
          sections: [
            ["결정 필요한 항목", "needs_director_decision"],
            ["근거가 약한 공식 설정", "canon_records_missing_decision_evidence"],
            ["겹침 신호", "possible_overlap_signals"],
            ["다음 행동", "recommended_actions"],
          ],
        },
        {
          key: "project_execution_plan",
          title: "프로젝트 실행 준비 점검",
          status: [["project", "project_id"], ["profile", "active_profile_path"]],
          sections: [
            ["검증 프로필", "available_validation_profiles"],
            ["빌드 프로필", "available_build_profiles"],
            ["사용 가능한 도구", "available_tool_adapters"],
            ["승인 필요한 도구", "human_approval_required_for"],
            ["빠지거나 약한 항목", "missing_or_weak_items"],
            ["준비 확인", "ready_to_run_checks"],
            ["다음 행동", "recommended_next_actions"],
          ],
        },
        {
          key: "model_routing_plan",
          title: "모델 라우팅 계획",
          status: [["task", "task_id"], ["route", "selected_route.route"]],
          sections: [
            ["라우팅 규칙", "route_rules"],
            ["권한 gate", "permission_gates"],
            ["어댑터 요약", "adapter_summary"],
          ],
        },
        {
          key: "completion_evidence_checklist",
          title: "완료 근거 점검",
          status: [["task", "task_id"], ["runner", "runner_run_id"], ["verdict", "verdict"], ["완료 판단 가능", "ready_to_decide"]],
          sections: [
            ["확인할 것", "evidence_items"],
            ["빠진 근거", "missing_items"],
            ["우려/경고", (r) => [...asArray(r.concerns_to_review), ...asArray(r.warnings_to_review)]],
            ["다음 행동", "recommended_next_actions"],
          ],
        },
        {
          key: "completion_decision_plan",
          title: "완료 판단안",
          status: [["task", "task_id"], ["runner", "runner_run_id"], ["verdict", "verdict"], ["추천 판단", "recommended_decision"]],
          sections: [
            ["선택지", "decision_options"],
            ["우려/경고", (r) => [...asArray(r.concerns_to_review), ...asArray(r.warnings_to_review)]],
            ["판단 전 확인", "director_checklist"],
          ],
        },
        {
          key: "approval_impact_plan",
          title: "승인 영향 점검",
          status: [["task", "task_id"], ["승인 필요", "approval_required"]],
          sections: [
            ["왜 필요한가", "why_approval_is_or_is_not_required"],
            ["승인하면 허용되는 것", "approving_allows"],
            ["승인하지 않는 것", "approving_does_not_allow"],
            ["승인 후 바뀌는 것", "what_changes_after_approval"],
            ["판단 전 확인", "director_checklist"],
          ],
        },
        {
          key: "automation_readiness_plan",
          title: "자동 진행 준비도",
          status: [["task", "task_id"], ["자동 handoff", "can_auto_handoff"], ["자동 완료", "can_auto_finalize"], ["자동 commit/push", "can_auto_commit_or_push"]],
          sections: [
            ["막는 이유", "blockers"],
            ["자동 허용 후보", "allowed_auto_steps"],
            ["항상 사람 판단", "always_human_steps"],
            ["다음 행동", "recommended_next_actions"],
          ],
        },
        {
          key: "director_surface_map",
          title: "Studio 화면 목록 점검",
          status: [["전체 화면", "total_surfaces"], ["사용자 화면", "human_director_surfaces"], ["내부 화면", "internal_surfaces"]],
          sections: [
            ["사용자 화면", "director_surfaces"],
            ["내부/관리자 화면", "internal_admin_surfaces"],
            ["제품 규칙", "product_rules"],
          ],
        },
        {
          key: "traceability_map",
          title: "추적 지도",
          status: [["task", "task_id"], ["제목", "task_title"]],
          sections: [
            ["연결된 자료", "linked_refs"],
            ["빠진 연결", "missing_links"],
            ["다음 행동", "recommended_next_actions"],
          ],
        },
        {
          key: "studio_recovery_plan",
          title: "복구 점검",
          status: [["상태", "health"], ["재시작 명령", "safe_restart_command"]],
          sections: [
            ["확인된 문제", "issues"],
            ["복구 순서", "recovery_steps"],
          ],
        },
        {
          key: "studio_eval_plan",
          title: "Smoke 계획",
          status: [["plan", "studio_eval_plan_id"]],
          sections: [
            ["자동 확인", "automated_checks"],
            ["브라우저 확인 경로", "browser_smoke_routes"],
            ["사람 확인", "manual_director_checks"],
            ["통과 기준", "pass_criteria"],
          ],
        },
        {
          key: "studio_smoke_report",
          title: "Studio 점검",
          status: [["report", "studio_smoke_report_id"], ["생성 시각", "generated_at"]],
          sections: [
            ["경고", "warnings"],
            ["스키마 확인", "schema_checks"],
            ["화면 확인", "console_pages"],
            ["수동 smoke", "recommended_manual_smoke"],
          ],
        },
      ];
      for (const spec of specs) {
        const report = value[spec.key];
        if (!report || typeof report !== "object") continue;
        const summary = report.current_meaning || report.summary || report.overall_label || spec.title;
        const statusLines = reportStatusLines(report, spec.status || []);
        const sections = (spec.sections || []).map((section) => {
          const title = section[0];
          const accessor = section[1];
          const items = typeof accessor === "function" ? accessor(report) : reportValue(report, accessor);
          return reportSection(title, items);
        }).join("");
        const hasAttention = asArray(report.blockers).length
          || asArray(report.missing_items).length
          || asArray(report.missing_or_weak_items).length
          || asArray(report.issues).length
          || asArray(report.warnings).length
          || asArray(report.concerns_to_review).length
          || asArray(report.canon_records_missing_decision_evidence).length;
        return '<div class="item ' + (hasAttention ? "warn" : "good") + '">' +
          '<h3>' + esc(spec.title) + '</h3>' +
          '<p class="summary">' + esc(summary) + '</p>' +
          (statusLines.length ? reportSection("현재 상태", statusLines) : "") +
          sections +
          safetySection(value.safety || report.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      return "";
    }
    function formatWorkOrderLog(value) {
      if (value?.work_order_handoff_plan) {
        const plan = value.work_order_handoff_plan || {};
        const contract = plan.handoff_contract || {};
        return '<div class="item good"><h3>인수인계 점검</h3>' +
          '<p class="summary">이 업무 지시가 AI 직원이나 작업 목록으로 넘어가도 되는지, 빠진 정보가 있는지 먼저 확인했습니다. 아직 실행, task 생성, git 변경은 하지 않았습니다.</p>' +
          reportSection("현재 업무", [
            "업무: " + (plan.work_order_id || ""),
            "의미: " + (plan.current_meaning || plan.objective || ""),
            "대상 부서: " + optionLabel(plan.target_department || ""),
            "추천 직원: " + asArray(plan.recommended_staff).map(staffName).join(", "),
          ]) +
          reportSection("넘길 때 필요한 내용", [
            ...(asArray(contract.expected_inputs).map((item) => "입력: " + item)),
            ...(asArray(contract.expected_outputs).map((item) => "결과물: " + item)),
            ...(asArray(contract.approval_items).map((item) => "승인 판단: " + item)),
          ]) +
          reportSection("보강이 필요한 항목", plan.missing_or_weak_items || [], "보강이 필요한 항목이 없습니다.") +
          reportSection("다음 행동", plan.next_actions || []) +
          safetySection(value.safety || plan.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.command === "store" && value?.work_order_id) {
        const written = value?.safety?.workorder_written === true || value?.execute === true;
        return '<div class="item ' + (written ? "good" : "warn") + '"><h3>업무 지시 저장 완료</h3>' +
          '<p class="summary">' + esc(written ? "수정이나 후속 작업으로 이어갈 업무 지시를 만들었습니다. 아직 구현, task 생성, commit/push는 하지 않았습니다." : "업무 지시 저장 계획을 확인했습니다.") + '</p>' +
          reportSection("생성된 업무", [
            "업무 지시: " + value.work_order_id,
            "저장 위치: " + (value.target_path || ""),
          ]) +
          reportSection("다음 행동", [
            "업무 지시 화면에서 내용을 확인하세요.",
            "범위가 맞으면 인수인계 점검이나 작업 생성 계획을 확인한 뒤 다음 gate로 넘기세요.",
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value, "내부 원본 JSON") +
          '</div>';
      }
      if (value?.context_packet && !value?.staff_plan && !value?.task_draft) {
        const packet = value.context_packet || {};
        return '<div class="item good"><h3>직원 자료 미리보기</h3>' +
          '<p class="summary">AI 직원에게 전달될 목표, 할 일, 제약 조건, 참고 근거를 미리 묶어 본 것입니다. 직원 실행은 아직 시작하지 않았습니다.</p>' +
          reportSection("전달 대상", [
            "직원: " + staffName(packet.agent_id || value.agent_id || ""),
            "부서: " + optionLabel(packet.department_id || ""),
            "출처: " + (packet.source_ref || ""),
          ]) +
          reportSection("직원이 받는 일", [
            "목표: " + (packet.objective || ""),
            ...asArray(packet.approved_scope).map((item) => "할 일: " + item),
            ...asArray(packet.non_goals).map((item) => "제약 조건: " + item),
          ]) +
          reportSection("참고 근거", [
            "공식 설정: " + asArray(packet.memory_context?.canon_refs).length + "개",
            "승인 결정: " + asArray(packet.memory_context?.approved_decision_refs).length + "개",
            "검증 자료: " + asArray(packet.memory_context?.evidence_refs).length + "개",
          ]) +
          safetySection(value.safety || packet.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.staff_plan) {
        const plan = value.staff_plan || {};
        const packet = value.context_packet || {};
        return '<div class="item warn"><h3>직원 실행 계획</h3>' +
          '<p class="summary">AI 직원 실행을 시작하기 전에 모델, 권한, 전달 자료를 확인하는 계획입니다. 이 화면은 계획만 보여주며 실행은 별도 버튼에서만 시작됩니다.</p>' +
          reportSection("실행 대상", [
            "직원: " + staffName(plan.agent_id || packet.agent_id || ""),
            "역할 실행: " + (plan.role_run_id || packet.role_run_id || ""),
            "문맥 묶음: " + (plan.context_packet_id || packet.context_packet_id || ""),
          ]) +
          reportSection("실행 설정", [
            "모델: " + (plan.model || ""),
            "추론 강도: " + (plan.reasoning || ""),
            "제공자: " + (plan.provider_policy || ""),
            "명령: " + short([plan.resolved_codex_command || plan.codex_command, ...(plan.planned_args || [])].filter(Boolean).join(" "), 220),
          ]) +
          reportSection("다음 행동", [
            "계획이 맞으면 직원에게 맡기기를 눌러 실행합니다.",
            "범위가 애매하면 업무 지시를 고친 뒤 다시 계획을 확인합니다.",
          ]) +
          safetySection(value.safety || plan.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.task_draft) {
        const draft = value.task_draft || {};
        return '<div class="item good"><h3>작업 생성 계획</h3>' +
          '<p class="summary">이 업무 지시를 AIWorkflow 작업 목록에 넣으면 어떤 task 초안이 생길지 미리 보여줍니다. 아직 Backlog에는 쓰지 않았습니다.</p>' +
          reportSection("생성될 작업 초안", [
            "제목: " + (draft.title || ""),
            "분류: " + (draft.category || ""),
            "종류: " + (draft.kind || ""),
            "우선순위/위험도: " + [draft.priority, draft.suggested_risk].filter(Boolean).join(" / "),
            "Workflow: " + (draft.workflow_path || ""),
          ]) +
          reportSection("승인 판단", draft.human_decision_gates || []) +
          reportSection("필수 검증", draft.required_validation || []) +
          reportSection("다음 행동", [
            draft.suggested_next_manual_action || "내용이 맞으면 작업 목록에 넣기를 눌러 Backlog task로 만듭니다.",
            "이 계획 자체는 승인, 실행, 완료, commit/push를 하지 않습니다.",
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      return "";
    }
    function formatGenericLogObject(value) {
      if (value?.company_runtime_readiness_report || value?.company_runtime || value?.gates?.some?.((gate) => gate.id && String(gate.id).includes("runtime"))) {
        const formatted = formatCompanyRuntimeReadinessLog(value);
        if (formatted) return formatted;
      }
        const directorReport = formatDirectorReportLog(value);
        if (directorReport) return directorReport;
      const workOrderReport = formatWorkOrderLog(value);
      if (workOrderReport) return workOrderReport;
      const workflowFinalizationFailure = formatWorkflowFinalizationFailure(value);
      if (workflowFinalizationFailure) return workflowFinalizationFailure;
      const materializationDecisionFailure = formatMaterializationDecisionFailure(value);
      if (materializationDecisionFailure) return materializationDecisionFailure;
      if (value?.command === "decision-create-memory" && value?.ok === false) {
        return '<div class="item danger"><h3>참고 기록 저장 실패</h3>' +
          '<p class="summary">이 판단 기록은 대상 ID가 비어 있어 참고 기록으로 저장할 수 없습니다. 아무것도 저장하지 않았습니다.</p>' +
          reportSection("대상", [
            "결정: " + (value.decision_id || ""),
            "판단: " + optionLabel(value.decision_type || ""),
            "요약: " + (value.summary || ""),
          ]) +
          reportSection("왜 실패했나", value.validation?.errors || [translateStudioMessage(value.error || "저장할 수 없는 판단 기록입니다.")]) +
          reportSection("다음 행동", [
            "대상이 명확한 제안/결정에서 다시 저장하세요.",
            "오래된 테스트 기록이면 읽고 넘어가거나 정리 대상으로 보면 됩니다.",
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value, "내부 원본 JSON") +
          '</div>';
      }
      if (value?.command === "wiki-inbox-create") {
        return '<div class="item ' + (value.ok ? "good" : "danger") + '"><h3>' + esc(value.ok ? "Wiki Inbox 저장 완료" : "Wiki Inbox 저장 실패") + '</h3>' +
          '<p class="summary">' + esc(value.ok
            ? "나중에 AI Librarian이 정리할 수 있도록 Studio Wiki Inbox에 임시 기록을 남겼습니다. 공식 결정, 공식 설정, task, git은 바뀌지 않습니다."
            : "Wiki Inbox에 저장하지 못했습니다. 아래 오류를 확인하세요.") + '</p>' +
          reportSection("저장 대상", [
            "기록: " + (value.wiki_inbox_id || ""),
            "제목: " + (value.title || ""),
            "출처: " + (value.source || ""),
          ]) +
          reportSection("다음 행동", value.ok ? [
            "LLM Wiki 현황 또는 Wiki 문서 목록에서 방금 저장한 Inbox 항목을 확인하세요.",
            "공식 설정이나 결정으로 쓰려면 별도 승격/판단 과정을 거쳐야 합니다.",
          ] : [
            translateStudioMessage(value.error || "저장 오류가 발생했습니다."),
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value, "내부 원본 JSON") +
          '</div>';
      }
      if (value?.data?.finalization_log_id || value?.data?.finalization_state || value?.command === "request-changes") {
        const data = value.data || {};
        const decision = data.final_decision || data.decision || value.decision || value.command || "";
        const decisionLabel = optionLabel(decision);
        const taskId = data.task_id || data.approval_record?.task_id || "";
        const finalizationState = data.finalization_state || "";
        const cardClass = decision === "request_changes" || decision === "request-changes" ? "warn" : value.ok ? "good" : "danger";
        const decisionMeaning = {
          accept: "완료 결과를 받아들였다는 기록을 남겼습니다.",
          "accept-concerns": "남은 우려를 확인했고 감수한다는 기록을 남겼습니다.",
          request_changes: "이 작업은 완료하지 않고, 수정이 필요하다는 기록을 남겼습니다.",
          "request-changes": "이 작업은 완료하지 않고, 수정이 필요하다는 기록을 남겼습니다.",
          reject: "이번 결과를 받아들이지 않는다는 기록을 남겼습니다.",
          defer: "지금은 완료 판단을 미룬다는 기록을 남겼습니다.",
        }[decision] || "감독자 최종 판단 기록을 남겼습니다.";
        const nextActions = decision === "request_changes" || decision === "request-changes"
          ? [
              "수정해야 할 내용을 새 업무 지시나 후속 작업으로 정리하세요.",
              "수정 작업을 다시 실행한 뒤 완료 보고서를 새로 확인하세요.",
              "아직 task done, commit, push는 하지 않습니다.",
            ]
          : [
              "결과를 다시 확인하고 필요하면 작업 완료나 커밋/푸시 결정을 진행하세요.",
              "이 기록만으로 commit/push는 실행되지 않습니다.",
            ];
        return '<div class="item ' + cardClass + '"><h3>감독자 최종 판단 기록 완료</h3>' +
          '<p class="summary">' + esc(decisionMeaning) + '</p>' +
          reportSection("대상", [
            "작업: " + taskId,
            "판단: " + decisionLabel,
            "상태: " + optionLabel(finalizationState),
          ]) +
          reportSection("생성된 기록", [
            "FinalizationLog: " + (data.finalization_log_id || ""),
            "ApprovalHistory: " + (data.approval_record_id || data.approval_record?.approval_record_id || ""),
            "진행 이벤트: " + (data.latest_progress_event_id || ""),
          ]) +
          reportSection("다음 행동", nextActions) +
          safetySection({
            task_done: !!data.task_done,
            runner_continue: !!data.runner_continue,
            commit_push: false,
          }) +
          rawJsonDetails(value, "내부 원본 JSON") +
          '</div>';
      }
      if (value?.command === "create" && (value?.memory_id || value?.summary?.memory_id)) {
        const summary = value.summary || {};
        const validation = value.validation || {};
        const written = value.safety?.memory_written;
        return '<div class="item ' + (value.ok ? "good" : "danger") + '"><h3>' + esc(value.ok ? "참고 기록 저장 완료" : "참고 기록 저장 실패") + '</h3>' +
          '<p class="summary">' + esc(value.ok
            ? "AI 직원이 이후 작업에서 참고할 기록을 저장했습니다. 이 작업은 소스, task, commit/push를 바꾸지 않습니다."
            : "참고 기록으로 저장하지 못했습니다. 아래 검증 오류를 확인하세요.") + '</p>' +
          reportSection("저장 대상", [
            "기록: " + (summary.memory_id || value.memory_id || ""),
            "상태: " + optionLabel(summary.status || validation.status || ""),
            "범위: " + optionLabel(summary.scope || validation.scope || ""),
            "종류: " + optionLabel(summary.type || validation.type || ""),
            "담당: " + staffName(summary.owner_agent_id || ""),
          ]) +
          reportSection("내용", [summary.content_preview || ""], "내용 미리보기가 없습니다.") +
          reportSection("문제", validation.errors || [], "저장 전 검증 오류는 없습니다.") +
          reportSection("다음 행동", [
            written ? "참고 기록 / 공식 설정 목록에서 방금 저장한 기록을 확인하세요." : "아직 저장되지 않은 dry-run 또는 실패 결과입니다.",
            "공식 설정으로 확정하려면 게임 설정 후보에 대한 공식 설정 검토 기록을 거쳐야 합니다.",
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value, "내부 원본 JSON") +
          '</div>';
      }
      if (value?.command === "create-decision" && value?.record?.decision_id) {
        const record = value.record;
        const written = value.safety?.decision_written;
        return '<div class="item ' + (value.ok ? "good" : "danger") + '"><h3>감독자 판단 기록 완료</h3>' +
          '<p class="summary">제안이나 자문, 업무 지시에 대한 Human Director 판단을 기록했습니다. 이 작업은 구현, task 실행, commit/push를 하지 않습니다.</p>' +
          reportSection("기록 대상", [
            "결정: " + (record.decision_id || ""),
            "대상: " + (record.target_ref || ""),
            "판단: " + optionLabel(record.decision_type || ""),
            "요약: " + (record.decision_summary || ""),
          ]) +
          reportSection("이 판단으로 허용한 것", record.accepted_scope || [], "따로 적힌 허용 범위가 없습니다.") +
          reportSection("아직 허용하지 않는 것 / 조건", [...asArray(record.rejected_scope), ...asArray(record.conditions)], "따로 적힌 제한 조건이 없습니다.") +
          reportSection("다음 행동", [
            written ? "결정 기록 목록에서 방금 만든 판단을 확인하세요." : "아직 저장되지 않은 dry-run 결과입니다.",
            "필요하면 이 판단을 참고 기록 또는 공식 설정 후보로 넘길 수 있습니다.",
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.command === "create-proposal" && value?.record?.proposal_id) {
        const record = value.record;
        return '<div class="item ' + (value.ok ? "good" : "danger") + '"><h3>제안 저장 완료</h3>' +
          '<p class="summary">제안을 제안함에 저장했습니다. 제안은 아직 승인, 공식 설정, 구현 지시가 아닙니다.</p>' +
          reportSection("저장된 제안", [
            "제안: " + (record.proposal_id || ""),
            "제목: " + (record.title || ""),
            "출처: " + staffName(record.source_agent_id || ""),
            "상태: " + optionLabel(record.status || ""),
          ]) +
          reportSection("다음 행동", [
            "제안함에서 내용을 읽고 채택, 수정 요청, 반려 중 하나로 판단하세요.",
            "게임 설정 후보일 때만 공식 설정 검토 기록을 사용하세요.",
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.command === "export" && value?.output_path) {
        return '<div class="item good"><h3>직원 보고서 보기 자료 생성</h3>' +
          '<p class="summary">직원 실행 결과를 사람이 읽기 좋은 HTML 검토 자료로 만들었습니다. 이 작업은 소스, task, 공식 설정, git을 바꾸지 않습니다.</p>' +
          reportSection("현재 상태", [
            "보고서: " + (value.output_id || ""),
            "직원 실행: " + (value.role_run_id || ""),
            "직원: " + (value.agent_id || ""),
            "상태: " + (value.status || ""),
          ]) +
          reportSection("포함된 내용", [
            "제안: " + (value.counts?.proposals ?? 0),
            "반론/우려: " + (value.counts?.objections ?? 0),
            "질문: " + (value.counts?.questions ?? 0),
            "승인 항목: " + (value.counts?.approval_items ?? 0),
            "업무 지시 후보: " + (value.counts?.workorders ?? 0),
            "기억 요청: " + (value.counts?.memory_requests ?? 0),
          ]) +
          reportSection("다음 행동", ["생성된 HTML을 열어 직원 보고서 내용을 검토합니다.", "채택할 내용이 있으면 채택 후보 미리보기 또는 채택 후보로 넘기기를 사용합니다."]) +
          safetySection(value.safety) +
          (value.output_path ? '<div class="row"><a href="/file?path=' + encodeURIComponent(value.output_path) + '" target="_blank">보고서 열기</a></div>' : '') +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.toolbox_result) {
        const result = value.toolbox_result;
        const cardClass = value.ok ? "good" : "danger";
        const outputLines = [
          result.stdout ? "stdout:\\n" + result.stdout.trim() : "",
          result.stderr ? "stderr:\\n" + result.stderr.trim() : "",
        ].filter(Boolean);
        if (result.tool_id === "google_drive_data_upload") {
          const publish = result.publish_summary || {};
          return '<div class="item ' + cardClass + '"><h3>' + esc(value.ok ? "팀 데이터 배포 완료" : "팀 데이터 배포 실패") + '</h3>' +
            '<p class="summary">' + esc(value.ok
              ? "PlayGround/Data 검증, versioned zip 업로드, latest manifest 갱신 흐름이 완료되었습니다."
              : "배포가 완료되지 않았습니다. 실패 단계와 로그를 확인하세요.") + '</p>' +
            reportSection("배포 버전", [publish.data_version || "자동 버전 사용"]) +
            reportSection("처리 결과", value.ok ? [
              publish.source_validation_seen ? "원본 Data 검증 실행" : "원본 Data 검증 로그 확인 필요",
              publish.archive_validation_seen ? "배포 zip 추출본 검증 실행" : "배포 zip 검증 로그 확인 필요",
              publish.archive_name ? "versioned zip 업로드: " + publish.archive_name : "versioned zip 업로드 결과 확인 필요",
              publish.backup_manifest_file_id ? "기존 latest manifest 백업 완료" : "기존 latest manifest가 없었거나 백업 없음",
              publish.latest_manifest_updated ? "latest manifest 갱신 완료" : "latest manifest 갱신 확인 필요",
            ] : [
              publish.failure_stage ? "실패 위치: " + publish.failure_stage : "실패 위치를 로그에서 확인해야 합니다.",
              "검증/zip 단계에서 실패했다면 Drive 최신 배포본은 바뀌지 않습니다.",
              "업로드 단계 이후 실패라면 아래 로그와 Drive 상태를 확인하세요.",
            ]) +
            reportSection("Drive 기록", [
              publish.archive_name ? "archive: " + publish.archive_name : "",
              publish.archive_file_id ? "archive id: " + publish.archive_file_id : "",
              publish.archive_size ? "archive size: " + publish.archive_size : "",
              publish.backup_manifest_name ? "backup manifest: " + publish.backup_manifest_name : "",
              publish.backup_manifest_file_id ? "backup manifest id: " + publish.backup_manifest_file_id : "",
              publish.manifest_file_id ? "latest manifest id: " + publish.manifest_file_id : "",
              publish.log_path ? "log: " + publish.log_path : "",
            ].filter(Boolean), "Drive 기록은 로그에서 확인하세요.") +
            reportSection("다음 확인", value.ok ? [
              "독립 폴더에 PlayGround.exe, DataUpdateConfig.json, DataUpdater만 넣고 실행합니다.",
              "실행 후 Data 폴더와 Data/DataUpdateManifest.json이 생성되는지 확인합니다.",
              "게임이 정상 시작되면 배포 smoke를 통과로 봅니다.",
            ] : [
              "업로드 로그 보기에서 실패 원인을 확인합니다.",
              "필요하면 백업 manifest 목록/rollback 명령은 별도로 실행합니다.",
            ]) +
            reportSection("안전 상태", [
              "소스 변경 없음",
              "task 상태 변경 없음",
              "commit/push 없음",
            ]) +
            (outputLines.length ? '<details class="internal-links"><summary>업로드 로그 보기</summary><pre class="log-json">' + esc(outputLines.join("\\n\\n").slice(0, 16000)) + '</pre></details>' : "") +
            '</div>';
        }
        return '<div class="item ' + cardClass + '"><h3>' + esc(result.label || "도구 실행 결과") + '</h3>' +
          '<p class="summary">' + esc(result.summary || "") + '</p>' +
          reportSection("실행 정보", [
            "상태: " + (result.status || ""),
            "명령: " + (result.command_display || ""),
            result.exit_code !== undefined ? "종료 코드: " + result.exit_code : "",
          ].filter(Boolean)) +
          (outputLines.length ? '<h3>출력</h3><pre class="log-json">' + esc(outputLines.join("\\n\\n").slice(0, 12000)) + '</pre>' : "") +
          (result.parsed_json ? '<details class="internal-links"><summary>JSON 결과</summary><pre class="log-json">' + esc(JSON.stringify(result.parsed_json, null, 2)) + '</pre></details>' : "") +
          safetySection(value.safety) +
          '</div>';
      }
      if (value?.command === "inspect" && value?.summary) {
        const summary = value.summary || {};
        const validation = value.validation || {};
        return '<div class="item ' + (validation.ok ? "good" : "warn") + '"><h3>자문 상태 점검</h3>' +
          '<p class="summary">선택한 자문 기록이 진행 가능한 상태인지 읽기 전용으로 확인했습니다.</p>' +
          reportSection("현재 자문", [
            "자문: " + (summary.meeting_id || ""),
            "주제: " + (summary.topic || ""),
            "종류: " + optionLabel(summary.meeting_type || ""),
            "상태: " + optionLabel(summary.status || ""),
            "의장: " + staffName(summary.chair_agent_id || ""),
            "참가자: " + asArray(summary.participants).map(staffName).join(", "),
          ]) +
          reportSection("확인된 내용", [
            "제안 " + (summary.proposal_count ?? 0) + "개",
            "우려/반론 " + (summary.objection_count ?? 0) + "개",
            "남은 질문 " + (summary.unresolved_question_count ?? 0) + "개",
            "감독자 결정 " + (summary.director_decision_count ?? 0) + "개",
          ]) +
          reportSection("오류/경고", [...asArray(validation.errors), ...asArray(validation.warnings)], "오류나 경고가 없습니다.") +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.command === "handoff") {
        return '<div class="item ' + (value.handoff_ready ? "good" : "warn") + '"><h3>자문 인수인계 보기</h3>' +
          '<p class="summary">자문 결과를 후속 업무나 다른 AI 직원에게 넘길 준비가 됐는지 확인했습니다. 이 버튼은 읽기 전용이며 업무를 만들지 않습니다.</p>' +
          reportSection("현재 자문", [
            "자문: " + (value.meeting_id || ""),
            "주제: " + (value.topic || ""),
            "넘길 준비: " + (value.handoff_ready ? "가능" : "확인 필요"),
          ]) +
          reportSection("넘길 수 있는 내용", [
            "후속 업무 후보 " + asArray(value.follow_up_workorders).length + "개",
            "받아들인 방향 " + asArray(value.accepted_directions).length + "개",
            "남은 질문 " + asArray(value.unresolved_questions).length + "개",
            "감독자 결정 " + asArray(value.director_decisions).length + "개",
          ]) +
          reportSection("막는 항목", value.blocked_by, "막는 항목이 없습니다.") +
          reportSection("다음 행동", value.next_actions) +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.command === "add-turn") {
        const turn = value.turn || {};
        return '<div class="item good"><h3>내 의견 기록 완료</h3>' +
          '<p class="summary">MeetingSession에 발언 1개를 저장했습니다. 이 작업은 자문 기록만 바꾸며 공식 설정, task, git은 바꾸지 않습니다.</p>' +
          reportSection("추가된 발언", [
            "자문: " + (value.meeting_id || ""),
            "기록 주체: " + staffName(turn.speaker_id || ""),
            "종류: " + optionLabel(turn.turn_type || ""),
            "내용: " + short(turn.content || "", 220),
          ]) +
          reportSection("현재 상태", [
            "다음 자문 상태: " + optionLabel(value.next_status || ""),
            "저장 파일: " + (value.path || ""),
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.staff_run && value?.meeting_id && Object.prototype.hasOwnProperty.call(value, "turn_appended")) {
        const turn = value.added_turn || value.turn_result?.turn || {};
        const appended = Boolean(value.turn_appended);
        return '<div class="item ' + (appended ? "good" : "warn") + '"><h3>다음 AI 발언 결과</h3>' +
          '<p class="summary">' + esc(appended
            ? "AI 직원 의견이 MeetingSession 발언으로 추가되었습니다. 공식 설정, task, git은 바꾸지 않았습니다."
            : "AI 직원 실행은 끝났지만 자문 발언으로 추가되지 않았습니다. 결과와 원본 JSON을 확인해야 합니다.") + '</p>' +
          reportSection("바뀐 것", [
            "자문: " + (value.meeting_id || ""),
            "발언자: " + staffName(value.agent_id || turn.speaker_id || ""),
            "발언 수: " + (value.before_turn_count ?? "?") + " -> " + (value.after_turn_count ?? "?"),
            "AI 발언 추가: " + (appended ? "yes" : "no"),
          ]) +
          reportSection("추가된 발언", appended ? [
            "종류: " + optionLabel(turn.turn_type || "synthesis"),
            "내용: " + short(turn.content || "", 260),
          ] : []) +
          reportSection("바뀌지 않은 것", [
            "공식 설정 확정 없음",
            "AIWorkflow task 생성/실행 없음",
            "소스/데이터 수정 없음",
            "commit/push 없음",
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if ((value?.command === "plan" || value?.command === "materialize") && (value?.validation || value?.plan?.validation || value?.materialization || value?.plan?.materialization)) {
        const plan = value.command === "plan" ? value : (value.plan || {});
        const validation = value.validation || value.plan?.validation || {};
        const materialization = value.materialization || plan.materialization || {};
        const counts = value.counts || plan.counts || {};
        const totalCandidates = Number(counts.proposals || 0) + Number(counts.memory || 0) + Number(counts.work_orders || 0) + Number(counts.handoffs || 0);
        const isWrite = value.command === "materialize" && value.ok !== false;
        const hasFailure = value.ok === false || validation.ok === false;
        const title = hasFailure
          ? "채택 후보로 넘길 수 없음"
          : (isWrite ? "채택 후보로 넘김" : "채택 후보 미리보기");
        const cardClass = hasFailure ? "danger" : (isWrite ? "good" : "warn");
        const summary = hasFailure
          ? "이 직원 보고서는 지금 채택 후보로 넘길 수 없습니다. 아래 이유를 확인하세요."
          : (totalCandidates === 0
            ? "이 직원 보고서에는 채택 후보로 넘길 제안, 기억, 업무 지시, 인수인계가 없습니다."
            : "직원 보고서에서 채택 검토할 수 있는 후보만 뽑아 정리했습니다. 이것은 실행 승인, 공식 설정 확정, task 생성이 아닙니다.");
        const cleanupPath = plan.output_path || value.output_path || "";
        return '<div class="item ' + cardClass + '"><h3>' + title + '</h3>' +
          '<p class="summary">' + esc(summary) + '</p>' +
          reportSection("대상", [
            "보고서: " + (plan.output_id || value.output_id || materialization.source_output_id || ""),
            "직원 실행: " + (plan.role_run_id || value.role_run_id || materialization.source_role_run_id || ""),
            "직원: " + staffName(plan.agent_id || value.agent_id || materialization.source_agent_id || ""),
          ]) +
          reportSection("채택 후보 개수", [
            "아이디어 제안: " + (counts.proposals ?? 0) + "개",
            "프로젝트 기억 후보: " + (counts.memory ?? 0) + "개",
            "업무 지시 후보: " + (counts.work_orders ?? 0) + "개",
            "직원 인수인계 후보: " + (counts.handoffs ?? 0) + "개",
          ]) +
          reportSection(hasFailure ? "왜 안 되는가" : "검토 결과", [
            ...(validation.errors || []).map(translateStudioMessage),
            ...(validation.warnings || []).map(translateStudioMessage),
            translateStudioMessage(value.error || ""),
          ], hasFailure ? "확인된 문제 없음" : "문제 없음") +
          reportSection(isWrite ? "생성된 후보" : "생성 예정 후보", materialization.created_records || [], totalCandidates === 0 ? "생성할 후보 없음" : "후보 정보 없음") +
          reportSection("다음 행동", hasFailure
            ? ["보고서 ID 형식 또는 직원 보고서 내용을 확인하세요.", "깨진 테스트 보고서나 오래된 개발 버전 보고서라면 임시 보고서 정리로 목록에서 지울 수 있습니다."]
            : (isWrite
              ? ["오른쪽 채택 후보 검토 영역에서 채택, 반려, 보류, 수정 요청 중 하나로 정리합니다.", "저장된 후보는 바로 실행되거나 공식 설정으로 확정되지 않습니다."]
              : ["내용이 맞으면 채택 후보로 넘기기를 눌러 검토 대상을 저장합니다.", "저장 전까지는 아무 파일도 바뀌지 않습니다."])) +
          (hasFailure && cleanupPath ? actionsHtml([button("임시 보고서 정리", "staff-run-cleanup", cleanupPath, "danger")]) : "") +
          safetySection(value.safety || plan.safety || materialization.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.command === "staff-run-cleanup") {
        return '<div class="item good"><h3>임시 보고서 정리 완료</h3>' +
          '<p class="summary">깨진 테스트 보고서나 더 이상 쓸 수 없는 개발 버전 직원 보고서를 목록에서 지웠습니다.</p>' +
          reportSection("정리한 대상", [
            "보고서: " + (value.output_id || ""),
            "직원 실행: " + (value.role_run_id || ""),
            "직원: " + staffName(value.agent_id || ""),
            "경로: " + (value.cleaned_path || ""),
          ]) +
          reportSection("바뀌지 않은 것", ["소스 파일 변경 없음", "task 상태 변경 없음", "공식 설정 변경 없음", "commit/push 없음"]) +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.materialization || value?.command === "materialize") {
        const materialization = value.materialization || value;
        return '<div class="item ' + (value.command === "materialize" ? "good" : "warn") + '"><h3>' + (value.command === "materialize" ? "채택 후보로 넘김" : "채택 후보 미리보기") + '</h3>' +
          '<p class="summary">직원 보고서에서 아이디어 제안, 프로젝트 기억, 업무 지시, 직원 인수인계 후보만 뽑아 채택 검토 대상으로 정리합니다. 이것은 실행 승인, 공식 설정 확정, task 생성이 아닙니다.</p>' +
          reportSection("현재 상태", [
            "후보 묶음: " + (materialization.materialization_id || ""),
            "원본 보고서: " + (materialization.source_output_id || value.output_id || ""),
            "원본 직원 실행: " + (materialization.source_role_run_id || value.role_run_id || ""),
            "직원: " + (materialization.source_agent_id || value.agent_id || ""),
          ]) +
          reportSection("생성/예정 후보", materialization.created_records || []) +
          reportSection("건너뛴 항목", materialization.skipped_items || []) +
          reportSection("다음 행동", [
            value.command === "materialize" ? "오른쪽 채택 후보 검토 영역에서 채택, 반려, 보류, 수정 요청 중 하나로 정리합니다." : "내용이 맞으면 채택 후보로 넘기기를 눌러 검토 대상을 저장합니다.",
            "저장된 후보도 바로 실행되거나 공식 설정이 되지 않습니다.",
          ]) +
          safetySection(value.safety || materialization.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.ok === false || value?.error || value?.reason) {
        return '<div class="item danger"><h3>실행 실패</h3><p class="summary">' + esc(value.reason || value.error || "작업 중 오류가 발생했습니다.") + '</p><pre class="log-json">' + esc(JSON.stringify(value, null, 2)) + '</pre></div>';
      }
      return '<pre class="log-json">' + esc(JSON.stringify(value, null, 2)) + '</pre>';
    }
    function revealResultPanel(panel) {
      if (!panel || typeof panel.getBoundingClientRect !== "function") return;
      const rect = panel.getBoundingClientRect();
      const margin = 24;
      const belowViewport = rect.top >= 0 && rect.bottom > window.innerHeight - margin;
      if (belowViewport) panel.scrollIntoView({ behavior:"smooth", block:"nearest" });
    }
    function writeResult(html) {
      const meetingPanel = el("meetingResultPanel");
      const meetingBody = el("meetingResult");
      if (activePage === "meetings" && meetingPanel && meetingBody) {
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
        ok ? "팀 데이터 배포 완료" : "팀 데이터 배포 실패",
        "",
        ok
          ? "versioned zip 업로드와 latest manifest 갱신까지 완료되었습니다."
          : "배포가 완료되지 않았습니다. 아래 실패 위치와 로그를 확인하세요.",
      ];
      if (publish.data_version) lines.push("배포 버전: " + publish.data_version);
      if (publish.archive_name) lines.push("업로드 zip: " + publish.archive_name);
      if (publish.archive_file_id) lines.push("zip 파일 ID: " + publish.archive_file_id);
      if (publish.manifest_file_id) lines.push("latest manifest ID: " + publish.manifest_file_id);
      if (publish.backup_manifest_file_id) lines.push("백업 manifest ID: " + publish.backup_manifest_file_id);
      if (publish.failure_stage) lines.push("실패 위치: " + publish.failure_stage);
      if (!ok && result.exit_code !== undefined) lines.push("종료 코드: " + result.exit_code);
      if (!ok && !publish.failure_stage) {
        const message = value?.error || value?.message || result.summary || "자세한 오류는 화면의 배포 결과 카드에서 확인하세요.";
        lines.push("오류: " + message);
      }
      if (publish.log_path) {
        lines.push("");
        lines.push("로그: " + publish.log_path);
      }
      lines.push("");
      lines.push("상세 내용은 화면의 배포 결과 카드에도 남습니다.");
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
    function internalLinksHtml(links, label = "내부 원본 보기") {
      const visibleLinks = asArray(links).filter(Boolean);
      if (!visibleLinks.length) return "";
      return '<details class="internal-links"><summary>' + esc(label) + '</summary><div class="row">' + visibleLinks.join("") + '</div></details>';
    }
    function actionsHtml(items, className = "action-row primary") {
      const visibleItems = asArray(items).filter(Boolean);
      return visibleItems.length ? '<div class="' + esc(className) + '">' + visibleItems.join("") + '</div>' : "";
    }
    function listHtml(items, emptyText = "") {
      const values = asArray(items).slice(0, 4);
      if (!values.length) return emptyText ? '<p class="small muted">' + esc(emptyText) + '</p>' : "";
      const more = asArray(items).length > values.length ? '<li>+' + esc(asArray(items).length - values.length) + '개 더 있음</li>' : "";
      return '<ul class="small">' + values.map((item) => '<li>' + esc(short(item, 110)) + '</li>').join("") + more + '</ul>';
    }
    function inlineList(items, emptyText = "-") {
      const values = asArray(items);
      return values.length ? values.slice(0, 3).join(", ") + (values.length > 3 ? " +" + (values.length - 3) : "") : emptyText;
    }
    function selectedGitFiles() {
      return Array.from(new Set(Array.from(document.querySelectorAll('input[data-git-file]:checked')).map((input) => input.dataset.gitFile)));
    }
    function isWorkflowPath(filePath) {
      return String(filePath || "").startsWith("_Docs/AIWorkflow/") || String(filePath || "").startsWith("tools/aiworkflow/");
    }
    function filePurpose(filePath) {
      const value = String(filePath || "");
      if (!value) return "대상 파일 정보가 없습니다.";
      if (value.includes("_Docs/AIWorkflow/Backlog.md")) return "작업 목록 상태 파일입니다. task 상태나 메모가 바뀐 신호입니다.";
      if (value.includes("_Docs/AIWorkflow/ActiveTask.md")) return "현재 선택된 작업 상태 파일입니다. active/done 같은 진행 상태가 바뀐 신호입니다.";
      if (value.includes("_Docs/AIWorkflow/")) return "워크플로우 문서 또는 Studio 설정 파일입니다. 운영 규칙이나 UI 설명이 바뀐 신호입니다.";
      if (value.includes("PlayGround/Data/")) return "게임 데이터 파일입니다. 실제 게임 내용이나 로더 입력값이 바뀐 신호입니다.";
      if (value.includes("PlayGround/Project/")) return "게임 소스 코드 파일입니다. 런타임 동작이 바뀔 수 있는 신호입니다.";
      if (value.includes("tools/")) return "로컬 도구/Studio 실행 코드입니다. UI나 자동화 동작이 바뀐 신호입니다.";
      return "검토가 필요한 변경 파일입니다.";
    }
    function explainConcern(text) {
      const value = String(text || "");
      const failed = value.match(/failed or cancelled session\\(s\\):\\s*(.+)$/i);
      if (failed) return "작업 실행 기록 중 끝까지 정상 완료되지 않은 실행이 있습니다. 아래 세션은 검증이나 수정 도중 멈췄던 기록이라 완료 승인 전에 원인을 확인해야 합니다.";
      const outside = value.match(/outside expected task category:\\s*(.+)$/i);
      if (outside) return "이번 작업 범위 밖으로 보이는 파일 변경 신호입니다. 이 파일이 실제로 이번 작업에 필요한 변경인지, 아니면 다른 작업이 섞였는지 확인해야 합니다.";
      if (/mixed/i.test(value)) return "실행 결과가 성공/실패 신호를 함께 갖고 있습니다. 완료로 볼지 사람이 판단해야 합니다.";
      return value;
    }
    function translateConcernDetail(text) {
      const value = String(text || "");
      const failed = value.match(/failed or cancelled session\\(s\\):\\s*(.+)$/i);
      if (failed) return "확인할 실행: " + failed[1] + " · 의미: 이 작업을 처리하던 Runner/Codex 실행 중 일부가 실패 또는 취소로 남았습니다.";
      const outside = value.match(/outside expected task category:\\s*(.+)$/i);
      if (outside) return "파일: " + outside[1] + " · 의미: " + filePurpose(outside[1]);
      if (/observed exit state is mixed/i.test(value)) return "실행 결과에 성공 신호와 실패/취소 신호가 함께 있습니다.";
      return value;
    }
    function translateCompletionSummary(text) {
      const value = String(text || "");
      if (/Verification reported concerns/i.test(value)) return "검증에서 우려 사항이 보고되었습니다. 완료 처리 전에 Human Director의 결정이 필요합니다.";
      if (/Verification passed/i.test(value)) return "검증이 통과했습니다. 완료 검토를 진행할 수 있습니다.";
      if (/Completion review can proceed/i.test(value)) return "완료 검토를 진행할 수 있습니다.";
      return value;
    }
`;
}

module.exports = { renderClientGenericResultScript };

#!/usr/bin/env node
"use strict";

function shortText(value, max = 180) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 3).trimEnd() + "..." : clean;
}

function slugifyId(value, fallback = "item") {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 36);
  return slug || fallback;
}

function studioTimestampParts() {
  const now = new Date();
  const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
  const compact = local.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return {
    date: compact.slice(0, 8),
    time: compact.slice(8, 14),
    iso: now.toISOString(),
  };
}

function makeStudioId(prefix, label) {
  const stamp = studioTimestampParts();
  return String(prefix) + "-" + stamp.date + "-" + stamp.time + "-" + slugifyId(label);
}

function stringList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return String(item.plain_language_summary || item.summary || item.title || item.type || item.id || item.record_id || "").trim();
      }
      return String(item || "").trim();
    })
    .filter(Boolean);
}

function buildMeetingFacilitationPlan(meeting = {}) {
  const meetingId = meeting.meeting_id || "";
  const topic = meeting.topic || meetingId || "meeting";
  const participants = stringList(meeting.participants);
  const turns = Array.isArray(meeting.discussion_turns) ? meeting.discussion_turns : [];
  const spoken = new Set(turns.map((turn) => String(turn.speaker_id || "").trim()).filter(Boolean));
  const staffParticipants = participants.filter((id) => !["human_director", "executive_producer"].includes(id));
  const nextSpeaker = staffParticipants.find((id) => !spoken.has(id)) || staffParticipants[0] || participants[0] || "creative_director";
  const unresolved = stringList(meeting.unresolved_questions);
  const proposals = stringList(meeting.proposals);
  const accepted = stringList(meeting.accepted_directions);
  const objections = stringList(meeting.objections);
  const status = meeting.status || "draft";
  const recommendedActions = [];

  if (status === "draft") {
    recommendedActions.push("자문을 시작하고 각 역할이 무엇을 판단해야 하는지 먼저 확인합니다.");
  }
  if (!turns.length) {
    recommendedActions.push(`${nextSpeaker}에게 첫 관점 정리를 요청합니다.`);
  } else if (unresolved.length) {
    recommendedActions.push("남은 질문을 정리하고 답할 담당 직원을 지정합니다.");
  } else if (proposals.length && !accepted.length) {
    recommendedActions.push("제안 중 채택/반려/보류할 항목을 Human Director 결정으로 넘깁니다.");
  } else {
    recommendedActions.push("자문 결과를 후속 업무 후보 또는 감독자 판단으로 넘길지 결정합니다.");
  }

  return {
    meeting_facilitation_plan_id: makeStudioId("MFP", meetingId || topic),
    meeting_id: meetingId,
    topic,
    status,
    current_meaning: status === "draft"
      ? "아직 자문이 시작되기 전입니다. 주제와 참석자를 확인할 차례입니다."
      : "자문 기록을 보고 의견을 더 받을지, 후속 업무 후보로 넘길지, 감독자 판단으로 남길지 결정하는 단계입니다.",
    next_speaker_recommendation: nextSpeaker,
    next_speaker_reason: spoken.has(nextSpeaker)
      ? "이미 발언한 직원이지만 현재 참석자 중 다음 관점 정리에 가장 적합합니다."
      : "아직 발언하지 않은 참석자라서 먼저 관점을 받을 수 있습니다.",
    recommended_actions: recommendedActions,
    director_decision_options: [
      "자문을 계속한다: AI 직원 발언을 더 받거나 사람이 직접 발언을 추가합니다.",
      "업무 후보 만들기: 자문에서 나온 해야 할 일을 업무 지시 후보로 저장합니다.",
      "방향 판단으로 남기기: 자문에서 정한 결론, 방향, 채택/반려/보류 판단을 감독자 결정함에 남깁니다.",
      "자문을 종료한다: 더 논의하지 않고 자문 상태를 closed로 바꿉니다.",
    ],
    blockers: [
      ...unresolved.map((item) => `남은 질문: ${item}`),
      ...objections.map((item) => `반론/우려: ${item}`),
    ],
    safety: {
      meeting_written: false,
      source_changed: false,
      task_state_changed: false,
      canon_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildMeetingRunbook(meeting = {}) {
  const meetingId = meeting.meeting_id || "";
  const topic = meeting.topic || meetingId || "meeting";
  const participants = stringList(meeting.participants);
  const turns = Array.isArray(meeting.discussion_turns) ? meeting.discussion_turns : [];
  const proposals = stringList(meeting.proposals);
  const objections = stringList(meeting.objections);
  const unresolved = stringList(meeting.unresolved_questions);
  const decisions = stringList(meeting.director_decisions);
  const accepted = stringList(meeting.accepted_directions);
  const followUps = stringList(meeting.follow_up_workorders);
  const spoken = new Set(turns.map((turn) => String(turn.speaker_id || "").trim()).filter(Boolean));
  const silentParticipants = participants.filter((id) => id && !spoken.has(id));
  const nextTurnQueue = silentParticipants.length
    ? silentParticipants.map((id) => `${id}: 아직 자문 관점이 기록되지 않았습니다.`)
    : participants.slice(0, 3).map((id) => `${id}: 제안/반박/질문 중 빠진 관점을 보강합니다.`);
  const decisionCandidates = [
    ...proposals.map((item) => `제안 판단: ${item}`),
    ...objections.map((item) => `우려 처리: ${item}`),
    ...unresolved.map((item) => `질문 해소: ${item}`),
  ];
  const closeCriteria = [
    "핵심 제안이 채택/반려/보류 중 하나로 분류되었습니다.",
    "반론과 남은 질문이 후속 업무 또는 결정 후보로 이동했습니다.",
    "후속 업무 후보 또는 감독자 판단으로 넘길 대상이 명확합니다.",
    "자문 결과가 canon이나 구현으로 바로 굳지 않는다는 점이 분리되어 있습니다.",
  ];
  const blockers = [];
  if (!turns.length) blockers.push("직원 발언이 아직 없습니다.");
  if (unresolved.length) blockers.push("남은 질문이 있습니다.");
  if (objections.length && !decisions.length) blockers.push("반론/우려가 결정으로 정리되지 않았습니다.");
  if (proposals.length && !accepted.length && !decisions.length) blockers.push("제안의 채택/반려/보류 판단이 남아 있습니다.");

  return {
    meeting_runbook_id: makeStudioId("MRB", meetingId || topic),
    meeting_id: meetingId,
    topic,
    status: meeting.status || "draft",
    current_meaning: blockers.length
      ? "자문이 아직 닫히기 전입니다. 발언, 질문, 우려, 제안 판단을 더 정리해야 합니다."
      : "자문 결과를 후속 업무 후보 또는 감독자 판단으로 넘길 준비가 되어 있습니다.",
    participants,
    discussion_state: {
      turn_count: turns.length,
      silent_participants: silentParticipants,
      proposal_count: proposals.length,
      objection_count: objections.length,
      unresolved_question_count: unresolved.length,
      director_decision_count: decisions.length,
      follow_up_count: followUps.length,
    },
    next_turn_queue: nextTurnQueue,
    decision_candidates: decisionCandidates.length ? decisionCandidates : ["현재 자문에는 즉시 판단할 제안/우려/질문이 없습니다."],
    handoff_candidates: followUps.length
      ? followUps
      : proposals.length
        ? proposals.map((item) => `업무 후보: ${item}`)
        : [`자문 주제 요약을 후속 업무 후보로 만들지 검토: ${topic}`],
    close_criteria: closeCriteria,
    blockers,
    director_checklist: [
      "모든 핵심 역할이 최소 한 번은 자기 관점에서 발언했는지 확인합니다.",
      "제안, 반론, 질문이 서로 섞이지 않고 분리되어 있는지 확인합니다.",
      "공식 설정으로 확정할 내용은 별도 감독자 판단/기록 gate로 넘깁니다.",
      "구현이 필요하면 자문 결과를 바로 실행하지 말고 WorkOrder로 넘깁니다.",
    ],
    safety: {
      read_only: true,
      meeting_written: false,
      staff_run_started: false,
      work_order_created: false,
      decision_written: false,
      canon_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildMeetingBoard(meeting = {}) {
  const facilitation = buildMeetingFacilitationPlan(meeting);
  const runbook = buildMeetingRunbook(meeting);
  const participants = stringList(meeting.participants);
  const turns = Array.isArray(meeting.discussion_turns) ? meeting.discussion_turns : [];
  const lastTurn = turns.length ? turns[turns.length - 1] : null;
  const spoken = new Set(turns.map((turn) => String(turn.speaker_id || "").trim()).filter(Boolean));
  const silentParticipants = participants.filter((id) => id && !spoken.has(id));
  const nextSpeakerId = facilitation.next_speaker_recommendation || "";
  const questions = stringList(meeting.unresolved_questions);
  const concernsOrBlockers = Array.from(new Set([
    ...stringList(facilitation.blockers),
    ...stringList(runbook.blockers),
  ]));
  const decisionCandidates = stringList(runbook.decision_candidates);
  const meaningfulDecisions = decisionCandidates.filter((item) => !/즉시 판단할 제안\/우려\/질문이 없습니다/.test(item));
  const hasOpenItems = questions.length || concernsOrBlockers.length || meaningfulDecisions.length;
  const currentMeaning = !turns.length
    ? "아직 자문 발언이 없습니다. 먼저 첫 관점을 받을 차례입니다."
    : silentParticipants.length
      ? "아직 발언하지 않은 직원이 있습니다. 다음 관점을 받은 뒤 후속 업무 후보나 감독자 판단으로 넘길지 판단합니다."
      : hasOpenItems
        ? "남은 질문, 우려, 판단 후보를 정리해야 합니다."
        : "자문 결과를 후속 업무 후보 또는 감독자 판단으로 넘기거나 자문을 닫을지 판단하는 단계입니다.";
  return {
    meeting_board_id: makeStudioId("MB", meeting.meeting_id || meeting.topic || "meeting"),
    meeting_id: meeting.meeting_id || "",
    topic: meeting.topic || meeting.meeting_id || "meeting",
    meeting_type: meeting.meeting_type || "",
    status: meeting.status || "draft",
    chair_agent_id: meeting.chair_agent_id || "",
    participant_ids: participants,
    turn_count: turns.length,
    last_turn: lastTurn ? {
      turn_id: lastTurn.turn_id || "",
      speaker_id: lastTurn.speaker_id || "",
      turn_type: lastTurn.turn_type || lastTurn.type || "",
      content: lastTurn.content || lastTurn.summary || "",
      created_at: lastTurn.created_at || lastTurn.timestamp || "",
    } : null,
    current_meaning: currentMeaning,
    next_speaker_id: nextSpeakerId,
    next_speaker_recommendation: nextSpeakerId,
    next_speaker_reason: facilitation.next_speaker_reason,
    director_next_actions: [
      nextSpeakerId ? "다음 AI 발언 받기: 추천 직원의 다음 관점을 자문에 추가" : "내 의견 기록: Human Director 의견을 자문 기록에 기록",
      "자문을 더 이어가려면: 내 의견 기록 또는 다음 AI 발언 받기",
      hasOpenItems ? "쟁점이 정리되면: 방향 판단으로 남기기 또는 업무 후보 만들기" : "논의가 충분하면: 업무 후보 만들기, 방향 판단으로 남기기, 또는 자문 종료",
    ],
    next_actions: facilitation.recommended_actions,
    remaining_questions: questions,
    concerns_or_blockers: concernsOrBlockers,
    decision_candidates: decisionCandidates,
    handoff_candidates: stringList(runbook.handoff_candidates),
    close_criteria: stringList(runbook.close_criteria),
    close_checklist: [
      "필요한 역할의 발언이 빠지지 않았는지 확인합니다.",
      "결정할 내용과 후속 업무로 넘길 내용을 분리합니다.",
      "자문 결과가 바로 canon/task/git으로 굳지 않았는지 확인합니다.",
    ],
    director_checklist: stringList(runbook.director_checklist),
    safety: {
      read_only: true,
      meeting_written: false,
      staff_run_started: false,
      work_order_created: false,
      decision_written: false,
      canon_changed: false,
      task_state_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildKnowledgeTransitionPlan(record = {}, relativePath = "") {
  const kind = record.proposal_id ? "proposal" : record.decision_id ? "decision" : record.memory_id ? "memory" : "unknown";
  const id = record.proposal_id || record.decision_id || record.memory_id || "knowledge-record";
  const title = record.title || record.decision_summary || record.content || id;
  const recordText = [
    id,
    title,
    record.summary,
    record.decision_summary,
    record.content,
    record.source_type,
    record.source_ref,
    record.target_ref,
    record.decision_type,
    ...(Array.isArray(record.risks) ? record.risks : []),
    ...(Array.isArray(record.evidence_refs) ? record.evidence_refs : []),
  ].join(" ").toLowerCase();
  const includesAny = (patterns) => patterns.some((pattern) => recordText.includes(pattern));
  const isOperationalRecord = includesAny(["studio", "aiworkflow", "workflow", "ux", "tool", "console", "orchestrator", "스튜디오", "운영", "도구", "워크플로우", "콘솔"]);
  const isGameCanonRecord = !isOperationalRecord && includesAny(["canon", "scenario", "story", "world", "lore", "character", "setting", "세계관", "캐릭터", "스토리", "시나리오", "공식 설정", "설정"]);
  const isWorkRecord = !isOperationalRecord && !isGameCanonRecord && includesAny(["work", "task", "implementation", "validation", "업무", "작업", "검증", "구현"]);
  const category = isOperationalRecord ? "Studio/운영 제안" : isGameCanonRecord ? "게임 설정 제안" : isWorkRecord ? "업무 제안" : "아이디어 제안";
  const base = {
    knowledge_transition_plan_id: makeStudioId("KTP", id),
    source_kind: kind,
    source_ref: id,
    source_path: relativePath,
    title,
    category,
    current_meaning: "",
    possible_actions: [],
    what_changes_if_accepted: [],
    what_does_not_change: [
      "이 계획을 보는 것만으로 공식 설정, 구현, task 실행, commit/push는 일어나지 않습니다.",
      "기록 전환 버튼을 눌러도 기존 승인/실행/완료 gate를 우회하지 않습니다.",
    ],
    director_checklist: [],
    safety: {
      record_written: false,
      canon_changed: false,
      source_changed: false,
      task_state_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };

  if (kind === "proposal") {
    base.current_meaning = isGameCanonRecord
      ? "제안은 게임 설정 아이디어 후보입니다. 채택, 반려, 수정 요청, 공식 설정 검토 중 하나로 판단하기 전까지는 확정 사항이 아닙니다."
      : `제안은 ${category}입니다. 채택, 수정 요청, 반려, 보류 중 하나로 판단하기 전까지는 확정 사항이 아닙니다.`;
    base.possible_actions = [
      "채택 기록: 이 아이디어를 방향 후보로 받아들였다는 감독자 판단을 남깁니다.",
      "수정 요청: 더 다듬어야 한다는 감독자 판단을 남깁니다.",
      "반려 기록: 채택하지 않는 이유를 남깁니다.",
      isGameCanonRecord
        ? "공식 설정 검토 기록: 세계관, 캐릭터, 규칙 같은 게임 설정 후보일 때만 사용합니다. 바로 canon으로 확정하지 않습니다."
        : `공식 설정 검토 없음: ${category}은 공식 설정 후보로 넘기지 않습니다.`,
    ];
    base.what_changes_if_accepted = [
      "제안 자체가 바로 공식 설정이나 구현 task로 바뀌지는 않습니다.",
      "감독자 판단 기록이 생기고, 필요하면 그 판단을 참고 기록 또는 공식 설정 기록으로 전환합니다.",
    ];
    base.director_checklist = isGameCanonRecord ? [
      "이 제안이 기존 공식 설정과 충돌하지 않는지 확인합니다.",
      "승인하면 어떤 플레이, 스토리, 아트, 기술 방향이 고정되는지 확인합니다.",
      "아직 더 물어봐야 할 질문이나 검증 자료가 있는지 확인합니다.",
    ] : [
      "이 제안을 운영 방향이나 업무 후보로 받아들일지 확인합니다.",
      "이 판단만으로 소스 수정, task 실행, commit/push가 일어나지 않는지 확인합니다.",
      "후속 업무 지시나 자문이 필요한지 확인합니다.",
    ];
  } else if (kind === "decision") {
    const canStoreAsCanon = record.decision_type === "canonize" && isGameCanonRecord;
    base.current_meaning = `이 기록은 Human Director가 ${category}에 대해 남긴 판단입니다. 참고 기록으로 저장하면 AI 직원이 이후 작업 맥락으로 참고합니다.`;
    base.possible_actions = [
      "참고 기록으로 저장: 승인한 방향, 선호, 운영 기준을 일반 프로젝트 기록으로 남깁니다.",
      canStoreAsCanon
        ? "공식 설정으로 저장: 세계관, 캐릭터, 규칙처럼 확정해도 되는 내용을 canon 기록으로 남깁니다."
        : "공식 설정으로 저장하지 않음: 이 결정은 게임 설정 후보에 대한 공식 설정 검토 기록이 아닙니다.",
    ];
    base.what_changes_if_accepted = canStoreAsCanon ? [
      "새 공식 설정 기록이 생깁니다.",
      "이후 AI 직원은 해당 내용을 확정 설정처럼 참고합니다.",
    ] : [
      "새 참고 기록이 생깁니다.",
      "공식 설정은 아니며, AI 직원이 참고할 판단 기록으로만 쓰입니다.",
    ];
    base.director_checklist = [
      "이 판단이 나중에 따라도 되는 기준인지 확인합니다.",
      canStoreAsCanon ? "공식 설정으로 저장해도 되는 확정 설정인지 확인합니다." : "공식 설정이 아니라 참고 기록으로만 남기는 것이 맞는지 확인합니다.",
      "받아들인 범위와 제외한 범위가 함께 남아 있는지 확인합니다.",
    ];
  } else if (kind === "memory") {
    base.current_meaning = record.status === "canon"
      ? "이 MemoryRecord는 공식 설정처럼 참고되는 기억입니다."
      : "이 MemoryRecord는 참고용 기억입니다. 아직 canon으로 확정된 설정은 아닐 수 있습니다.";
    base.possible_actions = [
      "참고만 한다: 직원 컨텍스트 검색에 활용합니다.",
      "상충 여부를 검토한다: 새 제안이나 결정이 이 기억과 충돌하는지 확인합니다.",
      "필요하면 새 Decision을 만들어 상태를 바꿉니다.",
    ];
    base.what_changes_if_accepted = [
      "현재 화면에서는 상태 변경이 없습니다.",
      "별도 Decision/Memory 전환을 거쳐야 공식 설정 변경이 됩니다.",
    ];
    base.director_checklist = [
      "이 기억이 현재 프로젝트에 여전히 맞는가?",
      "canon 상태라면 충돌하는 새 제안이 없는가?",
      "오래된 기억이면 superseded/rejected 처리할 필요가 있는가?",
    ];
  } else {
    base.current_meaning = "알 수 없는 지식 기록입니다. 원본 JSON 구조를 확인해야 합니다.";
    base.possible_actions = ["원본 JSON을 확인합니다."];
    base.director_checklist = ["record id, source type, status가 있는지 확인합니다."];
  }

  return base;
}

function buildCompletionDecisionPlan(core = {}) {
  const task = core.active_task || {};
  const runner = core.runner || {};
  const verification = core.verification || {};
  const completion = core.completion || {};
  const concerns = stringList(completion.remaining_concerns);
  const warnings = stringList(completion.remaining_warnings);
  const verdict = String(verification.verdict || completion.readiness || "").toUpperCase();
  const needsDirectorChoice = completion.state === "needs_human_decision"
    || completion.readiness === "NEEDS_DECISION"
    || ["CONCERNS", "BLOCKED", "FAIL"].includes(verdict);
  let recommended = "defer";
  if (verdict === "PASS") recommended = "accept";
  else if (verdict === "PASS_WITH_NOTES") recommended = warnings.length ? "accept" : "accept";
  else if (verdict === "CONCERNS") recommended = "request_changes_or_accept_concerns";
  else if (verdict === "FAIL" || verdict === "BLOCKED") recommended = "request_changes";
  const decisionOptions = [];
  if (!needsDirectorChoice) {
    decisionOptions.push({
      decision: "accept",
      label: "완료 승인",
      when_to_use: "검증 결과가 통과했고 남은 우려가 없거나 사소한 메모 수준일 때 사용합니다.",
      effect: "FinalizationLog를 남기고 Runner를 계속 진행합니다. markDone이면 task done까지 처리합니다. commit/push는 별도입니다.",
    });
  }
  if (needsDirectorChoice) {
    decisionOptions.push({
      decision: "accept-concerns",
      label: "우려 감수 후 완료",
      when_to_use: "우려를 확인했지만 이번 작업 완료를 막을 정도는 아니라고 사람이 판단할 때 사용합니다.",
      effect: "우려를 폐기하지 않고 '알고 감수했다'는 기록을 남긴 뒤 완료 흐름을 진행합니다. commit/push는 별도입니다.",
    });
  }
  decisionOptions.push(
    {
      decision: "request-changes",
      label: "수정 요청",
      when_to_use: "검증 실패, 범위 이탈, 설명 부족, 남은 문제 때문에 완료로 받을 수 없을 때 사용합니다.",
      effect: "task done을 하지 않고 수정 필요 FinalizationLog를 남깁니다. 후속 focused fix 작업으로 이어집니다.",
    },
    {
      decision: "defer",
      label: "판단 보류",
      when_to_use: "지금 판단할 근거가 부족해서 더 확인해야 할 때 사용합니다.",
      effect: "완료/반려/수정 결정을 미루는 기록만 남깁니다. task done, commit/push는 하지 않습니다.",
    },
  );

  return {
    completion_decision_plan_id: makeStudioId("CDP", task.task_id || "completion"),
    task_id: task.task_id || "",
    task_title: task.title || "",
    runner_run_id: runner.runner_run_id || "",
    verdict,
    completion_state: completion.state || "",
    current_meaning: runner.stop_reason === "completion_review_required"
      ? "완료 카드와 검증 자료를 보고 완료 승인, 우려 감수, 수정 요청, 보류 중 하나를 결정해야 합니다."
      : runner.stop_reason === "done_or_commit_decision"
        ? "완료 최종화는 끝났고 task done 또는 commit/push 판단이 남은 상태입니다."
        : "현재 완료 판단 gate가 열려 있는지 확인해야 합니다.",
    recommended_decision: recommended,
    decision_options: decisionOptions,
    concerns_to_review: concerns,
    warnings_to_review: warnings,
    director_checklist: [
      "검증 자료가 이번 작업 범위를 실제로 다루는가?",
      "남은 우려가 task 완료를 막는 문제인가, 감수 가능한 경고인가?",
      "완료 승인 후에도 commit/push는 별도 판단이라는 점을 확인했는가?",
    ],
    safety: {
      read_only: true,
      task_done_changed: false,
      finalization_written: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildCompletionEvidenceChecklist(core = {}) {
  const task = core.active_task || {};
  const runner = core.runner || {};
  const verification = core.verification || {};
  const completion = core.completion || {};
  const git = core.git || {};
  const items = [
    {
      name: "Runner 실행 기록",
      status: runner.path ? "present" : "missing",
      meaning: runner.path
        ? "작업 실행이 어떤 상태로 멈췄는지 확인할 수 있습니다."
        : "Runner 실행 기록을 찾지 못했습니다.",
      ref: runner.path || "",
    },
    {
      name: "검증 보고서",
      status: verification.path ? "present" : "missing",
      meaning: verification.path
        ? `검증 판정은 ${verification.verdict || "미기록"}입니다.`
        : "검증 보고서를 찾지 못했습니다.",
      ref: verification.path || "",
    },
    {
      name: "완료 보고서",
      status: completion.path ? "present" : "missing",
      meaning: completion.path
        ? "완료 상태, 남은 우려, 경고를 확인할 수 있습니다."
        : "완료 보고서를 찾지 못했습니다.",
      ref: completion.path || "",
    },
    {
      name: "완료 카드",
      status: completion.card_path ? "present" : "missing",
      meaning: completion.card_path
        ? "감독자가 읽기 쉬운 완료 요약을 확인할 수 있습니다."
        : "완료 카드를 찾지 못했습니다.",
      ref: completion.card_path || "",
    },
    {
      name: "Git 변경 상태",
      status: git.dirty ? "present" : "clean",
      meaning: git.dirty
        ? `${git.changed_count || 0}개 변경이 있어 commit 전 diff 확인이 필요합니다.`
        : "현재 git 변경이 없습니다.",
      ref: git.diff_stat || "",
    },
  ];
  const missing = items.filter((item) => item.status === "missing").map((item) => item.name);
  const concerns = stringList(completion.remaining_concerns);
  const warnings = stringList(completion.remaining_warnings);
  const ready = !missing.length && !["FAIL", "BLOCKED"].includes(String(verification.verdict || "").toUpperCase());
  return {
    completion_evidence_checklist_id: makeStudioId("CEC", task.task_id || "completion"),
    task_id: task.task_id || "",
    task_title: task.title || "",
    runner_run_id: runner.runner_run_id || "",
    current_meaning: "완료 판단 전에 필요한 검증 자료가 모였는지 확인하는 읽기 전용 점검입니다.",
    ready_to_decide: ready,
    verdict: verification.verdict || "",
    evidence_items: items,
    missing_items: missing,
    concerns_to_review: concerns.slice(0, 12),
    warnings_to_review: warnings.slice(0, 12),
    recommended_next_actions: missing.length
      ? ["빠진 검증 자료를 먼저 생성하거나 Runner 상태를 다시 확인합니다.", "근거가 부족하면 완료 승인 대신 수정 요청 또는 보류를 선택합니다."]
      : concerns.length
        ? ["완료 판단안에서 우려 감수와 수정 요청 중 무엇이 맞는지 결정합니다.", "우려를 감수한다면 무엇을 감수하는지 FinalizationLog에 남깁니다."]
        : ["완료 판단안에서 완료 승인 여부를 결정합니다.", "완료 후 commit/push는 별도 git gate에서 처리합니다."],
    safety: {
      read_only: true,
      finalization_written: false,
      task_done_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildApprovalImpactPlan(core = {}, automation = {}) {
  const task = core.active_task || {};
  const runner = core.runner || {};
  const completion = core.completion || {};
  const priority = String(task.priority || "").toUpperCase();
  const risk = String(task.risk || "").toLowerCase();
  const kind = String(task.kind || "").toLowerCase();
  const approvalRequired = ["P0", "P1"].includes(priority)
    || ["high", "critical"].includes(risk)
    || ["implementation", "data", "runtime", "schema", "refactor"].includes(kind);
  const automationEvaluations = Array.isArray(automation.evaluations) ? automation.evaluations : [];
  const policyCases = Array.isArray(automation.cases) ? automation.cases : [];
  const reasons = [];
  if (!task.task_id) reasons.push("현재 ActiveTask가 없습니다.");
  if (["P0", "P1"].includes(priority)) reasons.push(`${priority} 중요도 작업이라 시작 전 승인 대상입니다.`);
  if (["high", "critical"].includes(risk)) reasons.push(`${task.risk} 위험도 작업이라 자동 진행보다 사람 판단이 우선입니다.`);
  if (["implementation", "data", "runtime", "schema", "refactor"].includes(kind)) reasons.push(`${task.kind} 종류 작업은 파일/런타임 영향 가능성이 있어 범위 확인이 필요합니다.`);
  if (runner.stop_reason === "completion_review_required") reasons.push("완료 검토 gate에서 결과 수락 여부를 결정해야 합니다.");
  if (completion.state === "needs_human_decision") reasons.push("CompletionReport가 사람 결정을 요구합니다.");
  if (!reasons.length) reasons.push("현재 명시 승인 없이도 읽기/검토 중심으로 진행 가능한 상태입니다.");

  return {
    approval_impact_plan_id: makeStudioId("AIP", task.task_id || "approval"),
    task_id: task.task_id || "",
    task_title: task.title || "",
    current_meaning: "승인 버튼을 누르기 전에 무엇을 허용하고 무엇은 여전히 금지되는지 확인하는 읽기 전용 점검입니다.",
    approval_required: approvalRequired,
    why_approval_is_or_is_not_required: reasons,
    approving_allows: task.task_id
      ? [
          "선택한 task를 승인된 범위 안에서 실행 대상으로 삼을 수 있습니다.",
          "정책이 허용하면 PC Runner 또는 직원 실행 계획으로 이어갈 수 있습니다.",
          "검증 자료와 완료 판단 gate까지 진행할 수 있습니다.",
        ]
      : ["승인할 ActiveTask가 없습니다."],
    approving_does_not_allow: [
      "승인 범위를 벗어난 파일 수정",
      "schema/save/runtime 경계 변경을 숨겨서 진행",
      "검증 없는 완료 선언",
      "자동 task done, commit, push",
      "공식 설정 확정",
    ],
    what_changes_after_approval: [
      "승인 기록이 남고 다음 실행 gate에서 승인 근거로 사용됩니다.",
      "실행이 시작되더라도 완료, 최종화, commit/push는 별도 gate로 남습니다.",
      "범위가 바뀌면 새 승인이 필요합니다.",
    ],
    automation_snapshot: {
      policy_version: automation.policy_version || "unknown",
      case_count: policyCases.length,
      latest_evaluation_count: automationEvaluations.length,
      can_expand_automation_without_review: false,
      note: "자동 진행 확대는 별도 정책 검증과 Human Director 승인 후에만 가능합니다.",
    },
    director_checklist: [
      "승인 대상 task 제목과 범위가 내가 의도한 일인가?",
      "바뀔 수 있는 파일/데이터/런타임 경계가 보이는가?",
      "승인하지 않는 항목이 충분히 명확한가?",
      "실패 시 수정 요청이나 보류로 되돌릴 수 있는가?",
    ],
    safety: {
      read_only: true,
      approval_written: false,
      runner_started: false,
      task_done_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildDirectorSurfaceMap() {
  const surfaces = [
    ["home", "홈", "Human Director", "오늘 볼 일과 다음 행동을 확인합니다.", ["판단 대기 확인", "직원 상태 확인", "최근 검증 자료 확인"], false],
    ["goals", "새 안건", "Human Director", "큰 목표를 Director Brief로 정리하고 자문, 업무, 결정 후보로 쪼갭니다.", ["브리프 미리보기", "브리프 저장", "후보 생성"], false],
    ["inbox", "감독자 결정함", "Human Director", "승인, 완료, 채택 후보, 커밋 판단을 한곳에서 처리합니다.", ["승인+실행", "완료 판단", "채택 후보 검토", "commit/push 판단"], false],
    ["meetings", "자문실", "Human Director / Creative Director", "AI 직원 의견과 반박을 모아 후속 업무 후보와 감독자 판단 후보로 정리합니다.", ["자문판 보기", "내 의견 기록", "다음 AI 발언 받기", "업무 후보 만들기"], false],
    ["runs", "직원 보고서", "Human Director / Reviewer", "AI 직원 산출물을 보고 채택 후보로 넘깁니다.", ["보고서 보기/만들기", "채택 후보 미리보기", "채택 후보로 넘기기"], false],
    ["work", "업무 지시", "Human Director / Producer", "업무 지시를 직원 실행이나 AIWorkflow task로 넘깁니다.", ["인수인계 점검", "직원 자료 미리보기", "직원 실행 계획", "작업 목록에 넣기"], false],
    ["knowledge", "LLM Wiki", "Human Director / Documentation Keeper", "제안, 감독자 판단, 참고 기록, 공식 설정 후보를 회사 기억으로 구분합니다.", ["전환 계획", "공식 설정 충돌 점검", "제안/기억/결정 원본 확인"], false],
    ["evidence", "검증 자료", "Human Director / Reviewer", "완료 판단에 필요한 검증 자료를 확인합니다.", ["완료 근거 점검", "완료 판단안", "보고서 열기"], false],
    ["diff", "변경 검토", "Human Director / Release Manager", "현재 변경 파일을 골라 commit/push 범위를 정합니다.", ["파일 선택", "선택 commit", "선택 commit+push"], false],
    ["devlog", "DevLog", "Human Director / Documentation Keeper", "작업 배경, 검증, 남은 위험 기록을 확인합니다.", ["작업 기록 확인", "원본 열기"], false],
    ["toolbox", "도구함", "Human Director / Maintainer", "자주 쓰는 유지보수 도구만 실행합니다.", ["Studio 재시작", "Discord bot 재시작", "팀 데이터 배포", "점검 도구 실행"], false],
    ["project", "프로젝트", "참고/추적", "현재 프로젝트와 실행 경계를 확인합니다.", ["실행 준비 점검", "프로젝트 프로필 확인"], false],
    ["departments", "부서", "참고/추적", "부서 책임과 산출물 경계를 봅니다.", ["부서 책임 확인", "관련 직원/업무/자문 이동"], false],
    ["staff", "AI 직원", "참고/추적", "직원 역할, 권한, 금지 행위, 산출물 책임을 봅니다.", ["운영 점검", "직원 보고서 보기", "자문/업무 이동"], false],
    ["timeline", "실행 타임라인", "참고/추적", "자문, 업무, 직원 보고서, Runner 기록을 시간순으로 봅니다.", ["관련 화면 이동", "원본 기록 확인"], false],
    ["systems", "시스템", "관리자/내부", "도구 adapter와 도구 요청 경계를 점검합니다.", ["실행 준비 점검", "도구 요청서 작성"], true],
    ["policy", "정책", "관리자/내부", "승인 영향과 자동 진행 준비도를 점검합니다.", ["승인 영향 점검", "자동 진행 준비도"], true],
  ].map(([page_id, label, audience, purpose, actions, internal]) => ({
    page_id,
    label,
    audience,
    purpose,
    primary_actions: actions,
    internal_or_admin: internal,
  }));
  const surfaceLine = (surface) =>
    `${surface.label}: ${surface.purpose} 할 일: ${surface.primary_actions.join(", ")}`;
  const directorSurfaces = surfaces.filter((item) => !item.internal_or_admin).map(surfaceLine);
  const internalSurfaces = surfaces.filter((item) => item.internal_or_admin).map(surfaceLine);

  return {
    director_surface_map_id: makeStudioId("DSM", "director-surfaces"),
    current_meaning: "Studio 화면 구성이 의도대로 정리되어 있는지 확인하는 내부용 점검입니다. 일반 작업 중 매번 볼 필요는 없습니다.",
    total_surfaces: surfaces.length,
    human_director_surfaces: surfaces.filter((item) => !item.internal_or_admin).length,
    internal_surfaces: surfaces.filter((item) => item.internal_or_admin).length,
    recommended_home_order: ["home", "goals", "inbox", "meetings", "runs", "work", "knowledge", "evidence", "diff", "devlog", "toolbox"],
    surfaces,
    director_surfaces: directorSurfaces,
    internal_admin_surfaces: internalSurfaces,
    product_rules: [
      "Human Director가 매일 쓰는 화면은 사이드바 기본 영역에 둡니다.",
      "내부/관리자용 화면은 접힌 내부 도구 아래에 둡니다.",
      "버튼은 기존 gate를 우회하지 않고, 읽기 전용 점검과 쓰기 실행을 구분합니다.",
      "화면 설명은 사용자가 할 수 있는 일을 기준으로 짧게 유지합니다.",
    ],
    safety: {
      read_only: true,
      ui_changed: false,
      task_state_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildStudioEvalPlan() {
  return {
    studio_eval_plan_id: makeStudioId("SEP", "studio-eval"),
    current_meaning: "Studio 변경 후 무엇을 확인해야 제품 화면을 믿고 쓸 수 있는지 정리하는 읽기 전용 smoke/eval 계획입니다.",
    automated_checks: [
      "node --check tools\\aiworkflow\\studio_director_console_server.js",
      "node tools\\aiworkflow\\studio_director_console_server.js --once --json",
      "POST /api/studio/smoke/status",
      "POST /api/studio/company/runtime-readiness",
      "POST /api/studio/ui/surface-map",
      "POST /api/studio/recovery/plan",
      "POST /api/studio/traceability/map",
      "POST /api/studio/model/routing-plan",
    ],
    browser_smoke_routes: [
      "/#home",
      "/#goals",
      "/#project",
      "/#inbox",
      "/#meetings",
      "/#work",
      "/#knowledge",
      "/#evidence",
      "/#timeline",
      "/#diff",
    ],
    manual_director_checks: [
      "홈에서 다음 행동이 이해되는지 확인합니다.",
      "새 안건에서 후보가 실행이 아니라 브리프 기록으로 보이는지 확인합니다.",
      "자문실에서 자문판과 후속 업무 흐름이 보이는지 확인합니다.",
      "업무 지시에서 인수인계 점검, 직원 자료, 직원 실행 계획 차이가 보이는지 확인합니다.",
      "검증 자료에서 완료 근거 점검과 완료 판단안 차이가 보이는지 확인합니다.",
      "변경 검토에서 선택 commit/push만 가능하다는 점이 보이는지 확인합니다.",
    ],
    pass_criteria: [
      "필수 schema가 모두 존재합니다.",
      "Home, Project, Work, Evidence, Timeline 화면의 핵심 버튼이 보입니다.",
      "읽기 전용 계획 API는 task state, source, commit/push를 바꾸지 않습니다.",
      "사용자-facing 문구는 검증 자료, 승인 영향, 완료 판단 의미를 명확히 설명합니다.",
    ],
    safety: {
      read_only: true,
      tests_executed: false,
      source_changed: false,
      task_state_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}
module.exports = {
  buildApprovalImpactPlan,
  buildCompletionDecisionPlan,
  buildCompletionEvidenceChecklist,
  buildDirectorSurfaceMap,
  buildKnowledgeTransitionPlan,
  buildMeetingBoard,
  buildMeetingFacilitationPlan,
  buildMeetingRunbook,
  buildStudioEvalPlan,
};

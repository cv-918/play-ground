"use strict";

function renderSessionsPageShell() {
  return `
    <section class="page-shell page-shell-wide">
      <div class="page-title-row">
        <div>
          <h2>자문 세션</h2>
          <p>큰 방향을 말하고 AI 직원들과 대화하면서 결정 후보와 업무 후보를 정리합니다.</p>
        </div>
      </div>

      <div class="consultation-layout">
        <aside class="consultation-sidebar">
          <div class="panel">
            <div class="panel-title-row">
              <h3>새 자문 시작</h3>
              <span class="badge">Human Director</span>
            </div>
            <p class="muted small">
              무엇을 만들고 싶은지 자연어로 적으면 Studio가 방향 브리프와 자문 세션을 함께 만듭니다.
              이 단계는 기록만 만들며 source, task, git은 바꾸지 않습니다.
            </p>
            <label>무엇을 만들고 싶은가</label>
            <textarea id="goalCreateText" rows="5" placeholder="예: 초반 10분 플레이 루프를 더 명확하게 만들고, 필요한 기획/구현/검증 업무를 나눠줘."></textarea>
            <label>제약 조건</label>
            <textarea id="goalCreateConstraints" rows="3" placeholder="예: 승인 없는 소스/데이터 수정 금지&#10;Discord 기능 제외&#10;게임의 현재 톤 유지"></textarea>
            <div class="button-row">
              <button id="goalBundleSubmit" class="primary">자문 세션 시작</button>
              <button id="goalPlanSubmit">브리프만 미리보기</button>
              <button id="goalStoreSubmit" class="hidden">브리프 저장</button>
            </div>
            <p class="muted small">
              자문 세션 시작: 브리프와 대화방만 만듭니다. 구현/커밋은 별도 승인 흐름을 탑니다.
            </p>
          </div>

          <div class="panel">
            <div class="panel-title-row">
              <h3>자문 목록</h3>
              <span id="meetingCount" class="badge">0</span>
            </div>
            <input id="meetingSearch" placeholder="세션 제목, ID 검색" />
            <select id="meetingStatusFilter">
              <option value="__active__">진행 중/중단</option>
              <option value="__all__">모든 세션</option>
              <option value="in_progress">진행 중</option>
              <option value="director_decision_needed">판단 필요</option>
              <option value="follow_up_tasking">후속 업무</option>
              <option value="closed">종료</option>
            </select>
            <div id="consultationSessionList" class="session-list"></div>
          </div>
        </aside>

        <section class="consultation-main">
          <div class="panel consultation-chat-panel">
            <div class="panel-title-row">
              <div>
                <h3 id="activeConsultationTitle">자문 세션을 선택하세요</h3>
                <p id="consultationStatus" class="muted small">왼쪽에서 세션을 고르거나 새 자문을 시작하세요.</p>
              </div>
              <span id="activeConsultationBadge" class="badge">대기</span>
            </div>
            <div id="consultationChatTimeline" class="chat-timeline"></div>
            <div class="chat-composer">
              <textarea id="consultationComposer" rows="3" placeholder="자연어로 말하세요. 예: 기획자랑 QA 의견을 받아봐. /summon tools_engineer 처럼 보조 명령도 사용할 수 있습니다."></textarea>
              <div class="composer-bar">
                <select id="consultationStaffSelect"></select>
                <div class="button-row">
                  <button id="consultationSend" class="primary">내 발언 보내기</button>
                  <button id="consultationAskStaff">AI 직원 의견 받기</button>
                </div>
              </div>
              <p class="muted small">
                자연어는 Human Director 발언으로 저장됩니다. /ask, /summon, /work, /decision, /close 명령은 보조로 사용할 수 있습니다.
              </p>
            </div>
          </div>
        </section>

        <aside class="consultation-context">
          <div class="panel">
            <div class="panel-title-row">
              <h3>현재 안건</h3>
              <span class="badge">요약</span>
            </div>
            <div id="consultationSessionSummary" class="stack"></div>
          </div>

          <div class="panel">
            <h3>참가 직원</h3>
            <div id="consultationParticipants" class="stack"></div>
          </div>

          <div class="panel">
            <h3>남은 질문</h3>
            <div id="consultationOpenQuestions" class="stack"></div>
          </div>

          <div class="panel">
            <h3>다음 단계 후보</h3>
            <p class="muted small">
              후보 생성은 Studio 기록만 만듭니다. source, task 실행, commit/push는 하지 않습니다.
            </p>
            <div class="button-stack">
              <button id="consultationDecision" class="primary">방향 판단으로 넘기기</button>
              <button id="consultationWork">업무 후보 만들기</button>
              <button id="consultationClose" class="danger-secondary">자문 종료</button>
            </div>
            <div id="consultationCandidates" class="stack"></div>
          </div>

          <div class="panel">
            <h3>안전 상태</h3>
            <div id="consultationSafety" class="stack"></div>
          </div>
        </aside>
      </div>

      <section class="panel hidden" id="goalPreviewPanel">
        <div class="panel-title-row">
          <h3>브리프 미리보기</h3>
          <span id="goalPreviewBadge" class="badge">대기</span>
        </div>
        <div id="goalPreview"></div>
      </section>

      <section class="panel hidden">
        <span id="goalPlanCount">0</span>
        <div id="directorGoalPlans"></div>
        <input id="meetingCreateTopic" />
        <select id="meetingCreateType"></select>
        <select id="meetingCreateChair"></select>
        <div id="meetingTypeHelp"></div>
        <div id="meetingPresetButtons"></div>
        <div id="meetingParticipantPicker"></div>
        <textarea id="meetingCreateAgenda"></textarea>
        <textarea id="meetingCreateConstraints"></textarea>
        <textarea id="meetingCreateImpact"></textarea>
        <button id="meetingCreateSubmit"></button>
        <input id="meetingTurnId" />
        <select id="meetingTurnSpeaker"></select>
        <select id="meetingTurnType"></select>
        <textarea id="meetingTurnContent"></textarea>
        <button id="meetingTurnSubmit"></button>
        <div id="meetings"></div>
      </section>

      <section id="meetingResultPanel" class="result-panel hidden">
        <div class="panel-title-row">
          <h3>자문 실행 결과</h3>
          <button id="meetingResultClose">닫기</button>
        </div>
        <div id="meetingResult"></div>
      </section>
    </section>
  `;
}

module.exports = {
  renderSessionsPageShell,
};

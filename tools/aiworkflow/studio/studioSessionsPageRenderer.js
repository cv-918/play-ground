"use strict";

function renderSessionsPageShell() {
  return `
    <section class="page page-shell page-shell-wide" data-page="sessions">
      <div class="consultation-layout">
        <aside class="consultation-sidebar">
          <div class="card">
            <div class="section-title">
              <h3>대화 기록</h3>
              <div class="row">
                <button class="secondary" data-consultation-new="true">새 대화</button>
                <span id="meetingCount" class="pill">0</span>
              </div>
            </div>
            <p class="muted small">이전 대화를 선택하면 가운데 채팅창에 기존 로그와 이어가기 상태가 표시됩니다.</p>
            <input id="meetingSearch" placeholder="대화 제목 검색" />
            <select id="meetingStatusFilter">
              <option value="__active__">진행 중 / 중단</option>
              <option value="__all__">모든 대화</option>
              <option value="in_progress">진행 중</option>
              <option value="director_decision_needed">판단 필요</option>
              <option value="follow_up_tasking">후속 실행 요청</option>
              <option value="closed">종료</option>
            </select>
            <div id="consultationSessionList" class="session-list"></div>
          </div>
        </aside>

        <section class="consultation-main">
          <div class="card consultation-chat-panel">
            <div class="section-title">
              <div>
                <h3 id="activeConsultationTitle">대화하기</h3>
                <p id="consultationStatus" class="muted small">첫 메시지를 보내면 Studio 대화 기록만 자동 생성됩니다.</p>
                <p id="activeConsultationInfo" class="muted small">새 대화 대기 중</p>
              </div>
              <span id="activeConsultationBadge" class="badge">대기</span>
            </div>
            <div id="consultationChatTimeline" class="chat-timeline"></div>
            <div class="chat-composer">
              <div id="consultationSlashMenu" class="slash-command-menu" hidden></div>
              <textarea id="consultationComposer" rows="3" placeholder="자연어로 바로 말하세요. 예: 초반 10분 플레이 루프를 더 명확하게 만들고 싶어. 기획자랑 QA 의견도 받아봐."></textarea>
              <div class="composer-bar">
                <select id="consultationStaffSelect"></select>
                <div class="button-row">
                  <button id="consultationSend" class="primary">말하기</button>
                  <button id="consultationAskStaff">추가 의견 받기</button>
                </div>
              </div>
              <p class="muted small">
                Enter로 보내기 · Shift+Enter는 줄바꿈. 말하기는 내 발언만 기록합니다. 슬래시 명령은 / 입력 시 위에 표시됩니다. AI 직원 응답은 추가 의견 받기 또는 /ask, /summon으로 요청합니다. 후보 정리는 /decision, /work, 종료는 /close를 사용합니다.
              </p>
            </div>
          </div>
        </section>

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
        <input id="goalCreateText" />
        <textarea id="goalCreateConstraints"></textarea>
        <button id="goalBundleSubmit"></button>
        <button id="goalPlanSubmit"></button>
        <button id="goalStoreSubmit"></button>
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

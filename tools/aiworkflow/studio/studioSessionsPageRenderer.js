"use strict";

function renderSessionsPageShell() {
  return `
    <section class="page page-shell page-shell-wide" data-page="sessions">
      <div class="card">
        <div class="section-title"><h2>Conversation: 이 페이지의 역할</h2><span class="pill">record + candidates</span></div>
        <p class="muted small"><strong>Conversation.</strong> 자연어로 의도, 문제, 선택지를 구체화하고 필요할 때만 결정이나 실행 요청 후보로 넘깁니다.</p>
        <p class="muted small">대화는 기록과 후보만 만들며, 소스 수정/실행/commit/push는 별도 승인 없이는 하지 않습니다.</p>
      </div>

      <div class="consultation-layout">
        <aside class="consultation-sidebar">
          <div class="card">
            <div class="section-title">
              <h3>대화 시작</h3>
              <span class="pill">Human Director</span>
            </div>
            <p class="muted small">
              주제를 미리 정리하거나 가운데 채팅창에 바로 말할 수 있습니다. 첫 메시지는 Studio 대화 기록으로만 저장됩니다.
            </p>
            <label>대화 주제</label>
            <textarea id="goalCreateText" rows="5" placeholder="예: 초반 10분 플레이 루프를 더 명확하게 만들고, 필요한 기획/구현/검증 업무를 나눠줘."></textarea>
            <label>제약 조건</label>
            <textarea id="goalCreateConstraints" rows="3" placeholder="예:&#10;승인 없는 소스/데이터 수정 금지&#10;Discord 기능 제외&#10;현재 게임 방향은 유지"></textarea>
            <div class="button-row">
              <button id="goalBundleSubmit" class="primary">주제로 대화 시작</button>
              <button id="goalPlanSubmit">브리프만 미리보기</button>
              <button id="goalStoreSubmit" class="hidden">브리프 저장</button>
            </div>
            <p class="muted small">
              주제로 시작하면 브리프와 대화 기록만 만듭니다. 구현과 커밋은 별도 승인 흐름을 탑니다.
            </p>
          </div>

          <div class="card">
            <div class="section-title">
              <h3>대화 기록</h3>
              <span id="meetingCount" class="pill">0</span>
            </div>
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
                <h3 id="activeConsultationTitle">바로 대화를 시작하세요</h3>
                <p id="consultationStatus" class="muted small">아래 채팅창에 첫 메시지를 보내면 Studio 대화 기록이 자동으로 만들어집니다.</p>
              </div>
              <span id="activeConsultationBadge" class="badge">대기</span>
            </div>
            <div id="consultationChatTimeline" class="chat-timeline"></div>
            <div class="chat-composer">
              <textarea id="consultationComposer" rows="3" placeholder="자연어로 바로 말하세요. 예: 초반 10분 플레이 루프를 더 명확하게 만들고 싶어. 기획자랑 QA 의견도 받아봐."></textarea>
              <div class="composer-bar">
                <select id="consultationStaffSelect"></select>
                <div class="button-row">
                  <button id="consultationSend" class="primary">말하기</button>
                  <button id="consultationAskStaff">추가 의견 받기</button>
                </div>
              </div>
              <p class="muted small">
                첫 메시지를 보내면 대화가 자동으로 열립니다. 필요한 직원 의견, 방향 판단, 실행 요청 후보는 자연어로 요청하세요.
              </p>
            </div>
          </div>
        </section>

        <aside class="consultation-context">
          <div class="card">
            <div class="section-title">
              <h3>현재 맥락</h3>
              <span class="pill">요약</span>
            </div>
            <div id="consultationSessionSummary" class="stack"></div>
          </div>

          <div class="card">
            <h3>참가 직원</h3>
            <div id="consultationParticipants" class="stack"></div>
          </div>

          <div class="card">
            <h3>남은 질문</h3>
            <div id="consultationOpenQuestions" class="stack"></div>
          </div>

          <div class="card">
            <h3>다음 단계 후보</h3>
            <p class="muted small">
              후보 생성은 Studio 기록만 만듭니다. 소스 수정, 실행, commit/push는 별도 승인 없이는 하지 않습니다.
            </p>
            <div class="button-stack">
              <button id="consultationDecision" class="primary">방향 판단으로 넘기기</button>
              <button id="consultationWork">실행 요청 후보 만들기</button>
              <button id="consultationClose" class="danger-secondary">대화 종료</button>
            </div>
            <div id="consultationCandidates" class="stack"></div>
          </div>

          <div class="card">
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

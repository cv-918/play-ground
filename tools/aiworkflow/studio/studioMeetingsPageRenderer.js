#!/usr/bin/env node
"use strict";

function renderMeetingsPageShell() {
  return `        <section class="page" data-page="meetings">
          <div class="card">
            <h2>이 페이지의 역할</h2>
            <ul class="small">
              <li>안건 시작에서 정리된 방향을 바탕으로 AI 직원들의 관점, 질문, 반박을 모으는 자문 단계입니다.</li>
              <li>자문 발언은 자문 기록에만 남습니다. 공식 설정, task, git은 직접 바꾸지 않습니다.</li>
              <li>충분히 논의되면 실행할 일은 업무 후보로, 방향 판단은 감독자 결정함으로 넘깁니다.</li>
            </ul>
          </div>
          <div class="card">
            <div class="section-title"><h2>자문 흐름</h2><span class="pill">권장 순서</span></div>
            <ol class="small">
              <li>안건 시작에서 만든 Director Brief 또는 직접 논의할 주제를 고릅니다.</li>
              <li>참가 직원을 정해 자문 세션을 만듭니다.</li>
              <li>내 의견을 기록하거나 다음 AI 발언을 받아 관점을 모읍니다.</li>
              <li>자문판에서 최근 발언, 남은 질문, 쟁점을 확인합니다.</li>
              <li>실행할 일은 업무 후보로 만들고, 방향 판단은 감독자 결정함에 남깁니다.</li>
              <li>더 논의할 것이 없으면 자문 세션을 종료합니다.</li>
            </ol>
          </div>
          <div class="card">
            <div class="section-title"><h2>자문 세션 만들기</h2><span class="pill">MeetingSession</span></div>
            <p class="small muted">보통은 안건 시작에서 만든 브리프를 보고 이어서 자문을 엽니다. 직접 만드는 경우에도 이 세션은 자문 기록만 만들며 실행을 시작하지 않습니다.</p>
            <div class="form-grid">
              <label>안건 / 논의 주제<input id="meetingCreateTopic" placeholder="예: 초반 10분 플레이 루프 방향 자문"></label>
              <label>자문 종류<select id="meetingCreateType"></select></label>
              <label>의장<select id="meetingCreateChair"></select></label>
            </div>
            <div id="meetingTypeHelp" class="inline-help"></div>
            <div class="form-subsection">
              <h3>추천 참가자 조합</h3>
              <p class="small muted">자문 목적에 맞는 기본 조합을 누르면 참가 직원과 의장이 자동으로 채워집니다.</p>
              <div id="meetingPresetButtons" class="preset-row"></div>
            </div>
            <div class="form-subsection">
              <h3>참가 직원</h3>
              <p class="small muted">표시명은 한글 직책명 중심으로 보여주고, 자문 기록에는 기존 staff/role ID가 저장됩니다.</p>
              <div id="meetingParticipantPicker" class="staff-picker"></div>
            </div>
            <div id="meetingCreateImpact" class="impact-note"></div>
            <textarea id="meetingCreateAgenda" placeholder="안건을 줄바꿈으로 입력하세요. 예:&#10;현재 플레이 루프의 약점 확인&#10;후속 업무 지시 후보 정리"></textarea>
            <textarea id="meetingCreateConstraints" placeholder="제약 조건을 줄바꿈으로 입력하세요. 예:&#10;승인 없는 공식 설정 확정 금지&#10;구현 작업 직접 생성 금지"></textarea>
            <div class="row"><button class="good" id="meetingCreateSubmit">자문 세션 생성</button></div>
            <p class="small muted">자문 세션 생성은 MeetingSession 기록만 만듭니다. 공식 설정 확정, task 생성, git 변경은 하지 않습니다.</p>
          </div>
          <div class="card">
            <div class="section-title"><h2>내 의견 기록</h2><span class="pill">Human Director</span></div>
            <div class="form-grid">
              <label>자문 ID<input id="meetingTurnId" placeholder="MEET-..."></label>
              <label>기록 주체<select id="meetingTurnSpeaker"></select></label>
              <label>발언 종류<select id="meetingTurnType"></select></label>
            </div>
            <p class="small muted">이 입력칸은 Human Director인 내 의견을 자문 기록에 남기는 곳입니다. AI 직원 발언은 아래 자문 카드의 <strong>다음 AI 발언 받기</strong>를 사용하세요.</p>
            <textarea id="meetingTurnContent" placeholder="내 의견, 질문, 반박, 정리 메모를 입력하세요."></textarea>
            <div class="row"><button class="good" id="meetingTurnSubmit">내 의견 기록</button></div>
          </div>
          <div class="control-bar">
            <input id="meetingSearch" placeholder="자문 주제, ID 검색">
            <select id="meetingStatusFilter"></select>
          </div>
          <div class="card">
            <div class="section-title"><h2>자문 버튼 안내</h2><span class="pill">기록 전용</span></div>
            <div class="grid">
              <div class="item">
                <h3>1. 자문 상태 보기</h3>
                <ul class="small">
                  <li><strong>자문판 보기</strong>: 최근 발언, 다음에 받을 관점, 남은 질문, 후속 업무 후보를 한 번에 확인합니다.</li>
                </ul>
              </div>
              <div class="item">
                <h3>2. 의견 더 모으기</h3>
                <ul class="small">
                  <li><strong>다음 AI 발언 받기</strong>: 추천된 AI 직원의 의견을 하나 더 받습니다. 공식 설정, task, git은 바꾸지 않습니다.</li>
                  <li><strong>내 의견 기록</strong>: 선택한 자문 ID를 위 입력칸에 넣고, Human Director인 내 의견만 자문 기록에 남깁니다.</li>
                </ul>
              </div>
              <div class="item">
                <h3>3. 결과 넘기기</h3>
                <ul class="small">
                  <li><strong>업무 후보 만들기</strong>: 자문에서 나온 “해야 할 일”을 업무 지시 후보로 저장합니다. 구현, task 생성, git 변경은 시작하지 않습니다.</li>
                  <li><strong>방향 판단으로 남기기</strong>: 자문에서 정한 결론이나 방향을 감독자 결정함에 남깁니다. 공식 설정 확정이나 구현 지시는 별도입니다.</li>
                  <li><strong>자문 종료</strong>: 자문 기록의 진행 상태만 닫습니다. 소스, task, git은 바꾸지 않습니다.</li>
                </ul>
              </div>
            </div>
          </div>
          <div id="meetingResultPanel" class="card result-panel" hidden>
            <div class="section-title"><h2>자문 실행 결과</h2><button id="meetingResultClose" class="secondary">닫기</button></div>
            <div id="meetingResult" class="list"></div>
          </div>
          <div id="meetings" class="list"></div>
        </section>

`;
}

module.exports = { renderMeetingsPageShell };

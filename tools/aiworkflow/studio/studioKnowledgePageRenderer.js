#!/usr/bin/env node
"use strict";

function renderKnowledgePageShell() {
  return `        <section class="page" data-page="knowledge">
          <div class="card">
            <div class="section-title"><h2>이 페이지의 역할</h2><button class="secondary" data-action="canon-conflict-report">공식 설정 충돌 점검</button></div>
            <ul class="small">
              <li><strong>기록함은 장기 지식 정리 도구가 아닙니다.</strong> Studio 안에서는 감독자 판단, 참고 기록, 공식 설정 후보만 최소한으로 다룹니다.</li>
              <li><strong>제안함</strong>: AI 직원이나 감독자가 낸 아이디어를 임시로 모아둡니다. 이 단계에서는 공식 설정도, 구현 지시도 아닙니다.</li>
              <li><strong>감독자 판단</strong>: 제안을 채택, 수정 요청, 반려, 보류 중 하나로 정리합니다. 판단 기록만 만들며 구현과 commit/push는 하지 않습니다.</li>
              <li><strong>참고 기록</strong>: 이후 AI 직원이 참고할 메모입니다. 일반 기록은 참고용이고, 공식 설정 후보는 별도 검토 대상입니다.</li>
              <li><strong>공식 설정 후보</strong>: 게임 세계관, 캐릭터, 규칙처럼 나중에 canon으로 확정할 수 있는 항목입니다. Studio UX나 운영 개선 제안은 공식 설정 후보로 남길 수 없습니다.</li>
              <li><strong>외부 지식 기반</strong>: Obsidian/Hermes 같은 장기 지식 정리는 별도 지식 도구의 책임입니다. 이 화면은 장기 지식 편집기가 아닙니다.</li>
              <li><strong>Hermes 조사 결과</strong>: 웹 조사나 브라우저 확인 결과는 참고 기록으로만 가져옵니다. 자동으로 공식 설정, 결정, task가 되지 않습니다.</li>
            </ul>
          </div>
          <details class="internal-panel">
            <summary>수동 기록 추가</summary>
            <p class="small muted">보통은 제안 카드나 결정 카드의 버튼으로 기록을 남깁니다. 직접 입력이 필요할 때만 이 영역을 열어 사용하세요.</p>
            <div class="grid">
            <div class="item">
              <div class="section-title"><h2>제안 만들기</h2><span class="pill">아이디어</span></div>
              <p class="small muted">감독자가 직접 떠올린 아이디어를 검토 대상으로 저장합니다. 새 제안은 Human Director(나)의 제안으로 기록됩니다. 저장만으로 공식 설정, task, git은 바뀌지 않습니다.</p>
              <div class="form-grid">
                <label>제안 제목 <span class="required-mark">필수</span><input id="proposalCreateTitle" placeholder="예: 초반 생존 동기 방향"></label>
              </div>
              <input id="proposalCreateAgent" type="hidden" value="human_director">
              <label class="field-block">제안 요약 <span class="required-mark">필수</span><span class="field-help">무엇을 제안하는지 한두 문장으로 적습니다.</span><textarea id="proposalCreateSummary" placeholder="예: 초반 10분 안에 생존 압박과 이동 목표가 드러나도록 연출 방향을 잡는다."></textarea></label>
              <label class="field-block">제안 이유 <span class="optional-mark">선택</span><span class="field-help">이 제안이 왜 필요한지, 어떤 문제를 줄이는지 적습니다.</span><textarea id="proposalCreateRationale" placeholder="예: 플레이어가 초반 목표를 늦게 이해하면 반복 플레이 동기가 약해진다."></textarea></label>
              <label class="field-block">주의할 점 <span class="optional-mark">선택</span><span class="field-help">채택 전에 확인해야 할 위험이나 충돌 가능성을 한 줄에 하나씩 적습니다.</span><textarea id="proposalCreateRisks" placeholder="예:&#10;기존 세계관과 충돌하지 않아야 함&#10;초반 튜토리얼 분량이 늘어나지 않아야 함"></textarea></label>
              <div class="row"><button class="good" id="proposalCreateSubmit">제안 저장</button></div>
            </div>
            <div class="item">
              <div class="section-title"><h2>결정 기록하기</h2><span class="pill">결정</span></div>
              <p class="small muted">제안함에 있는 제안에 대해 감독자의 판단을 남깁니다. 회의나 업무 지시는 각 화면의 전용 버튼에서 처리합니다. 기록만 남기며 구현이나 커밋은 하지 않습니다.</p>
              <div class="form-grid">
                <label>판단 대상 <span class="required-mark">필수</span><select id="decisionCreateTarget"></select></label>
                <label>결정 종류 <span class="required-mark">필수</span><select id="decisionCreateType"></select></label>
              </div>
              <p id="decisionCreateTargetHelp" class="small muted">판단할 제안을 선택하면 전체 제목과 분류를 여기에서 확인할 수 있습니다.</p>
              <p id="decisionCreateTypeHelp" class="small muted"></p>
              <label class="field-block">판단 내용 <span class="required-mark">필수</span><span class="field-help">이 대상을 어떻게 처리할지 한두 문장으로 적습니다.</span><textarea id="decisionCreateSummary" placeholder="예: Home UX 개선 방향은 채택한다. 다만 구현은 별도 업무 지시와 검증을 거친다."></textarea></label>
              <label class="field-block">이번 판단으로 허용하는 것 <span class="optional-mark">선택</span><span class="field-help">허용 범위가 따로 있을 때만 적습니다.</span><textarea id="decisionCreateAccepted" placeholder="예: Home 화면에서 지금 결정할 일과 다음 행동을 더 잘 보이게 개선하는 방향"></textarea></label>
              <label class="field-block">아직 허용하지 않는 것 / 조건 <span class="optional-mark">선택</span><span class="field-help">범위 밖 내용이나 나중에 다시 확인할 조건이 있을 때만 적습니다.</span><textarea id="decisionCreateRejected" placeholder="예: 소스 수정, task 실행, commit/push는 이 판단만으로 하지 않는다."></textarea></label>
              <input id="decisionCreateConditions" type="hidden" value="">
              <div class="row"><button class="good" id="decisionCreateSubmit">결정 저장</button></div>
            </div>
            <div class="item">
              <div class="section-title"><h2>참고 기록 / 공식 설정 기록하기</h2><span class="pill">프로젝트 지식</span></div>
              <p class="small muted">AI 직원이 이후 참고할 프로젝트 지식을 저장합니다. 일반 기록은 참고용 메모이고, 공식 설정은 게임 세계관/규칙처럼 확정 근거로 쓰일 수 있으므로 신중하게 남깁니다.</p>
              <div class="form-grid">
                <label>범위 <span class="required-mark">필수</span><select id="memoryCreateScope"></select></label>
                <label>종류 <span class="required-mark">필수</span><select id="memoryCreateType"></select></label>
                <label>상태 <span class="required-mark">필수</span><select id="memoryCreateStatus"></select></label>
                <label>담당 직원 <span class="optional-mark">선택</span><select id="memoryCreateOwner"></select></label>
              </div>
              <label class="field-block">참고할 내용 <span class="required-mark">필수</span><span class="field-help">나중에 AI 직원이 참고해야 할 사실, 결정, 선호, 공식 설정을 적습니다.</span><textarea id="memoryCreateContent" placeholder="예: Dustland의 초반 목표는 생존 압박과 이동 목적을 빠르게 보여주는 방향을 우선 검토한다."></textarea></label>
              <label class="field-block">근거 ID <span class="optional-mark">선택</span><span class="field-help">이 참고 기록의 근거가 된 결정, 회의, 제안 ID를 적습니다.</span><input id="memoryCreateRefs" placeholder="예: DEC-..., MEET-..., PROP-..."></label>
              <div class="row"><button class="good" id="memoryCreateSubmit">참고 기록 저장</button></div>
            </div>
            <div class="item">
              <div class="section-title"><h2>Hermes 조사 결과 가져오기</h2><span class="pill">외부 조사</span></div>
              <p class="small muted">Hermes가 웹 검색이나 브라우저 확인으로 정리한 내용을 Studio 참고 기록으로 저장합니다. 저장해도 공식 설정, 감독자 결정, task, git은 바뀌지 않습니다.</p>
              <div class="form-grid">
                <label>조사 제목 <span class="required-mark">필수</span><input id="hermesImportTitle" placeholder="예: Hermes LLM Wiki 기능 확인"></label>
                <label>출처 URL 또는 세션 <span class="required-mark">필수</span><input id="hermesImportSource" placeholder="예: https://... 또는 hermes session 20260602-..."></label>
              </div>
              <label class="field-block">조사 요약 <span class="required-mark">필수</span><span class="field-help">Hermes가 확인한 핵심 내용을 사람이 읽기 좋게 붙여넣습니다.</span><textarea id="hermesImportSummary" placeholder="예: Hermes에는 persistent memory와 llm-wiki skill이 있으며, Studio 내부 Wiki 대신 외부 지식 정리 후보로 다룬다."></textarea></label>
              <label class="field-block">참고할 이유 <span class="optional-mark">선택</span><span class="field-help">이 자료를 나중에 왜 참고해야 하는지 적습니다.</span><textarea id="hermesImportReason" placeholder="예: Studio와 Hermes의 역할 분리를 정할 때 근거로 사용한다."></textarea></label>
              <label class="field-block">관련 회의/결정/업무 ID <span class="optional-mark">선택</span><span class="field-help">관련된 MEET, DEC, WO, PROP ID가 있으면 쉼표나 줄바꿈으로 적습니다.</span><input id="hermesImportRefs" placeholder="예: MEET-..., DEC-..., WO-..."></label>
              <div class="row"><button class="good" id="hermesImportSubmit">Hermes 조사 참고 기록 저장</button></div>
            </div>
            </div>
          </details>
          <div class="control-bar">
            <input id="knowledgeSearch" placeholder="제안, 결정, 참고 기록 검색">
            <select id="proposalDecisionFilter"></select>
            <select id="memoryStatusFilter"></select>
          </div>
          <div class="card">
            <div class="section-title"><h2>기록함 버튼 안내</h2><span class="pill">판단 기록</span></div>
            <div class="grid">
              <div class="item">
                <h3>검토만 할 때</h3>
                <ul class="small">
                  <li><strong>전환 계획</strong>: 이 제안을 업무, 판단 기록, 참고 기록 중 어디로 넘길 수 있는지 미리 봅니다. 기록은 만들지 않습니다.</li>
                </ul>
              </div>
              <div class="item">
                <h3>판단을 남길 때</h3>
                <ul class="small">
                  <li><strong>채택 기록</strong>: 아직 판단하지 않은 제안에만 표시됩니다. 이 제안을 방향으로 받아들였다는 판단을 남깁니다.</li>
                  <li><strong>공식 설정 검토 기록</strong>: 게임 설정/세계관 후보일 때만 표시됩니다. Studio UX 같은 운영 제안에는 사용할 수 없습니다.</li>
                  <li><strong>수정 요청</strong>: 지금 형태로는 부족하니 다시 다듬어야 한다는 결정 기록을 남깁니다.</li>
                  <li><strong>반려 기록</strong>: 채택하지 않는다는 판단을 남깁니다.</li>
                </ul>
              </div>
              <div class="item">
                <h3>이미 판단한 제안</h3>
                <ul class="small">
                  <li>이미 결정 기록이 있는 제안은 카드에서 채택/수정/반려 버튼을 숨깁니다.</li>
                  <li>같은 제안에 추가 판단을 남기려면 위의 <strong>결정 기록하기</strong>에서 제안을 선택하세요.</li>
                </ul>
              </div>
              <div class="item">
                <h3>결정 기록을 넘길 때</h3>
                <ul class="small">
                  <li><strong>전환 계획</strong>: 참고 기록이나 공식 설정으로 넘길 수 있는지 미리 봅니다. 기록은 만들지 않습니다.</li>
                  <li><strong>참고 기록으로 저장</strong>: AI 직원이 이후 작업에서 참고할 일반 기록을 만듭니다.</li>
                  <li><strong>공식 설정으로 저장</strong>: 게임 설정 후보에 대한 공식 설정 검토 결정에서만 표시됩니다.</li>
                </ul>
              </div>
            </div>
          </div>
          <div class="grid">
            <div class="card"><h2>제안함</h2><p class="muted">아직 감독자 판단을 기다리는 아이디어입니다. 제안 자체는 결정이나 공식 설정이 아닙니다.</p><div id="proposals" class="list"></div></div>
            <div class="card"><h2>감독자 결정</h2><p class="muted">Human Director가 채택, 수정 요청, 반려, 보류로 정리한 판단 기록입니다.</p><div id="decisions" class="list"></div></div>
            <div class="card"><h2>참고 기록 / 공식 설정 후보</h2><p class="muted">AI 직원이 참고할 메모와 나중에 canon으로 검토할 후보만 남깁니다.</p><div id="memories" class="list"></div></div>
          </div>
        </section>

`;
}

module.exports = { renderKnowledgePageShell };

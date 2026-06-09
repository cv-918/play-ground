#!/usr/bin/env node
"use strict";

function renderWorkPageShell() {
  return `        <section class="page" data-page="work">
          <section class="card">
            <div class="section-title"><h2>요청 작성</h2><span class="pill">Execution Request</span></div>
            <p class="muted small">AI에게 맡길 일의 목표, 범위, 제약, 결과물, 검증 방법을 실행 요청 형태로 고정합니다.</p>
            <div class="form-grid">
              <label>목표 <span class="required-mark">필수</span><input id="workCreateObjective" placeholder="예: Skill.json 로더 검증 계획 수립"></label>
              <label>담당 부서 <span class="required-mark">필수</span><select id="workCreateDepartment"></select></label>
              <label>상태<select id="workCreateStatus"></select></label>
            </div>
            <div id="workStatusHelp" class="inline-help"></div>
            <details class="dashboard-reference-section">
              <summary><h3>담당 직원</h3></summary>
              <p class="small muted">먼저 담당 부서를 고르면 그 부서의 AI 직원만 표시됩니다. 내부 식별자는 화면 판단을 방해하지 않도록 숨깁니다.</p>
              <div id="workAgentPicker" class="staff-picker"></div>
            </details>
            <div id="workCreateImpact" class="impact-note"></div>
            <label class="field-block">할 일 <span class="required-mark">필수</span><span class="field-help">이번 요청 안에서 실제로 다룰 내용을 한 줄에 하나씩 적습니다.</span><textarea id="workCreateScope" placeholder="예:&#10;Skill.json 로더가 파일을 읽는 흐름 확인&#10;검증에 필요한 최소 테스트 계획 작성"></textarea></label>
            <label class="field-block">제약 조건 <span class="optional-mark">선택</span><span class="field-help">건드리지 말 범위와 스코프 제한을 적습니다.</span><textarea id="workCreateNonGoals" placeholder="예:&#10;JSON schema 변경 금지&#10;게임 소스 직접 수정 금지"></textarea></label>
            <label class="field-block">기대 결과물 <span class="optional-mark">선택</span><span class="field-help">완료 후 받아야 하는 문서, 보고서, 계획, 검증 자료를 적습니다.</span><textarea id="workCreateOutputs" placeholder="예:&#10;검증 계획 요약&#10;승인 필요 항목 목록&#10;다음 실행 요청 후보"></textarea></label>
            <label class="field-block">승인 판단 <span class="optional-mark">선택</span><span class="field-help">Human Director가 나중에 보고 승인해야 하는 핵심 결정을 한 문장으로 적습니다.</span><textarea id="workCreateApproval" placeholder="예: Skill.json 검증을 AIWorkflow 작업 목록에 넣어 실행할지 판단해야 함"></textarea></label>
            <label class="field-block">검증 방법 <span class="optional-mark">선택</span><span class="field-help">완료 여부를 판단할 때 확인할 검증 방법을 한 줄에 하나씩 적습니다.</span><textarea id="workCreateValidation" placeholder="예:&#10;관련 JSON 파일 파싱 확인&#10;로더가 파일을 읽을 수 있는지 확인&#10;변경 파일이 없는지 git diff 확인"></textarea></label>
            <div class="row"><button class="good" id="workCreateSubmit">실행 요청 저장</button></div>
          </section>

          <section class="card">
            <div class="section-title"><h2>요청/Dispatch 기록</h2><span class="pill">record only</span></div>
            <p class="muted small">요청과 dispatch 기록을 확인합니다. 이 기록만으로 PC Runner, Codex/local execution, Result Review, commit/push를 시작하지 않습니다.</p>
            <div class="control-bar">
              <input id="workSearch" placeholder="실행 요청, 담당 영역 검색">
              <select id="workDepartmentFilter"></select>
              <select id="workStatusGroupFilter">
                <option value="">모든 상태</option>
                <option value="waiting_for_director">승인 판단 대기</option>
                <option value="ready">작업 준비 완료</option>
                <option value="requested">worker pickup 대기</option>
                <option value="running">실행 관찰 중</option>
                <option value="result_review_needed">결과 handoff 필요</option>
                <option value="attention">주의 필요</option>
                <option value="closed">종료/대체됨</option>
              </select>
              <button class="secondary" data-clear-filter="work">필터 해제</button>
            </div>
            <div class="grid">
              <div class="item"><h2>Execution Request 레코드</h2><p class="muted">저장된 실행 요청입니다. 준비 표시나 dispatch 요청 기록 생성은 가능하지만 실제 runner는 시작하지 않습니다.</p><div id="workorders" class="list"></div></div>
              <div class="item"><h2>Worker Dispatch 레코드</h2><p class="muted">Hermes/runner가 나중에 검토할 요청 자료입니다. Studio가 PC Runner나 Codex/local execution을 시작했다는 뜻이 아닙니다.</p><div id="workerDispatches" class="list"></div></div>
              <div class="item"><h2>전달 후보</h2><p class="muted">다른 AI에게 넘길 수 있는 별도 전달 후보입니다. 실행은 명시 승인 후에만 시작합니다.</p><div id="handoffs" class="list"></div></div>
            </div>
          </section>

          <details class="card dashboard-reference-section">
            <summary class="section-title"><h2>Execution Requests 역할</h2><span class="pill">request only</span></summary>
            <ul class="small">
              <li>AI에게 맡길 일의 목표, 범위, 제약 조건, 결과물, 검증 방법을 정리합니다.</li>
              <li>Human Director가 승인할 수 있는 실행 요청 형태로 먼저 고정합니다.</li>
              <li>이 화면에서 저장하는 실행 요청과 dispatch 요청은 Studio 기록입니다. PC Runner, Codex/local execution, Result Review, commit/push는 시작하지 않습니다.</li>
            </ul>
          </details>

          <details class="card dashboard-reference-section">
            <summary class="section-title"><h2>처리 기준</h2><span class="pill">reference</span></summary>
            <div class="grid">
              <div class="item">
                <h3>먼저 확인</h3>
                <ul class="small">
                  <li><strong>범위 점검</strong>: 이 요청을 AI에게 맡겨도 되는지 읽기 전용으로 점검합니다.</li>
                  <li><strong>전달 계획</strong>: 담당자, 전달 내용, 실행 전 확인 사항을 미리 봅니다.</li>
                  <li><strong>전달 자료 미리보기</strong>: AI에게 전달될 목표, 할 일, 제약 조건, 근거를 미리 봅니다.</li>
                </ul>
              </div>
              <div class="item warn">
                <h3>실제로 넘기기</h3>
                <ul class="small">
                  <li><strong>AI에게 맡기기</strong>: 선택한 AI에게 요청을 맡겨 보고서를 만듭니다. 소스, 실행 상태, git은 직접 바꾸지 않습니다.</li>
                  <li><strong>실행 대기 항목으로 만들기</strong>: 초안을 미리 봅니다. 실제 실행 시작은 별도 승인으로만 진행합니다.</li>
                </ul>
              </div>
            </div>
          </details>
        </section>

`;
}

module.exports = { renderWorkPageShell };

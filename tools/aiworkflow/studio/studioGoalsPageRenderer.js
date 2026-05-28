#!/usr/bin/env node
"use strict";

function renderGoalsPageShell() {
  return `        <section class="page" data-page="goals">
          <div class="page-heading"><div><h2>목표/방향</h2><p>큰 방향을 말하면 Studio가 부서, AI 직원, 회의, 업무 지시, 승인 항목으로 쪼갭니다.</p></div></div>
          <div class="card">
            <h2>이 페이지의 역할</h2>
            <ul class="small">
              <li>감독자가 “어떤 게임/Studio 방향으로 가고 싶은지”를 말하는 첫 화면입니다.</li>
              <li>Studio는 이 목표를 부서, AI 직원, 회의, 업무 지시, 감독자 승인 항목으로 나눠서 보여줍니다.</li>
              <li>여기서 만드는 것은 분해안과 다음 단계 후보입니다. 공식 설정 확정, 소스 수정, task 실행, commit/push는 하지 않습니다.</li>
            </ul>
          </div>
          <section class="grid">
            <div class="card">
              <div class="section-title"><h2>감독자 목표 입력</h2><span class="pill">Director Goal</span></div>
              <p class="small muted">세부 업무 지시가 아니라 “무엇을 더 좋게 만들고 싶은지”를 적습니다. 구현 방법은 Studio가 다음 단계 후보로 나눕니다.</p>
              <div class="row">
                <button class="secondary" data-goal-sample="초반 10분 플레이 루프를 더 명확하게 만들고, 플레이어가 다음 목표를 자연스럽게 이해하게 만드는 방향을 기획해줘." data-goal-constraints="승인 전 공식 설정 확정 금지&#10;승인 없는 소스/데이터 수정 금지&#10;먼저 기획/검증/구현 후보만 분리">초반 루프</button>
                <button class="secondary" data-goal-sample="Studio 홈 화면에서 Human Director가 지금 판단해야 할 일과 다음 행동을 더 직관적으로 이해할 수 있게 개선 방향을 기획해줘." data-goal-constraints="Discord 기능은 이번 범위에서 제외&#10;먼저 UX 방향과 후속 업무 후보만 정리&#10;소스 수정은 별도 승인 흐름">Studio UX</button>
                <button class="secondary" data-goal-sample="새 스킬/보상 데이터가 기존 전투 루프와 충돌하지 않도록 검토하고, 필요한 테스트와 후속 업무를 나눠줘." data-goal-constraints="JSON schema 변경 금지&#10;승인 없는 데이터 수정 금지&#10;검증 계획을 먼저 분리">데이터 검토</button>
              </div>
              <label class="field-block">큰 방향 <span class="required-mark">필수</span><span class="field-help">원하는 결과를 사람 말로 적습니다. 예: “초반 루프가 더 명확하게 느껴지게 만들고 싶다.”</span><textarea id="goalCreateText" placeholder="예: 초반 10분 플레이 루프를 더 명확하게 만들고, 필요한 기획/구현/검증 업무를 나눠줘."></textarea></label>
              <label class="field-block">제약 조건 <span class="optional-mark">선택</span><span class="field-help">절대 하지 말 것, 나중에 승인받아야 할 것, 이번 범위에서 제외할 것을 한 줄에 하나씩 적습니다.</span><textarea id="goalCreateConstraints" placeholder="예:&#10;승인 전 공식 설정 확정 금지&#10;승인 없는 소스/데이터 수정 금지&#10;먼저 기획/검증/구현 후보만 분리"></textarea></label>
              <div class="row">
                <button class="secondary" id="goalPlanSubmit">분해안 미리보기</button>
                <button class="good" id="goalStoreSubmit">분해안만 저장</button>
                <button class="warn" id="goalBundleSubmit">분해안 + 다음 단계 후보 생성</button>
              </div>
              <ul class="small muted button-help">
                <li><strong>미리보기:</strong> 저장하지 않고 오른쪽에서 Studio가 어떻게 이해했는지만 확인합니다.</li>
                <li><strong>분해안만 저장:</strong> 목표 분해 기록만 남깁니다. 회의나 업무 후보는 만들지 않습니다.</li>
                <li><strong>다음 단계 후보 생성:</strong> 회의/업무/제안 후보까지 만듭니다. 실제 구현과 커밋은 여전히 별도 승인 흐름을 탑니다.</li>
              </ul>
            </div>
            <div class="card">
              <div class="section-title"><h2>분해안 미리보기</h2><span id="goalPreviewBadge" class="pill">대기</span></div>
              <div id="goalPreview" class="list"></div>
            </div>
          </section>
          <section class="card">
            <div class="section-title"><h2>저장된 목표/방향 분해안</h2><span id="goalPlanCount" class="pill"></span></div>
            <div id="directorGoalPlans" class="list"></div>
          </section>
        </section>

`;
}

module.exports = { renderGoalsPageShell };

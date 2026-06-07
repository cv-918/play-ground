#!/usr/bin/env node
"use strict";

function renderPolicyPageShell() {
  return `        <section class="page" data-page="policy">
          <div class="card">
            <div class="section-title"><h2>Admin Tools: Policy</h2><span class="pill">no automation</span></div>
            <p class="muted small">자동 진행 가능성을 평가만 수행합니다. 이 화면은 승인/실행/commit/push를 하지 않고 평가와 _Temp 검증 자료만 만듭니다.</p>
          </div>
          <section class="card">
            <div class="section-title"><h2>자동 진행 정책</h2><div class="row"><button class="secondary" data-action="approval-impact-plan">승인 영향 점검</button><button class="secondary" data-action="automation-readiness-plan">자동 진행 준비도</button></div></div>
            <p class="muted">평가만 수행합니다. 자동 true 플래그를 켜거나 실행 상태를 바꾸지 않습니다.</p>
            <div id="automationPolicy" class="list"></div>
          </section>
        </section>

`;
}

module.exports = { renderPolicyPageShell };

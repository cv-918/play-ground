#!/usr/bin/env node
"use strict";

function renderPolicyPageShell() {
  return `        <section class="page" data-page="policy">
          <div class="card"><div class="section-title"><h2>자동 진행 정책</h2><div class="row"><button class="secondary" data-action="approval-impact-plan">승인 영향 점검</button><button class="secondary" data-action="automation-readiness-plan">자동 진행 준비도</button></div></div><p class="muted">이 패널은 승인/실행을 하지 않고 평가와 _Temp 검증 자료만 만듭니다.</p><div id="automationPolicy" class="list"></div></div>
        </section>

`;
}

module.exports = { renderPolicyPageShell };

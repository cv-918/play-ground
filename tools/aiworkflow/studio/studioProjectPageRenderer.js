#!/usr/bin/env node
"use strict";

function renderProjectPageShell() {
  return `        <section class="page" data-page="project">
          <div class="page-heading"><div><h2>프로젝트</h2><p>현재 Studio가 어떤 프로젝트를 보고 있고, 어떤 검증/빌드/작업 경계를 쓰는지 확인합니다.</p></div></div>
          <section class="grid">
            <div class="card">
              <div class="section-title"><h2>현재 프로젝트</h2><span id="projectActiveBadge" class="pill"></span></div>
              <div id="projectActiveSummary" class="list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>AIWorkflow 상태</h2><button class="secondary" data-nav-jump="inbox">감독자 결정함</button></div>
              <div id="projectWorkflowSummary" class="compact-list"></div>
            </div>
          </section>
          <section class="grid">
            <div class="card"><h2>프로젝트 프로필</h2><p class="muted">빌드, 데이터, 검증 진입점은 Project Profile이 제공합니다. Core는 특정 게임 경로를 직접 알지 않는 방향입니다.</p><div id="projectProfilesPublic" class="list"></div></div>
            <div class="card"><div class="section-title"><h2>도구와 실행 경계</h2><div class="row"><button class="secondary" data-action="model-routing-plan">모델/권한 라우팅</button><button class="secondary" data-action="project-execution-plan">실행 준비 점검</button></div></div><p class="muted">도구는 실행 장비입니다. 비용, 외부 호출, 파일 수정 가능성은 여기서 검토합니다.</p><div id="projectToolSummary" class="list"></div></div>
          </section>
        </section>

`;
}

module.exports = { renderProjectPageShell };

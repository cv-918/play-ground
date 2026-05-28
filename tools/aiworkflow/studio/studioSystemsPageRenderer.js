#!/usr/bin/env node
"use strict";

function renderSystemsPageShell() {
  return `        <section class="page" data-page="systems">
          <div class="page-heading"><div><h2>시스템</h2><p>내부/관리자용 화면입니다. 평소에는 신경 쓰지 않아도 됩니다.</p></div></div>
          <div class="card">
            <div class="section-title"><h2>Studio 진단 도구</h2><span class="pill">내부 도구</span></div>
            <p class="muted">Studio 자체가 이상하거나, 새 기능을 고친 뒤 확인할 때만 쓰는 점검 도구입니다. 일반 작업을 진행할 때는 쓰지 않아도 됩니다.</p>
            <div class="row">
              <button class="secondary" data-action="studio-surface-map">화면 목록 점검</button>
              <button class="secondary" data-action="studio-recovery-plan">복구 상태 점검</button>
              <button class="secondary" data-action="studio-eval-plan">테스트 계획 보기</button>
              <button class="secondary" data-action="studio-smoke-status">Studio 상태 점검</button>
            </div>
          </div>
          <div class="card">
            <div class="section-title"><h2>도구 요청서 만들기</h2><span class="pill">실행 전 요청서</span></div>
            <p class="muted">도구를 바로 실행하지 않고, 어떤 도구를 왜 쓰려는지와 어떤 검증 자료가 필요한지 먼저 기록합니다.</p>
            <div class="form-grid">
              <label>도구<select id="toolRunCreateAdapter"></select></label>
              <label>권한 등급<select id="toolRunCreatePermission"></select></label>
              <label>요청자 종류<select id="toolRunCreateRequesterType"></select></label>
              <label>요청자 ref<input id="toolRunCreateRequesterRef" placeholder="WO-..., RR-..., MEET-..."></label>
            </div>
            <textarea id="toolRunCreateAction" placeholder="요청 행동. 예: 승인 범위 기준으로 직원 보고서 검토"></textarea>
            <textarea id="toolRunCreatePurpose" placeholder="왜 이 도구 요청이 필요한지"></textarea>
            <textarea id="toolRunCreateInputs" placeholder="입력 refs를 줄바꿈으로 입력"></textarea>
            <textarea id="toolRunCreateOutputs" placeholder="기대 산출물을 줄바꿈으로 입력"></textarea>
            <textarea id="toolRunCreateEvidence" placeholder="필수 검증 자료를 줄바꿈으로 입력"></textarea>
            <div class="row">
              <button class="secondary" id="toolRunPlanSubmit">요청 평가</button>
              <button class="good" id="toolRunCreateSubmit">요청 저장</button>
            </div>
          </div>
          <div class="grid">
            <div class="card"><h2>프로젝트 프로필</h2><p class="muted">현재 작업 대상 프로젝트와 검증/빌드 프로필입니다.</p><div id="projectProfiles" class="list"></div></div>
            <div class="card"><h2>도구 어댑터</h2><p class="muted">비용, 외부 호출, 파일 수정, 승인 필요 여부를 확인합니다.</p><div id="toolAdapters" class="list"></div></div>
            <div class="card"><h2>도구 요청서</h2><p class="muted">아직 실행이 아니라, 실행 전 검토해야 하는 도구 요청서입니다.</p><div id="toolRunRequests" class="list"></div></div>
          </div>
        </section>

`;
}

module.exports = { renderSystemsPageShell };

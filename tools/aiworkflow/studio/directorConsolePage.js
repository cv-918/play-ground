#!/usr/bin/env node
"use strict";

const { renderGoalsPageShell } = require("./studioGoalsPageRenderer");
const { renderRunsPageShell } = require("./studioRunsPageRenderer");
const { renderWorkPageShell } = require("./studioWorkPageRenderer");

function directorConsoleHtml() {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AIWorkflow Studio Director Console</title>
  <style>
    :root {
      color-scheme: dark;
      --bg:#0f1218;
      --sidebar:#141923;
      --panel:#1b202a;
      --panel2:#242b37;
      --panel3:#202735;
      --line:#3a4353;
      --text:#edf1f7;
      --muted:#aeb8c7;
      --accent:#79a9ff;
      --accent2:#b7ccff;
      --good:#28a564;
      --warn:#f0b84d;
      --danger:#ff6464;
    }
    * { box-sizing: border-box; }
    body { margin:0; font-family:"Segoe UI", system-ui, sans-serif; background:var(--bg); color:var(--text); line-height:1.45; }
    .app-shell { min-height:100vh; display:grid; grid-template-columns:260px minmax(0, 1fr); }
    .sidebar { position:sticky; top:0; height:100vh; display:flex; flex-direction:column; gap:16px; padding:18px 14px; background:linear-gradient(180deg, #151b25, #10141c); border-right:1px solid var(--line); }
    .brand { padding:8px 8px 12px; border-bottom:1px solid rgba(255,255,255,.08); }
    .brand-title { margin:0; font-size:18px; font-weight:800; letter-spacing:0; }
    .brand-subtitle { margin:5px 0 0; color:var(--muted); font-size:12px; }
    .nav { display:grid; gap:6px; }
    .nav button { width:100%; display:flex; justify-content:space-between; align-items:center; border:1px solid transparent; border-radius:8px; padding:9px 10px; color:var(--muted); background:transparent; text-align:left; }
    .nav button:hover { background:#202735; color:var(--text); }
    .nav button.active { background:#27344a; border-color:#48648f; color:var(--text); }
    .nav .count { min-width:22px; text-align:center; color:var(--accent2); font-size:12px; }
    .nav-section-label { margin:4px 8px -4px; color:var(--muted); font-size:11px; font-weight:800; letter-spacing:0; }
    .reference-nav { padding-top:8px; border-top:1px solid rgba(255,255,255,.08); }
    .nav[hidden], .reference-nav[hidden], .internal-nav[hidden] { display:none; }
    .internal-toggle { width:100%; margin-top:4px; display:flex; justify-content:space-between; align-items:center; background:#202735; color:var(--muted); }
    .internal-nav { display:grid; gap:6px; }
    .internal-panel { margin-top:12px; border:1px dashed var(--line); border-radius:8px; padding:10px; color:var(--muted); background:rgba(255,255,255,.025); }
    .internal-panel summary { cursor:pointer; color:var(--muted); font-weight:700; }
    .internal-panel[open] summary { margin-bottom:10px; color:var(--text); }
    .workspace { min-width:0; }
    header { position:sticky; top:0; z-index:4; padding:18px 22px; background:rgba(16,19,25,.88); border-bottom:1px solid var(--line); backdrop-filter:blur(12px); }
    main { max-width:1280px; margin:0 auto; padding:20px; }
    h1 { margin:0 0 6px; font-size:26px; letter-spacing:0; }
    h2 { margin:0 0 10px; font-size:18px; letter-spacing:0; }
    h3 { margin:0 0 6px; font-size:15px; letter-spacing:0; }
    p { margin:6px 0; }
    button, select, input { font:inherit; }
    button { border:0; border-radius:7px; padding:8px 11px; color:white; background:#4f6cff; cursor:pointer; }
    button.secondary { background:#2f3747; }
    button.good { background:#168b4f; }
    button.warn { background:#a56d10; }
    button.danger { background:#bc2f3f; }
    button:disabled { opacity:.55; cursor:not-allowed; }
    code { background:#12151c; border:1px solid var(--line); border-radius:5px; padding:1px 5px; overflow-wrap:anywhere; word-break:break-word; }
    a { color:#c6d8ff; text-decoration:none; }
    a:hover { text-decoration:underline; }
    .toolbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:12px; }
    .muted { color:var(--muted); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; margin:14px 0; }
    .span-all { grid-column:1 / -1; }
    .toolbox-layout { display:block; margin:14px 0; max-width:1240px; }
    .toolbox-primary { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:10px; margin:14px 0 18px; align-items:stretch; }
    .toolbox-primary-card { display:grid; grid-template-columns:minmax(0, 1fr) auto; gap:10px; align-items:center; min-width:0; padding:12px; }
    .toolbox-primary-card h3 { margin:0 0 4px; }
    .toolbox-primary-card .summary { margin:0; font-size:13px; line-height:1.35; }
    .toolbox-primary-card button { white-space:nowrap; font-weight:700; padding:9px 12px; }
    .toolbox-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px; margin:14px 0; align-items:start; max-width:1240px; }
    .toolbox-grid.secondary { grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); }
    .toolbox-card { min-width:0; overflow:hidden; }
    .toolbox-card .item { overflow:hidden; }
    .toolbox-card code { display:inline-block; max-width:100%; white-space:normal; overflow-wrap:anywhere; }
    .toolbox-divider { margin:20px 0 12px; padding-top:16px; border-top:1px solid var(--line); max-width:1240px; }
    .toolbox-secondary-category { display:flex; flex-direction:column; gap:12px; }
    @media (max-width: 980px) {
      .toolbox-primary { grid-template-columns:1fr; }
      .toolbox-primary-card { grid-template-columns:minmax(0, 1fr) auto; }
      .toolbox-grid.secondary { grid-template-columns:1fr; }
    }
    .card { background:linear-gradient(180deg, var(--panel), #171c25); border:1px solid var(--line); border-radius:8px; padding:14px; box-shadow:0 10px 28px rgba(0,0,0,.16); }
    .hero { display:grid; grid-template-columns:minmax(0, 1.5fr) minmax(280px, .8fr); gap:14px; align-items:stretch; margin-bottom:14px; }
    .hero-card { min-height:176px; padding:18px; border-color:#4b6590; background:linear-gradient(135deg, #202b3e, #171d29 70%); }
    .hero-card h2 { font-size:24px; }
    .metric { font-size:28px; font-weight:700; }
    .metric-card { min-height:96px; }
    .metric-label { color:var(--muted); font-size:12px; }
    .row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .action-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:10px; }
    .action-row.primary { padding-top:4px; }
    .internal-links { margin-top:10px; padding:8px 10px; border:1px dashed rgba(174,184,199,.38); border-radius:7px; background:rgba(255,255,255,.025); }
    .internal-links summary { cursor:pointer; color:var(--muted); font-size:12px; font-weight:700; }
    .internal-links[open] summary { margin-bottom:8px; color:var(--text); }
    .internal-links .row { margin-top:6px; }
    .pill { display:inline-block; border:1px solid var(--line); border-radius:999px; background:var(--panel2); color:var(--muted); padding:2px 7px; font-size:12px; }
    .list { display:grid; gap:10px; }
    .item { background:var(--panel2); border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:7px; padding:11px; }
    .item * { min-width:0; }
    .item.warn { border-left-color:var(--warn); }
    .item.good { border-left-color:var(--good); }
    .item.danger { border-left-color:var(--danger); }
    .small { font-size:13px; }
    .button-help { margin:10px 0 0; padding-left:1.2rem; }
    .button-help li { margin:2px 0; }
    .inline-help, .impact-note, .form-subsection { margin-top:10px; }
    .inline-help, .impact-note { border:1px solid var(--line); border-radius:8px; padding:10px 12px; background:rgba(255,255,255,.03); }
    .form-subsection h3 { margin-top:0; }
    .field-block { display:grid; gap:6px; margin-top:10px; color:var(--muted); font-size:12px; }
    .field-help { display:block; color:var(--muted); font-size:12px; font-weight:400; }
    .required-mark, .optional-mark { display:inline-flex; align-items:center; min-height:18px; padding:1px 7px; margin-left:4px; border-radius:999px; font-size:11px; font-weight:700; }
    .required-mark { color:#dff7e8; background:rgba(35,166,93,.22); border:1px solid rgba(35,166,93,.38); }
    .optional-mark { color:var(--muted); background:rgba(255,255,255,.05); border:1px solid var(--line); }
    .preset-row { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
    .staff-picker { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px; margin-top:8px; }
    .staff-choice { display:grid; grid-template-columns:auto minmax(0, 1fr); gap:8px; align-items:start; border:1px solid var(--line); border-radius:8px; padding:9px 10px; background:rgba(255,255,255,.025); }
    .staff-choice input { margin-top:3px; }
    .staff-choice strong, .staff-choice span { display:block; overflow-wrap:anywhere; }
    .staff-choice span { color:var(--muted); font-size:12px; margin-top:2px; }
    .summary { color:var(--muted); font-size:13px; }
    .staff-detail { margin:9px 0; color:var(--muted); font-size:13px; }
    .staff-detail strong { display:block; color:var(--text); margin-bottom:3px; }
    .staff-detail ul { margin:0; padding-left:18px; }
    .page { display:none; }
    .page.active { display:block; }
    .page-heading { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; margin:0 0 16px; }
    .page-heading h2 { margin:0; font-size:24px; }
    .page-heading p { max-width:720px; margin:4px 0 0; color:var(--muted); }
    .section-title { display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:10px; }
    .kicker { color:var(--accent2); font-size:12px; font-weight:700; text-transform:uppercase; }
    .compact-list { display:grid; gap:7px; }
    .compact-line { display:flex; justify-content:space-between; gap:12px; border-bottom:1px solid rgba(255,255,255,.06); padding:6px 0; }
    .compact-line:last-child { border-bottom:0; }
    .control-bar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:0 0 12px; }
    .control-bar input, .control-bar select { min-height:36px; border:1px solid var(--line); border-radius:7px; padding:7px 9px; background:#121722; color:var(--text); }
    .control-bar input { min-width:240px; }
    .form-grid { display:grid; gap:10px; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); margin:10px 0; }
    .form-grid label { display:grid; gap:5px; color:var(--muted); font-size:12px; }
    .form-grid input, .form-grid select { min-height:36px; border:1px solid var(--line); border-radius:7px; padding:7px 9px; background:#121722; color:var(--text); }
    .form-grid textarea { min-height:82px; }
    textarea { width:100%; min-height:92px; resize:vertical; border:1px solid var(--line); border-radius:8px; padding:10px; background:#121722; color:var(--text); font:inherit; }
    .file-select { display:grid; gap:6px; margin:10px 0; max-height:220px; overflow:auto; padding-right:4px; }
    .file-select label { display:flex; gap:8px; align-items:flex-start; font-size:13px; color:var(--muted); }
    .file-select input { margin-top:2px; }
    .empty { color:var(--muted); border:1px dashed var(--line); border-radius:8px; padding:16px; }
    pre { white-space:pre-wrap; word-break:break-word; background:#0f1218; border:1px solid var(--line); border-radius:8px; padding:12px; max-height:400px; overflow:auto; }
    .log-output { display:grid; gap:10px; background:#0f1218; border:1px solid var(--line); border-radius:8px; padding:12px; max-height:460px; overflow:auto; }
    .result-panel[hidden] { display:none; }
    .result-panel {
      position:fixed;
      top:92px;
      left:280px;
      right:20px;
      z-index:40;
      max-height:min(72vh, 760px);
      overflow:auto;
      margin:0;
      border-color:#5276c8;
      box-shadow:0 18px 48px rgba(0,0,0,.46);
    }
    .result-panel .section-title {
      position:sticky;
      top:0;
      z-index:1;
      padding-bottom:10px;
      background:linear-gradient(180deg, var(--panel), rgba(26,32,43,.94));
    }
    .log-json { margin:0; max-height:none; border:0; padding:0; background:transparent; }
    .log-message { color:var(--muted); white-space:pre-wrap; word-break:break-word; }
    @media (max-width: 920px) {
      .app-shell { grid-template-columns:1fr; }
      .sidebar { position:static; height:auto; }
      .nav { grid-template-columns:repeat(2, minmax(0, 1fr)); }
      .hero { grid-template-columns:1fr; }
      .result-panel { left:12px; right:12px; top:72px; max-height:76vh; }
    }
    @media (max-width: 720px) {
      main { padding:12px; }
      h1 { font-size:22px; }
      .metric { font-size:24px; }
      .nav { grid-template-columns:1fr; }
      .page-heading { display:block; }
    }
  </style>
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <p class="brand-title">AIWorkflow Studio</p>
        <p class="brand-subtitle">Human Director 운영 콘솔</p>
      </div>
      <div class="nav-section-label">감독자 콘솔</div>
      <nav class="nav" aria-label="Human Director navigation">
        <button class="active" data-nav="home">홈 <span class="count" id="nav-home-count"></span></button>
        <button data-nav="goals">목표/방향 <span class="count" id="nav-goals-count"></span></button>
        <button data-nav="meetings">회의실 <span class="count" id="nav-meetings-count"></span></button>
        <button data-nav="inbox">감독자 결정함 <span class="count" id="nav-inbox-count"></span></button>
        <button data-nav="evidence">결과 검토 <span class="count" id="nav-evidence-count"></span></button>
        <button data-nav="knowledge">기록실 <span class="count" id="nav-knowledge-count"></span></button>
        <button data-nav="toolbox">도구함 <span class="count" id="nav-toolbox-count"></span></button>
      </nav>
      <button id="referenceNavToggle" class="internal-toggle">운영 상세 <span id="referenceNavState">숨김</span></button>
      <nav id="referenceNav" class="nav reference-nav" aria-label="Operations detail navigation" hidden>
        <button data-nav="work">업무 지시 <span class="count" id="nav-work-count"></span></button>
        <button data-nav="runs">직원 보고서 <span class="count" id="nav-runs-count"></span></button>
        <button data-nav="diff">변경 검토 <span class="count" id="nav-diff-count"></span></button>
        <button data-nav="devlog">DevLog <span class="count" id="nav-devlog-count"></span></button>
        <button data-nav="timeline">실행 타임라인 <span class="count" id="nav-timeline-count"></span></button>
      </nav>
      <button id="organizationNavToggle" class="internal-toggle">조직 참고 <span id="organizationNavState">숨김</span></button>
      <nav id="organizationNav" class="nav reference-nav" aria-label="Organization reference navigation" hidden>
        <button data-nav="project">프로젝트 <span class="count" id="nav-project-count"></span></button>
        <button data-nav="departments">부서 <span class="count" id="nav-departments-count"></span></button>
        <button data-nav="staff">AI 직원 <span class="count" id="nav-staff-count"></span></button>
      </nav>
      <button id="internalNavToggle" class="internal-toggle">내부 도구 <span id="internalNavState">숨김</span></button>
      <nav id="internalNav" class="nav internal-nav" aria-label="Internal Studio navigation" hidden>
        <button data-nav="systems">시스템 <span class="count" id="nav-systems-count"></span></button>
        <button data-nav="policy">정책 <span class="count" id="nav-policy-count"></span></button>
      </nav>
      <p class="small muted">이 콘솔은 로컬 전용입니다. 버튼은 allowlist된 Studio 도구만 호출합니다.</p>
    </aside>
    <div class="workspace">
      <header>
        <h1 id="pageTitle">스튜디오 홈</h1>
        <p id="pageSubtitle" class="muted">최근 작업, 직원 상태, 감독자 판단 대기 항목을 먼저 봅니다.</p>
        <div class="toolbar">
          <button id="refresh">새로고침</button>
          <button id="export-dashboard" class="secondary">정적 대시보드 갱신</button>
          <span id="stamp" class="muted"></span>
        </div>
      </header>
      <section id="globalResultPanel" class="card result-panel" hidden>
        <div class="section-title"><h2>실행 결과</h2><button id="globalResultClose" class="secondary">닫기</button></div>
        <div id="globalResult" class="list"></div>
      </section>
      <main>
        <section class="page active" data-page="home">
          <div class="hero">
            <div class="card hero-card">
              <span class="kicker">Human Director Desk</span>
              <h2>내가 지금 판단할 것</h2>
              <p class="muted">세부 업무 조작이 아니라 방향 승인, 결과 컨펌, 수정 요청처럼 감독자가 실제로 결정해야 하는 항목만 먼저 봅니다.</p>
              <div id="inbox" class="list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>Studio의 역할</h2><span class="pill">운영본부</span></div>
              <div class="list">
                <div class="item good"><h3>네가 직접 하는 일</h3><p class="small">큰 방향 제시, 중요한 승인, 결과 컨펌, 수정/보류/반려 판단.</p></div>
                <div class="item warn"><h3>Studio가 뒤에서 정리할 일</h3><p class="small">업무 분해, 직원 배정, 검증 자료 요약, 후속 업무 후보 생성, 기록 정리.</p></div>
                <div class="item"><h3>핵심 화면</h3><p class="small">평소에는 아래 화면만 보면 됩니다. 실무 세부 화면은 왼쪽의 운영 상세에 접어뒀습니다.</p><div class="row"><button class="secondary" data-nav-jump="goals">목표/방향</button><button class="secondary" data-nav-jump="meetings">회의실</button><button class="secondary" data-nav-jump="inbox">감독자 결정함</button><button class="secondary" data-nav-jump="evidence">결과 검토</button><button class="secondary" data-nav-jump="knowledge">기록실</button></div></div>
              </div>
            </div>
          </div>
          <section class="grid">
            <div class="card">
              <div class="section-title"><h2>현재 진행 상황</h2><span id="coreNextAction" class="pill"></span></div>
              <div id="homeWorkflowCore" class="list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>결과 검토 요약</h2><button class="secondary" data-nav-jump="evidence">결과 검토</button></div>
              <div id="homeWorkflowEvidence" class="compact-list"></div>
            </div>
          </section>
          <section class="grid" hidden>
            <div class="card">
              <div class="section-title"><h2>새 작업 접수</h2><span class="pill">Studio 접수</span></div>
              <textarea id="studioIntakeText" placeholder="예: VAL task: source/data 변경 없이 현재 Runner 흐름을 검증해줘."></textarea>
              <div class="row"><button class="good" id="studioIntakeSubmit">작업 접수</button></div>
              <p class="small muted">접수는 작업 초안과 작업 목록 항목을 만들 수 있습니다. 저위험 작업만 정책에 따라 자동 착수됩니다.</p>
            </div>
            <div class="card">
              <div class="section-title"><h2>Studio Git Gate</h2><span id="gitGateCount" class="pill"></span></div>
              <div id="gitFileSelect" class="file-select"></div>
              <input id="gitCommitMessage" placeholder="커밋 메시지 비우면 자동 제안">
              <div class="row">
                <button class="secondary" id="gitSelectWorkflow">Workflow만 선택</button>
                <button class="secondary" id="gitClearSelection">선택 해제</button>
                <button class="good" id="gitCommitSelected">선택 커밋</button>
                <button class="good" id="gitCommitPushSelected">선택 커밋+푸시</button>
                <button class="secondary" id="gitPushOnly">푸시만</button>
              </div>
            </div>
          </section>
          <section id="metrics" class="grid" hidden></section>
          <section class="grid" hidden>
            <div class="card">
              <div class="section-title"><h2>판단 대기</h2><span id="homeQueueCount" class="pill"></span></div>
              <div id="homeDecisionQueue" class="list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>직원 현황</h2><button class="secondary" data-nav-jump="staff">전체 보기</button></div>
              <div id="homeStaffStatus" class="compact-list"></div>
            </div>
          </section>
          <section class="grid" hidden>
            <div class="card">
              <div class="section-title"><h2>최근 활동</h2><button class="secondary" data-nav-jump="runs">산출물 보기</button></div>
              <div id="homeActivity" class="compact-list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>상태 참고</h2><span class="pill">읽기 전용</span></div>
              <div id="homeOperations" class="compact-list"></div>
            </div>
          </section>
          <section class="card" hidden>
            <div class="section-title"><h2>최근 검증 자료</h2><button class="secondary" data-nav-jump="evidence">검증 자료 보기</button></div>
            <div id="homeEvidence" class="compact-list"></div>
          </section>
        </section>

        <section class="page" data-page="toolbox">
          <div class="page-heading"><div><h2>도구함</h2><p>직접 사용할 만한 로컬 도구만 모았습니다. 스크립트 파일명을 외우지 않아도 됩니다.</p></div></div>
          <div class="card" id="meetingButtonGuide">
            <h2>사용 기준</h2>
            <ul class="small">
              <li>여기에는 allowlist된 도구만 표시합니다.</li>
              <li>소스 수정, task 완료, commit/push는 이 도구함에서 자동으로 하지 않습니다.</li>
              <li>긴 출력이 필요한 도구는 해당 화면의 결과 영역 또는 생성된 파일에서 확인합니다.</li>
            </ul>
          </div>
          <section id="toolboxList" class="toolbox-layout"></section>
        </section>

        ${renderGoalsPageShell()}

        <section class="page" data-page="project">
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

        <section class="page" data-page="inbox">
          <div class="page-heading"><div><h2>감독자 결정함</h2><p>Studio가 올린 판단거리 중 사람이 실제로 결론을 내려야 하는 것만 봅니다.</p></div></div>
          <div class="card">
            <h2>이 페이지의 역할</h2>
            <ul class="small">
              <li>큰 방향, 완료 검토, 수정 요청, 채택/반려, 커밋 판단처럼 감독자가 결정해야 하는 항목만 모읍니다.</li>
              <li>각 카드에서 “내가 결정할 것”과 “결정하면 바뀌는 것”을 보고 판단합니다.</li>
              <li>세부 보고서, 원본 JSON, 내부 실행 기록은 필요할 때만 운영 상세 화면에서 확인합니다.</li>
            </ul>
          </div>
          <div id="directorInboxFull" class="list"></div>
        </section>

        <section class="page" data-page="timeline">
          <div class="page-heading"><div><h2>실행 타임라인</h2><p>회의, 업무 지시, 직원 보고서, Runner 실행, 채택 후보를 시간순으로 훑어봅니다.</p></div><button class="secondary" data-action="traceability-map">추적 지도</button></div>
          <div class="card">
            <h2>이 페이지의 역할</h2>
            <ul class="small">
              <li>최근 어떤 일이 어떤 순서로 일어났는지 확인합니다.</li>
              <li>멈춘 실행, 직원 보고서, 회의 후속 작업을 빠르게 찾아갑니다.</li>
              <li>세부 판단은 각 항목의 원래 화면에서 진행합니다.</li>
            </ul>
          </div>
          <div id="timelineList" class="list"></div>
        </section>

        <section class="page" data-page="diff">
          <div class="page-heading"><div><h2>변경 검토</h2><p>현재 Git 작업대의 변경 파일을 사람 말로 확인하고, 커밋 전 범위를 고릅니다.</p></div></div>
          <section class="grid">
            <div class="card">
              <div class="section-title"><h2>변경 파일</h2><span id="diffChangedCount" class="pill"></span></div>
              <div id="diffChangedFiles" class="list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>커밋 범위 선택</h2><span class="pill">Git Gate</span></div>
              <p class="muted">Home의 Studio Git Gate와 같은 안전 규칙을 사용합니다. unrelated 변경은 선택하지 마세요.</p>
              <div id="diffGitFileSelect" class="file-select"></div>
              <input id="diffGitCommitMessage" placeholder="커밋 메시지 비우면 자동 제안">
              <div class="row">
                <button class="secondary" id="diffGitSelectWorkflow">Workflow만 선택</button>
                <button class="secondary" id="diffGitClearSelection">선택 해제</button>
                <button class="good" id="diffGitCommitSelected">선택 커밋</button>
                <button class="good" id="diffGitCommitPushSelected">선택 커밋+푸시</button>
              </div>
            </div>
          </section>
          <section class="card">
            <h2>diff 통계</h2>
            <pre id="diffStatView">대기 중</pre>
          </section>
        </section>

        <section class="page" data-page="departments">
          <div class="page-heading"><div><h2>부서</h2><p>AI 회사의 부서입니다. 각 부서가 어떤 책임, 검토 기준, 산출물 경계를 갖는지 확인합니다.</p></div></div>
          <div class="card">
            <h2>이 페이지의 역할</h2>
            <ul class="small">
              <li>부서별 책임과 검토 기준을 확인합니다.</li>
              <li>어떤 AI 직원이 어떤 부서에 속하는지 확인하고 직원 화면으로 이동합니다.</li>
              <li>부서가 담당하는 결과물 종류를 보고 업무 지시나 회의 범위를 정리합니다.</li>
            </ul>
          </div>
          <div class="control-bar">
            <input id="departmentSearch" placeholder="부서명, 역할, 검토 기준 검색">
            <span id="departmentSummary" class="pill"></span>
          </div>
          <div id="departments" class="grid"></div>
        </section>

        <section class="page" data-page="staff">
          <div class="page-heading"><div><h2>AI 직원</h2><p>영구 역할을 가진 AI 직원 명단입니다. 역할, 권한, 승인 필요 항목, 산출물 책임을 확인합니다.</p></div></div>
          <div class="control-bar">
            <input id="staffSearch" placeholder="직원명, 역할, 산출물 검색">
            <select id="staffDepartmentFilter"></select>
            <button class="secondary" data-clear-filter="staff">필터 해제</button>
          </div>
          <div id="staffAgents" class="grid"></div>
        </section>

        <section class="page" data-page="meetings">
          <div class="page-heading"><div><h2>회의실</h2><p>AI 직원 의견을 모아 쟁점, 후속 업무 후보, 감독자 판단 후보로 정리합니다.</p></div></div>
          <div class="card">
            <h2>이 페이지의 역할</h2>
            <ul class="small">
              <li>감독자가 회의 주제와 제약 조건을 정하고, AI 직원들의 관점을 모읍니다.</li>
              <li>회의 발언은 회의록에만 남습니다. 공식 설정, task, git은 직접 바꾸지 않습니다.</li>
              <li>충분히 논의되면 실행할 일은 업무 후보로, 방향 판단은 감독자 결정함으로 넘깁니다.</li>
            </ul>
          </div>
          <div class="card">
            <div class="section-title"><h2>회의 흐름</h2><span class="pill">권장 순서</span></div>
            <ol class="small">
              <li>회의 주제와 참가 직원을 정해 회의를 만듭니다.</li>
              <li>내 의견을 기록하거나 다음 AI 발언을 받아 관점을 모읍니다.</li>
              <li>회의판에서 최근 발언, 남은 질문, 쟁점을 확인합니다.</li>
              <li>실행할 일은 업무 후보로 만들고, 방향 판단은 감독자 결정함에 남깁니다.</li>
              <li>더 논의할 것이 없으면 회의를 종료합니다.</li>
            </ol>
          </div>
          <div class="card">
            <div class="section-title"><h2>논의 주제 만들기</h2><span class="pill">회의 세션</span></div>
            <div class="form-grid">
              <label>회의 주제<input id="meetingCreateTopic" placeholder="예: 초반 10분 플레이 루프 방향 회의"></label>
              <label>회의 종류<select id="meetingCreateType"></select></label>
              <label>의장<select id="meetingCreateChair"></select></label>
            </div>
            <div id="meetingTypeHelp" class="inline-help"></div>
            <div class="form-subsection">
              <h3>추천 참가자 조합</h3>
              <p class="small muted">회의 목적에 맞는 기본 조합을 누르면 참가 직원과 의장이 자동으로 채워집니다.</p>
              <div id="meetingPresetButtons" class="preset-row"></div>
            </div>
            <div class="form-subsection">
              <h3>참가 직원</h3>
              <p class="small muted">표시명은 한글 직책명 중심으로 보여주고, 회의 기록에는 기존 staff/role ID가 저장됩니다.</p>
              <div id="meetingParticipantPicker" class="staff-picker"></div>
            </div>
            <div id="meetingCreateImpact" class="impact-note"></div>
            <textarea id="meetingCreateAgenda" placeholder="안건을 줄바꿈으로 입력하세요. 예:&#10;현재 플레이 루프의 약점 확인&#10;후속 업무 지시 후보 정리"></textarea>
            <textarea id="meetingCreateConstraints" placeholder="제약 조건을 줄바꿈으로 입력하세요. 예:&#10;승인 없는 공식 설정 확정 금지&#10;구현 작업 직접 생성 금지"></textarea>
            <div class="row"><button class="good" id="meetingCreateSubmit">회의 생성</button></div>
            <p class="small muted">회의 생성은 MeetingSession 기록만 만듭니다. 공식 설정 확정, task 생성, git 변경은 하지 않습니다.</p>
          </div>
          <div class="card">
            <div class="section-title"><h2>내 의견 기록</h2><span class="pill">Human Director</span></div>
            <div class="form-grid">
              <label>회의 ID<input id="meetingTurnId" placeholder="MEET-..."></label>
              <label>기록 주체<select id="meetingTurnSpeaker"></select></label>
              <label>발언 종류<select id="meetingTurnType"></select></label>
            </div>
            <p class="small muted">이 입력칸은 Human Director인 내 의견을 회의록에 남기는 곳입니다. AI 직원 발언은 아래 회의 카드의 <strong>다음 AI 발언 받기</strong>를 사용하세요.</p>
            <textarea id="meetingTurnContent" placeholder="내 의견, 질문, 반박, 정리 메모를 입력하세요."></textarea>
            <div class="row"><button class="good" id="meetingTurnSubmit">내 의견 기록</button></div>
          </div>
          <div class="control-bar">
            <input id="meetingSearch" placeholder="회의 주제, ID 검색">
            <select id="meetingStatusFilter"></select>
          </div>
          <div class="card">
            <div class="section-title"><h2>회의 버튼 안내</h2><span class="pill">회의 기록 전용</span></div>
            <div class="grid">
              <div class="item">
                <h3>1. 회의 상태 보기</h3>
                <ul class="small">
                  <li><strong>회의판 보기</strong>: 최근 발언, 다음에 받을 관점, 남은 질문, 후속 업무 후보를 한 번에 확인합니다.</li>
                </ul>
              </div>
              <div class="item">
                <h3>2. 의견 더 모으기</h3>
                <ul class="small">
                  <li><strong>다음 AI 발언 받기</strong>: 추천된 AI 직원의 의견을 하나 더 받습니다. 공식 설정, task, git은 바꾸지 않습니다.</li>
                  <li><strong>내 의견 기록</strong>: 선택한 회의 ID를 위 입력칸에 넣고, Human Director인 내 의견만 회의록에 남깁니다.</li>
                </ul>
              </div>
              <div class="item">
                <h3>3. 결과 넘기기</h3>
                <ul class="small">
                  <li><strong>업무 후보 만들기</strong>: 회의에서 나온 “해야 할 일”을 업무 지시 후보로 저장합니다. 구현, task 생성, git 변경은 시작하지 않습니다.</li>
                  <li><strong>방향 판단으로 남기기</strong>: 회의에서 정한 결론이나 방향을 감독자 결정함에 남깁니다. 공식 설정 확정이나 구현 지시는 별도입니다.</li>
                  <li><strong>회의 종료</strong>: 회의 기록의 진행 상태만 닫습니다. 소스, task, git은 바꾸지 않습니다.</li>
                </ul>
              </div>
            </div>
          </div>
          <div id="meetingResultPanel" class="card result-panel" hidden>
            <div class="section-title"><h2>회의 실행 결과</h2><button id="meetingResultClose" class="secondary">닫기</button></div>
            <div id="meetingResult" class="list"></div>
          </div>
          <div id="meetings" class="list"></div>
        </section>

        ${renderRunsPageShell()}

        ${renderWorkPageShell()}

        <section class="page" data-page="knowledge">
          <div class="page-heading"><div><h2>기록실</h2><p>제안, 감독자 판단, 참고 기록, 공식 설정 후보를 확인합니다. 평소에는 결정함에서 올라온 항목만 처리하면 됩니다.</p></div></div>
          <div class="card">
            <div class="section-title"><h2>이 페이지의 역할</h2><button class="secondary" data-action="canon-conflict-report">공식 설정 충돌 점검</button></div>
            <ul class="small">
              <li><strong>제안함</strong>: AI 직원이나 감독자가 낸 아이디어를 임시로 모아둡니다. 이 단계에서는 위키도, 공식 설정도, 구현 지시도 아닙니다.</li>
              <li><strong>감독자 판단</strong>: 제안을 채택, 수정 요청, 반려, 보류 중 하나로 정리합니다. 판단 기록만 만들며 구현과 commit/push는 하지 않습니다.</li>
              <li><strong>참고 기록</strong>: 이후 AI 직원이 참고할 메모입니다. 일반 기록은 참고용이고, 공식 설정 후보는 별도 검토 대상입니다.</li>
              <li><strong>공식 설정 후보</strong>: 게임 세계관, 캐릭터, 규칙처럼 나중에 canon으로 확정할 수 있는 항목입니다. Studio UX나 운영 개선 제안은 공식 설정 후보로 남길 수 없습니다.</li>
            </ul>
          </div>
          <div class="grid">
            <div class="card">
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
            <div class="card">
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
            <div class="card">
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
          </div>
          <div class="control-bar">
            <input id="knowledgeSearch" placeholder="제안, 결정, 참고 기록 검색">
            <select id="proposalDecisionFilter"></select>
            <select id="memoryStatusFilter"></select>
          </div>
          <div class="card">
            <div class="section-title"><h2>제안 버튼 안내</h2><span class="pill">판단 기록</span></div>
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
            <div class="card"><h2>제안함</h2><p class="muted">AI 직원이나 감독자가 낸 아이디어를 모아둡니다. 게임 설정 제안, Studio 운영 제안, 업무 제안이 함께 올 수 있으며 제안 자체는 결정이나 공식 설정이 아닙니다.</p><div id="proposals" class="list"></div></div>
            <div class="card"><h2>결정 기록</h2><p class="muted">Human Director가 남긴 결정 기록입니다.</p><div id="decisions" class="list"></div></div>
            <div class="card"><h2>참고 기록 / 공식 설정</h2><p class="muted">상태가 공식 설정이어야 확정 설정으로 취급합니다.</p><div id="memories" class="list"></div></div>
          </div>
        </section>

        <section class="page" data-page="systems">
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

        <section class="page" data-page="policy">
          <div class="page-heading"><div><h2>정책</h2><p>내부/관리자용 정책 검증 화면입니다. 자동 진행 정책을 조정하거나 디버깅할 때만 봅니다.</p></div></div>
          <div class="card"><div class="section-title"><h2>자동 진행 정책</h2><div class="row"><button class="secondary" data-action="approval-impact-plan">승인 영향 점검</button><button class="secondary" data-action="automation-readiness-plan">자동 진행 준비도</button></div></div><p class="muted">이 패널은 승인/실행을 하지 않고 평가와 _Temp 검증 자료만 만듭니다.</p><div id="automationPolicy" class="list"></div></div>
        </section>

        <section class="page" data-page="evidence">
          <div class="page-heading"><div><h2>결과 검토</h2><p>완료로 받을지, 수정할지, 보류할지 판단하는 화면입니다. 원본 검증 자료는 필요할 때만 펼쳐 봅니다.</p></div></div>
          <div id="evidenceSummary" class="grid"></div>
          <div class="card">
            <h2>이 페이지에서 하는 일</h2>
            <ul class="small">
              <li>위쪽 숫자는 전체 자료량이 아니라 현재 작업의 완료 판단 상태를 먼저 보여줍니다.</li>
              <li>아래의 <strong>워크플로우 검토</strong>에서 완료, 수정 요청, 판단 보류 중 하나를 고릅니다.</li>
              <li>접힌 참고 보고서는 판단이 헷갈릴 때만 열어 봅니다. 평소에는 현재 판정과 지금 할 일만 보면 됩니다.</li>
            </ul>
          </div>
          <div class="card">
            <h2>보고서 숫자 읽는 법</h2>
            <ul class="small">
              <li><strong>참고 보고서</strong>는 Studio가 모아둔 직원/검토 보고서 수입니다. 이것을 하나씩 처리하라는 뜻은 아닙니다.</li>
              <li><strong>현재 판정</strong>과 <strong>감독자 결정</strong>만 지금 행동으로 이어집니다.</li>
              <li>보고서 원문은 아래 <strong>참고용 검토 보고서</strong>에 접혀 있습니다.</li>
            </ul>
          </div>
          <div class="card">
            <h2>판단 버튼 뜻</h2>
            <ul class="small">
              <li><strong>완료 승인</strong>: 남은 문제가 없다고 보고 task를 완료 처리합니다.</li>
              <li><strong>우려 감수 후 완료</strong>: 우려를 확인했지만 이번 작업은 완료로 닫습니다.</li>
              <li><strong>수정 요청</strong>: 완료하지 않고 수정이 필요하다고 기록합니다.</li>
              <li><strong>판단 보류</strong>: 지금은 근거가 부족해서 결정을 미룹니다.</li>
            </ul>
          </div>
          <div class="grid">
            <div class="card span-all"><div class="section-title"><h2>워크플로우 검토</h2><div class="row"><button class="secondary" data-action="completion-evidence-checklist">완료 근거 점검</button><button class="secondary" data-action="completion-decision-plan">완료 판단안</button></div></div><div id="workflowReview" class="list"></div></div>
            <div class="card span-all"><h2>버튼 실행 결과</h2><p class="muted small">위 버튼을 누르면 이곳에 결과가 표시됩니다. 읽기 전용 점검이며 task, commit, push는 바꾸지 않습니다.</p><div id="evidenceResult" class="list"><div class="empty">아직 실행한 버튼 결과가 없습니다.</div></div></div>
            <div class="card span-all"><h2>참고용 검토 보고서</h2><p class="muted small">원본 보고서가 필요할 때만 펼쳐서 확인합니다. 보통은 위의 현재 판정과 완료 판단안을 먼저 보면 됩니다.</p><div id="packets" class="list"></div></div>
          </div>
        </section>

        <section class="page" data-page="devlog">
          <div class="page-heading"><div><h2>DevLog</h2><p>의미 있는 작업의 배경, 변경 범위, 검증, 남은 위험을 확인합니다.</p></div></div>
          <div class="card">
            <h2>이 페이지의 역할</h2>
            <ul class="small">
              <li>최근 작업 로그를 확인해 어떤 맥락으로 변경됐는지 봅니다.</li>
              <li>FixLog, WorkLog, Retrospective를 구분해 작업 기록을 추적합니다.</li>
              <li>검증이 실제로 수행됐는지, 남은 위험이 문서화됐는지 확인합니다.</li>
            </ul>
          </div>
          <div id="devLogList" class="list"></div>
        </section>
      </main>
    </div>
  </div>
  <script>
    let state = null;
    let activePage = "home";
    let latestGoalPreview = null;
    const PAGES = {
      home: ["홈", "Human Director가 지금 결정할 일과 진행 중인 방향만 봅니다."],
      toolbox: ["도구함", "직접 사용할 만한 유지보수 도구만 설명과 함께 실행합니다."],
      goals: ["목표/방향", "큰 방향을 말하면 Studio가 부서, 직원, 회의, 업무 후보로 분해합니다."],
      project: ["프로젝트", "현재 프로젝트와 실행 경계를 확인합니다."],
      inbox: ["감독자 결정함", "사람 판단이 필요한 항목만 모아서 봅니다."],
      departments: ["부서", "부서별 책임, 직원, 검토 기준을 확인합니다."],
      staff: ["AI 직원", "AI 직원의 역할, 권한, 결과물 책임을 확인합니다."],
      meetings: ["회의실", "AI 직원 의견을 모아 후속 업무와 감독자 판단 후보로 정리합니다."],
      runs: ["직원 보고서", "AI 직원 보고서와 채택 후보를 검토합니다."],
      work: ["업무 지시", "Studio 업무 후보와 인수인계를 AIWorkflow task로 연결합니다."],
      knowledge: ["제안/결정 기록함", "제안, 감독자 판단, 참고 기록, 공식 설정 후보를 확인합니다."],
      timeline: ["실행 타임라인", "최근 Studio와 AIWorkflow 활동을 시간순으로 확인합니다."],
      diff: ["변경 검토", "현재 Git 변경과 커밋 후보를 확인합니다."],
      systems: ["시스템", "내부/관리자용 도구 경계를 확인합니다."],
      policy: ["정책", "내부/관리자용 자동 진행 정책을 확인합니다."],
      evidence: ["결과 검토", "결과물 요약, 남은 우려, 완료/수정 판단만 먼저 확인합니다."],
      devlog: ["DevLog", "작업 기록과 남은 위험을 확인합니다."],
    };
    const filters = {
      departmentSearch: "",
      staffSearch: "",
      staffDepartment: "",
      meetingSearch: "",
      meetingStatus: "__active__",
      runSearch: "",
      runStatus: "",
      workSearch: "",
      workDepartment: "",
      knowledgeSearch: "",
      proposalDecision: "",
      memoryStatus: "",
    };
    const el = (id) => document.getElementById(id);
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
    function compactListHtml(items, emptyText = "없음") {
      const values = asArray(items).slice(0, 6);
      if (!values.length) return '<p class="small muted">' + esc(emptyText) + '</p>';
      const more = asArray(items).length > values.length ? '<li>+' + esc(asArray(items).length - values.length) + '개 더 있음</li>' : "";
      return '<ul class="small">' + values.map((item) => '<li>' + esc(short(item, 150)) + '</li>').join("") + more + '</ul>';
    }
    function formatCompanyRuntimeReadinessLog(value) {
      const report = value.company_runtime_readiness_report || value.company_runtime || value;
      if (!report || !report.stage_summary || !Array.isArray(report.gates)) return "";
      const stage = report.stage_summary || {};
      const boundary = report.conceptual_completion_boundary || {};
      const passed = stage.passed_gate_count ?? report.gates.filter((gate) => gate.status === "pass").length;
      const total = stage.total_gate_count ?? report.gates.length;
      const cPassed = stage.c_passed_gate_count ?? report.gates.filter((gate) => gate.stage === "C" && gate.status === "pass").length;
      const cTotal = stage.c_gate_count ?? report.gates.filter((gate) => gate.stage === "C").length;
      const attention = report.gates.filter((gate) => gate.status !== "pass");
      const cardClass = attention.length ? "warn" : "good";
      const gateLines = report.gates.map((gate) =>
        String(gate.stage || "") + " · " + String(gate.label || "") + ": " + (gate.status === "pass" ? "통과" : "확인 필요")
      );
      return '<div class="item ' + cardClass + '">' +
        '<h3>' + esc(report.overall_label || report.overall_status || "회사 런타임 점검") + '</h3>' +
        '<p class="summary">' + esc(boundary.definition || "Studio 회사 런타임 준비 상태를 점검했습니다.") + '</p>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>전체 gate</span><span class="pill">' + esc(passed + "/" + total) + '</span></div>' +
        '<div class="compact-line"><span>C gate</span><span class="pill">' + esc(cPassed + "/" + cTotal) + '</span></div>' +
        '<div class="compact-line"><span>고정 기준</span><span class="pill">' + esc(boundary.fixed_standard || "C: Personal AI Company v1") + '</span></div>' +
        '</div>' +
        '<h3>Gate 결과</h3>' + compactListHtml(gateLines) +
        (attention.length ? '<h3>확인 필요</h3>' + compactListHtml(attention.flatMap((gate) => gate.missing_or_weak_items || [])) : '<h3>확인 필요</h3><p class="small good">현재 C 기준에서 막힌 항목은 없습니다.</p>') +
        '<h3>다음 분류</h3>' + compactListHtml(report.next_actions || []) +
        '<h3>안전 상태</h3>' + compactListHtml([
          "읽기 전용: " + (report.safety?.read_only ? "yes" : "no"),
          "task 상태 변경 없음: " + (!report.safety || report.safety.task_state_changed === false ? "yes" : "no"),
          "소스 변경 없음: " + (!report.safety || report.safety.source_changed === false ? "yes" : "no"),
          "commit/push 없음: " + (!report.safety || report.safety.commit_or_push === false ? "yes" : "no"),
        ]) +
        '</div>';
    }
    function rawJsonDetails(value) {
      return '<details class="internal-links"><summary>원본 JSON</summary><pre class="log-json">' + esc(JSON.stringify(value, null, 2)) + '</pre></details>';
    }
    function recordLine(item) {
      if (item === null || item === undefined) return "";
      if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") return String(item);
      if (Array.isArray(item)) return item.map(recordLine).filter(Boolean).join(", ");
      const title = item.label || item.name || item.title || item.schema || item.page_id || item.decision || item.action || item.id || item.kind || item.status || item.field || "";
      const status = item.status && item.status !== title ? " (" + item.status + ")" : "";
      const detail = item.meaning || item.purpose || item.when_to_use || item.effect || item.summary || item.ref || item.path || item.note || "";
      const extra = item.exists !== undefined ? "exists=" + (item.exists ? "yes" : "no") : "";
      return [title ? title + status : "", detail, extra].filter(Boolean).join(" - ");
    }
    function reportLines(items) {
      return asArray(items).map(recordLine).filter(Boolean);
    }
    function translateStudioMessage(message) {
      const text = String(message || "").trim();
      if (!text) return "";
      const invalidOutput = text.match(/^Invalid output_id:\s*(.+)$/);
      if (invalidOutput) return "보고서 ID 형식이 현재 규칙과 맞지 않습니다: " + invalidOutput[1];
      const invalidRoleRun = text.match(/^Invalid role_run_id:\s*(.+)$/);
      if (invalidRoleRun) return "직원 실행 ID 형식이 현재 규칙과 맞지 않습니다: " + invalidRoleRun[1];
      if (text.includes("Output has no materializable proposals")) {
        return "이 보고서에는 채택 후보로 넘길 아이디어 제안, 프로젝트 기억, 업무 지시, 직원 인수인계가 없습니다.";
      }
      if (text.includes("RoleRunOutput validation failed")) {
        return "직원 보고서 검증에 실패해서 아무것도 저장하지 않았습니다.";
      }
      if (text.includes("RoleRunOutput has no adoption candidates")) {
        return "채택 후보가 없어 아무것도 저장하지 않았습니다.";
      }
      if (text.includes("Target materialization records already exist")) {
        return "이미 같은 채택 후보가 있어서 새로 저장하지 않았습니다.";
      }
      if (text.includes("Nothing was written")) {
        return text.replace("Nothing was written.", "아무것도 저장하지 않았습니다.");
      }
      return text;
    }
    function reportValue(report, key) {
      if (!key || typeof key !== "string") return undefined;
      return key.split(".").reduce((current, part) => {
        if (current === undefined || current === null) return undefined;
        return current[part];
      }, report);
    }
    function reportSection(title, items, emptyText = "없음") {
      return '<h3>' + esc(title) + '</h3>' + compactListHtml(reportLines(items), emptyText);
    }
    function reportStatusLines(report, keys) {
      return keys.map((entry) => {
        const label = entry[0];
        const key = entry[1];
        const value = reportValue(report, key);
        if (value === undefined || value === null || value === "") return "";
        return label + ": " + String(value);
      }).filter(Boolean);
    }
    function safetySection(safety) {
      if (!safety || typeof safety !== "object") return "";
      return reportSection("안전 상태", Object.keys(safety).map((key) => key + ": " + (safety[key] ? "yes" : "no")));
    }
    function meaningfulMeetingItems(items) {
      return asArray(items).filter((item) => {
        const value = String(item || "");
        return value && !value.includes("즉시 판단할 제안/우려/질문이 없습니다");
      });
    }
    function meetingBoardLastTurnLine(turn) {
      if (!turn || typeof turn !== "object") return "아직 기록된 발언이 없습니다.";
      const speaker = staffName(turn.speaker_id || "");
      const type = optionLabel(turn.turn_type || turn.type || "brief");
      const content = short(turn.content || turn.summary || "", 160);
      return [speaker, type, content].filter(Boolean).join(" · ");
    }
    function formatMeetingBoardLog(board, safety) {
      if (!board || typeof board !== "object") return "";
      const questions = asArray(board.remaining_questions);
      const concerns = asArray(board.concerns_or_blockers);
      const decisions = meaningfulMeetingItems(board.decision_candidates);
      const handoffs = meaningfulMeetingItems(board.handoff_candidates);
      const hasOpenItems = questions.length || concerns.length || decisions.length;
      const nextSpeaker = board.next_speaker_id || board.next_speaker_recommendation || "";
      const nextSpeakerLine = nextSpeaker
        ? staffName(nextSpeaker) + (board.next_speaker_reason ? " - " + short(board.next_speaker_reason, 120) : "")
        : "추천 발언자가 아직 없습니다.";
      const safetyLines = [
        "읽기 전용: 이 버튼은 회의 기록, task, git을 바꾸지 않습니다.",
        safety?.read_only || board.safety?.read_only ? "검토용 카드입니다." : "상태 변경 가능성이 있으면 별도 버튼에서 다시 확인합니다.",
      ];
      return '<div class="item good">' +
        '<h3>회의판</h3>' +
        '<p class="summary">' + esc(board.current_meaning || "회의 상태와 다음 행동을 확인합니다.") + '</p>' +
        reportSection("지금 상황", [
          "회의: " + (board.meeting_id || board.topic || ""),
          "상태: " + optionLabel(board.status || "draft"),
          "발언 수: " + (board.turn_count ?? 0) + "개",
          "마지막 발언: " + meetingBoardLastTurnLine(board.last_turn),
          "다음 추천: " + nextSpeakerLine,
        ]) +
        reportSection("다음에 누를 것", board.director_next_actions || board.next_actions || []) +
        (hasOpenItems
          ? reportSection("남은 쟁점", [
              ...questions.map((item) => "질문: " + item),
              ...concerns.map((item) => "우려/막힘: " + item),
              ...decisions.map((item) => "판단 후보: " + item),
            ])
          : reportSection("남은 쟁점", ["남은 질문, 우려, 즉시 판단할 제안이 없습니다."])) +
        (handoffs.length ? reportSection("후속 업무 후보", handoffs) : reportSection("후속 업무 후보", ["후속 업무로 넘길 내용이 아직 명확하지 않습니다."])) +
        reportSection("종료 전 확인", board.close_checklist || [
          "핵심 역할이 필요한 관점을 냈는지 확인합니다.",
          "결정할 내용과 후속 업무로 넘길 내용을 분리합니다.",
          "공식 설정/canon 또는 구현 task로 확정하지 않았는지 확인합니다.",
        ]) +
        reportSection("안전 상태", safetyLines) +
        rawJsonDetails({ meeting_board: board, safety: safety || board.safety }) +
        '</div>';
    }
    function formatDirectorReportLog(value) {
      if (value?.meeting_board) return formatMeetingBoardLog(value.meeting_board, value.safety || value.meeting_board.safety);
      const specs = [
        {
          key: "director_goal_plan",
          title: "목표 기획안",
          status: [["plan", "director_goal_plan_id"], ["상태", "status"]],
          sections: [
            ["추천 부서", "recommended_departments"],
            ["추천 직원", "recommended_staff"],
            ["승인할 때 볼 것", "approval_items"],
            ["안전 경계", "non_goals"],
            ["다음 행동", "next_steps"],
          ],
        },
        {
          key: "staff_operating_plan",
          title: "AI 직원 운영 계획",
          status: [["직원", "agent_id"], ["부서", "department_name"], ["직책", "role_title"]],
          sections: [
            ["할 수 있는 일", (r) => r.authority_boundary?.can_do],
            ["승인 필요한 일", (r) => r.authority_boundary?.must_request_approval_for],
            ["하지 않는 일", (r) => r.authority_boundary?.must_not_do],
            ["필수 산출물", (r) => r.output_contract?.required_outputs],
            ["검증 자료/품질 기준", (r) => r.evidence_and_quality?.required_evidence],
          ],
        },
        {
          key: "meeting_board",
          title: "회의판",
          status: [["회의", "meeting_id"], ["상태", "status"], ["다음 발언자", "next_speaker_recommendation"]],
          sections: [
            ["다음 행동", "next_actions"],
            ["남은 질문", "remaining_questions"],
            ["우려/막는 항목", "concerns_or_blockers"],
            ["판단 후보", "decision_candidates"],
            ["후속 업무 후보", "handoff_candidates"],
            ["회의 종료 기준", "close_criteria"],
            ["감독자 체크리스트", "director_checklist"],
          ],
        },
        {
          key: "meeting_facilitation_plan",
          title: "회의 진행안",
          status: [["회의", "meeting_id"], ["상태", "status"], ["다음 발언자", "next_speaker_recommendation"]],
          sections: [
            ["추천 행동", "recommended_actions"],
            ["감독자 선택지", "director_decision_options"],
            ["막는 항목", "blockers"],
          ],
        },
        {
          key: "meeting_runbook",
          title: "회의 운영판",
          status: [["회의", "meeting_id"], ["상태", "status"]],
          sections: [
            ["다음 발언 순서", "next_turn_queue"],
            ["판단 후보", "decision_candidates"],
            ["인수인계 후보", "handoff_candidates"],
            ["닫기 기준", "close_criteria"],
            ["막는 항목", "blockers"],
            ["감독자 체크리스트", "director_checklist"],
          ],
        },
        {
          key: "work_order_handoff_plan",
          title: "업무 인수인계 점검",
          status: [["업무", "work_order_id"], ["출처", "source_ref"]],
          sections: [
            ["추천 담당 직원", "recommended_staff"],
            ["빠지거나 약한 항목", "missing_or_weak_items"],
            ["필수 입력", (r) => r.handoff_contract?.inputs_required],
            ["기대 산출물", (r) => r.handoff_contract?.expected_outputs],
            ["승인 항목", (r) => r.handoff_contract?.approval_items],
            ["필수 검증 자료", (r) => r.handoff_contract?.evidence_required],
            ["다음 행동", "next_actions"],
          ],
        },
        {
          key: "knowledge_transition_plan",
          title: "기록 전환 계획",
          status: [["대상", "source_ref"], ["종류", "source_kind"], ["분류", "category"]],
          sections: [
            ["가능한 행동", "possible_actions"],
            ["받아들이면 바뀌는 것", "what_changes_if_accepted"],
            ["바뀌지 않는 것", "what_does_not_change"],
            ["감독자 체크리스트", "director_checklist"],
          ],
        },
        {
          key: "canon_conflict_report",
          title: "공식 설정 충돌 점검",
          status: [["제안", "counts.proposals"], ["결정", "counts.decisions"], ["기억", "counts.memories"]],
          sections: [
            ["결정 필요한 항목", "needs_director_decision"],
            ["근거가 약한 공식 설정", "canon_records_missing_decision_evidence"],
            ["겹침 신호", "possible_overlap_signals"],
            ["다음 행동", "recommended_actions"],
          ],
        },
        {
          key: "project_execution_plan",
          title: "프로젝트 실행 준비 점검",
          status: [["project", "project_id"], ["profile", "active_profile_path"]],
          sections: [
            ["검증 프로필", "available_validation_profiles"],
            ["빌드 프로필", "available_build_profiles"],
            ["사용 가능한 도구", "available_tool_adapters"],
            ["승인 필요한 도구", "human_approval_required_for"],
            ["빠지거나 약한 항목", "missing_or_weak_items"],
            ["준비 확인", "ready_to_run_checks"],
            ["다음 행동", "recommended_next_actions"],
          ],
        },
        {
          key: "model_routing_plan",
          title: "모델 라우팅 계획",
          status: [["task", "task_id"], ["route", "selected_route.route"]],
          sections: [
            ["라우팅 규칙", "route_rules"],
            ["권한 gate", "permission_gates"],
            ["어댑터 요약", "adapter_summary"],
          ],
        },
        {
          key: "completion_evidence_checklist",
          title: "완료 근거 점검",
          status: [["task", "task_id"], ["runner", "runner_run_id"], ["verdict", "verdict"], ["완료 판단 가능", "ready_to_decide"]],
          sections: [
            ["확인할 것", "evidence_items"],
            ["빠진 근거", "missing_items"],
            ["우려/경고", (r) => [...asArray(r.concerns_to_review), ...asArray(r.warnings_to_review)]],
            ["다음 행동", "recommended_next_actions"],
          ],
        },
        {
          key: "completion_decision_plan",
          title: "완료 판단안",
          status: [["task", "task_id"], ["runner", "runner_run_id"], ["verdict", "verdict"], ["추천 판단", "recommended_decision"]],
          sections: [
            ["선택지", "decision_options"],
            ["우려/경고", (r) => [...asArray(r.concerns_to_review), ...asArray(r.warnings_to_review)]],
            ["판단 전 확인", "director_checklist"],
          ],
        },
        {
          key: "approval_impact_plan",
          title: "승인 영향 점검",
          status: [["task", "task_id"], ["승인 필요", "approval_required"]],
          sections: [
            ["왜 필요한가", "why_approval_is_or_is_not_required"],
            ["승인하면 허용되는 것", "approving_allows"],
            ["승인하지 않는 것", "approving_does_not_allow"],
            ["승인 후 바뀌는 것", "what_changes_after_approval"],
            ["판단 전 확인", "director_checklist"],
          ],
        },
        {
          key: "automation_readiness_plan",
          title: "자동 진행 준비도",
          status: [["task", "task_id"], ["자동 handoff", "can_auto_handoff"], ["자동 완료", "can_auto_finalize"], ["자동 commit/push", "can_auto_commit_or_push"]],
          sections: [
            ["막는 이유", "blockers"],
            ["자동 허용 후보", "allowed_auto_steps"],
            ["항상 사람 판단", "always_human_steps"],
            ["다음 행동", "recommended_next_actions"],
          ],
        },
        {
          key: "director_surface_map",
          title: "Studio 화면 목록 점검",
          status: [["전체 화면", "total_surfaces"], ["사용자 화면", "human_director_surfaces"], ["내부 화면", "internal_surfaces"]],
          sections: [
            ["사용자 화면", "director_surfaces"],
            ["내부/관리자 화면", "internal_admin_surfaces"],
            ["제품 규칙", "product_rules"],
          ],
        },
        {
          key: "traceability_map",
          title: "추적 지도",
          status: [["task", "task_id"], ["제목", "task_title"]],
          sections: [
            ["연결된 자료", "linked_refs"],
            ["빠진 연결", "missing_links"],
            ["다음 행동", "recommended_next_actions"],
          ],
        },
        {
          key: "studio_recovery_plan",
          title: "복구 점검",
          status: [["상태", "health"], ["재시작 명령", "safe_restart_command"]],
          sections: [
            ["확인된 문제", "issues"],
            ["복구 순서", "recovery_steps"],
          ],
        },
        {
          key: "studio_eval_plan",
          title: "Smoke 계획",
          status: [["plan", "studio_eval_plan_id"]],
          sections: [
            ["자동 확인", "automated_checks"],
            ["브라우저 확인 경로", "browser_smoke_routes"],
            ["사람 확인", "manual_director_checks"],
            ["통과 기준", "pass_criteria"],
          ],
        },
        {
          key: "studio_smoke_report",
          title: "Studio 점검",
          status: [["report", "studio_smoke_report_id"], ["생성 시각", "generated_at"]],
          sections: [
            ["경고", "warnings"],
            ["스키마 확인", "schema_checks"],
            ["화면 확인", "console_pages"],
            ["수동 smoke", "recommended_manual_smoke"],
          ],
        },
      ];
      for (const spec of specs) {
        const report = value[spec.key];
        if (!report || typeof report !== "object") continue;
        const summary = report.current_meaning || report.summary || report.overall_label || spec.title;
        const statusLines = reportStatusLines(report, spec.status || []);
        const sections = (spec.sections || []).map((section) => {
          const title = section[0];
          const accessor = section[1];
          const items = typeof accessor === "function" ? accessor(report) : reportValue(report, accessor);
          return reportSection(title, items);
        }).join("");
        const hasAttention = asArray(report.blockers).length
          || asArray(report.missing_items).length
          || asArray(report.missing_or_weak_items).length
          || asArray(report.issues).length
          || asArray(report.warnings).length
          || asArray(report.concerns_to_review).length
          || asArray(report.canon_records_missing_decision_evidence).length;
        return '<div class="item ' + (hasAttention ? "warn" : "good") + '">' +
          '<h3>' + esc(spec.title) + '</h3>' +
          '<p class="summary">' + esc(summary) + '</p>' +
          (statusLines.length ? reportSection("현재 상태", statusLines) : "") +
          sections +
          safetySection(value.safety || report.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      return "";
    }
    function formatWorkOrderLog(value) {
      if (value?.work_order_handoff_plan) {
        const plan = value.work_order_handoff_plan || {};
        const contract = plan.handoff_contract || {};
        return '<div class="item good"><h3>인수인계 점검</h3>' +
          '<p class="summary">이 업무 지시가 AI 직원이나 작업 목록으로 넘어가도 되는지, 빠진 정보가 있는지 먼저 확인했습니다. 아직 실행, task 생성, git 변경은 하지 않았습니다.</p>' +
          reportSection("현재 업무", [
            "업무: " + (plan.work_order_id || ""),
            "의미: " + (plan.current_meaning || plan.objective || ""),
            "대상 부서: " + optionLabel(plan.target_department || ""),
            "추천 직원: " + asArray(plan.recommended_staff).map(staffName).join(", "),
          ]) +
          reportSection("넘길 때 필요한 내용", [
            ...(asArray(contract.expected_inputs).map((item) => "입력: " + item)),
            ...(asArray(contract.expected_outputs).map((item) => "결과물: " + item)),
            ...(asArray(contract.approval_items).map((item) => "승인 판단: " + item)),
          ]) +
          reportSection("보강이 필요한 항목", plan.missing_or_weak_items || [], "보강이 필요한 항목이 없습니다.") +
          reportSection("다음 행동", plan.next_actions || []) +
          safetySection(value.safety || plan.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.command === "store" && value?.work_order_id) {
        const written = value?.safety?.workorder_written === true || value?.execute === true;
        return '<div class="item ' + (written ? "good" : "warn") + '"><h3>업무 지시 저장 완료</h3>' +
          '<p class="summary">' + esc(written ? "수정이나 후속 작업으로 이어갈 업무 지시를 만들었습니다. 아직 구현, task 생성, commit/push는 하지 않았습니다." : "업무 지시 저장 계획을 확인했습니다.") + '</p>' +
          reportSection("생성된 업무", [
            "업무 지시: " + value.work_order_id,
            "저장 위치: " + (value.target_path || ""),
          ]) +
          reportSection("다음 행동", [
            "업무 지시 화면에서 내용을 확인하세요.",
            "범위가 맞으면 인수인계 점검이나 작업 생성 계획을 확인한 뒤 다음 gate로 넘기세요.",
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value, "내부 원본 JSON") +
          '</div>';
      }
      if (value?.context_packet && !value?.staff_plan && !value?.task_draft) {
        const packet = value.context_packet || {};
        return '<div class="item good"><h3>직원 자료 미리보기</h3>' +
          '<p class="summary">AI 직원에게 전달될 목표, 할 일, 제약 조건, 참고 근거를 미리 묶어 본 것입니다. 직원 실행은 아직 시작하지 않았습니다.</p>' +
          reportSection("전달 대상", [
            "직원: " + staffName(packet.agent_id || value.agent_id || ""),
            "부서: " + optionLabel(packet.department_id || ""),
            "출처: " + (packet.source_ref || ""),
          ]) +
          reportSection("직원이 받는 일", [
            "목표: " + (packet.objective || ""),
            ...asArray(packet.approved_scope).map((item) => "할 일: " + item),
            ...asArray(packet.non_goals).map((item) => "제약 조건: " + item),
          ]) +
          reportSection("참고 근거", [
            "공식 설정: " + asArray(packet.memory_context?.canon_refs).length + "개",
            "승인 결정: " + asArray(packet.memory_context?.approved_decision_refs).length + "개",
            "검증 자료: " + asArray(packet.memory_context?.evidence_refs).length + "개",
          ]) +
          safetySection(value.safety || packet.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.staff_plan) {
        const plan = value.staff_plan || {};
        const packet = value.context_packet || {};
        return '<div class="item warn"><h3>직원 실행 계획</h3>' +
          '<p class="summary">AI 직원 실행을 시작하기 전에 모델, 권한, 전달 자료를 확인하는 계획입니다. 이 화면은 계획만 보여주며 실행은 별도 버튼에서만 시작됩니다.</p>' +
          reportSection("실행 대상", [
            "직원: " + staffName(plan.agent_id || packet.agent_id || ""),
            "역할 실행: " + (plan.role_run_id || packet.role_run_id || ""),
            "문맥 묶음: " + (plan.context_packet_id || packet.context_packet_id || ""),
          ]) +
          reportSection("실행 설정", [
            "모델: " + (plan.model || ""),
            "추론 강도: " + (plan.reasoning || ""),
            "제공자: " + (plan.provider_policy || ""),
            "명령: " + short([plan.resolved_codex_command || plan.codex_command, ...(plan.planned_args || [])].filter(Boolean).join(" "), 220),
          ]) +
          reportSection("다음 행동", [
            "계획이 맞으면 직원에게 맡기기를 눌러 실행합니다.",
            "범위가 애매하면 업무 지시를 고친 뒤 다시 계획을 확인합니다.",
          ]) +
          safetySection(value.safety || plan.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.task_draft) {
        const draft = value.task_draft || {};
        return '<div class="item good"><h3>작업 생성 계획</h3>' +
          '<p class="summary">이 업무 지시를 AIWorkflow 작업 목록에 넣으면 어떤 task 초안이 생길지 미리 보여줍니다. 아직 Backlog에는 쓰지 않았습니다.</p>' +
          reportSection("생성될 작업 초안", [
            "제목: " + (draft.title || ""),
            "분류: " + (draft.category || ""),
            "종류: " + (draft.kind || ""),
            "우선순위/위험도: " + [draft.priority, draft.suggested_risk].filter(Boolean).join(" / "),
            "Workflow: " + (draft.workflow_path || ""),
          ]) +
          reportSection("승인 판단", draft.human_decision_gates || []) +
          reportSection("필수 검증", draft.required_validation || []) +
          reportSection("다음 행동", [
            draft.suggested_next_manual_action || "내용이 맞으면 작업 목록에 넣기를 눌러 Backlog task로 만듭니다.",
            "이 계획 자체는 승인, 실행, 완료, commit/push를 하지 않습니다.",
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      return "";
    }
    function formatGenericLogObject(value) {
      if (value?.company_runtime_readiness_report || value?.company_runtime || value?.gates?.some?.((gate) => gate.id && String(gate.id).includes("runtime"))) {
        const formatted = formatCompanyRuntimeReadinessLog(value);
        if (formatted) return formatted;
      }
        const directorReport = formatDirectorReportLog(value);
        if (directorReport) return directorReport;
      const workOrderReport = formatWorkOrderLog(value);
      if (workOrderReport) return workOrderReport;
      const workflowFinalizationFailure = formatWorkflowFinalizationFailure(value);
      if (workflowFinalizationFailure) return workflowFinalizationFailure;
      const materializationDecisionFailure = formatMaterializationDecisionFailure(value);
      if (materializationDecisionFailure) return materializationDecisionFailure;
      if (value?.command === "decision-create-memory" && value?.ok === false) {
        return '<div class="item danger"><h3>참고 기록 저장 실패</h3>' +
          '<p class="summary">이 판단 기록은 대상 ID가 비어 있어 참고 기록으로 저장할 수 없습니다. 아무것도 저장하지 않았습니다.</p>' +
          reportSection("대상", [
            "결정: " + (value.decision_id || ""),
            "판단: " + optionLabel(value.decision_type || ""),
            "요약: " + (value.summary || ""),
          ]) +
          reportSection("왜 실패했나", value.validation?.errors || [translateStudioMessage(value.error || "저장할 수 없는 판단 기록입니다.")]) +
          reportSection("다음 행동", [
            "대상이 명확한 제안/결정에서 다시 저장하세요.",
            "오래된 테스트 기록이면 읽고 넘어가거나 정리 대상으로 보면 됩니다.",
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value, "내부 원본 JSON") +
          '</div>';
      }
      if (value?.data?.finalization_log_id || value?.data?.finalization_state || value?.command === "request-changes") {
        const data = value.data || {};
        const decision = data.final_decision || data.decision || value.decision || value.command || "";
        const decisionLabel = optionLabel(decision);
        const taskId = data.task_id || data.approval_record?.task_id || "";
        const finalizationState = data.finalization_state || "";
        const cardClass = decision === "request_changes" || decision === "request-changes" ? "warn" : value.ok ? "good" : "danger";
        const decisionMeaning = {
          accept: "완료 결과를 받아들였다는 기록을 남겼습니다.",
          "accept-concerns": "남은 우려를 확인했고 감수한다는 기록을 남겼습니다.",
          request_changes: "이 작업은 완료하지 않고, 수정이 필요하다는 기록을 남겼습니다.",
          "request-changes": "이 작업은 완료하지 않고, 수정이 필요하다는 기록을 남겼습니다.",
          reject: "이번 결과를 받아들이지 않는다는 기록을 남겼습니다.",
          defer: "지금은 완료 판단을 미룬다는 기록을 남겼습니다.",
        }[decision] || "감독자 최종 판단 기록을 남겼습니다.";
        const nextActions = decision === "request_changes" || decision === "request-changes"
          ? [
              "수정해야 할 내용을 새 업무 지시나 후속 작업으로 정리하세요.",
              "수정 작업을 다시 실행한 뒤 완료 보고서를 새로 확인하세요.",
              "아직 task done, commit, push는 하지 않습니다.",
            ]
          : [
              "결과를 다시 확인하고 필요하면 작업 완료나 커밋/푸시 결정을 진행하세요.",
              "이 기록만으로 commit/push는 실행되지 않습니다.",
            ];
        return '<div class="item ' + cardClass + '"><h3>감독자 최종 판단 기록 완료</h3>' +
          '<p class="summary">' + esc(decisionMeaning) + '</p>' +
          reportSection("대상", [
            "작업: " + taskId,
            "판단: " + decisionLabel,
            "상태: " + optionLabel(finalizationState),
          ]) +
          reportSection("생성된 기록", [
            "FinalizationLog: " + (data.finalization_log_id || ""),
            "ApprovalHistory: " + (data.approval_record_id || data.approval_record?.approval_record_id || ""),
            "진행 이벤트: " + (data.latest_progress_event_id || ""),
          ]) +
          reportSection("다음 행동", nextActions) +
          safetySection({
            task_done: !!data.task_done,
            runner_continue: !!data.runner_continue,
            commit_push: false,
          }) +
          rawJsonDetails(value, "내부 원본 JSON") +
          '</div>';
      }
      if (value?.command === "create" && (value?.memory_id || value?.summary?.memory_id)) {
        const summary = value.summary || {};
        const validation = value.validation || {};
        const written = value.safety?.memory_written;
        return '<div class="item ' + (value.ok ? "good" : "danger") + '"><h3>' + esc(value.ok ? "참고 기록 저장 완료" : "참고 기록 저장 실패") + '</h3>' +
          '<p class="summary">' + esc(value.ok
            ? "AI 직원이 이후 작업에서 참고할 기록을 저장했습니다. 이 작업은 소스, task, commit/push를 바꾸지 않습니다."
            : "참고 기록으로 저장하지 못했습니다. 아래 검증 오류를 확인하세요.") + '</p>' +
          reportSection("저장 대상", [
            "기록: " + (summary.memory_id || value.memory_id || ""),
            "상태: " + optionLabel(summary.status || validation.status || ""),
            "범위: " + optionLabel(summary.scope || validation.scope || ""),
            "종류: " + optionLabel(summary.type || validation.type || ""),
            "담당: " + staffName(summary.owner_agent_id || ""),
          ]) +
          reportSection("내용", [summary.content_preview || ""], "내용 미리보기가 없습니다.") +
          reportSection("문제", validation.errors || [], "저장 전 검증 오류는 없습니다.") +
          reportSection("다음 행동", [
            written ? "참고 기록 / 공식 설정 목록에서 방금 저장한 기록을 확인하세요." : "아직 저장되지 않은 dry-run 또는 실패 결과입니다.",
            "공식 설정으로 확정하려면 게임 설정 후보에 대한 공식 설정 검토 기록을 거쳐야 합니다.",
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value, "내부 원본 JSON") +
          '</div>';
      }
      if (value?.command === "create-decision" && value?.record?.decision_id) {
        const record = value.record;
        const written = value.safety?.decision_written;
        return '<div class="item ' + (value.ok ? "good" : "danger") + '"><h3>감독자 판단 기록 완료</h3>' +
          '<p class="summary">제안이나 회의, 업무 지시에 대한 Human Director 판단을 기록했습니다. 이 작업은 구현, task 실행, commit/push를 하지 않습니다.</p>' +
          reportSection("기록 대상", [
            "결정: " + (record.decision_id || ""),
            "대상: " + (record.target_ref || ""),
            "판단: " + optionLabel(record.decision_type || ""),
            "요약: " + (record.decision_summary || ""),
          ]) +
          reportSection("이 판단으로 허용한 것", record.accepted_scope || [], "따로 적힌 허용 범위가 없습니다.") +
          reportSection("아직 허용하지 않는 것 / 조건", [...asArray(record.rejected_scope), ...asArray(record.conditions)], "따로 적힌 제한 조건이 없습니다.") +
          reportSection("다음 행동", [
            written ? "결정 기록 목록에서 방금 만든 판단을 확인하세요." : "아직 저장되지 않은 dry-run 결과입니다.",
            "필요하면 이 판단을 참고 기록 또는 공식 설정 후보로 넘길 수 있습니다.",
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.command === "create-proposal" && value?.record?.proposal_id) {
        const record = value.record;
        return '<div class="item ' + (value.ok ? "good" : "danger") + '"><h3>제안 저장 완료</h3>' +
          '<p class="summary">제안을 제안함에 저장했습니다. 제안은 아직 승인, 공식 설정, 구현 지시가 아닙니다.</p>' +
          reportSection("저장된 제안", [
            "제안: " + (record.proposal_id || ""),
            "제목: " + (record.title || ""),
            "출처: " + staffName(record.source_agent_id || ""),
            "상태: " + optionLabel(record.status || ""),
          ]) +
          reportSection("다음 행동", [
            "제안함에서 내용을 읽고 채택, 수정 요청, 반려 중 하나로 판단하세요.",
            "게임 설정 후보일 때만 공식 설정 검토 기록을 사용하세요.",
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.command === "export" && value?.output_path) {
        return '<div class="item good"><h3>직원 보고서 보기 자료 생성</h3>' +
          '<p class="summary">직원 실행 결과를 사람이 읽기 좋은 HTML 검토 자료로 만들었습니다. 이 작업은 소스, task, 공식 설정, git을 바꾸지 않습니다.</p>' +
          reportSection("현재 상태", [
            "보고서: " + (value.output_id || ""),
            "직원 실행: " + (value.role_run_id || ""),
            "직원: " + (value.agent_id || ""),
            "상태: " + (value.status || ""),
          ]) +
          reportSection("포함된 내용", [
            "제안: " + (value.counts?.proposals ?? 0),
            "반론/우려: " + (value.counts?.objections ?? 0),
            "질문: " + (value.counts?.questions ?? 0),
            "승인 항목: " + (value.counts?.approval_items ?? 0),
            "업무 지시 후보: " + (value.counts?.workorders ?? 0),
            "기억 요청: " + (value.counts?.memory_requests ?? 0),
          ]) +
          reportSection("다음 행동", ["생성된 HTML을 열어 직원 보고서 내용을 검토합니다.", "채택할 내용이 있으면 채택 후보 미리보기 또는 채택 후보로 넘기기를 사용합니다."]) +
          safetySection(value.safety) +
          (value.output_path ? '<div class="row"><a href="/file?path=' + encodeURIComponent(value.output_path) + '" target="_blank">보고서 열기</a></div>' : '') +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.toolbox_result) {
        const result = value.toolbox_result;
        const cardClass = value.ok ? "good" : "danger";
        const outputLines = [
          result.stdout ? "stdout:\\n" + result.stdout.trim() : "",
          result.stderr ? "stderr:\\n" + result.stderr.trim() : "",
        ].filter(Boolean);
        if (result.tool_id === "google_drive_data_upload") {
          const publish = result.publish_summary || {};
          return '<div class="item ' + cardClass + '"><h3>' + esc(value.ok ? "팀 데이터 배포 완료" : "팀 데이터 배포 실패") + '</h3>' +
            '<p class="summary">' + esc(value.ok
              ? "PlayGround/Data 검증, versioned zip 업로드, latest manifest 갱신 흐름이 완료되었습니다."
              : "배포가 완료되지 않았습니다. 실패 단계와 로그를 확인하세요.") + '</p>' +
            reportSection("배포 버전", [publish.data_version || "자동 버전 사용"]) +
            reportSection("처리 결과", value.ok ? [
              publish.source_validation_seen ? "원본 Data 검증 실행" : "원본 Data 검증 로그 확인 필요",
              publish.archive_validation_seen ? "배포 zip 추출본 검증 실행" : "배포 zip 검증 로그 확인 필요",
              publish.archive_name ? "versioned zip 업로드: " + publish.archive_name : "versioned zip 업로드 결과 확인 필요",
              publish.backup_manifest_file_id ? "기존 latest manifest 백업 완료" : "기존 latest manifest가 없었거나 백업 없음",
              publish.latest_manifest_updated ? "latest manifest 갱신 완료" : "latest manifest 갱신 확인 필요",
            ] : [
              publish.failure_stage ? "실패 위치: " + publish.failure_stage : "실패 위치를 로그에서 확인해야 합니다.",
              "검증/zip 단계에서 실패했다면 Drive 최신 배포본은 바뀌지 않습니다.",
              "업로드 단계 이후 실패라면 아래 로그와 Drive 상태를 확인하세요.",
            ]) +
            reportSection("Drive 기록", [
              publish.archive_name ? "archive: " + publish.archive_name : "",
              publish.archive_file_id ? "archive id: " + publish.archive_file_id : "",
              publish.archive_size ? "archive size: " + publish.archive_size : "",
              publish.backup_manifest_name ? "backup manifest: " + publish.backup_manifest_name : "",
              publish.backup_manifest_file_id ? "backup manifest id: " + publish.backup_manifest_file_id : "",
              publish.manifest_file_id ? "latest manifest id: " + publish.manifest_file_id : "",
              publish.log_path ? "log: " + publish.log_path : "",
            ].filter(Boolean), "Drive 기록은 로그에서 확인하세요.") +
            reportSection("다음 확인", value.ok ? [
              "독립 폴더에 PlayGround.exe, DataUpdateConfig.json, DataUpdater만 넣고 실행합니다.",
              "실행 후 Data 폴더와 Data/DataUpdateManifest.json이 생성되는지 확인합니다.",
              "게임이 정상 시작되면 배포 smoke를 통과로 봅니다.",
            ] : [
              "업로드 로그 보기에서 실패 원인을 확인합니다.",
              "필요하면 백업 manifest 목록/rollback 명령은 별도로 실행합니다.",
            ]) +
            reportSection("안전 상태", [
              "소스 변경 없음",
              "task 상태 변경 없음",
              "commit/push 없음",
            ]) +
            (outputLines.length ? '<details class="internal-links"><summary>업로드 로그 보기</summary><pre class="log-json">' + esc(outputLines.join("\\n\\n").slice(0, 16000)) + '</pre></details>' : "") +
            '</div>';
        }
        return '<div class="item ' + cardClass + '"><h3>' + esc(result.label || "도구 실행 결과") + '</h3>' +
          '<p class="summary">' + esc(result.summary || "") + '</p>' +
          reportSection("실행 정보", [
            "상태: " + (result.status || ""),
            "명령: " + (result.command_display || ""),
            result.exit_code !== undefined ? "종료 코드: " + result.exit_code : "",
          ].filter(Boolean)) +
          (outputLines.length ? '<h3>출력</h3><pre class="log-json">' + esc(outputLines.join("\\n\\n").slice(0, 12000)) + '</pre>' : "") +
          (result.parsed_json ? '<details class="internal-links"><summary>JSON 결과</summary><pre class="log-json">' + esc(JSON.stringify(result.parsed_json, null, 2)) + '</pre></details>' : "") +
          safetySection(value.safety) +
          '</div>';
      }
      if (value?.command === "inspect" && value?.summary) {
        const summary = value.summary || {};
        const validation = value.validation || {};
        return '<div class="item ' + (validation.ok ? "good" : "warn") + '"><h3>회의 상태 점검</h3>' +
          '<p class="summary">선택한 회의 기록이 진행 가능한 상태인지 읽기 전용으로 확인했습니다.</p>' +
          reportSection("현재 회의", [
            "회의: " + (summary.meeting_id || ""),
            "주제: " + (summary.topic || ""),
            "종류: " + optionLabel(summary.meeting_type || ""),
            "상태: " + optionLabel(summary.status || ""),
            "의장: " + staffName(summary.chair_agent_id || ""),
            "참가자: " + asArray(summary.participants).map(staffName).join(", "),
          ]) +
          reportSection("확인된 내용", [
            "제안 " + (summary.proposal_count ?? 0) + "개",
            "우려/반론 " + (summary.objection_count ?? 0) + "개",
            "남은 질문 " + (summary.unresolved_question_count ?? 0) + "개",
            "감독자 결정 " + (summary.director_decision_count ?? 0) + "개",
          ]) +
          reportSection("오류/경고", [...asArray(validation.errors), ...asArray(validation.warnings)], "오류나 경고가 없습니다.") +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.command === "handoff") {
        return '<div class="item ' + (value.handoff_ready ? "good" : "warn") + '"><h3>회의 인수인계 보기</h3>' +
          '<p class="summary">회의 결과를 후속 업무나 다른 AI 직원에게 넘길 준비가 됐는지 확인했습니다. 이 버튼은 읽기 전용이며 업무를 만들지 않습니다.</p>' +
          reportSection("현재 회의", [
            "회의: " + (value.meeting_id || ""),
            "주제: " + (value.topic || ""),
            "넘길 준비: " + (value.handoff_ready ? "가능" : "확인 필요"),
          ]) +
          reportSection("넘길 수 있는 내용", [
            "후속 업무 후보 " + asArray(value.follow_up_workorders).length + "개",
            "받아들인 방향 " + asArray(value.accepted_directions).length + "개",
            "남은 질문 " + asArray(value.unresolved_questions).length + "개",
            "감독자 결정 " + asArray(value.director_decisions).length + "개",
          ]) +
          reportSection("막는 항목", value.blocked_by, "막는 항목이 없습니다.") +
          reportSection("다음 행동", value.next_actions) +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.command === "add-turn") {
        const turn = value.turn || {};
        return '<div class="item good"><h3>내 의견 기록 완료</h3>' +
          '<p class="summary">MeetingSession에 발언 1개를 저장했습니다. 이 작업은 회의 기록만 바꾸며 공식 설정, task, git은 바꾸지 않습니다.</p>' +
          reportSection("추가된 발언", [
            "회의: " + (value.meeting_id || ""),
            "기록 주체: " + staffName(turn.speaker_id || ""),
            "종류: " + optionLabel(turn.turn_type || ""),
            "내용: " + short(turn.content || "", 220),
          ]) +
          reportSection("현재 상태", [
            "다음 회의 상태: " + optionLabel(value.next_status || ""),
            "저장 파일: " + (value.path || ""),
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.staff_run && value?.meeting_id && Object.prototype.hasOwnProperty.call(value, "turn_appended")) {
        const turn = value.added_turn || value.turn_result?.turn || {};
        const appended = Boolean(value.turn_appended);
        return '<div class="item ' + (appended ? "good" : "warn") + '"><h3>다음 AI 발언 결과</h3>' +
          '<p class="summary">' + esc(appended
            ? "AI 직원 의견이 MeetingSession 발언으로 추가되었습니다. 공식 설정, task, git은 바꾸지 않았습니다."
            : "AI 직원 실행은 끝났지만 회의 발언으로 추가되지 않았습니다. 결과와 원본 JSON을 확인해야 합니다.") + '</p>' +
          reportSection("바뀐 것", [
            "회의: " + (value.meeting_id || ""),
            "발언자: " + staffName(value.agent_id || turn.speaker_id || ""),
            "발언 수: " + (value.before_turn_count ?? "?") + " -> " + (value.after_turn_count ?? "?"),
            "AI 발언 추가: " + (appended ? "yes" : "no"),
          ]) +
          reportSection("추가된 발언", appended ? [
            "종류: " + optionLabel(turn.turn_type || "synthesis"),
            "내용: " + short(turn.content || "", 260),
          ] : []) +
          reportSection("바뀌지 않은 것", [
            "공식 설정 확정 없음",
            "AIWorkflow task 생성/실행 없음",
            "소스/데이터 수정 없음",
            "commit/push 없음",
          ]) +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if ((value?.command === "plan" || value?.command === "materialize") && (value?.validation || value?.plan?.validation || value?.materialization || value?.plan?.materialization)) {
        const plan = value.command === "plan" ? value : (value.plan || {});
        const validation = value.validation || value.plan?.validation || {};
        const materialization = value.materialization || plan.materialization || {};
        const counts = value.counts || plan.counts || {};
        const totalCandidates = Number(counts.proposals || 0) + Number(counts.memory || 0) + Number(counts.work_orders || 0) + Number(counts.handoffs || 0);
        const isWrite = value.command === "materialize" && value.ok !== false;
        const hasFailure = value.ok === false || validation.ok === false;
        const title = hasFailure
          ? "채택 후보로 넘길 수 없음"
          : (isWrite ? "채택 후보로 넘김" : "채택 후보 미리보기");
        const cardClass = hasFailure ? "danger" : (isWrite ? "good" : "warn");
        const summary = hasFailure
          ? "이 직원 보고서는 지금 채택 후보로 넘길 수 없습니다. 아래 이유를 확인하세요."
          : (totalCandidates === 0
            ? "이 직원 보고서에는 채택 후보로 넘길 제안, 기억, 업무 지시, 인수인계가 없습니다."
            : "직원 보고서에서 채택 검토할 수 있는 후보만 뽑아 정리했습니다. 이것은 실행 승인, 공식 설정 확정, task 생성이 아닙니다.");
        const cleanupPath = plan.output_path || value.output_path || "";
        return '<div class="item ' + cardClass + '"><h3>' + title + '</h3>' +
          '<p class="summary">' + esc(summary) + '</p>' +
          reportSection("대상", [
            "보고서: " + (plan.output_id || value.output_id || materialization.source_output_id || ""),
            "직원 실행: " + (plan.role_run_id || value.role_run_id || materialization.source_role_run_id || ""),
            "직원: " + staffName(plan.agent_id || value.agent_id || materialization.source_agent_id || ""),
          ]) +
          reportSection("채택 후보 개수", [
            "아이디어 제안: " + (counts.proposals ?? 0) + "개",
            "프로젝트 기억 후보: " + (counts.memory ?? 0) + "개",
            "업무 지시 후보: " + (counts.work_orders ?? 0) + "개",
            "직원 인수인계 후보: " + (counts.handoffs ?? 0) + "개",
          ]) +
          reportSection(hasFailure ? "왜 안 되는가" : "검토 결과", [
            ...(validation.errors || []).map(translateStudioMessage),
            ...(validation.warnings || []).map(translateStudioMessage),
            translateStudioMessage(value.error || ""),
          ], hasFailure ? "확인된 문제 없음" : "문제 없음") +
          reportSection(isWrite ? "생성된 후보" : "생성 예정 후보", materialization.created_records || [], totalCandidates === 0 ? "생성할 후보 없음" : "후보 정보 없음") +
          reportSection("다음 행동", hasFailure
            ? ["보고서 ID 형식 또는 직원 보고서 내용을 확인하세요.", "깨진 테스트 보고서나 오래된 개발 버전 보고서라면 임시 보고서 정리로 목록에서 지울 수 있습니다."]
            : (isWrite
              ? ["오른쪽 채택 후보 검토 영역에서 채택, 반려, 보류, 수정 요청 중 하나로 정리합니다.", "저장된 후보는 바로 실행되거나 공식 설정으로 확정되지 않습니다."]
              : ["내용이 맞으면 채택 후보로 넘기기를 눌러 검토 대상을 저장합니다.", "저장 전까지는 아무 파일도 바뀌지 않습니다."])) +
          (hasFailure && cleanupPath ? actionsHtml([button("임시 보고서 정리", "staff-run-cleanup", cleanupPath, "danger")]) : "") +
          safetySection(value.safety || plan.safety || materialization.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.command === "staff-run-cleanup") {
        return '<div class="item good"><h3>임시 보고서 정리 완료</h3>' +
          '<p class="summary">깨진 테스트 보고서나 더 이상 쓸 수 없는 개발 버전 직원 보고서를 목록에서 지웠습니다.</p>' +
          reportSection("정리한 대상", [
            "보고서: " + (value.output_id || ""),
            "직원 실행: " + (value.role_run_id || ""),
            "직원: " + staffName(value.agent_id || ""),
            "경로: " + (value.cleaned_path || ""),
          ]) +
          reportSection("바뀌지 않은 것", ["소스 파일 변경 없음", "task 상태 변경 없음", "공식 설정 변경 없음", "commit/push 없음"]) +
          safetySection(value.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.materialization || value?.command === "materialize") {
        const materialization = value.materialization || value;
        return '<div class="item ' + (value.command === "materialize" ? "good" : "warn") + '"><h3>' + (value.command === "materialize" ? "채택 후보로 넘김" : "채택 후보 미리보기") + '</h3>' +
          '<p class="summary">직원 보고서에서 아이디어 제안, 프로젝트 기억, 업무 지시, 직원 인수인계 후보만 뽑아 채택 검토 대상으로 정리합니다. 이것은 실행 승인, 공식 설정 확정, task 생성이 아닙니다.</p>' +
          reportSection("현재 상태", [
            "후보 묶음: " + (materialization.materialization_id || ""),
            "원본 보고서: " + (materialization.source_output_id || value.output_id || ""),
            "원본 직원 실행: " + (materialization.source_role_run_id || value.role_run_id || ""),
            "직원: " + (materialization.source_agent_id || value.agent_id || ""),
          ]) +
          reportSection("생성/예정 후보", materialization.created_records || []) +
          reportSection("건너뛴 항목", materialization.skipped_items || []) +
          reportSection("다음 행동", [
            value.command === "materialize" ? "오른쪽 채택 후보 검토 영역에서 채택, 반려, 보류, 수정 요청 중 하나로 정리합니다." : "내용이 맞으면 채택 후보로 넘기기를 눌러 검토 대상을 저장합니다.",
            "저장된 후보도 바로 실행되거나 공식 설정이 되지 않습니다.",
          ]) +
          safetySection(value.safety || materialization.safety) +
          rawJsonDetails(value) +
          '</div>';
      }
      if (value?.ok === false || value?.error || value?.reason) {
        return '<div class="item danger"><h3>실행 실패</h3><p class="summary">' + esc(value.reason || value.error || "작업 중 오류가 발생했습니다.") + '</p><pre class="log-json">' + esc(JSON.stringify(value, null, 2)) + '</pre></div>';
      }
      return '<pre class="log-json">' + esc(JSON.stringify(value, null, 2)) + '</pre>';
    }
    function revealResultPanel(panel) {
      if (!panel || typeof panel.getBoundingClientRect !== "function") return;
      const rect = panel.getBoundingClientRect();
      const margin = 24;
      const belowViewport = rect.top >= 0 && rect.bottom > window.innerHeight - margin;
      if (belowViewport) panel.scrollIntoView({ behavior:"smooth", block:"nearest" });
    }
    function writeResult(html) {
      const meetingPanel = el("meetingResultPanel");
      const meetingBody = el("meetingResult");
      if (activePage === "meetings" && meetingPanel && meetingBody) {
        meetingBody.innerHTML = html;
        meetingPanel.hidden = false;
        revealResultPanel(meetingPanel);
        return;
      }
      const evidenceBody = el("evidenceResult");
      if (activePage === "evidence" && evidenceBody) {
        evidenceBody.innerHTML = html;
        revealResultPanel(evidenceBody);
        return;
      }
      const globalPanel = el("globalResultPanel");
      const globalBody = el("globalResult");
      if (globalPanel && globalBody) {
        globalBody.innerHTML = html;
        globalPanel.hidden = false;
        revealResultPanel(globalPanel);
      }
    }
    const log = (value) => {
      const rendered = typeof value === "string"
        ? '<div class="log-message">' + esc(value) + '</div>'
        : formatGenericLogObject(value);
      writeResult(rendered);
    };
    function notifyTeamDataPublish(value) {
      const result = value?.toolbox_result || {};
      const publish = result.publish_summary || {};
      const ok = value?.ok === true;
      const lines = [
        ok ? "팀 데이터 배포 완료" : "팀 데이터 배포 실패",
        "",
        ok
          ? "versioned zip 업로드와 latest manifest 갱신까지 완료되었습니다."
          : "배포가 완료되지 않았습니다. 아래 실패 위치와 로그를 확인하세요.",
      ];
      if (publish.data_version) lines.push("배포 버전: " + publish.data_version);
      if (publish.archive_name) lines.push("업로드 zip: " + publish.archive_name);
      if (publish.archive_file_id) lines.push("zip 파일 ID: " + publish.archive_file_id);
      if (publish.manifest_file_id) lines.push("latest manifest ID: " + publish.manifest_file_id);
      if (publish.backup_manifest_file_id) lines.push("백업 manifest ID: " + publish.backup_manifest_file_id);
      if (publish.failure_stage) lines.push("실패 위치: " + publish.failure_stage);
      if (!ok && result.exit_code !== undefined) lines.push("종료 코드: " + result.exit_code);
      if (!ok && !publish.failure_stage) {
        const message = value?.error || value?.message || result.summary || "자세한 오류는 화면의 배포 결과 카드에서 확인하세요.";
        lines.push("오류: " + message);
      }
      if (publish.log_path) {
        lines.push("");
        lines.push("로그: " + publish.log_path);
      }
      lines.push("");
      lines.push("상세 내용은 화면의 배포 결과 카드에도 남습니다.");
      alert(lines.join("\\n"));
    }

    async function api(path, options) {
      const res = await fetch(path, options);
      const json = await res.json();
      if (!res.ok || json.ok === false) throw json;
      return json;
    }
    function post(path, body) {
      return api(path, { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify(body || {}) });
    }
    function metric(label, value) {
      return '<div class="card metric-card"><div class="metric-label">' + esc(label) + '</div><div class="metric">' + esc(value) + '</div></div>';
    }
    function button(label, action, filePath, className = "secondary", extra = "") {
      return '<button class="' + esc(className) + '" data-action="' + esc(action) + '" data-path="' + esc(filePath) + '" ' + extra + '>' + esc(label) + '</button>';
    }
    function link(label, href) {
      return href ? '<a href="' + esc(href) + '" target="_blank">' + esc(label) + '</a>' : "";
    }
    function short(text, max = 180) {
      const clean = String(text || "").replace(/\\s+/g, " ").trim();
      return clean.length > max ? clean.slice(0, max - 3).trimEnd() + "..." : clean;
    }
    function asArray(value) {
      return Array.isArray(value) ? value.filter(Boolean) : [];
    }
    function internalLinksHtml(links, label = "내부 원본 보기") {
      const visibleLinks = asArray(links).filter(Boolean);
      if (!visibleLinks.length) return "";
      return '<details class="internal-links"><summary>' + esc(label) + '</summary><div class="row">' + visibleLinks.join("") + '</div></details>';
    }
    function actionsHtml(items, className = "action-row primary") {
      const visibleItems = asArray(items).filter(Boolean);
      return visibleItems.length ? '<div class="' + esc(className) + '">' + visibleItems.join("") + '</div>' : "";
    }
    function listHtml(items, emptyText = "") {
      const values = asArray(items).slice(0, 4);
      if (!values.length) return emptyText ? '<p class="small muted">' + esc(emptyText) + '</p>' : "";
      const more = asArray(items).length > values.length ? '<li>+' + esc(asArray(items).length - values.length) + '개 더 있음</li>' : "";
      return '<ul class="small">' + values.map((item) => '<li>' + esc(short(item, 110)) + '</li>').join("") + more + '</ul>';
    }
    function inlineList(items, emptyText = "-") {
      const values = asArray(items);
      return values.length ? values.slice(0, 3).join(", ") + (values.length > 3 ? " +" + (values.length - 3) : "") : emptyText;
    }
    function selectedGitFiles() {
      return Array.from(new Set(Array.from(document.querySelectorAll('input[data-git-file]:checked')).map((input) => input.dataset.gitFile)));
    }
    function isWorkflowPath(filePath) {
      return String(filePath || "").startsWith("_Docs/AIWorkflow/") || String(filePath || "").startsWith("tools/aiworkflow/");
    }
    function filePurpose(filePath) {
      const value = String(filePath || "");
      if (!value) return "대상 파일 정보가 없습니다.";
      if (value.includes("_Docs/AIWorkflow/Backlog.md")) return "작업 목록 상태 파일입니다. task 상태나 메모가 바뀐 신호입니다.";
      if (value.includes("_Docs/AIWorkflow/ActiveTask.md")) return "현재 선택된 작업 상태 파일입니다. active/done 같은 진행 상태가 바뀐 신호입니다.";
      if (value.includes("_Docs/AIWorkflow/")) return "워크플로우 문서 또는 Studio 설정 파일입니다. 운영 규칙이나 UI 설명이 바뀐 신호입니다.";
      if (value.includes("PlayGround/Data/")) return "게임 데이터 파일입니다. 실제 게임 내용이나 로더 입력값이 바뀐 신호입니다.";
      if (value.includes("PlayGround/Project/")) return "게임 소스 코드 파일입니다. 런타임 동작이 바뀔 수 있는 신호입니다.";
      if (value.includes("tools/")) return "로컬 도구/Studio 실행 코드입니다. UI나 자동화 동작이 바뀐 신호입니다.";
      return "검토가 필요한 변경 파일입니다.";
    }
    function explainConcern(text) {
      const value = String(text || "");
      const failed = value.match(/failed or cancelled session\\(s\\):\\s*(.+)$/i);
      if (failed) return "작업 실행 기록 중 끝까지 정상 완료되지 않은 실행이 있습니다. 아래 세션은 검증이나 수정 도중 멈췄던 기록이라 완료 승인 전에 원인을 확인해야 합니다.";
      const outside = value.match(/outside expected task category:\\s*(.+)$/i);
      if (outside) return "이번 작업 범위 밖으로 보이는 파일 변경 신호입니다. 이 파일이 실제로 이번 작업에 필요한 변경인지, 아니면 다른 작업이 섞였는지 확인해야 합니다.";
      if (/mixed/i.test(value)) return "실행 결과가 성공/실패 신호를 함께 갖고 있습니다. 완료로 볼지 사람이 판단해야 합니다.";
      return value;
    }
    function translateConcernDetail(text) {
      const value = String(text || "");
      const failed = value.match(/failed or cancelled session\\(s\\):\\s*(.+)$/i);
      if (failed) return "확인할 실행: " + failed[1] + " · 의미: 이 작업을 처리하던 Runner/Codex 실행 중 일부가 실패 또는 취소로 남았습니다.";
      const outside = value.match(/outside expected task category:\\s*(.+)$/i);
      if (outside) return "파일: " + outside[1] + " · 의미: " + filePurpose(outside[1]);
      if (/observed exit state is mixed/i.test(value)) return "실행 결과에 성공 신호와 실패/취소 신호가 함께 있습니다.";
      return value;
    }
    function translateCompletionSummary(text) {
      const value = String(text || "");
      if (/Verification reported concerns/i.test(value)) return "검증에서 우려 사항이 보고되었습니다. 완료 처리 전에 Human Director의 결정이 필요합니다.";
      if (/Verification passed/i.test(value)) return "검증이 통과했습니다. 완료 검토를 진행할 수 있습니다.";
      if (/Completion review can proceed/i.test(value)) return "완료 검토를 진행할 수 있습니다.";
      return value;
    }
    function workflowActionButton(label, decision, className, markDone = false) {
      const core = state.workflow_core || {};
      const task = core.active_task || {};
      const runner = core.runner || {};
      const completion = core.completion || {};
      if (!task.task_id || !runner.runner_run_id || !completion.path) return "";
      return '<button class="' + esc(className) + '" data-workflow-finalize="' + esc(decision) + '" data-mark-done="' + esc(markDone ? "true" : "false") + '">' + esc(label) + '</button>';
    }
    function workflowStartButton(label, taskId, className = "good") {
      if (!taskId) return "";
      return '<button class="' + esc(className) + '" data-workflow-start="' + esc(taskId) + '">' + esc(label) + '</button>';
    }
    function completionCurrentReportId(completion) {
      return String(completion?.id || completion?.path || "")
        .replace(/\\\\/g, "/")
        .split("/")
        .pop()
        .replace(/\.json$/i, "");
    }
    function completionVerdictLevel(core) {
      return String(core?.verification?.verdict || core?.completion?.readiness || "").toUpperCase();
    }
    function completionNeedsDirectorChoice(core) {
      const completion = core?.completion || {};
      const verdict = completionVerdictLevel(core);
      return completion.state === "needs_human_decision"
        || completion.readiness === "NEEDS_DECISION"
        || ["CONCERNS", "BLOCKED", "FAIL"].includes(verdict);
    }
    function completionPlainAcceptAllowed(core) {
      const verdict = completionVerdictLevel(core);
      return !completionNeedsDirectorChoice(core) && (verdict === "PASS" || verdict === "PASS_WITH_NOTES" || verdict === "");
    }
    function completionChangesAlreadyRequested(core) {
      const completion = core?.completion || {};
      const finalization = core?.finalization || {};
      const decision = String(finalization.decision || "").replace(/_/g, "-");
      const stateValue = String(finalization.state || "");
      const currentReportId = completionCurrentReportId(completion);
      const finalizedReportId = String(finalization.completion_report_id || "");
      const sameReport = !currentReportId || !finalizedReportId || currentReportId === finalizedReportId;
      return sameReport && (decision === "request-changes" || stateValue === "changes_requested");
    }
    function completionDecisionStatusLines(core) {
      if (completionChangesAlreadyRequested(core)) {
        return [
          "수정 요청이 이미 기록되어 있습니다.",
          "같은 완료 보고서를 다시 승인하지 말고, 수정 작업을 진행한 뒤 새 완료 보고서를 확인하세요.",
        ];
      }
      if (completionNeedsDirectorChoice(core)) {
        return [
          "검증 우려가 남아 있어 일반 완료 승인은 사용할 수 없습니다.",
          "문제를 감수하고 끝낼지, 수정 요청할지, 판단을 보류할지 선택하세요.",
        ];
      }
      return [];
    }
    function completionDecisionActionItems(core) {
      const completion = core?.completion || {};
      const items = [
        completion.card_href ? '<a href="' + esc(completion.card_href) + '" target="_blank">완료 카드</a>' : "",
        completion.href ? '<a href="' + esc(completion.href) + '" target="_blank">결과 보기</a>' : "",
      ];
      if (completionChangesAlreadyRequested(core)) return items;
      if (completionPlainAcceptAllowed(core)) {
        items.push(workflowActionButton("완료 승인", "accept", "good", true));
      }
      if (completionNeedsDirectorChoice(core)) {
        items.push(workflowActionButton("우려 감수 후 완료", "accept-concerns", "warn", true));
      }
      items.push(workflowActionButton("수정 요청", "request-changes", "danger", false));
      items.push(workflowActionButton("판단 보류", "defer", "secondary", false));
      return items;
    }
    function completionFollowUpActionItems(core) {
      const items = completionDecisionActionItems(core);
      if (completionChangesAlreadyRequested(core)) {
        items.push(button("수정 업무 지시 만들기", "completion-create-fix-workorder", "", "good"));
        items.push('<button class="secondary" data-nav-jump="work">업무 지시로 이동</button>');
      }
      return items;
    }
    function completionDecisionStateLabel(core) {
      if (completionChangesAlreadyRequested(core)) return "수정 요청 기록됨";
      if (completionNeedsDirectorChoice(core)) return "사람 판단 필요";
      if (completionPlainAcceptAllowed(core)) return "완료 승인 가능";
      return "보고서 확인 필요";
    }
    function completionDirectorDecisionSummary(core) {
      if (completionChangesAlreadyRequested(core)) {
        return "이미 수정 요청을 남긴 결과입니다. 같은 결과를 다시 완료 처리하지 말고, 수정 업무로 넘긴 뒤 새 검토 결과를 확인하세요.";
      }
      if (completionNeedsDirectorChoice(core)) {
        return "그냥 완료 처리하기에는 우려가 남아 있습니다. 받아들일 수 있는 우려면 감수 후 완료, 고쳐야 하면 수정 요청, 아직 모르겠으면 판단 보류를 선택하세요.";
      }
      if (completionPlainAcceptAllowed(core)) {
        return "완료로 받아도 되는 상태입니다. 그래도 완료 카드와 보고서를 빠르게 확인한 뒤 완료 승인하세요.";
      }
      return "완료 카드와 보고서를 먼저 확인한 뒤 완료, 수정, 보류 중 하나를 고르세요.";
    }
    function reviewPacketRoleLabel(packet) {
      const id = String(packet?.id || "");
      const match = id.match(/^RRO-\d{8}-\d{6}-(.+)$/u);
      if (match) return staffName(match[1].replace(/-/g, "_"));
      return "검토 보고서";
    }
    function reviewPacketBreakdownHtml(packets) {
      const counts = {};
      asArray(packets).forEach((packet) => {
        const label = reviewPacketRoleLabel(packet);
        counts[label] = (counts[label] || 0) + 1;
      });
      const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
      if (!rows.length) return '<p class="small muted">참고 보고서가 없습니다.</p>';
      const more = Object.keys(counts).length > rows.length ? '<li>+' + esc(Object.keys(counts).length - rows.length) + '종류 더 있음</li>' : "";
      return '<ul class="small">' + rows.map(([label, count]) => '<li>' + esc(label) + ' 보고서 ' + esc(count) + '개</li>').join("") + more + '</ul>';
    }
    function formatWorkflowFinalizationFailure(value) {
      const failedFinalization = value?.ok === false && (
        value?.command === "accept-completion"
        || value?.stage === "finalization"
        || value?.data?.finalization
      );
      if (!failedFinalization) return "";
      const errorText = String(value?.error || value?.data?.finalization?.error || value?.data?.finalization?.data?.error || "");
      const notReady = /not ready for accept_completion/i.test(errorText);
      const needsDecision = /needs_human_decision/i.test(errorText);
      const reasonLines = notReady
        ? [
            needsDecision ? "현재 상태: 사람 판단 필요" : "현재 완료 보고서가 일반 완료 승인 가능한 상태가 아닙니다.",
            "일반 완료 승인은 우려가 없는 PASS/READY 상태에서만 사용합니다.",
            "우려가 남은 보고서는 감수, 수정 요청, 보류 중 하나로 결정해야 합니다.",
          ]
        : [translateStudioMessage(errorText || value?.reason || "완료 판단 처리 중 오류가 발생했습니다.")];
      const actionLines = notReady
        ? [
            "문제를 알고도 이번 작업을 끝낼 거면 우려 감수 후 완료를 누르세요.",
            "고쳐야 할 문제가 있으면 수정 요청을 누르세요.",
            "아직 판단 근거가 부족하면 판단 보류를 누르세요.",
          ]
        : ["Runner 상태와 완료 카드를 다시 확인한 뒤 필요한 판단 버튼을 선택하세요."];
      return '<div class="item danger"><h3>완료 승인 실패</h3>' +
        '<p class="summary">' + esc(notReady ? "이 완료 보고서는 우려가 남아 있어 일반 완료 승인을 사용할 수 없습니다." : "완료 판단을 처리하지 못했습니다.") + '</p>' +
        reportSection("왜 실패했나", reasonLines) +
        reportSection("다음 행동", actionLines) +
        actionsHtml(completionDecisionActionItems(state.workflow_core || {})) +
        rawJsonDetails(value) +
        '</div>';
    }
    function formatMaterializationDecisionFailure(value) {
      const command = String(value?.command || "");
      const errorText = String(value?.error || value?.plan?.error || "");
      const plan = value?.plan || {};
      const decisions = asArray(plan.decisions || value?.decisions);
      const missingTargets = decisions.filter((decision) => !String(decision?.target_ref || "").trim()).length;
      const isMaterializationDecisionFailure = value?.ok === false
        && (command === "record" || command === "plan")
        && /Nothing was written|Decision plan failed|Decision validation failed/i.test(errorText);
      if (!isMaterializationDecisionFailure) return "";
      const reasonLines = [
        missingTargets
          ? "저장하려는 판단 후보에 대상 ID가 비어 있습니다. 무엇에 대한 판단인지 알 수 없어 기록하지 않았습니다."
          : "판단 기록 검증을 통과하지 못해 저장하지 않았습니다.",
        "아무 파일도 쓰지 않았고, 참고 기록이나 공식 설정도 생기지 않았습니다.",
      ];
      const nextLines = [
        "대상이 명확한 제안/결정 카드에서 다시 시도하세요.",
        "오래된 테스트 후보라면 읽고 넘어가거나 정리 대상으로 보면 됩니다.",
        "이 화면에서 같은 버튼이 계속 보이면 UI가 숨겨야 하는 오래된 후보입니다.",
      ];
      return '<div class="item danger"><h3>판단 기록 저장 실패</h3>' +
        '<p class="summary">저장 대상이 불완전해서 아무것도 저장하지 않았습니다.</p>' +
        reportSection("왜 실패했나", reasonLines) +
        reportSection("대상", [
          "후보 묶음: " + (plan.materialization_id || value.materialization_id || ""),
          "판단 종류: " + optionLabel(plan.decision_type || value.decision_type || ""),
          "대상 ID 누락 후보: " + missingTargets + "개",
        ]) +
        reportSection("다음 행동", nextLines) +
        safetySection({
          decision_written: false,
          memory_written: false,
          canon_written: false,
          source_changed: false,
          commit_push: false,
        }) +
        rawJsonDetails(value, "내부 원본 JSON") +
        '</div>';
    }
    function includesText(value, query) {
      return !query || String(value || "").toLowerCase().includes(String(query || "").toLowerCase());
    }
    function optionList(values, allLabel) {
      const unique = Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
      return '<option value="">' + esc(allLabel) + '</option>' + unique.map((value) => '<option value="' + esc(value) + '">' + esc(optionLabel(value)) + '</option>').join("");
    }
    function meetingStatusOptionList(meetings) {
      const statuses = Array.from(new Set(asArray(meetings).map((meeting) => meeting.status).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
      return '<option value="__active__">진행 중 회의만 보기</option>' +
        '<option value="">전체 회의 보기</option>' +
        statuses.map((value) => '<option value="' + esc(value) + '">' + esc(optionLabel(value)) + '</option>').join("");
    }
    function meetingMatchesStatusFilter(meeting) {
      const status = String(meeting?.status || "");
      if (filters.meetingStatus === "__active__") return status !== "closed" && status !== "cancelled";
      return !filters.meetingStatus || status === filters.meetingStatus;
    }
    function departmentOptionList(departments, allLabel) {
      const sorted = asArray(departments).slice().sort((a, b) => String(a.name_ko || a.department_id).localeCompare(String(b.name_ko || b.department_id)));
      return '<option value="">' + esc(allLabel) + '</option>' + sorted.map((department) =>
        '<option value="' + esc(department.department_id) + '">' + esc(department.name_ko || department.department_id) + '</option>'
      ).join("");
    }
    function staffOptionList(staffAgents, allLabel) {
      const sorted = asArray(staffAgents).slice().sort((a, b) => String(a.display_name_ko || a.agent_id).localeCompare(String(b.display_name_ko || b.agent_id)));
      return '<option value="">' + esc(allLabel) + '</option>' + sorted.map((agent) =>
        '<option value="' + esc(agent.agent_id) + '">' + esc(agent.display_name_ko || agent.agent_id) + '</option>'
      ).join("");
    }
    function proposalSourceOptionList(staffAgents) {
      const sorted = asArray(staffAgents).slice().sort((a, b) => String(a.display_name_ko || a.agent_id).localeCompare(String(b.display_name_ko || b.agent_id)));
      return '<option value="human_director">Human Director (나)</option>' + sorted.map((agent) =>
        '<option value="' + esc(agent.agent_id) + '">' + esc(agent.display_name_ko || agent.agent_id) + '</option>'
      ).join("");
    }
    function compactRecordId(id) {
      const value = String(id || "");
      const match = value.match(/^([A-Z]+-\\d{8})-(.+)$/);
      if (!match) return short(value, 32);
      const suffix = match[2].split("-").filter(Boolean).slice(-2).join("-");
      return match[1] + (suffix ? "..." + suffix : "");
    }
    function proposalOptionLabel(proposal) {
      const title = proposal?.title || proposal?.summary || "";
      const category = proposalKindLabel(proposal).replace("Studio/운영 제안", "운영 제안").replace("게임 설정 제안", "게임 설정");
      return compactRecordId(proposal?.proposal_id) + " · " + category + " · " + short(title, 28);
    }
    function knowledgeTargetOptionList() {
      const proposals = asArray(state.proposals).map((item) =>
        '<option value="' + esc(item.proposal_id) + '" title="' + esc(item.proposal_id + " · " + (item.title || item.summary || "")) + '">' + esc(proposalOptionLabel(item)) + '</option>'
      );
      if (!proposals.length) return '<option value="">판단할 제안이 아직 없습니다</option>';
      return '<option value="">판단할 제안을 선택하세요</option><optgroup label="제안">' + proposals.join("") + '</optgroup>';
    }
    function proposalById(proposalId) {
      return asArray(state.proposals).find((proposal) => proposal.proposal_id === proposalId);
    }
    function proposalDecisions(proposalId) {
      return asArray(state.decisions).filter((decision) => decision.target_ref === proposalId);
    }
    function proposalKindLabel(proposal) {
      const text = [proposal?.proposal_id, proposal?.title, proposal?.summary, proposal?.source_type, proposal?.source_ref].join(" ").toLowerCase();
      if (/studio|aiworkflow|workflow|ux|tool|도구|운영|스튜디오/.test(text)) return "Studio/운영 제안";
      if (/canon|scenario|story|world|lore|character|세계관|캐릭터|스토리|시나리오|공식 설정/.test(text)) return "게임 설정 제안";
      if (/work|task|업무|작업|implementation|validation/.test(text)) return "업무 제안";
      return "아이디어 제안";
    }
    function proposalCanBecomeCanon(proposal) {
      return proposalKindLabel(proposal) === "게임 설정 제안";
    }
    function decisionTargetCategory(decision) {
      const proposal = proposalById(decision?.target_ref);
      return proposal ? proposalKindLabel(proposal) : "일반 결정";
    }
    function decisionCanCreateCanon(decision) {
      const proposal = proposalById(decision?.target_ref);
      return proposalCanBecomeCanon(proposal) && decision?.decision_type === "canonize";
    }
    function decisionTypeOptionListForProposal(proposalId, selectedValue = "") {
      const proposal = proposalById(proposalId);
      const values = ["approve", "request_changes", "reject", "defer"];
      if (proposalCanBecomeCanon(proposal)) values.push("canonize");
      const selected = values.includes(selectedValue) ? selectedValue : values[0];
      return values.map((value) =>
        '<option value="' + esc(value) + '"' + (value === selected ? " selected" : "") + '>' + esc(optionLabel(value)) + '</option>'
      ).join("");
    }
    function syncDecisionTypeOptions() {
      const targetRef = fieldValue("decisionCreateTarget");
      const currentType = fieldValue("decisionCreateType");
      const proposal = proposalById(targetRef);
      el("decisionCreateType").innerHTML = decisionTypeOptionListForProposal(targetRef, currentType);
      const category = proposal ? proposalKindLabel(proposal) : "";
      const targetHelp = el("decisionCreateTargetHelp");
      if (targetHelp) {
        targetHelp.innerHTML = proposal
          ? '<strong>선택한 제안</strong>: <code>' + esc(proposal.proposal_id || "") + '</code> · ' + esc(category) + '<br><span>' + esc(short(proposal.title || proposal.summary || "", 140)) + '</span>'
          : "판단할 제안을 먼저 선택하세요. 긴 제목은 선택 후 여기에서 확인합니다.";
      }
      el("decisionCreateTypeHelp").textContent = proposal
        ? (proposalCanBecomeCanon(proposal)
          ? "게임 설정 제안이므로 공식 설정 검토 기록을 남길 수 있습니다."
          : category + "은 공식 설정 후보로 남길 수 없습니다. 채택, 수정 요청, 반려, 보류 중에서 판단하세요.")
        : "먼저 판단할 제안을 선택하세요. 회의나 업무 지시는 각 화면의 전용 버튼에서 처리합니다.";
    }
    const MEETING_TYPE_DETAILS = {
      creative: "게임 아이디어, 세계관, 스토리, 컨셉을 논의합니다.",
      technical: "Studio UX, 도구, 시스템, 구현 구조, 데이터/런타임을 논의합니다.",
      production: "작업 분배, 일정, 우선순위, 진행 관리를 정리합니다.",
      review: "결과물 검토, 완료 판단, 개선점을 정리합니다.",
      qa_triage: "버그, 검증 이슈, 재현 조건, 우선순위를 분류합니다.",
      postmortem: "작업 후 잘된 점, 문제, 다음 개선점을 돌아봅니다.",
      release_readiness: "배포, 공유, 릴리즈 체크와 남은 위험을 점검합니다.",
    };
    const MEETING_PRESETS = [
      { id:"studio_ux_tools", label:"Studio UX/도구 회의", type:"technical", chair:"executive_producer", participants:["executive_producer", "tools_engineer", "qa_tester"] },
      { id:"game_design", label:"게임 기획 회의", type:"creative", chair:"game_designer", participants:["game_designer", "scenario_director", "executive_producer"] },
      { id:"validation_bug", label:"검증/버그 회의", type:"qa_triage", chair:"qa_tester", participants:["qa_tester", "tools_engineer", "executive_producer"] },
      { id:"release_ready", label:"릴리즈 준비 회의", type:"release_readiness", chair:"executive_producer", participants:["executive_producer", "documentation_keeper", "qa_tester"] },
    ];
    function meetingTypeOptionList() {
      return Object.keys(MEETING_TYPE_DETAILS).map((value) =>
        '<option value="' + esc(value) + '">' + esc(optionLabel(value)) + '</option>'
      ).join("");
    }
    function staffById(agentId) {
      return (state?.staff_agents || []).find((item) => item.agent_id === agentId);
    }
    function staffChoiceLabel(agent) {
      return agent?.display_name_ko || agent?.role_title_ko || agent?.display_name || agent?.role_title || agent?.agent_id || "";
    }
    function staffChoiceDetail(agent) {
      const role = agent?.role_title_ko || agent?.role_title || "";
      const department = departmentName(agent?.department_id || "");
      return [role, department, agent?.agent_id].filter(Boolean).join(" · ");
    }
    function selectedMeetingParticipants() {
      return Array.from(document.querySelectorAll("input[data-meeting-participant]:checked")).map((input) => input.value);
    }
    function renderMeetingTypeHelp() {
      const type = fieldValue("meetingCreateType") || "creative";
      el("meetingTypeHelp").innerHTML = '<strong>' + esc(optionLabel(type)) + '</strong><p class="small muted">' + esc(MEETING_TYPE_DETAILS[type] || "회의 목적에 맞게 논의 범위를 정합니다.") + '</p>';
    }
    function renderMeetingPresetButtons() {
      el("meetingPresetButtons").innerHTML = MEETING_PRESETS.map((preset) =>
        '<button class="secondary" data-meeting-preset="' + esc(preset.id) + '">' + esc(preset.label) + '</button>'
      ).join("");
    }
    function renderMeetingParticipantPicker(selectedIds = selectedMeetingParticipants()) {
      const selected = new Set(selectedIds);
      const sorted = asArray(state.staff_agents).slice().sort((a, b) => staffChoiceLabel(a).localeCompare(staffChoiceLabel(b)));
      el("meetingParticipantPicker").innerHTML = sorted.map((agent) =>
        '<label class="staff-choice"><input type="checkbox" data-meeting-participant value="' + esc(agent.agent_id) + '"' + (selected.has(agent.agent_id) ? " checked" : "") + '>' +
        '<span><strong>' + esc(staffChoiceLabel(agent)) + '</strong><span>' + esc(staffChoiceDetail(agent)) + '</span></span></label>'
      ).join("");
    }
    function syncMeetingChairOptions(preferredChair = "") {
      const participants = selectedMeetingParticipants();
      const current = preferredChair || fieldValue("meetingCreateChair");
      const options = participants.length
        ? participants.map((agentId) => '<option value="' + esc(agentId) + '">' + esc(staffName(agentId)) + '</option>').join("")
        : '<option value="">참가 직원을 먼저 선택하세요</option>';
      el("meetingCreateChair").innerHTML = options;
      if (participants.includes(current)) {
        el("meetingCreateChair").value = current;
      } else if (participants.length) {
        el("meetingCreateChair").value = participants[0];
      }
      updateMeetingCreateImpact();
    }
    function updateMeetingCreateImpact() {
      const participants = selectedMeetingParticipants();
      const chair = fieldValue("meetingCreateChair");
      const type = fieldValue("meetingCreateType") || "creative";
      el("meetingCreateImpact").innerHTML =
        '<strong>생성 시 기록되는 내용</strong>' +
        '<ul class="small">' +
        '<li>회의 종류: ' + esc(optionLabel(type)) + ' - ' + esc(MEETING_TYPE_DETAILS[type] || "") + '</li>' +
        '<li>참가 직원: ' + esc(participants.length ? participants.map(staffName).join(", ") : "아직 선택 없음") + '</li>' +
        '<li>의장: ' + esc(chair ? staffName(chair) : "아직 선택 없음") + '</li>' +
        '<li>변경 범위: MeetingSession JSON만 생성합니다. canon/task/git은 바꾸지 않습니다.</li>' +
        '</ul>';
    }
    function applyMeetingPreset(presetId) {
      const preset = MEETING_PRESETS.find((item) => item.id === presetId);
      if (!preset) return;
      el("meetingCreateType").value = preset.type;
      renderMeetingParticipantPicker(preset.participants);
      syncMeetingChairOptions(preset.chair);
      renderMeetingTypeHelp();
    }
    const WORK_ORDER_STATUS_DETAILS = {
      director_review: "감독자가 내용을 보고 넘길지 판단하는 단계입니다. 새 업무 지시의 기본값입니다.",
      proposed: "직원이나 회의에서 나온 제안 상태입니다. 아직 실행 대상으로 고른 것은 아닙니다.",
      draft: "내용을 더 다듬는 초안 상태입니다. 작업 목록에 넣기 전에 보강할 때 사용합니다.",
      approved_for_tasking: "업무 지시 내용이 충분해서 작업 목록 후보로 넘길 수 있는 상태입니다.",
    };
    function selectedWorkAgents() {
      return Array.from(document.querySelectorAll("input[data-work-agent]:checked")).map((input) => input.value);
    }
    function workStatusOptionList() {
      return Object.keys(WORK_ORDER_STATUS_DETAILS).map((value) =>
        '<option value="' + esc(value) + '">' + esc(optionLabel(value)) + '</option>'
      ).join("");
    }
    function renderWorkStatusHelp() {
      const status = fieldValue("workCreateStatus") || "director_review";
      el("workStatusHelp").innerHTML =
        '<strong>상태: ' + esc(optionLabel(status)) + '</strong>' +
        '<p class="small muted">' + esc(WORK_ORDER_STATUS_DETAILS[status] || "업무 지시의 현재 검토 단계를 표시합니다.") + '</p>' +
        '<p class="small muted">상태는 업무 지시 기록의 분류값입니다. 이 값을 고른다고 실행, 승인, task 생성, commit/push가 바로 일어나지 않습니다.</p>';
    }
    function renderWorkAgentPicker(selectedIds = selectedWorkAgents()) {
      const departmentId = fieldValue("workCreateDepartment");
      const selected = new Set(selectedIds);
      const agents = asArray(state.staff_agents)
        .filter((agent) => !departmentId || agent.department_id === departmentId)
        .sort((a, b) => staffChoiceLabel(a).localeCompare(staffChoiceLabel(b)));
      if (!departmentId) {
        el("workAgentPicker").innerHTML = '<p class="small muted">담당 부서를 먼저 선택하면 해당 부서 직원 목록이 나타납니다.</p>';
        updateWorkCreateImpact();
        return;
      }
      el("workAgentPicker").innerHTML = agents.length ? agents.map((agent) =>
        '<label class="staff-choice"><input type="checkbox" data-work-agent value="' + esc(agent.agent_id) + '"' + (selected.has(agent.agent_id) ? " checked" : "") + '>' +
        '<span><strong>' + esc(staffChoiceLabel(agent)) + '</strong><span>' + esc(staffChoiceDetail(agent)) + '</span></span></label>'
      ).join("") : '<p class="small muted">이 부서에 등록된 직원이 없습니다. 다른 부서를 선택하세요.</p>';
      updateWorkCreateImpact();
    }
    function updateWorkCreateImpact() {
      const departmentId = fieldValue("workCreateDepartment");
      const agents = selectedWorkAgents();
      const status = fieldValue("workCreateStatus") || "director_review";
      el("workCreateImpact").innerHTML =
        '<strong>저장 시 기록되는 내용</strong>' +
        '<ul class="small">' +
        '<li>담당 부서: ' + esc(departmentId ? departmentName(departmentId) : "아직 선택 없음") + '</li>' +
        '<li>담당 직원: ' + esc(agents.length ? agents.map(staffName).join(", ") : "아직 선택 없음") + '</li>' +
        '<li>상태: ' + esc(optionLabel(status)) + ' - ' + esc(WORK_ORDER_STATUS_DETAILS[status] || "") + '</li>' +
        '<li>변경 범위: WorkOrder JSON만 생성합니다. task 생성, 직원 실행, 소스 수정, git 변경은 하지 않습니다.</li>' +
        '</ul>';
    }
    function optionLabel(value) {
      const labels = {
        creative:"크리에이티브", technical:"기술", production:"제작", review:"리뷰", qa_triage:"QA 분류", postmortem:"회고", release_readiness:"릴리즈 준비",
        brief:"요약", proposal:"제안", objection:"반론", question:"질문", answer:"답변", synthesis:"종합", decision_note:"결정 메모",
        director_review:"감독자 검토", proposed:"제안됨", draft:"초안", approved_for_tasking:"작업화 승인", follow_up_tasking:"후속 작업화",
        approve:"채택", reject:"반려", defer:"보류", request_changes:"수정 요청", accept_concerns:"조건부 채택", canonize:"공식 설정 후보",
        project:"프로젝트", canon:"공식 설정", global:"전체", agent:"직원", department:"부서", meeting:"회의", task:"작업",
        fact:"사실", preference:"선호", decision:"결정", rejection:"반려 기록", evidence:"검증 자료", lesson:"교훈",
        approved:"승인됨", rejected:"반려됨",
        active:"활성", available:"사용 가능", planned:"예정", stored:"저장됨", example:"예시",
        valid_output:"보고서 준비됨", output_ready:"보고서 준비됨", needs_evidence:"검증 자료 필요", needs_director_decision:"감독자 결정 필요", completed:"실행 완료", failed:"실패",
        completion_review_required:"완료 검토 필요", done_or_commit_decision:"완료/커밋 결정 필요", ready_for_implementation:"구현 준비 완료", in_progress:"진행 중", todo:"대기",
        low:"낮음", medium:"중간", high:"높음", critical:"치명적",
        validation:"검증", implementation:"구현", documentation:"문서", data:"데이터", automation:"자동화", review_task:"리뷰",
        read:"읽기", write:"쓰기", execute:"실행", external:"외부 호출", destructive:"파괴적 작업",
      human_director:"Human Director (나)", staff_agent:"AI 직원", role_run:"직원 실행", work_order:"업무 지시", system:"시스템",
      };
      return labels[value] || value;
    }
    const STAFF_OUTPUT_STATUS_DETAILS = {
      valid_output: "직원 보고서 JSON이 정상이고 읽을 준비가 된 상태입니다.",
      output_ready: "직원 보고서가 읽을 준비가 된 상태입니다.",
      needs_evidence: "보고서는 있지만 근거/검증 자료를 더 확인해야 하는 상태입니다.",
      needs_director_decision: "감독자가 채택, 반려, 수정 요청 중 하나를 골라야 하는 상태입니다.",
      completed: "직원 실행이 끝난 상태입니다.",
      failed: "직원 실행 또는 보고서 생성에 실패한 상태입니다.",
    };
    function staffOutputStatusDetail(status) {
      return STAFF_OUTPUT_STATUS_DETAILS[status] || "직원 보고서의 현재 검토 상태입니다.";
    }
    const ARTIFACT_LABELS = {
      WorkOrder: "업무 지시서",
      ApprovalItem: "승인 요청 항목",
      FinalizationLog: "최종화 기록",
      Decision: "결정 기록",
      Proposal: "제안서",
      MemoryRecord: "기억/설정 기록",
      CreativeBrief: "크리에이티브 방향 문서",
      DirectionDecision: "방향성 결정 기록",
      RejectedDirection: "반려된 방향 기록",
      GameDesignProposal: "게임 디자인 제안서",
      SystemDesignBrief: "시스템 설계 문서",
      BalanceRiskList: "밸런스 위험 목록",
      ScenarioPitch: "시나리오 피치",
      StoryArcPlan: "스토리 흐름 계획",
      CharacterBrief: "캐릭터 브리프",
      CanonProposal: "공식 설정 후보",
      TechnicalDesignBrief: "기술 설계 문서",
      ImplementationPlan: "구현 계획",
      DiffReview: "diff 리뷰",
      BuildEvidence: "빌드/검증 자료",
      ArtDirectionBrief: "아트 방향 문서",
      AssetRequest: "에셋 요청서",
      GeneratedAssetReview: "생성 에셋 검토",
      ImportDecision: "반입 결정 기록",
      QAReport: "QA 보고서",
      BugRepro: "버그 재현 기록",
      RegressionChecklist: "회귀 테스트 체크리스트",
      VerificationEvidence: "검증 자료",
      DevLog: "DevLog",
      UserGuide: "사용자 가이드",
      ReleaseNote: "릴리즈 노트",
      DocumentMap: "문서 지도",
    };
    function staffName(agentId) {
      const agent = (state?.staff_agents || []).find((item) => item.agent_id === agentId);
      return agent ? agent.display_name_ko || agent.display_name || agent.agent_id : optionLabel(agentId || "");
    }
    function departmentName(departmentId) {
      const department = (state?.departments || []).find((item) => item.department_id === departmentId);
      return department ? department.name_ko || department.name || department.department_id : optionLabel(departmentId || "");
    }
    function artifactLabel(value) {
      return ARTIFACT_LABELS[value] || optionLabel(value || "");
    }
    function mappedListHtml(items, mapper, emptyText = "") {
      return listHtml(asArray(items).map(mapper), emptyText);
    }
    function fixedOptionList(values) {
      return values.map((value) => '<option value="' + esc(value) + '">' + esc(optionLabel(value)) + '</option>').join("");
    }
    function syncFilterControls() {
      el("staffDepartmentFilter").innerHTML = departmentOptionList(state.departments, "모든 부서");
      el("workDepartmentFilter").innerHTML = departmentOptionList(state.departments, "모든 부서");
      el("meetingStatusFilter").innerHTML = meetingStatusOptionList(state.meetings);
      el("runStatusFilter").innerHTML = optionList(state.recent_staff_runs.map((run) => run.output_status || run.status), "모든 실행 상태");
      el("memoryStatusFilter").innerHTML = optionList(state.memories.map((memory) => memory.status), "모든 기억 상태");
      el("proposalDecisionFilter").innerHTML = '<option value="">모든 제안</option><option value="pending">판단 대기 제안</option><option value="decided">판단 기록 있음</option>';
      const selectedMeetingType = fieldValue("meetingCreateType") || "creative";
      const selectedMeetingParticipantsBeforeRender = selectedMeetingParticipants();
      const selectedMeetingChairBeforeRender = fieldValue("meetingCreateChair");
      el("meetingCreateType").innerHTML = meetingTypeOptionList();
      el("meetingCreateType").value = MEETING_TYPE_DETAILS[selectedMeetingType] ? selectedMeetingType : "creative";
      renderMeetingTypeHelp();
      renderMeetingPresetButtons();
      renderMeetingParticipantPicker(selectedMeetingParticipantsBeforeRender);
      syncMeetingChairOptions(selectedMeetingChairBeforeRender);
      el("meetingTurnSpeaker").innerHTML = '<option value="human_director">Human Director (나)</option>';
      el("meetingTurnSpeaker").value = "human_director";
      el("meetingTurnType").innerHTML = fixedOptionList(["brief", "proposal", "objection", "question", "answer", "synthesis", "decision_note"]);
      const selectedWorkDepartmentBeforeRender = fieldValue("workCreateDepartment");
      const selectedWorkAgentsBeforeRender = selectedWorkAgents();
      const selectedWorkStatusBeforeRender = fieldValue("workCreateStatus") || "director_review";
      el("workCreateDepartment").innerHTML = departmentOptionList(state.departments, "담당 부서 선택");
      if (selectedWorkDepartmentBeforeRender) el("workCreateDepartment").value = selectedWorkDepartmentBeforeRender;
      el("workCreateStatus").innerHTML = workStatusOptionList();
      el("workCreateStatus").value = WORK_ORDER_STATUS_DETAILS[selectedWorkStatusBeforeRender] ? selectedWorkStatusBeforeRender : "director_review";
      renderWorkStatusHelp();
      renderWorkAgentPicker(selectedWorkAgentsBeforeRender);
      el("proposalCreateAgent").value = "human_director";
      el("decisionCreateTarget").innerHTML = knowledgeTargetOptionList();
      syncDecisionTypeOptions();
      el("memoryCreateScope").innerHTML = fixedOptionList(["project", "canon", "global", "agent", "department", "meeting", "task"]);
      el("memoryCreateType").innerHTML = fixedOptionList(["fact", "preference", "proposal", "decision", "canon", "rejection", "evidence", "lesson"]);
      el("memoryCreateStatus").innerHTML = fixedOptionList(["proposed", "approved", "canon", "draft", "rejected", "evidence", "lesson"]);
      el("memoryCreateOwner").innerHTML = staffOptionList(state.staff_agents, "담당 직원 선택");
      el("toolRunCreateAdapter").innerHTML = optionList(state.tool_adapters.map((adapter) => adapter.adapter_id), "도구 선택");
      el("toolRunCreatePermission").innerHTML = fixedOptionList(["read", "write", "execute", "external", "destructive"]);
      el("toolRunCreateRequesterType").innerHTML = fixedOptionList(["human_director", "staff_agent", "role_run", "work_order", "system"]);
      el("departmentSearch").value = filters.departmentSearch;
      el("staffSearch").value = filters.staffSearch;
      el("staffDepartmentFilter").value = filters.staffDepartment;
      el("meetingSearch").value = filters.meetingSearch;
      el("meetingStatusFilter").value = filters.meetingStatus;
      el("runSearch").value = filters.runSearch;
      el("runStatusFilter").value = filters.runStatus;
      el("workSearch").value = filters.workSearch;
      el("workDepartmentFilter").value = filters.workDepartment;
      el("knowledgeSearch").value = filters.knowledgeSearch;
      el("proposalDecisionFilter").value = filters.proposalDecision;
      el("memoryStatusFilter").value = filters.memoryStatus;
    }
    function renderEmpty(text) {
      return '<div class="empty">' + esc(text) + '</div>';
    }
    function meetingNextActionText(meeting) {
      if (!meeting.is_stored) return "예시 회의입니다. 실제로 쓰려면 새 회의 만들기로 기록을 생성하세요.";
      if (meeting.status === "draft") return "회의판을 보고 내 의견을 기록하거나 다음 AI 발언을 받아 첫 관점을 모으세요.";
      if (meeting.unresolved_count) return "남은 질문을 정리하고 답할 직원의 의견을 더 받으세요.";
      if (meeting.follow_up_count) return "후속 업무 후보를 확인하고 실제 업무 지시로 넘길지 결정하세요.";
      if (asArray(meeting.proposals).length) return "제안을 업무 후보로 넘길지, 방향 판단으로 남길지 결정하세요.";
      return "회의판을 보고 의견을 더 받을지, 업무 후보/방향 판단으로 넘길지, 회의를 닫을지 고르세요.";
    }
    function meetingLastTurnLine(meeting) {
      const turn = meeting?.last_turn;
      if (!turn || !turn.content) return "아직 기록된 발언이 없습니다.";
      return staffName(turn.speaker_id || "") + " · " + optionLabel(turn.turn_type || "brief") + ": " + short(turn.content, 150);
    }
    function meetingCountLine(label, count, emptyLabel) {
      const value = Number(count || 0);
      return value ? label + " " + value + "개" : emptyLabel;
    }
    function setPage(page) {
      const nextPage = PAGES[page] ? page : "home";
      if (nextPage !== activePage) {
        const globalPanel = el("globalResultPanel");
        const meetingPanel = el("meetingResultPanel");
        if (globalPanel) globalPanel.hidden = true;
        if (meetingPanel) meetingPanel.hidden = true;
      }
      activePage = nextPage;
      if (activePage === "systems" || activePage === "policy") {
        setInternalNavVisible(true);
      }
      if (["work", "runs", "diff", "devlog", "timeline"].includes(activePage)) {
        setReferenceNavVisible(true);
      }
      if (["project", "departments", "staff"].includes(activePage)) {
        setOrganizationNavVisible(true);
      }
      document.querySelectorAll(".page").forEach((section) => {
        section.classList.toggle("active", section.dataset.page === activePage);
      });
      document.querySelectorAll("button[data-nav]").forEach((buttonEl) => {
        buttonEl.classList.toggle("active", buttonEl.dataset.nav === activePage);
      });
      el("pageTitle").textContent = PAGES[activePage][0];
      el("pageSubtitle").textContent = PAGES[activePage][1];
      const nextHash = activePage === "home" ? "" : "#" + activePage;
      if (location.hash !== nextHash) {
        history.replaceState(null, "", location.pathname + location.search + nextHash);
      }
    }
    function setNavCount(page, value) {
      const target = el("nav-" + page + "-count");
      if (target) target.textContent = value ? String(value) : "";
    }
    function setInternalNavVisible(visible) {
      const nav = el("internalNav");
      const stateLabel = el("internalNavState");
      nav.hidden = !visible;
      stateLabel.textContent = visible ? "표시" : "숨김";
    }
    function setReferenceNavVisible(visible) {
      const nav = el("referenceNav");
      const stateLabel = el("referenceNavState");
      nav.hidden = !visible;
      stateLabel.textContent = visible ? "표시" : "숨김";
    }
    function setOrganizationNavVisible(visible) {
      const nav = el("organizationNav");
      const stateLabel = el("organizationNavState");
      nav.hidden = !visible;
      stateLabel.textContent = visible ? "표시" : "숨김";
    }
    function renderNavCounts() {
      const m = state.metrics;
      setNavCount("home", buildDirectorDecisionItems().length);
      setNavCount("toolbox", state.toolbox?.tool_count || "");
      setNavCount("goals", state.director_goal_plans.length);
      setNavCount("project", state.project_profiles.length);
      setNavCount("inbox", buildDirectorDecisionItems().length);
      setNavCount("departments", m.departments);
      setNavCount("staff", m.staff);
      setNavCount("meetings", state.meetings.length);
      setNavCount("runs", state.recent_staff_runs.length + state.materializations.length + state.context_packets.length);
      setNavCount("work", state.work_orders.length + state.handoffs.length);
      setNavCount("knowledge", state.proposals.length + state.decisions.length + state.memories.length);
      setNavCount("timeline", buildTimelineItems().length);
      setNavCount("diff", state.workflow_core?.git?.changed_count || "");
      setNavCount("systems", state.project_profiles.length + state.tool_adapters.length + state.tool_run_requests.length);
      setNavCount("policy", state.conditional_automation.evaluations.length);
      setNavCount("evidence", m.review_packets);
      setNavCount("devlog", state.dev_logs.length);
    }
    function decisionPriorityRank(label) {
      if (label === "최우선") return 0;
      if (label === "높음") return 1;
      if (label === "중간") return 2;
      return 3;
    }
    function decisionKindRank(kind) {
      if (String(kind || "").includes("완료")) return 0;
      if (String(kind || "").includes("작업 착수")) return 1;
      if (String(kind || "").includes("커밋")) return 2;
      if (String(kind || "").includes("직원 보고서")) return 3;
      if (String(kind || "").includes("제안")) return 4;
      return 9;
    }
    function sortDirectorDecisionItems(items) {
      return asArray(items).slice().sort((a, b) =>
        decisionPriorityRank(a.priority_label) - decisionPriorityRank(b.priority_label)
        || decisionKindRank(a.kind) - decisionKindRank(b.kind)
        || String(a.title || "").localeCompare(String(b.title || ""))
      );
    }
    function decisionInboxSummaryHtml(items) {
      const total = items.length;
      const urgent = items.filter((item) => item.priority_label === "최우선").length;
      const high = items.filter((item) => item.priority_label === "높음").length;
      const medium = items.filter((item) => item.priority_label === "중간").length;
      const primary = items[0];
      return '<div class="card">' +
        '<div class="section-title"><h2>결정 큐 요약</h2><span class="pill">' + esc(total) + '개</span></div>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>최우선</span><span class="pill">' + esc(urgent) + '</span></div>' +
        '<div class="compact-line"><span>높음</span><span class="pill">' + esc(high) + '</span></div>' +
        '<div class="compact-line"><span>중간</span><span class="pill">' + esc(medium) + '</span></div>' +
        '</div>' +
        (primary ? '<div class="item warn"><h3>먼저 볼 것</h3><p class="summary">' + esc(primary.kind + " · " + short(primary.title, 180)) + '</p></div>' : '') +
        '<p class="small muted">위에서 아래로 처리하면 됩니다. 이 화면의 버튼은 감독자 판단 기록, 완료 판단, 승인 실행, 커밋 범위 선택처럼 사람이 결정해야 하는 일만 다룹니다.</p>' +
        '</div>';
    }
    function buildDirectorDecisionItems() {
      const core = state.workflow_core || {};
      const activeTask = core.active_task || {};
      const runner = core.runner || {};
      const completion = core.completion || {};
      const git = core.git || {};
      const items = [];

      const runnerGate = runner.stop_reason || "";
      const completionGateOpen = runnerGate === "completion_review_required" || runnerGate === "done_or_commit_decision" || completion.state === "needs_human_decision";
      const completionChangesRequested = completionChangesAlreadyRequested(core);
      const completionNeedsChoice = completionNeedsDirectorChoice(core);
      if (activeTask.task_id && !completionGateOpen && ["todo", "ready_for_implementation", "awaiting_approval", "partial_done"].includes(activeTask.status)) {
        items.push({
          kind: "작업 착수 승인",
          title: activeTask.task_id + " · " + (activeTask.title || "(제목 없음)"),
          why_now: "현재 선택된 작업이 아직 실행 대상으로 확정되지 않았습니다.",
          priority_label: "높음",
          meaning: "이 작업을 실제 실행 대상으로 선택할지 결정합니다.",
          effect: "승인하면 ActiveTask 선택, 승인 기록, PC Runner 시작이 이어집니다. task done, commit, push는 하지 않습니다.",
          risk: "우선순위/위험도/데이터·런타임 경계가 있으면 사람 승인에서 멈추는 것이 정상입니다.",
          actions: [workflowStartButton("승인+실행", activeTask.task_id, "good"), '<button class="secondary" data-nav-jump="work">업무 지시 보기</button>'],
        });
      }
      if (runner.stop_reason === "completion_review_required" || completion.state === "needs_human_decision") {
        items.push({
          kind: completionChangesRequested ? "완료 검토 · 수정 요청 기록됨" : "완료 검토",
          title: activeTask.task_id ? activeTask.task_id + " 완료 판단" : "완료 판단",
          why_now: completionChangesRequested
            ? "이 완료 보고서는 이미 수정 요청으로 정리되어 같은 결과를 다시 승인하면 안 됩니다."
            : "Runner가 완료 검토 지점에서 멈춰 있어 사람 판단 없이는 다음 단계로 진행할 수 없습니다.",
          priority_label: "최우선",
          meaning: completionChangesRequested
            ? "수정 요청 기록이 이미 남아 있으므로 새 수정 작업이나 후속 업무로 이어가야 합니다."
            : "작업 결과와 검증 자료를 보고 완료로 받을지, 수정 요청할지 결정합니다.",
          effect: completionChangesRequested
            ? "이 카드에서는 추가 FinalizationLog를 만들지 않습니다. 기존 수정 요청 기록을 기준으로 다음 작업을 진행하세요."
            : completionNeedsChoice
              ? "일반 완료 승인은 숨깁니다. 우려 감수, 수정 요청, 판단 보류 중 하나를 선택하면 FinalizationLog가 남습니다."
              : "완료 승인은 FinalizationLog를 남기고 Runner를 계속 진행합니다. markDone이면 task done까지 처리합니다. 커밋/푸시는 별도입니다.",
          risk: completionChangesRequested
            ? "이미 수정 요청된 결과를 다시 완료 처리하지 않도록 주의하세요."
            : (completion.remaining_concerns || []).length
              ? "우려 사항이 남아 있습니다. 감수할 수 있는 문제인지 먼저 확인해야 합니다."
              : "표시된 우려 사항은 없습니다.",
          status_lines: completionDecisionStatusLines(core),
          actions: completionFollowUpActionItems(core),
        });
      }
      state.materializations.slice(0, 5).forEach((item) => {
        items.push({
          kind: "직원 보고서 채택 후보",
          title: item.materialization_id,
          why_now: "직원 보고서에서 뽑힌 채택 후보가 아직 채택/반려/수정 요청으로 정리되지 않았습니다.",
          priority_label: "중간",
          meaning: "AI 직원 보고서에서 아이디어, 프로젝트 기억, 업무 지시, 직원 인수인계 후보를 뽑아둔 상태입니다.",
          effect: "승인 기록을 남겨도 바로 실행되지는 않습니다. 이후 업무 지시나 결정/기억으로 따로 넘깁니다.",
          risk: "직원 제안이 공식 설정처럼 굳지 않게, 채택 범위와 제외 범위를 분리해야 합니다.",
          actions: [
            button("결정 전 확인", "decision-plan", item.path),
            button("승인 결정 기록", "decision-approve", item.path, "good", 'data-decision="approve"'),
            button("수정 요청", "decision-request-changes", item.path, "warn", 'data-decision="request_changes"'),
            button("반려", "decision-reject", item.path, "danger", 'data-decision="reject"'),
          ],
        });
      });
      state.proposals.filter((proposal) => proposalDecisions(proposal.proposal_id).length === 0).slice(0, 4).forEach((proposal) => {
        const canonEligible = proposalCanBecomeCanon(proposal);
        items.push({
          kind: "제안 판단",
          title: proposal.proposal_id + " · " + (proposal.title || proposal.summary || "(제안)"),
          why_now: "제안은 공식 설정이나 구현 근거가 되기 전에 감독자 판단이 필요합니다.",
          priority_label: "중간",
          meaning: "아이디어를 채택/수정/반려할지 결정합니다. 제안 자체는 공식 설정이 아닙니다.",
          effect: "결정 기록을 만들 수 있습니다. 공식 설정으로 저장하는 것은 별도 선택입니다.",
          risk: "공식 설정화 버튼은 프로젝트 기억에 강하게 남으므로, 승인된 설정일 때만 사용하세요.",
          actions: [
            button("채택 기록", "proposal-approve", proposal.path, "good"),
            canonEligible ? button("공식 설정 검토 기록", "proposal-canonize", proposal.path, "warn") : "",
            button("수정 요청", "proposal-request-changes", proposal.path),
            button("반려 기록", "proposal-reject", proposal.path, "danger"),
          ],
        });
      });
      if (git.changed_count) {
        items.push({
          kind: "커밋/푸시 결정",
          title: git.changed_count + "개 변경 파일",
          why_now: "작업대에 변경 파일이 있어 커밋 전 범위 분리가 필요합니다.",
          priority_label: "높음",
          meaning: "현재 작업대에서 어떤 파일을 같은 커밋으로 묶을지 결정합니다.",
          effect: "선택 커밋은 고른 파일만 stage/commit합니다. 선택 커밋+푸시는 commit 후 push까지 합니다.",
          risk: "게임/파티클/리소스 변경처럼 다른 채팅 작업일 수 있는 파일은 섞지 마세요.",
          actions: ['<button class="secondary" data-nav-jump="diff">변경 검토로 이동</button>'],
        });
      }
      return sortDirectorDecisionItems(items);
    }
    function renderDecisionCard(item) {
      return '<div class="item warn decision-card">' +
        '<div class="section-title"><h3>' + esc(item.kind) + '</h3>' + (item.priority_label ? '<span class="pill">' + esc(item.priority_label) + '</span>' : '') + '</div>' +
        '<p><strong>' + esc(short(item.title, 180)) + '</strong></p>' +
        '<h4>내가 결정할 것</h4>' +
        '<p class="summary">' + esc(item.meaning) + '</p>' +
        (item.why_now ? '<h4>왜 지금 올라왔나</h4><p class="small">' + esc(item.why_now) + '</p>' : '') +
        '<h4>결정하면 바뀌는 것</h4>' +
        '<p class="small">' + esc(item.effect) + '</p>' +
        '<h4>주의할 것</h4>' +
        '<p class="small">' + esc(item.risk) + '</p>' +
        (asArray(item.status_lines).length ? '<h3>현재 판정</h3>' + compactListHtml(item.status_lines) : '') +
        actionsHtml(item.actions) + '</div>';
    }
    function renderDirectorInboxFull() {
      const items = buildDirectorDecisionItems();
      el("directorInboxFull").innerHTML = items.length
        ? decisionInboxSummaryHtml(items) + '<div class="list">' + items.map(renderDecisionCard).join("") + '</div>'
        : '<div class="item good"><h3>지금 사람이 결정할 항목 없음</h3><p class="summary">새 완료 검토, 승인 gate, 직원 보고서 후보, 제안, Git 변경이 생기면 여기에 모입니다. 지금은 큰 방향을 새로 넣거나 진행 중인 게임 작업으로 돌아가면 됩니다.</p></div>';
    }
    function renderGoalPlanCard(plan, compact = false) {
      if (!plan) return "";
      const departments = asArray(plan.recommended_departments).map(departmentName);
      const staff = asArray(plan.recommended_staff).map(staffName);
      const approvals = asArray(plan.approval_items);
      const approvalText = approvals.map((item) => {
        if (typeof item === "string") return item;
        return item.plain_language_summary || item.summary || "";
      }).filter(Boolean);
      const meetingCount = plan.meeting_count ?? asArray(plan.meeting_recommendations).length;
      const workOrderCount = plan.work_order_count ?? asArray(plan.work_order_candidates).length;
      const proposalCount = plan.proposal_count ?? asArray(plan.proposal_candidates).length;
      const routingReasons = asArray(plan.routing_reasons);
      const nextSteps = asArray(plan.next_steps);
      return '<div class="item warn"><div class="section-title"><h3><code>' + esc(plan.director_goal_plan_id || "(미저장)") + '</code></h3><span class="pill">' + esc(optionLabel(plan.status || "director_review")) + '</span></div>' +
        '<h4>Studio가 이해한 방향</h4>' +
        '<p class="summary">' + esc(short(plan.goal || "", compact ? 180 : 260)) + '</p>' +
        '<h4>추천 운영 흐름</h4>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>추천 부서</span><span class="pill">' + esc(inlineList(departments, "(없음)")) + '</span></div>' +
        '<div class="compact-line"><span>추천 직원</span><span class="pill">' + esc(inlineList(staff, "(없음)")) + '</span></div>' +
        '<div class="compact-line"><span>다음 단계 후보</span><span class="pill">' + esc("회의 " + meetingCount + " · 업무 " + workOrderCount + " · 제안 " + proposalCount) + '</span></div>' +
        '</div>' +
        (routingReasons.length ? '<h4>왜 이렇게 나눴나</h4>' + listHtml(routingReasons) : '') +
        '<h4>감독자가 승인할 때 볼 것</h4>' +
        listHtml(approvalText, "승인 항목이 없습니다.") +
        '<h4>이 단계에서 바뀌지 않는 것</h4>' +
        listHtml(plan.non_goals || ["기획안만으로 실행, 공식 설정 확정, commit/push를 하지 않습니다."]) +
        (nextSteps.length ? '<h4>다음 행동</h4>' + listHtml(nextSteps) : '') +
        internalLinksHtml([plan.href ? link("기획안 JSON", plan.href) : ""]) +
        '</div>';
    }
    function renderDirectorGoals() {
      const plans = state.director_goal_plans || [];
      el("goalPlanCount").textContent = plans.length ? String(plans.length) : "없음";
      el("directorGoalPlans").innerHTML = plans.length
        ? plans.map((plan) => renderGoalPlanCard(plan, true)).join("")
        : renderEmpty("저장된 목표 기획안이 없습니다. 큰 목표를 입력해 먼저 기획안으로 쪼개보세요.");
      el("goalPreviewBadge").textContent = latestGoalPreview ? "미리보기" : "대기";
      el("goalPreview").innerHTML = latestGoalPreview
        ? renderGoalPlanCard(latestGoalPreview, false)
        : '<div class="item"><h3>아직 미리보기가 없습니다</h3><p class="summary">왼쪽에 큰 방향과 제약 조건을 입력하고 분해안 미리보기를 누르세요.</p></div>';
    }
    function renderProjectDashboard() {
      const core = state.workflow_core || {};
      const activeTask = core.active_task || {};
      const projectStatus = core.project_status || {};
      const activeProfile = state.project_profiles.find((profile) => profile.project_id === state.active_project.project_id) || state.project_profiles[0] || {};
      el("projectActiveBadge").textContent = state.active_project.project_id || "미선택";
      el("projectActiveSummary").innerHTML =
        '<div class="item good"><h3>' + esc(activeProfile.display_name || state.active_project.project_id || "활성 프로젝트 없음") + '</h3>' +
        '<ul class="small">' +
        '<li>엔진/유형: ' + esc([activeProfile.engine, activeProfile.project_type].filter(Boolean).join(" · ") || "(없음)") + '</li>' +
        '<li>검증 프로필: ' + esc((activeProfile.validation_profile_ids || []).join(", ") || "(없음)") + '</li>' +
        '<li>빌드 프로필: ' + esc(activeProfile.build_profile_count ?? 0) + '개</li>' +
        '</ul>' + internalLinksHtml([activeProfile.href ? link("프로필 원본", activeProfile.href) : ""]) + '</div>';
      el("projectWorkflowSummary").innerHTML = [
        ["운영 단계", projectStatus.phase || "(없음)"],
        ["현재 목표", projectStatus.current_goal || "(없음)"],
        ["현재 초점", projectStatus.current_focus || "(없음)"],
        ["ActiveTask", activeTask.task_id ? activeTask.task_id + " · " + optionLabel(activeTask.status) : "(없음)"],
        ["Backlog", "open " + (core.backlog?.open_count ?? 0) + " · blocked " + (core.backlog?.blocked_count ?? 0)],
      ].map(([label, value]) => '<div class="compact-line"><span>' + esc(label) + '</span><span>' + esc(value) + '</span></div>').join("");
      el("projectProfilesPublic").innerHTML = state.project_profiles.length ? state.project_profiles.map((profile) =>
        '<div class="item ' + (profile.status === "active" ? "good" : "") + '"><h3><code>' + esc(profile.project_id) + '</code> <span class="pill">' + esc(optionLabel(profile.status)) + '</span></h3>' +
        '<p>' + esc(profile.display_name) + ' · ' + esc(profile.engine) + ' · ' + esc(profile.project_type) + '</p>' +
        '<ul class="small"><li>source root ' + esc(profile.source_root_count) + '개</li><li>data root ' + esc(profile.data_root_count) + '개</li><li>validation ' + esc(profile.validation_profile_count) + '개</li></ul>' +
        internalLinksHtml([link("프로필 원본", profile.href)]) + '</div>'
      ).join("") : renderEmpty("Project Profile이 없습니다.");
      el("projectToolSummary").innerHTML = state.tool_adapters.slice(0, 6).map((adapter) =>
        '<div class="item ' + (adapter.status === "available" ? "good" : "warn") + '"><h3>' + esc(adapter.display_name) + ' <span class="pill">' + esc(optionLabel(adapter.status)) + '</span></h3>' +
        '<ul class="small"><li>파일 수정: ' + esc(adapter.can_modify_files ? "가능" : "읽기 중심") + '</li><li>외부 호출/비용: ' + esc(adapter.can_call_external ? "가능" : "없음") + ' / ' + esc(adapter.can_incur_cost ? "가능" : "없음") + '</li><li>사람 승인: ' + esc(adapter.requires_human_approval ? "필요" : "조건부 생략 가능") + '</li></ul>' +
        '</div>'
      ).join("") || renderEmpty("등록된 도구 어댑터가 없습니다.");
    }
    function buildTimelineItems() {
      const core = state.workflow_core || {};
      const items = [];
      if (core.runner?.runner_run_id) {
        items.push({ when: core.runner.updated_at || state.generated_at, kind: "Runner", title: core.runner.runner_run_id, detail: core.runner.stop_reason || core.runner.status, page: "evidence" });
      }
      state.recent_staff_runs.forEach((run) => items.push({ when: run.updated_at, kind: "직원 보고서", title: run.output_id || run.role_run_id, detail: staffName(run.agent_id) + " · " + optionLabel(run.output_status || run.status), page: "runs" }));
      state.meetings.forEach((meeting) => items.push({ when: meeting.updated_at || meeting.created_at || "", kind: "회의", title: meeting.meeting_id, detail: meeting.topic || meeting.status, page: "meetings" }));
      state.work_orders.forEach((wo) => items.push({ when: wo.updated_at || wo.created_at || "", kind: "업무 지시", title: wo.work_order_id, detail: wo.objective || wo.status, page: "work" }));
      state.materializations.forEach((m) => items.push({ when: m.updated_at || "", kind: "채택 후보", title: m.materialization_id, detail: "후보 " + m.created_record_count + "개", page: "runs" }));
      state.dev_logs.slice(0, 8).forEach((logItem) => items.push({ when: logItem.updated_at, kind: "DevLog", title: logItem.title, detail: logItem.group, page: "devlog" }));
      return items.sort((a, b) => String(b.when || "").localeCompare(String(a.when || ""))).slice(0, 24);
    }
    function renderTimelinePage() {
      const items = buildTimelineItems();
      el("timelineList").innerHTML = items.length ? items.map((item) =>
        '<div class="item"><h3>' + esc(item.kind) + ' · ' + esc(short(item.title, 150)) + '</h3>' +
        '<p class="summary">' + esc(short(item.detail, 180)) + '</p>' +
        '<p class="small muted">' + esc(item.when || "(시간 정보 없음)") + '</p>' +
        '<div class="row"><button class="secondary" data-nav-jump="' + esc(item.page) + '">관련 화면 보기</button></div></div>'
      ).join("") : renderEmpty("표시할 활동이 없습니다.");
    }
    function renderDiffPage() {
      const git = state.workflow_core?.git || {};
      const entries = git.changed_entries || [];
      el("diffChangedCount").textContent = entries.length ? entries.length + "개" : "깨끗함";
      el("diffChangedFiles").innerHTML = entries.length ? entries.map((entry) =>
        '<div class="item ' + (isWorkflowPath(entry.path) ? "good" : "warn") + '"><h3><code>' + esc(entry.status) + '</code> ' + esc(entry.path) + '</h3>' +
        '<p class="summary">' + esc(filePurpose(entry.path)) + '</p></div>'
      ).join("") : '<div class="item good"><h3>Git 변경 없음</h3><p class="summary">현재 작업대가 깨끗합니다.</p></div>';
      el("diffGitFileSelect").innerHTML = entries.length ? entries.map((entry) =>
        '<label><input type="checkbox" data-git-file="' + esc(entry.path) + '"' + (isWorkflowPath(entry.path) ? ' checked' : '') + '> <span><code>' + esc(entry.status) + '</code> ' + esc(entry.path) + '</span></label>'
      ).join("") : '<p class="muted">커밋할 변경 파일이 없습니다.</p>';
      el("diffStatView").textContent = git.diff_stat || "diff 통계가 없습니다.";
    }
    function renderDevLogPage() {
      el("devLogList").innerHTML = state.dev_logs.length ? state.dev_logs.map((item) =>
        '<div class="item"><h3>' + esc(item.title) + ' <span class="pill">' + esc(item.group) + '</span></h3>' +
        '<p class="summary">' + esc(short(item.summary, 240)) + '</p>' +
        '<p class="small muted">' + esc(item.updated_at) + '</p>' +
        '<div class="row"><a href="' + esc(item.href) + '" target="_blank">DevLog 열기</a></div></div>'
      ).join("") : renderEmpty("DevLog 파일이 없습니다.");
    }
    function renderHomePanels() {
      const core = state.workflow_core || {};
      const activeTask = core.active_task || {};
      const runner = core.runner || {};
      const verification = core.verification || {};
      const completion = core.completion || {};
      const git = core.git || {};
      const nextAction = core.next_action || {};
      el("coreNextAction").textContent = nextAction.label || "대기";
      const activeTaskHtml = activeTask.task_id
        ? '<div class="item warn"><h3><code>' + esc(activeTask.task_id) + '</code> · ' + esc(activeTask.priority || "") + ' · ' + esc(optionLabel(activeTask.status || "")) + '</h3>' +
          '<p class="summary">' + esc(activeTask.title || "(title 없음)") + '</p>' +
          '<p class="small muted">종류 ' + esc(optionLabel(activeTask.kind || "-")) + ' · 위험도 ' + esc(optionLabel(activeTask.risk || "-")) + '</p></div>'
        : '<div class="item warn"><h3>선택된 작업 없음</h3><p class="summary">다음에 처리할 작업을 업무 지시나 작업 목록에서 선택해야 합니다.</p></div>';
      const runnerHtml = runner.runner_run_id
        ? '<div class="item"><h3>최근 Runner</h3><p><code>' + esc(runner.runner_run_id) + '</code></p>' +
          '<p class="summary">' + esc(optionLabel(runner.stop_reason || runner.current_step || runner.status || "상태 없음")) + '</p>' +
          '<div class="row">' + (runner.href ? '<a href="' + esc(runner.href) + '" target="_blank">Runner 기록</a>' : '') + '</div></div>'
        : '<div class="item"><h3>Runner 기록 없음</h3><p class="summary">현재 ActiveTask 기준 실행 기록을 찾지 못했습니다.</p></div>';
      const actionButtons = (runner.stop_reason === "completion_review_required" || completion.state === "needs_human_decision")
          ? (completionDecisionStatusLines(core).length ? '<div class="item warn"><h3>완료 판단 상태</h3>' + compactListHtml(completionDecisionStatusLines(core)) + '</div>' : '') +
          actionsHtml([
            '<button class="secondary" data-action="completion-decision-plan">완료 판단안</button>',
            ...completionFollowUpActionItems(core),
          ])
        : ((activeTask.status === "ready_for_implementation" || activeTask.status === "awaiting_approval" || activeTask.status === "todo")
          ? '<div class="row">' + workflowStartButton("승인+실행", activeTask.task_id, "good") + '</div>'
          : '');
      el("homeWorkflowCore").innerHTML =
        '<div class="item good"><h3>지금 할 일</h3><p class="summary">' + esc(nextAction.detail || "즉시 처리할 gate가 보이지 않습니다.") + '</p></div>' +
        activeTaskHtml +
        runnerHtml +
        actionButtons;
      const evidenceLines = [
        ["브랜치", git.branch || "(unknown)"],
        ["변경 파일", (git.changed_count || 0) + "개"],
        ["검증", verification.verdict || "(없음)"],
        ["완료 상태", completion.state || completion.readiness || "(없음)"],
      ];
      const evidenceLinks = [
        verification.href ? '<a href="' + esc(verification.href) + '" target="_blank">검증 보고서</a>' : '',
        completion.href ? '<a href="' + esc(completion.href) + '" target="_blank">완료 보고서</a>' : '',
        completion.card_href ? '<a href="' + esc(completion.card_href) + '" target="_blank">완료 카드</a>' : '',
      ].filter(Boolean).join("");
      el("homeWorkflowEvidence").innerHTML =
        evidenceLines.map(([label, value]) =>
          '<div class="compact-line"><span>' + esc(label) + '</span><span class="pill">' + esc(value) + '</span></div>'
        ).join("") +
        (git.changed_files && git.changed_files.length
          ? '<div class="item warn"><h3>변경 파일 미리보기</h3><p class="summary">' + esc(git.changed_files.slice(0, 6).join(", ")) + ((git.changed_count || git.changed_files.length) > 6 ? ' 외 ' + esc((git.changed_count || git.changed_files.length) - 6) + '개' : '') + '</p></div>'
          : '<div class="item good"><h3>Git 변경 없음</h3><p class="summary">현재 Git 작업대가 깨끗합니다.</p></div>') +
        (evidenceLinks ? '<div class="row">' + evidenceLinks + '</div>' : '');
      const gitEntries = git.changed_entries || [];
      el("gitGateCount").textContent = gitEntries.length ? gitEntries.length + "개" : "깨끗함";
      el("gitFileSelect").innerHTML = gitEntries.length ? gitEntries.map((entry) =>
        '<label><input type="checkbox" data-git-file="' + esc(entry.path) + '"' + (isWorkflowPath(entry.path) ? ' checked' : '') + '> <span><code>' + esc(entry.status) + '</code> ' + esc(entry.path) + '</span></label>'
      ).join("") : '<p class="muted">커밋할 변경 파일이 없습니다.</p>';
      const queue = buildDirectorDecisionItems().slice(0, 6);
      el("homeQueueCount").textContent = queue.length ? String(queue.length) : "없음";
      el("homeDecisionQueue").innerHTML = queue.length
        ? queue.map(renderDecisionCard).join("")
        : '<div class="item good"><h3>지금 당장 판단할 항목 없음</h3><p class="summary">새 완료 검토, 승인 gate, 직원 보고서 후보, 제안, Git 변경이 생기면 여기에 올라옵니다.</p></div>';
      el("homeStaffStatus").innerHTML = state.staff_agents.length ? state.staff_agents.slice(0, 6).map((agent) =>
        '<div class="compact-line"><span>' + esc(agent.display_name_ko || agent.display_name || agent.agent_id) + '</span><span class="pill">' + esc(agent.department_name_ko || departmentName(agent.department_id)) + '</span></div>'
      ).join("") : '<p class="muted">등록된 StaffAgent가 없습니다.</p>';
      const activity = [
        ...state.recent_staff_runs.slice(0, 3).map((run) => ({ label:"직원 보고서", value:run.output_id || run.role_run_id, status:run.output_status || run.status })),
        ...state.meetings.slice(0, 2).map((meeting) => ({ label:"회의", value:meeting.meeting_id, status:meeting.status })),
        ...state.work_orders.slice(0, 2).map((wo) => ({ label:"업무 지시", value:wo.work_order_id, status:wo.status })),
      ].slice(0, 6);
      el("homeActivity").innerHTML = activity.length ? activity.map((item) =>
        '<div class="compact-line"><span><span class="muted">' + esc(item.label) + '</span> · ' + esc(item.value) + '</span><span class="pill">' + esc(optionLabel(item.status || "")) + '</span></div>'
      ).join("") : '<p class="muted">최근 Studio 활동이 없습니다.</p>';
      const company = state.company_runtime || {};
      const companyStage = company.stage_summary || {};
      const operations = [
        ["회사 런타임", company.overall_label || company.overall_status || "(unknown)"],
        ["전체 gate", (companyStage.passed_gate_count ?? 0) + "/" + (companyStage.total_gate_count ?? 0)],
        ["C gate", (companyStage.c_passed_gate_count ?? 0) + "/" + (companyStage.c_gate_count ?? 0)],
        ["활성 프로젝트", state.active_project.project_id || "(none)"],
        ["부서 / 직원", state.metrics.departments + " / " + state.metrics.staff],
        ["도구 어댑터", state.metrics.tool_adapters],
        ["도구 요청서", state.metrics.tool_run_requests],
        ["정책 평가", state.metrics.automation_evaluations],
        ["안전 경계", "commit/push 없음"],
      ];
      el("homeOperations").innerHTML = operations.map(([label, value]) =>
        '<div class="compact-line"><span>' + esc(label) + '</span><span class="pill">' + esc(value) + '</span></div>'
      ).join("") + '<div class="row"><button class="secondary" data-action="company-runtime-readiness">C 단계 점검</button></div>';
      const evidence = [
        ...state.review_packets.slice(0, 3).map((packet) => ({ label:"검토 보고서", value:packet.id, href:packet.href })),
        ...state.conditional_automation.evaluations.slice(0, 2).map((evaluation) => ({ label:"정책 평가", value:evaluation.id, href:evaluation.href })),
      ].slice(0, 5);
      el("homeEvidence").innerHTML = evidence.length ? evidence.map((item) =>
        '<div class="compact-line"><span><span class="muted">' + esc(item.label) + '</span> · ' + esc(item.value) + '</span><a href="' + esc(item.href) + '" target="_blank">열기</a></div>'
      ).join("") : '<p class="muted">최근 검증 자료 파일이 없습니다.</p>';
    }
    function renderInbox() {
      const items = buildDirectorDecisionItems().slice(0, 3);
      el("inbox").innerHTML = items.length
        ? items.map(renderDecisionCard).join("")
        : '<div class="item good"><h3>지금 바로 결정할 일 없음</h3><p class="summary">새 완료 검토, 승인 gate, 채택 후보, 제안, Git 변경이 생기면 여기에 우선순위와 이유가 함께 표시됩니다.</p></div>';
    }
    function defaultDataVersion() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return year + "." + month + "." + day + ".001";
    }
    function renderToolbox() {
      const catalog = state.toolbox || { categories: [] };
      const toolCard = (tool, primary = false) =>
        '<div class="item toolbox-card ' + (tool.available ? "" : "danger") + '"><h3>' + esc(tool.label) + '</h3>' +
        '<p class="summary">' + esc(tool.purpose) + '</p>' +
        '<ul class="small">' +
        '<li>언제 쓰나: ' + esc(tool.when_to_use) + '</li>' +
        '<li>실행 명령: <code>' + esc(tool.command_display) + '</code></li>' +
        '<li>안전: ' + esc(tool.safety) + '</li>' +
        '</ul>' +
        '<div class="row"><button class="' + (primary || tool.id.includes("restart") || tool.id.includes("upload") ? "warn" : "secondary") + '" data-toolbox-run="' + esc(tool.id) + '"' + (tool.confirm_message ? ' data-confirm="' + esc(tool.confirm_message) + '"' : '') + (tool.available ? "" : " disabled") + '>실행</button></div>' +
        '</div>';
      const primaryAction = (tool) => {
        if (tool.publish_data) {
          return '<div class="item toolbox-primary-card ' + (tool.available ? "" : "danger") + '"><div>' +
            '<h3>' + esc(tool.label) + '</h3>' +
            '<p class="summary">' + esc(tool.purpose) + '</p>' +
            '<div class="field-block small"><span>배포 버전</span><input id="toolboxDataVersion" value="' + esc(defaultDataVersion()) + '" placeholder="예: 2026.05.23.001"></div>' +
            '<ul class="small">' +
            '<li>원본 Data와 배포 zip을 먼저 검증합니다.</li>' +
            '<li>UserData.json은 배포하지 않습니다.</li>' +
            '<li>마지막에 latest manifest만 새 버전으로 바꿉니다.</li>' +
            '</ul></div>' +
            '<button class="warn" data-toolbox-publish="' + esc(tool.id) + '"' +
            (tool.available ? "" : " disabled") + '>배포 실행</button></div>';
        }
        return '<div class="item toolbox-primary-card ' + (tool.available ? "" : "danger") + '"><div>' +
          '<h3>' + esc(tool.label) + '</h3>' +
          '<p class="summary">' + esc(tool.purpose) + '</p></div>' +
          '<button class="warn" data-toolbox-run="' + esc(tool.id) + '"' +
          (tool.confirm_message ? ' data-confirm="' + esc(tool.confirm_message) + '"' : '') +
          (tool.available ? "" : " disabled") + '>실행</button></div>';
      };
      const primaryTools = catalog.primary_tools || [];
      const primaryHtml = primaryTools.length
        ? '<section class="toolbox-primary">' + primaryTools.map(primaryAction).join("") + '</section>'
        : "";
      const secondaryHtml = catalog.categories.length
        ? '<div class="toolbox-divider"><h2>가끔 쓰는 점검 도구</h2><p class="muted small">평소에는 거의 쓰지 않아도 됩니다. 작업대가 헷갈리거나 검증이 필요할 때만 사용하세요.</p></div>' +
          '<section class="toolbox-grid secondary">' + catalog.categories.map((category) =>
            '<div class="card toolbox-card toolbox-secondary-category"><h2>' + esc(category.category) + '</h2><div class="list">' +
            category.tools.map((tool) => toolCard(tool, false)).join("") +
            '</div></div>'
          ).join("") + '</section>'
        : "";
      el("toolboxList").innerHTML = primaryHtml + secondaryHtml || renderEmpty("표시할 도구가 없습니다.");
    }
    function render() {
      el("stamp").textContent = "updated " + new Date(state.generated_at).toLocaleString();
      const m = state.metrics;
      syncFilterControls();
      el("metrics").innerHTML = [
        metric("목표 기획안", m.director_goal_plans),
        metric("직원", m.staff),
        metric("직원 보고서", m.staff_runs),
        metric("보고서", m.review_packets),
        metric("인수인계", m.handoffs),
        metric("업무 지시", m.work_orders),
        metric("채택 후보", m.materializations),
        metric("제안", m.proposals),
        metric("기억", m.memories),
        metric("회의", state.meetings.length),
        metric("프로젝트", m.project_profiles),
        metric("정책 평가", m.automation_evaluations),
        metric("DevLog", m.dev_logs)
      ].join("");
      renderInbox();
      renderToolbox();
      renderHomePanels();
      renderDirectorGoals();
      renderProjectDashboard();
      renderDirectorInboxFull();
      renderTimelinePage();
      renderDiffPage();
      renderDevLogPage();
      renderNavCounts();
      el("contextPackets").innerHTML = state.context_packets.length ? state.context_packets.map((packet) =>
        '<div class="item"><h3><code>' + esc(packet.context_packet_id) + '</code> <span class="pill">' + esc(packet.is_durable ? "durable" : "temp") + '</span></h3>' +
        '<p class="small muted">직원 ' + esc(staffName(packet.agent_id)) + ' · 출처 ' + esc(packet.source_ref || "-") + '</p>' +
        '<p class="summary">' + esc(short(packet.objective)) + '</p>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>승인 범위</span><span class="pill">' + esc(asArray(packet.approved_scope).length) + '</span></div>' +
        listHtml(packet.approved_scope) +
        '<div class="compact-line"><span>필수 산출물</span><span class="pill">' + esc(inlineList(packet.required_outputs)) + '</span></div>' +
        '</div>' +
        internalLinksHtml([link("문맥 원본", packet.href)]) + '</div>'
      ).join("") : renderEmpty("아직 내부 문맥 기록이 없습니다. 업무 지시에서 직원 자료를 저장하면 여기에 나타납니다.");
      const visibleRuns = state.recent_staff_runs.filter((r) =>
        (!filters.runStatus || (r.output_status || r.status) === filters.runStatus) &&
        includesText([r.role_run_id, r.output_id, r.agent_id, r.model, r.reasoning, r.summary, r.output_status, r.status].join(" "), filters.runSearch)
      );
      const hasAdoptionCandidates = (r) => {
        const counts = r.materializable_counts || {};
        return Boolean((counts.proposals || 0) + (counts.memory || 0) + (counts.workorders || 0) + (counts.handoffs || 0));
      };
      el("runs").innerHTML = visibleRuns.length ? visibleRuns.map((r) =>
        '<div class="item ' + (r.status === "failed" ? "danger" : "") + '"><h3><code>' + esc(r.output_id || r.role_run_id) + '</code> <span class="pill">' + esc(optionLabel(r.output_status || r.status)) + '</span></h3>' +
        '<p>' + esc(staffName(r.agent_id)) + ' · ' + esc(r.model) + ' / ' + esc(r.reasoning) + '</p>' +
        '<p class="small muted">' + esc(staffOutputStatusDetail(r.output_status || r.status)) + '</p>' +
        '<h3>보고서 요약</h3><p class="summary">' + esc(short(r.summary)) + '</p>' +
        '<h3>채택할 수 있는 내용</h3>' +
        '<ul class="small">' +
        '<li>아이디어 제안: ' + esc(r.materializable_counts.proposals) + '개</li>' +
        '<li>프로젝트 기억 후보: ' + esc(r.materializable_counts.memory) + '개</li>' +
        '<li>업무 지시 후보: ' + esc(r.materializable_counts.workorders) + '개</li>' +
        '<li>직원 인수인계 후보: ' + esc(r.materializable_counts.handoffs) + '개</li>' +
        '</ul>' +
        actionsHtml(r.output_path ? [
          button("보고서 보기/만들기", "review-packet-export", r.output_path),
          button("채택 후보 미리보기", "materialize-plan", r.output_path),
          button("채택 후보로 넘기기", "materialize", r.output_path, "good"),
          ...(hasAdoptionCandidates(r) ? [] : [button("임시 보고서 정리", "staff-run-cleanup", r.output_path, "danger")])
        ] : []) +
        internalLinksHtml([
          link("실행 기록", "/file?path=" + encodeURIComponent(r.staff_run_path)),
          r.output_href ? link("원본 JSON", r.output_href) : ""
        ]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 직원 보고서가 없습니다.");
      el("materializations").innerHTML = state.materializations.length ? state.materializations.map((m) =>
        '<div class="item good"><h3><code>' + esc(m.materialization_id) + '</code></h3>' +
        '<p class="small">원본 보고서: ' + esc(m.source_output_id) + ' · 후보 ' + esc(m.created_record_count) + '개</p>' +
        actionsHtml([
          button("결정 전 확인", "decision-plan", m.path),
          button("채택 결정 기록", "decision-approve", m.path, "good", 'data-decision="approve"'),
          button("수정 요청", "decision-request-changes", m.path, "warn", 'data-decision="request_changes"'),
          button("반려", "decision-reject", m.path, "danger", 'data-decision="reject"')
        ]) +
        internalLinksHtml([link("채택 후보 원본", m.href)]) + '</div>'
      ).join("") : '<p class="muted">아직 채택 후보가 없습니다. 왼쪽 직원 보고서에서 채택 후보로 넘기기를 누르면 여기에 나타납니다.</p>';
      const visibleWorkOrders = state.work_orders.filter((wo) =>
        (!filters.workDepartment || wo.department_id === filters.workDepartment) &&
        includesText([wo.work_order_id, wo.objective, wo.department_id, wo.status].join(" "), filters.workSearch)
      );
      el("workorders").innerHTML = visibleWorkOrders.length ? visibleWorkOrders.map((wo) =>
        '<div class="item"><h3><code>' + esc(wo.work_order_id) + '</code> <span class="pill">' + esc(optionLabel(wo.status)) + '</span></h3>' +
        '<p class="small muted">부서: ' + esc(departmentName(wo.department_id) || "(없음)") + ' · 담당: ' + esc(inlineList(asArray(wo.assigned_agents).map(staffName), "(없음)")) + '</p>' +
        '<p class="summary">' + esc(short(wo.objective)) + '</p>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>할 일</span><span class="pill">' + esc(asArray(wo.scope).length) + '</span></div>' +
        listHtml(wo.scope, "할 일이 비어 있습니다.") +
        '<div class="compact-line"><span>기대 산출물</span><span class="pill">' + esc(asArray(wo.expected_outputs).length) + '</span></div>' +
        listHtml(wo.expected_outputs, "기대 결과물이 비어 있습니다.") +
        '<div class="compact-line"><span>승인 항목</span><span class="pill">' + esc(asArray(wo.approval_items).length ? "필요" : "없음") + '</span></div>' +
        listHtml(wo.approval_items) +
        '</div>' +
        '<div class="button-help small"><strong>권장 순서</strong><ul><li>먼저 점검/미리보기/계획으로 내용을 확인합니다.</li><li>바로 직원에게 맡길지, 작업 목록에 넣을지 하나를 고릅니다.</li></ul></div>' +
        actionsHtml([
          button("인수인계 점검", "workorder-handoff-plan", wo.path),
          button("직원 자료 미리보기", "workorder-context-plan", wo.path),
          button("직원 실행 계획", "workorder-staff-plan", wo.path),
          button("작업 생성 계획", "workorder-plan", wo.path),
          button("직원에게 맡기기", "workorder-staff-run", wo.path, "warn"),
          button("작업 목록에 넣기", "workorder-create", wo.path, "good")
        ]) +
        internalLinksHtml([link("업무 지시 원본", wo.href)]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 업무 지시가 없습니다.");
      const visibleHandoffs = state.handoffs.filter((h) =>
        includesText([h.handoff_id, h.from_agent_id, h.to_agent_id, h.reason, h.status].join(" "), filters.workSearch)
      );
      el("handoffs").innerHTML = visibleHandoffs.length ? visibleHandoffs.map((h) =>
        '<div class="item warn"><h3><code>' + esc(h.handoff_id) + '</code> <span class="pill">' + esc(optionLabel(h.status)) + '</span></h3>' +
        '<p>' + esc(staffName(h.from_agent_id)) + ' → ' + esc(staffName(h.to_agent_id)) + '</p><p class="summary">' + esc(short(h.reason)) + '</p>' +
        actionsHtml([button("인수인계 계획", "handoff-plan", h.path), button("직원에게 맡기기", "handoff-execute", h.path, "good")]) +
        internalLinksHtml([link("인수인계 원본", "/file?path=" + encodeURIComponent(h.path))]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 인수인계 후보가 없습니다.");
      const visibleMeetings = state.meetings.filter((meeting) =>
        meetingMatchesStatusFilter(meeting) &&
        includesText([meeting.meeting_id, meeting.topic, meeting.meeting_type, meeting.status].join(" "), filters.meetingSearch)
      );
      el("meetings").innerHTML = visibleMeetings.length ? visibleMeetings.map((meeting) =>
        '<div class="item"><h3><code>' + esc(meeting.meeting_id) + '</code> <span class="pill">' + esc(optionLabel(meeting.status)) + '</span></h3>' +
        '<p>' + esc(meeting.topic) + '</p>' +
        '<p class="small muted">종류 ' + esc(optionLabel(meeting.meeting_type || "(none)")) + ' · 출처 ' + esc(meeting.is_stored ? "저장됨" : "예시") + '</p>' +
        '<p class="small muted">참석자 ' + esc(meeting.participant_count) + ' · 발언 ' + esc(meeting.turn_count || 0) + ' · ' + esc(meetingCountLine("판단할 제안", asArray(meeting.proposals).length, "판단할 제안 없음")) + ' · ' + esc(meetingCountLine("미해결 질문", meeting.unresolved_count, "미해결 질문 없음")) + '</p>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>최근 발언</span><span class="pill">' + esc(meeting.last_turn ? staffName(meeting.last_turn.speaker_id || "") : "없음") + '</span></div>' +
        '<p class="summary">' + esc(meetingLastTurnLine(meeting)) + '</p>' +
        '<div class="compact-line"><span>지금 할 일</span><span class="pill">다음 행동</span></div>' +
        '<p class="summary">' + esc(meetingNextActionText(meeting)) + '</p>' +
        '</div>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>참석자</span><span class="pill">' + esc(inlineList(asArray(meeting.participants).map(staffName))) + '</span></div>' +
        '<div class="compact-line"><span>판단할 제안</span><span class="pill">' + esc(asArray(meeting.proposals).length ? asArray(meeting.proposals).length + "개" : "없음") + '</span></div>' +
        listHtml(meeting.proposals) +
        '<div class="compact-line"><span>미해결 질문</span><span class="pill">' + esc(meeting.unresolved_count ? meeting.unresolved_count + "개" : "없음") + '</span></div>' +
        listHtml(meeting.unresolved_questions) +
        '</div>' +
        actionsHtml([
          button("회의판 보기", "meeting-board", meeting.path),
          meeting.is_stored ? button("다음 AI 발언 받기", "meeting-agent-run", meeting.path, "good") : "",
          '<button class="secondary" data-meeting-turn="' + esc(meeting.meeting_id) + '">내 의견 기록</button>',
          button("업무 후보 만들기", "meeting-create-workorder", meeting.path),
          button("방향 판단으로 남기기", "meeting-create-decision", meeting.path),
          meeting.is_stored && meeting.status !== "closed" ? button("회의 종료", "meeting-finalize", meeting.meeting_id, "warn") : ""
        ]) +
        internalLinksHtml([link("회의 원본", meeting.href)]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 MeetingSession이 없습니다.");
      const visibleDepartments = state.departments.filter((department) =>
        includesText([department.name_ko, department.name, department.department_id, department.mission_ko, department.review_gate_labels.join(" ")].join(" "), filters.departmentSearch)
      );
      el("departmentSummary").textContent = "표시 " + visibleDepartments.length + "/" + state.departments.length;
      el("departments").innerHTML = visibleDepartments.length ? visibleDepartments.map((department) =>
        '<div class="item"><h3>' + esc(department.name_ko) + '</h3>' +
        '<p class="small muted">ID <code>' + esc(department.department_id) + '</code> · 원문명 ' + esc(department.name) + '</p>' +
        '<p class="summary">역할: ' + esc(short(department.mission_ko, 150)) + '</p>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>부서장</span><span class="pill">' + esc(staffName(department.department_lead) || department.department_lead_name || "(없음)") + '</span></div>' +
        '<div class="compact-line"><span>등록 직원</span><span class="pill">' + esc(department.active_staff_count) + '/' + esc(department.staff_count) + '</span></div>' +
        '<div class="compact-line"><span>검토 기준</span><span class="pill">' + esc(asArray(department.review_gate_labels).length) + '</span></div>' +
        listHtml(department.review_gate_labels, "(없음)") +
        '<div class="compact-line"><span>담당 결과물</span><span class="pill">' + esc(asArray(department.owned_artifacts).length) + '</span></div>' +
        mappedListHtml(department.owned_artifacts, artifactLabel, "(없음)") +
        '</div>' +
        '<div class="row">' +
        '<button class="secondary" data-filter-department="' + esc(department.department_id) + '" data-target-page="staff">직원 보기</button>' +
        '<button class="secondary" data-filter-department="' + esc(department.department_id) + '" data-target-page="work">관련 업무 보기</button>' +
        '<button class="secondary" data-nav-jump="meetings">회의 보기</button>' +
        '</div>' +
        internalLinksHtml([link("부서 registry 원본", department.href)]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 부서가 없습니다.");
      const visibleStaff = state.staff_agents.filter((agent) =>
        (!filters.staffDepartment || agent.department_id === filters.staffDepartment) &&
        includesText([
          agent.agent_id,
          agent.display_name,
          agent.display_name_ko,
          agent.role_title,
          agent.role_title_ko,
          agent.department_id,
          agent.department_name_ko,
          agent.mission,
          agent.mission_ko,
          agent.output_contracts.join(" "),
          agent.output_contracts_ko.join(" "),
          agent.approval_required_actions.join(" "),
          agent.approval_required_actions_ko.join(" "),
          agent.authority_ko.join(" "),
        ].join(" "), filters.staffSearch)
      );
      el("staffAgents").innerHTML = visibleStaff.length ? visibleStaff.map((agent) =>
        '<div class="item"><h3>' + esc(agent.display_name_ko) + ' <span class="pill">' + esc(agent.seniority_label) + '</span></h3>' +
        '<p class="small muted">ID <code>' + esc(agent.agent_id) + '</code> · 직책 ' + esc(agent.role_title_ko) + ' · 부서 ' + esc(agent.department_name_ko) + '</p>' +
        '<p class="small muted">원문명: ' + esc(agent.display_name) + ' / ' + esc(agent.role_title) + '</p>' +
        '<p class="summary">역할: ' + esc(short(agent.mission_ko, 150)) + '</p>' +
        '<div class="staff-detail"><strong>할 수 있는 일</strong>' + listHtml(agent.authority_ko, "(없음)") + '</div>' +
        '<div class="staff-detail"><strong>담당 산출물</strong>' + listHtml(agent.output_contracts_ko, "(없음)") + '</div>' +
        '<div class="staff-detail"><strong>승인이 필요한 일</strong>' + listHtml(agent.approval_required_actions_ko, "(없음)") + '</div>' +
        '<details class="internal-links"><summary>직원 운영 기준</summary>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>기억 권한</span><span class="pill">' + esc(agent.canon_write_permission || "none") + '</span></div>' +
        listHtml([...(agent.readable_memory_scopes || []).map((item) => "읽기: " + item), ...(agent.writable_memory_scopes || []).map((item) => "쓰기: " + item)]) +
        '<div class="compact-line"><span>차단 도구</span><span class="pill">' + esc(asArray(agent.blocked_tools).length) + '</span></div>' +
        listHtml(agent.blocked_tools, "(없음)") +
        '<div class="compact-line"><span>근거 없이 주장 금지</span><span class="pill">' + esc(asArray(agent.cannot_claim_without_evidence).length) + '</span></div>' +
        listHtml(agent.cannot_claim_without_evidence, "(없음)") +
        '</div></details>' +
        '<div class="row"><button class="secondary" data-action="staff-operating-plan" data-path="' + esc(agent.agent_id) + '">운영 점검</button><button class="secondary" data-filter-agent="' + esc(agent.agent_id) + '" data-target-page="runs">최근 보고서</button><button class="secondary" data-nav-jump="meetings">회의 보기</button></div>' +
        internalLinksHtml([link("직원 registry 원본", agent.href)]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 AI 직원이 없습니다.");
      el("projectProfiles").innerHTML = state.project_profiles.length ? state.project_profiles.map((profile) =>
        '<div class="item ' + (profile.status === "active" ? "good" : "") + '"><h3><code>' + esc(profile.project_id) + '</code> <span class="pill">' + esc(optionLabel(profile.status)) + '</span></h3>' +
        '<p>' + esc(profile.display_name) + ' · ' + esc(profile.engine) + ' · ' + esc(profile.project_type) + '</p>' +
        '<p class="small muted">source ' + esc(profile.source_root_count) + ' · data ' + esc(profile.data_root_count) + ' · validation ' + esc(profile.validation_profile_count) + ' · build ' + esc(profile.build_profile_count) + '</p>' +
        '<p class="summary">validation: ' + esc(profile.validation_profile_ids.join(", ") || "(none)") + '</p>' +
        internalLinksHtml([link("프로필 원본", profile.href)]) + '</div>'
      ).join("") : '<p class="muted">Project Profile이 없습니다.</p>';
      el("toolAdapters").innerHTML = state.tool_adapters.length ? state.tool_adapters.map((adapter) =>
        '<div class="item ' + (adapter.status === "available" ? "good" : adapter.status === "planned" ? "warn" : "") + '"><h3><code>' + esc(adapter.adapter_id) + '</code> <span class="pill">' + esc(optionLabel(adapter.status)) + '</span></h3>' +
        '<p>' + esc(adapter.display_name) + ' · ' + esc(adapter.category) + '</p>' +
        '<p class="small muted">owner ' + esc(adapter.execution_owner) + ' · default ' + esc(adapter.default_enabled ? "yes" : "no") + ' · approval ' + esc(adapter.requires_human_approval ? "yes" : "no") + '</p>' +
        '<p class="small muted">files ' + esc(adapter.can_modify_files ? "write-capable" : "read-only") + ' · external ' + esc(adapter.can_call_external ? "yes" : "no") + ' · cost ' + esc(adapter.can_incur_cost ? "yes" : "no") + '</p>' +
        '<p class="summary">' + esc(short(adapter.provider_policy, 140)) + '</p>' +
        actionsHtml(['<button class="secondary" data-toolrun-adapter="' + esc(adapter.adapter_id) + '">이 도구로 요청서 작성</button>']) +
        internalLinksHtml([link("도구 설정 원본", adapter.href)]) + '</div>'
      ).join("") : '<p class="muted">도구 어댑터가 없습니다.</p>';
      el("toolRunRequests").innerHTML = state.tool_run_requests.length ? state.tool_run_requests.map((request) =>
        '<div class="item ' + (request.permission_class === "read" ? "good" : "warn") + '"><h3><code>' + esc(request.tool_run_request_id) + '</code> <span class="pill">' + esc(optionLabel(request.status)) + '</span></h3>' +
        '<p>' + esc(request.tool_adapter_id) + ' · ' + esc(optionLabel(request.permission_class)) + ' · ' + esc(request.requested_action) + '</p>' +
        '<p class="summary">' + esc(short(request.purpose, 170)) + '</p>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>입력</span><span class="pill">' + esc(request.input_refs.length) + '</span></div>' +
        listHtml(request.input_refs.slice(0, 3)) +
        '<div class="compact-line"><span>필수 검증 자료</span><span class="pill">' + esc(request.evidence_requirements.length) + '</span></div>' +
        listHtml(request.evidence_requirements.slice(0, 3)) +
        '</div>' +
        actionsHtml([button("다시 평가", "toolrun-plan", request.path)]) +
        internalLinksHtml([link("요청서 원본", request.href)]) + '</div>'
      ).join("") : '<p class="muted">저장된 도구 요청서가 없습니다.</p>';
      const automation = state.conditional_automation;
      el("automationPolicy").innerHTML =
        '<div class="item"><h3><code>' + esc(automation.policy_version) + '</code></h3>' +
        '<p class="small muted">정책 사례 ' + esc(automation.case_count) + ' · 최근 평가 ' + esc(automation.evaluations.length) + '</p>' +
        actionsHtml([
          button("상태 확인", "automation-status", ""),
          button("정책 검사", "automation-validate", ""),
          button("테스트", "automation-test", ""),
          button("_Temp 평가 기록", "automation-test-write", "", "good")
        ]) +
        internalLinksHtml([link("정책 사례 원본", automation.cases_href)]) + '</div>' +
        (automation.evaluations.length ? automation.evaluations.map((evaluation) =>
          '<div class="item good"><h3><code>' + esc(evaluation.id) + '</code></h3>' +
          '<p class="small muted">' + esc(evaluation.command || "evaluation") + ' · 통과 ' + esc(evaluation.passed_count) + ' · 실패 ' + esc(evaluation.failed_count) + ' · ' + esc(evaluation.updated_at) + '</p>' +
          actionsHtml([button("재현", "automation-replay", evaluation.path), button("수정 계획", "automation-repair", evaluation.path)]) +
          internalLinksHtml([link("평가 원본", evaluation.href)]) + '</div>'
        ).join("") : '<p class="muted">저장된 정책 평가가 없습니다.</p>');
      const visibleProposals = state.proposals.filter((p) => {
        const decisionCount = proposalDecisions(p.proposal_id).length;
        const matchesDecisionFilter = !filters.proposalDecision ||
          (filters.proposalDecision === "pending" && decisionCount === 0) ||
          (filters.proposalDecision === "decided" && decisionCount > 0);
        return matchesDecisionFilter &&
          includesText([p.proposal_id, p.title, p.summary, p.status, p.source_agent_id, proposalKindLabel(p)].join(" "), filters.knowledgeSearch);
      });
      el("proposals").innerHTML = visibleProposals.length ? visibleProposals.map((p) => {
        const decisionsForProposal = proposalDecisions(p.proposal_id);
        const category = proposalKindLabel(p);
        const canonEligible = proposalCanBecomeCanon(p);
        const decisionState = decisionsForProposal.length ? "판단 기록 있음 " + decisionsForProposal.length + "개" : "판단 대기";
        const decisionSummary = decisionsForProposal.length
          ? decisionsForProposal.map((decision) => optionLabel(decision.decision_type) + " · " + short(decision.summary || decision.decision_summary || decision.decision_id, 70))
          : ["아직 감독자 판단 기록이 없습니다."];
        const actionHelp = decisionsForProposal.length
          ? "이미 판단 기록이 있어 카드에서는 채택/수정/반려 버튼을 숨겼습니다. 추가 판단은 위의 결정 기록하기에서 남기세요."
          : "아직 판단 전이라 카드에서 채택, 수정 요청, 반려를 바로 남길 수 있습니다.";
        const decisionButtons = decisionsForProposal.length
          ? [button("전환 계획", "knowledge-transition-plan", p.path)]
          : [
              button("전환 계획", "knowledge-transition-plan", p.path),
              button("채택 기록", "proposal-approve", p.path, "good"),
              button("수정 요청", "proposal-request-changes", p.path),
              button("반려 기록", "proposal-reject", p.path, "danger"),
              canonEligible ? button("공식 설정 검토 기록", "proposal-canonize", p.path, "warn") : "",
            ];
        return '<div class="item warn"><h3><code>' + esc(p.proposal_id) + '</code> <span class="pill">' + esc(category) + '</span> <span class="pill">' + esc(decisionState) + '</span> <span class="pill">' + esc(optionLabel(p.status)) + '</span></h3>' +
          '<p>' + esc(p.title) + '</p><p class="summary">' + esc(short(p.summary)) + '</p>' +
          '<p class="small muted">출처 ' + esc(staffName(p.source_agent_id)) + ' · 선택지 ' + esc(p.option_count) + '</p>' +
          '<div class="compact-list">' +
          '<div class="compact-line"><span>감독자 판단</span><span class="pill">' + esc(decisionState) + '</span></div>' +
          listHtml(decisionSummary) +
          '<div class="compact-line"><span>승인 필요</span><span class="pill">' + esc(asArray(p.approval_items).length) + '</span></div>' +
          listHtml(p.approval_items) +
          '<div class="compact-line"><span>위험/의존성</span><span class="pill">' + esc(asArray(p.risks).length + asArray(p.dependencies).length) + '</span></div>' +
          listHtml([...(p.risks || []), ...(p.dependencies || [])]) +
          '</div>' +
          '<p class="small muted">' + esc(actionHelp) + '</p>' +
          (!canonEligible ? '<p class="small muted">이 제안은 ' + esc(category) + '이라 공식 설정 후보 버튼을 숨겼습니다.</p>' : '') +
          actionsHtml(decisionButtons) +
          internalLinksHtml([link("제안 원본", p.href)]) + '</div>';
      }).join("") : renderEmpty("조건에 맞는 제안이 없습니다.");
      const visibleDecisions = state.decisions.filter((d) =>
        includesText([d.decision_id, d.decision_type, d.target_ref, d.summary].join(" "), filters.knowledgeSearch)
      );
      el("decisions").innerHTML = visibleDecisions.length ? visibleDecisions.map((d) => {
        const category = decisionTargetCategory(d);
        const canCreateCanon = decisionCanCreateCanon(d);
        const hasTargetRef = Boolean(String(d.target_ref || "").trim());
        const decisionHelp = canCreateCanon
          ? "이 결정은 게임 설정 후보에 대한 공식 설정 검토 기록입니다. 필요하면 공식 설정으로 저장할 수 있습니다."
          : hasTargetRef
            ? "이 결정은 " + category + "입니다. AI 직원 참고용 기록으로만 저장할 수 있고, 공식 설정으로는 저장하지 않습니다."
            : "이 결정은 대상 ID가 비어 있어 참고 기록이나 공식 설정으로 넘길 수 없습니다. 오래된 테스트/깨진 후보라면 정리 대상으로 보세요.";
        return '<div class="item good"><h3><code>' + esc(d.decision_id) + '</code> <span class="pill">' + esc(optionLabel(d.decision_type)) + '</span> <span class="pill">' + esc(category) + '</span></h3>' +
          '<p class="small">대상: ' + esc(d.target_ref || "(대상 없음)") + '</p><p class="summary">' + esc(short(d.summary)) + '</p>' +
          '<div class="compact-list">' +
          '<div class="compact-line"><span>받아들인 범위</span><span class="pill">' + esc(asArray(d.accepted_scope).length) + '</span></div>' +
          listHtml(d.accepted_scope, "없음") +
          '<div class="compact-line"><span>제외한 범위/조건</span><span class="pill">' + esc(asArray(d.rejected_scope).length) + '</span></div>' +
          listHtml(d.rejected_scope, "없음") +
          '</div>' +
          '<p class="small muted">' + esc(decisionHelp) + '</p>' +
          actionsHtml(hasTargetRef ? [
            button("전환 계획", "knowledge-transition-plan", d.path),
            button("참고 기록으로 저장", "decision-create-memory", d.path, "good"),
            canCreateCanon ? button("공식 설정으로 저장", "decision-create-canon", d.path, "warn") : "",
          ] : [
            button("전환 계획", "knowledge-transition-plan", d.path),
          ]) +
          internalLinksHtml([link("결정 원본", d.href)]) + '</div>';
      }).join("") : renderEmpty("조건에 맞는 결정 기록이 없습니다.");
      const visibleMemories = state.memories.filter((m) =>
        (!filters.memoryStatus || m.status === filters.memoryStatus) &&
        includesText([m.memory_id, m.scope, m.type, m.status, m.content, m.owner_agent_id].join(" "), filters.knowledgeSearch)
      );
      el("memories").innerHTML = visibleMemories.length ? visibleMemories.map((m) =>
        '<div class="item ' + (m.status === "canon" ? "good" : "warn") + '"><h3><code>' + esc(m.memory_id) + '</code> <span class="pill">' + esc(optionLabel(m.status)) + '</span></h3>' +
        '<p class="small">' + esc(optionLabel(m.scope)) + ' · ' + esc(optionLabel(m.type)) + ' · 담당 ' + esc(staffName(m.owner_agent_id)) + '</p>' +
        '<p class="summary">' + esc(short(m.content)) + '</p>' +
        actionsHtml([button("전환 계획", "knowledge-transition-plan", m.path)]) +
        internalLinksHtml([link("기억 원본", m.href)]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 기억 기록이 없습니다.");
      const core = state.workflow_core || {};
      const completion = core.completion || {};
      const verification = core.verification || {};
      const concerns = completion.remaining_concerns || [];
      const warnings = completion.remaining_warnings || [];
      const totalReviewPackets = state.metrics?.review_packets ?? state.review_packets.length;
      const visibleReviewPackets = state.review_packets.length;
      const concernPreview = concerns.slice(0, 8);
      const warningPreview = warnings.slice(0, 6);
      const concernMore = concerns.length > concernPreview.length ? '<li>+' + esc(concerns.length - concernPreview.length) + '개 더 있음</li>' : "";
      const warningMore = warnings.length > warningPreview.length ? '<li>+' + esc(warnings.length - warningPreview.length) + '개 더 있음</li>' : "";
      const decisionStatus = completionDecisionStatusLines(core);
      const decisionActions = completionFollowUpActionItems(core);
      const decisionActionSummary = completionDirectorDecisionSummary(core);
      const activeTask = core.active_task || {};
      const decisionStateLabel = completionDecisionStateLabel(core);
      el("evidenceSummary").innerHTML =
        metric("현재 작업", activeTask.task_id || "없음") +
        metric("감독자 결정", decisionStateLabel) +
        metric("현재 판정", verification.verdict || "없음") +
        metric("참고 보고서", visibleReviewPackets + "개" + (totalReviewPackets > visibleReviewPackets ? " / 전체 " + totalReviewPackets + "개" : ""));
      el("workflowReview").innerHTML =
        '<div class="item ' + (verification.verdict === "CONCERNS" ? "warn" : verification.verdict === "FAIL" ? "danger" : "good") + '"><h3>현재 판정 <span class="pill">' + esc(verification.verdict || "없음") + '</span></h3>' +
        '<p class="summary">' + esc(translateCompletionSummary(completion.summary) || "완료 보고서 요약이 없습니다.") + '</p>' +
        '<p class="small muted">경고 ' + esc(verification.warning_count ?? "-") + ' · 우려 ' + esc(verification.concern_count ?? "-") + '</p>' +
        '<div class="row">' + (verification.href ? '<a href="' + esc(verification.href) + '" target="_blank">검증 보고서</a>' : '') + (completion.href ? '<a href="' + esc(completion.href) + '" target="_blank">완료 보고서</a>' : '') + (completion.card_href ? '<a href="' + esc(completion.card_href) + '" target="_blank">완료 카드</a>' : '') + '</div></div>' +
        '<div class="item ' + (completionNeedsDirectorChoice(core) || completionChangesAlreadyRequested(core) ? "warn" : "good") + '"><h3>감독자 결정 <span class="pill">' + esc(decisionStateLabel) + '</span></h3><p class="summary">' + esc(decisionActionSummary) + '</p>' +
        (decisionStatus.length ? compactListHtml(decisionStatus) : "") +
        actionsHtml(decisionActions) +
        '</div>' +
        (concerns.length ? '<div class="item warn"><h3>우려 사항</h3><p class="summary">완료 전에 사람이 확인해야 하는 신호입니다. 문제가 받아들일 만하면 우려 감수, 고쳐야 하면 수정 요청을 선택합니다.</p><ul class="small">' + concernPreview.map((concern) =>
          '<li><strong>' + esc(explainConcern(concern)) + '</strong><br><span class="muted">' + esc(translateConcernDetail(concern)) + '</span></li>'
        ).join("") + concernMore + '</ul></div>' : '<div class="item good"><h3>표시할 우려 사항 없음</h3><p class="summary">현재 완료 보고서에서 별도 concern 목록을 찾지 못했습니다.</p></div>') +
        (warnings.length ? '<div class="item"><h3>참고 신호</h3><p class="summary">완료 판단을 보조하는 경고입니다. 우려 사항보다 낮은 강도의 확인 항목입니다.</p><ul class="small">' + warningPreview.map((warning) =>
          '<li>' + esc(translateConcernDetail(warning)) + '</li>'
        ).join("") + warningMore + '</ul></div>' : "");
      el("packets").innerHTML = state.review_packets.length ? '<details class="internal-links"><summary>참고용 검토 보고서 ' + esc(visibleReviewPackets) + '개 보기' + (totalReviewPackets > visibleReviewPackets ? ' · 전체 ' + esc(totalReviewPackets) + '개 중 일부' : '') + '</summary><div class="item"><h3>무엇이 들어 있나</h3><p class="summary">직원 보고서와 검토 패킷입니다. 현재 완료 판단이 헷갈릴 때만 열어 보면 됩니다.</p>' + reviewPacketBreakdownHtml(state.review_packets) + '</div><div class="list">' + state.review_packets.map((p) =>
        '<div class="item good"><h3><code>' + esc(p.id) + '</code> <span class="pill">' + esc(reviewPacketRoleLabel(p)) + '</span></h3><p class="muted small">' + esc(p.updated_at) + '</p><a href="' + esc(p.href) + '" target="_blank">검토 보고서 열기</a></div>'
      ).join("") + '</div></details>' : '<p class="muted">검토 보고서가 없습니다.</p>';
    }
    async function refresh() {
      state = await api("/api/summary");
      render();
    }
    async function exportDashboard() {
      log("정적 대시보드를 갱신하는 중입니다.");
      log(await post("/api/dashboard/export", {}));
      await refresh();
    }
    async function submitStudioIntake() {
      const text = el("studioIntakeText").value.trim();
      if (!text) {
        alert("작업 요청을 입력하세요.");
        return;
      }
      if (!confirm("이 요청으로 작업 초안과 작업 목록 항목을 생성할까요? 저위험 작업만 자동 착수됩니다.")) return;
      log("Studio intake 실행 중...");
      log(await post("/api/workflow/intake", { text }));
      el("studioIntakeText").value = "";
      await refresh();
    }
    function goalPayloadFromForm() {
      return {
        goal: fieldValue("goalCreateText"),
        constraints: fieldValue("goalCreateConstraints"),
        target_project_profile: state?.active_project?.project_id || "dustland_custom_cpp_prototype",
      };
    }
    async function previewDirectorGoalPlan() {
      const payload = goalPayloadFromForm();
      if (!payload.goal) return alert("감독자 목표를 입력하세요.");
      const result = await post("/api/studio/director-goal/plan", payload);
      latestGoalPreview = result.director_goal_plan;
      log(result);
      renderDirectorGoals();
    }
    async function storeDirectorGoalPlan() {
      const payload = goalPayloadFromForm();
      if (!payload.goal) return alert("감독자 목표를 입력하세요.");
      if (!confirm("기획안을 저장할까요? 저장만 하며 공식 설정 확정, 소스 수정, task 실행, commit/push는 하지 않습니다.")) return;
      const result = await post("/api/studio/director-goal/store", payload);
      latestGoalPreview = result.director_goal_plan;
      log(result);
      await refresh();
    }
    async function createDirectorGoalBundle() {
      const payload = goalPayloadFromForm();
      if (!payload.goal) return alert("감독자 목표를 입력하세요.");
      if (!confirm("기획안과 회의/업무/제안 후보를 함께 생성할까요? 이 작업은 Studio 기록만 만들고 구현, task 실행, commit/push는 하지 않습니다.")) return;
      const result = await post("/api/studio/director-goal/create-bundle", payload);
      latestGoalPreview = result.director_goal_plan;
      log(result);
      await refresh();
    }
    async function finalizeWorkflow(decision, markDone) {
      const core = state.workflow_core || {};
      const task = core.active_task || {};
      const runner = core.runner || {};
      const completion = core.completion || {};
      const labels = {
        accept: "완료 승인",
        "accept-concerns": "우려 감수 후 완료",
        "request-changes": "수정 요청",
        reject: "반려",
        defer: "판단 보류",
      };
      const effectsByDecision = {
        accept: "검증 결과를 받아들이고 FinalizationLog를 남긴 뒤 Runner를 계속 진행합니다. markDone이면 task done까지 처리합니다. 커밋/푸시는 하지 않습니다.",
        "accept-concerns": "우려 사항을 폐기하지 않습니다. ‘확인했고 감수한다’고 기록한 뒤 완료 흐름을 진행합니다. markDone이면 task done까지 처리합니다. 커밋/푸시는 하지 않습니다.",
        "request-changes": "이 작업은 완료하지 않습니다. 수정이 필요하다는 FinalizationLog만 남기고, 수정용 후속 작업으로 이어가야 합니다.",
        reject: "이 결과를 받아들이지 않는다고 기록합니다. task done, Runner continue, commit/push는 하지 않습니다.",
        defer: "지금은 판단하지 않는다고 기록합니다. task done, Runner continue, commit/push는 하지 않습니다.",
      };
      const effects = effectsByDecision[decision] || "FinalizationLog만 기록합니다. task done, Runner continue, commit/push는 하지 않습니다.";
      if (completionChangesAlreadyRequested(core)) {
        alert("이 완료 보고서는 이미 수정 요청으로 정리되었습니다. 같은 결과를 다시 완료 승인하지 말고, 수정 작업을 진행한 뒤 새 완료 보고서를 확인하세요.");
        return;
      }
      if (decision === "accept" && !completionPlainAcceptAllowed(core)) {
        log({
          ok: false,
          command: "accept-completion",
          stage: "finalization",
          error: "CompletionReport is not ready for accept_completion. Current state: " + (completion.state || completion.readiness || "unknown"),
        });
        return;
      }
      if (!confirm(labels[decision] + "\\n\\n바뀌는 것: " + effects)) return;
      log(await post("/api/workflow/finalize", {
        task_id: task.task_id,
        runner_run_id: runner.runner_run_id,
        completion_report_id: (completion.path || "").split("/").pop().replace(/\\.json$/i, ""),
        decision,
        mark_done: markDone === true,
      }));
      await refresh();
    }
    async function startWorkflowTask(taskId) {
      const core = state.workflow_core || {};
      const task = taskId === core.active_task?.task_id ? core.active_task : (core.backlog?.top_items || []).find((item) => item.id === taskId) || { task_id: taskId };
      const title = task.title || task.item || taskId;
      if (!confirm("이 작업을 현재 작업으로 선택하고 승인 기록 후 PC Runner를 시작할까요?\\n\\n승인 대상: " + title + "\\n\\n바뀌는 것: 현재 작업/작업 목록 승인 기록과 Runner 시작 기록이 생깁니다. 작업 완료 처리, commit, push는 하지 않습니다.")) return;
      log(await post("/api/workflow/task/approve-start", { task_id: taskId }));
      await refresh();
    }
    async function commitSelected(pushAfter = false) {
      const files = selectedGitFiles();
      const message = (fieldValue("gitCommitMessage") || fieldValue("diffGitCommitMessage"));
      if (files.length === 0) {
        alert("커밋할 파일을 선택하세요.");
        return;
      }
      if (!confirm("선택한 " + files.length + "개 파일만 커밋" + (pushAfter ? "+푸시" : "") + "합니다. 선택하지 않은 변경은 그대로 둡니다.")) return;
      log(await post("/api/workflow/git/commit", { files, message, push: pushAfter }));
      await refresh();
    }
    async function pushOnly() {
      if (!confirm("현재 branch를 push할까요? 새 커밋은 만들지 않습니다.")) return;
      log(await post("/api/workflow/git/push", {}));
      await refresh();
    }
    function fieldValue(id) {
      return (el(id)?.value || "").trim();
    }
    async function createMeetingFromForm() {
      const topic = fieldValue("meetingCreateTopic");
      const participants = selectedMeetingParticipants();
      if (!topic) return alert("회의 주제를 입력하세요.");
      if (!participants.length) return alert("참가 직원을 한 명 이상 선택하세요.");
      if (!confirm("새 회의를 저장할까요? 회의 생성은 승인, 공식 설정 확정, 작업 실행을 하지 않습니다.")) return;
      log(await post("/api/studio/meeting/create", {
        topic,
        meeting_type: fieldValue("meetingCreateType") || "creative",
        participants,
        chair_agent_id: fieldValue("meetingCreateChair"),
        agenda: fieldValue("meetingCreateAgenda"),
        known_constraints: fieldValue("meetingCreateConstraints"),
      }));
      await refresh();
    }
    async function addMeetingTurnFromForm() {
      const meetingId = fieldValue("meetingTurnId");
      const speaker = "human_director";
      const content = fieldValue("meetingTurnContent");
      if (!meetingId || !content) return alert("회의 ID와 내 발언 내용을 입력하세요.");
      if (!confirm("내 발언을 회의록에 기록할까요? 이 작업은 승인, 공식 설정 확정, 작업 실행을 하지 않습니다.")) return;
      log(await post("/api/studio/meeting/add-turn", {
        meeting_id: meetingId,
        speaker_id: speaker,
        turn_type: fieldValue("meetingTurnType") || "synthesis",
        content,
      }));
      await refresh();
    }
    async function createWorkOrderFromForm() {
      const objective = fieldValue("workCreateObjective");
      const departmentId = fieldValue("workCreateDepartment");
      const assignedAgents = selectedWorkAgents();
      if (!objective) return alert("업무 지시 목표를 입력하세요.");
      if (!departmentId) return alert("담당 부서를 선택하세요.");
      if (!assignedAgents.length) return alert("담당 직원을 한 명 이상 선택하세요.");
      if (!confirm("새 업무 지시를 저장할까요?\\n\\n저장되는 것: WorkOrder 기록\\n바뀌지 않는 것: task 생성, 직원 실행, 소스 수정, commit/push")) return;
      log(await post("/api/studio/workorder/create", {
        objective,
        department_id: departmentId,
        assigned_agents: assignedAgents,
        status: fieldValue("workCreateStatus") || "director_review",
        scope: fieldValue("workCreateScope"),
        non_goals: fieldValue("workCreateNonGoals"),
        expected_outputs: fieldValue("workCreateOutputs"),
        approval_summary: fieldValue("workCreateApproval"),
        verification_plan: fieldValue("workCreateValidation"),
      }));
      await refresh();
    }
    async function createProposalFromForm() {
      const title = fieldValue("proposalCreateTitle");
      const summary = fieldValue("proposalCreateSummary");
      if (!title || !summary) return alert("제안 제목과 요약을 입력하세요.");
      if (!confirm("새 제안을 저장할까요? 제안은 아이디어이며 공식 결정이나 공식 설정이 아닙니다.")) return;
      log(await post("/api/studio/proposal/create", {
        title,
        source_agent_id: fieldValue("proposalCreateAgent"),
        summary,
        rationale: fieldValue("proposalCreateRationale"),
        risks: fieldValue("proposalCreateRisks"),
      }));
      await refresh();
    }
    async function createDecisionFromForm() {
      const targetRef = fieldValue("decisionCreateTarget");
      const summary = fieldValue("decisionCreateSummary");
      if (!targetRef || !summary) return alert("판단 대상과 판단 내용을 입력하세요.");
      const proposal = proposalById(targetRef);
      const decisionType = fieldValue("decisionCreateType") || "approve";
      if (!proposal) return alert("판단 대상은 제안함에 있는 제안만 선택할 수 있습니다. 회의나 업무 지시는 각 화면의 전용 버튼에서 처리하세요.");
      if (decisionType === "canonize" && !proposalCanBecomeCanon(proposal)) {
        return alert("이 제안은 공식 설정 후보로 남길 수 없습니다. 게임 세계관, 캐릭터, 규칙 같은 게임 설정 제안에만 공식 설정 검토 기록을 사용할 수 있습니다.");
      }
      if (!confirm("Human Director 판단을 저장할까요? 판단 기록은 근거가 되지만 구현/커밋은 하지 않습니다.")) return;
      log(await post("/api/studio/decision/create", {
        target_ref: targetRef,
        decision_type: decisionType,
        decision_summary: summary,
        accepted_scope: fieldValue("decisionCreateAccepted"),
        rejected_scope: fieldValue("decisionCreateRejected"),
        conditions: fieldValue("decisionCreateConditions"),
      }));
      await refresh();
    }
    async function createMemoryFromForm() {
      const content = fieldValue("memoryCreateContent");
      if (!content) return alert("기억할 내용을 입력하세요.");
      if (!confirm("기억 기록을 저장할까요? 공식 설정 상태로 저장하면 이후 AI 직원들이 확정 설정처럼 참고합니다.")) return;
      log(await post("/api/studio/memory/create", {
        scope: fieldValue("memoryCreateScope") || "project",
        type: fieldValue("memoryCreateType") || "fact",
        status: fieldValue("memoryCreateStatus") || "proposed",
        owner_agent_id: fieldValue("memoryCreateOwner"),
        content,
        source_refs: fieldValue("memoryCreateRefs"),
      }));
      await refresh();
    }
    function toolRunPayloadFromForm() {
      return {
        tool_adapter_id: fieldValue("toolRunCreateAdapter"),
        permission_class: fieldValue("toolRunCreatePermission") || "read",
        requester_type: fieldValue("toolRunCreateRequesterType") || "human_director",
        requester_ref: fieldValue("toolRunCreateRequesterRef") || "studio-console",
        requested_action: fieldValue("toolRunCreateAction"),
        purpose: fieldValue("toolRunCreatePurpose"),
        input_refs: fieldValue("toolRunCreateInputs"),
        expected_outputs: fieldValue("toolRunCreateOutputs"),
        evidence_requirements: fieldValue("toolRunCreateEvidence"),
      };
    }
    async function planToolRunFromForm() {
      const payload = toolRunPayloadFromForm();
      if (!payload.tool_adapter_id || !payload.requested_action || !payload.purpose) {
        return alert("도구, 요청 행동, 목적은 필수입니다.");
      }
      log(await post("/api/studio/toolrun/plan", payload));
    }
    async function createToolRunFromForm() {
      const payload = toolRunPayloadFromForm();
      if (!payload.tool_adapter_id || !payload.requested_action || !payload.purpose) {
        return alert("도구, 요청 행동, 목적은 필수입니다.");
      }
      if (!confirm("도구 요청서를 저장할까요? 이것은 도구 실행이 아니라 실행 전 검토 요청서입니다.")) return;
      log(await post("/api/studio/toolrun/create", payload));
      await refresh();
    }
    async function runAction(action, filePath, decision) {
      if (action === "handoff-plan") return log(await post("/api/handoff/plan", { path:filePath }));
      if (action === "handoff-execute") {
        if (!confirm("서명된 Codex 직원 실행을 시작할까요? 결과는 _Temp에 기록되고 소스/작업/공식 설정/git은 변경하지 않습니다.")) return;
        log(await post("/api/handoff/execute", { path:filePath, model:"gpt-5.5", reasoning:"high" }));
      }
      if (action === "materialize-plan") return log(await post("/api/output/materialize-plan", { path:filePath }));
      if (action === "materialize") {
        if (!confirm("이 직원 보고서에서 아이디어 제안, 프로젝트 기억, 업무 지시, 직원 인수인계 후보만 뽑아 '채택 후보'로 넘길까요?\\n\\n바뀌는 것: Studio 채택 후보 파일이 생깁니다.\\n바뀌지 않는 것: 공식 설정 확정, task 생성/실행, 소스 수정, commit/push는 하지 않습니다.")) return;
        log(await post("/api/output/materialize", { path:filePath }));
        await refresh();
        return;
      }
      if (action === "staff-run-cleanup") {
        if (!confirm("이 임시 직원 보고서를 목록에서 정리할까요?\\n\\n삭제되는 것: _Temp 아래의 해당 직원 실행 기록과 보고서 JSON\\n바뀌지 않는 것: 소스, task, 공식 설정, commit/push")) return;
        log(await post("/api/studio/staff-run/cleanup", { path:filePath }));
        await refresh();
        return;
      }
      if (action === "review-packet-export") {
        log(await post("/api/review-packet/export", { path:filePath }));
        await refresh();
      }
      if (action === "decision-plan") return log(await post("/api/materialization/review-plan", { path:filePath, decision:"approve" }));
      if (action.startsWith("decision-")) {
        if (!confirm("이 채택 후보에 대한 Human Director 결정 기록을 남길까요? 이후 실행 승인은 별도입니다.")) return;
        log(await post("/api/materialization/review-record", { path:filePath, decision:decision || "approve", reason:"StudioConsole" }));
        await refresh();
      }
      if (action === "workorder-plan") return log(await post("/api/workorder/plan", { path:filePath }));
      if (action === "workorder-create") {
        if (!confirm("이 업무 지시를 작업 목록에 넣을까요? 작업 실행 승인과 Runner 시작은 별도입니다.")) return;
        log(await post("/api/workorder/create", { path:filePath }));
        await refresh();
      }
      if (action === "automation-status") return log(await post("/api/automation/status", {}));
      if (action === "automation-validate") return log(await post("/api/automation/validate", {}));
      if (action === "automation-test") return log(await post("/api/automation/test", {}));
      if (action === "automation-test-write") {
        if (!confirm("정책 테스트 결과를 _Temp 평가 기록으로 남길까요? 워크플로우 상태, 소스, git은 바꾸지 않습니다.")) return;
        log(await post("/api/automation/test-write", {}));
        await refresh();
      }
      if (action === "automation-replay") return log(await post("/api/automation/replay", { path:filePath }));
      if (action === "automation-repair") return log(await post("/api/automation/repair", { path:filePath }));
      if (action === "meeting-inspect") return log(await post("/api/meeting/inspect", { path:filePath }));
      if (action === "meeting-handoff") return log(await post("/api/meeting/handoff", { path:filePath }));
      if (action === "meeting-start") {
        if (!confirm("이 회의를 시작 상태로 바꿀까요? 회의 시작은 작업 실행이나 공식 설정 확정이 아닙니다.")) return;
        log(await post("/api/meeting/start", { meeting_id:filePath }));
        await refresh();
      }
      if (action === "meeting-finalize") {
        if (!confirm("이 회의를 종료 상태로 닫을까요? 결정, 공식 설정, 작업 생성은 별도 gate에서 처리합니다.")) return;
        log(await post("/api/meeting/finalize", { meeting_id:filePath }));
        await refresh();
      }
      if (action === "meeting-create") {
        if (!confirm("이 회의를 Studio 저장소에 기록할까요? 저장만 하며 실행이나 공식 설정 확정은 하지 않습니다.")) return;
        log(await post("/api/meeting/create", { path:filePath }));
        await refresh();
      }
      if (action === "meeting-create-workorder") {
        if (!confirm("이 회의에서 나온 해야 할 일을 업무 지시 후보로 저장할까요? 구현, task 생성, 승인, 실행은 아직 하지 않습니다.")) return;
        log(await post("/api/studio/meeting/create-workorder", { path:filePath }));
        await refresh();
      }
      if (action === "meeting-create-decision") {
        if (!confirm("이 회의에서 정한 결론이나 방향을 감독자 결정함에 남길까요? 공식 설정 확정, 구현, task 생성은 별도입니다.")) return;
        log(await post("/api/studio/meeting/create-decision", { path:filePath, decision_type:"approve" }));
        await refresh();
      }
      if (action === "meeting-board") return log(await post("/api/studio/meeting/board", { path:filePath }));
      if (action === "meeting-facilitation-plan") return log(await post("/api/studio/meeting/facilitation-plan", { path:filePath }));
      if (action === "meeting-runbook") return log(await post("/api/studio/meeting/runbook", { path:filePath }));
      if (action === "meeting-agent-plan") return log(await post("/api/studio/meeting/agent-turn-plan", { path:filePath, model:"gpt-5.5", reasoning:"high" }));
      if (action === "meeting-agent-run") {
        if (!confirm("다음 AI 발언을 받을까요? Codex 직원 실행을 호출하고, 결과 요약을 새 회의 발언으로 추가합니다. 결정/공식 설정/task/git은 변경하지 않습니다.")) return;
        log(await post("/api/studio/meeting/agent-turn-run", { path:filePath, model:"gpt-5.5", reasoning:"high" }));
        await refresh();
      }
      if (action === "proposal-approve" || action === "proposal-canonize" || action === "proposal-request-changes" || action === "proposal-reject") {
        const decisionType = action === "proposal-canonize" ? "canonize" : action === "proposal-request-changes" ? "request_changes" : action === "proposal-reject" ? "reject" : "approve";
        const proposal = asArray(state.proposals).find((item) => item.path === filePath);
        if (decisionType === "canonize" && !proposalCanBecomeCanon(proposal)) {
          return alert("이 제안은 공식 설정 후보로 남길 수 없습니다. 공식 설정 검토 기록은 게임 세계관, 캐릭터, 규칙 같은 게임 설정 제안에만 사용할 수 있습니다.");
        }
        if (!confirm("이 제안에 대한 감독자 판단을 기록할까요? 기록만 남기며, 작업 실행과 commit/push는 하지 않습니다.")) return;
        log(await post("/api/studio/proposal/create-decision", { path:filePath, decision_type:decisionType }));
        await refresh();
      }
      if (action === "knowledge-transition-plan") return log(await post("/api/studio/knowledge/transition-plan", { path:filePath }));
      if (action === "canon-conflict-report") return log(await post("/api/studio/knowledge/canon-conflict-report", {}));
      if (action === "decision-create-memory" || action === "decision-create-canon") {
        const status = action === "decision-create-canon" ? "canon" : "approved";
        const decision = asArray(state.decisions).find((item) => item.path === filePath);
        if (action === "decision-create-canon" && !decisionCanCreateCanon(decision)) {
          return alert("이 결정은 공식 설정으로 저장할 수 없습니다. 공식 설정 저장은 게임 세계관, 캐릭터, 규칙 같은 게임 설정 제안에 대한 공식 설정 검토 기록에만 사용할 수 있습니다.");
        }
        const message = action === "decision-create-canon"
          ? "이 결정을 공식 설정으로 저장할까요? 이후 Studio 직원들이 확정 설정처럼 참고합니다."
          : "이 결정을 AI 직원 참고 기록으로 저장할까요? 공식 설정으로 확정되지는 않습니다.";
        if (!confirm(message)) return;
        log(await post("/api/studio/decision/create-memory", { path:filePath, status }));
        await refresh();
      }
      if (action === "workorder-handoff-plan") return log(await post("/api/studio/workorder/handoff-plan", { path:filePath }));
      if (action === "workorder-context-plan") return log(await post("/api/studio/workorder/context-plan", { path:filePath }));
      if (action === "workorder-context-create") {
        if (!confirm("이 업무 지시를 담당 직원용 실행 자료로 저장할까요? 직원 실행은 아직 시작하지 않습니다.")) return;
        log(await post("/api/studio/workorder/context-create", { path:filePath }));
        await refresh();
      }
      if (action === "workorder-staff-plan") return log(await post("/api/studio/workorder/staff-plan", { path:filePath, model:"gpt-5.5", reasoning:"high" }));
      if (action === "workorder-staff-run") {
        if (!confirm("선택한 업무 지시를 담당 AI 직원에게 맡길까요? Codex CLI를 호출하며 결과는 _Temp 검증 자료로 남습니다. 소스/작업/공식 설정/git은 직접 변경하지 않습니다.")) return;
        log(await post("/api/studio/workorder/staff-run", { path:filePath, model:"gpt-5.5", reasoning:"high" }));
        await refresh();
      }
      if (action === "toolrun-plan") return log(await post("/api/studio/toolrun/plan-file", { path:filePath }));
      if (action === "model-routing-plan") return log(await post("/api/studio/model/routing-plan", {}));
      if (action === "project-execution-plan") return log(await post("/api/studio/project/execution-plan", {}));
      if (action === "completion-evidence-checklist") return log(await post("/api/studio/completion/evidence-checklist", {}));
      if (action === "completion-decision-plan") return log(await post("/api/studio/completion/decision-plan", {}));
      if (action === "completion-create-fix-workorder") {
        if (!confirm("이 완료 보고서의 수정 요청을 새 업무 지시로 만들까요?\\n\\n바뀌는 것: Studio WorkOrder 기록이 생깁니다.\\n바뀌지 않는 것: 소스 수정, task 생성/완료, commit/push")) return;
        const result = await post("/api/studio/completion/create-fix-workorder", {});
        await refresh();
        setPage("work");
        writeResult(formatGenericLogObject(result));
        return;
      }
      if (action === "approval-impact-plan") return log(await post("/api/studio/approval/impact-plan", {}));
      if (action === "automation-readiness-plan") return log(await post("/api/studio/automation/readiness-plan", {}));
      if (action === "traceability-map") return log(await post("/api/studio/traceability/map", {}));
      if (action === "studio-surface-map") return log(await post("/api/studio/ui/surface-map", {}));
      if (action === "studio-recovery-plan") return log(await post("/api/studio/recovery/plan", {}));
      if (action === "studio-eval-plan") return log(await post("/api/studio/smoke/eval-plan", {}));
      if (action === "studio-smoke-status") return log(await post("/api/studio/smoke/status", {}));
      if (action === "company-runtime-readiness") return log(await post("/api/studio/company/runtime-readiness", {}));
      if (action === "staff-operating-plan") return log(await post("/api/studio/staff/operating-plan", { agent_id:filePath }));
    }
    document.addEventListener("click", (event) => {
      const referenceToggle = event.target.closest("#referenceNavToggle");
      if (referenceToggle) {
        event.preventDefault();
        setReferenceNavVisible(el("referenceNav").hidden);
        return;
      }
      const organizationToggle = event.target.closest("#organizationNavToggle");
      if (organizationToggle) {
        event.preventDefault();
        setOrganizationNavVisible(el("organizationNav").hidden);
        return;
      }
      const internalToggle = event.target.closest("#internalNavToggle");
      if (internalToggle) {
        event.preventDefault();
        setInternalNavVisible(el("internalNav").hidden);
        return;
      }
      const startTarget = event.target.closest("button[data-workflow-start]");
      if (startTarget) {
        startWorkflowTask(startTarget.dataset.workflowStart).catch(log);
        return;
      }
      const finalizeTarget = event.target.closest("button[data-workflow-finalize]");
      if (finalizeTarget) {
        finalizeWorkflow(finalizeTarget.dataset.workflowFinalize, finalizeTarget.dataset.markDone === "true").catch(log);
        return;
      }
      const target = event.target.closest("button[data-action]");
      if (target) {
        runAction(target.dataset.action, target.dataset.path, target.dataset.decision).catch(log);
        return;
      }
      const toolboxTarget = event.target.closest("button[data-toolbox-run]");
      if (toolboxTarget) {
        if (toolboxTarget.dataset.confirm && !confirm(toolboxTarget.dataset.confirm)) return;
        post("/api/toolbox/run", { tool_id:toolboxTarget.dataset.toolboxRun }).then(log).catch(log);
        return;
      }
      const toolboxPublishTarget = event.target.closest("button[data-toolbox-publish]");
      if (toolboxPublishTarget) {
        const input = el("toolboxDataVersion");
        const dataVersion = String(input?.value || "").trim();
        if (!dataVersion || !/^[0-9A-Za-z._-]{1,80}$/.test(dataVersion)) {
          alert("배포 버전은 비워둘 수 없고, 영문/숫자/점/밑줄/하이픈만 사용할 수 있습니다.");
          return;
        }
        const confirmed = confirm(
          "팀 데이터 배포를 실행할까요?\\n\\n" +
          "배포 버전: " + dataVersion + "\\n\\n" +
          "진행 내용:\\n" +
          "- PlayGround/Data 원본 검증\\n" +
          "- 배포 zip 생성 및 추출본 재검증\\n" +
          "- versioned zip 업로드\\n" +
          "- 기존 latest manifest 백업\\n" +
          "- latest manifest 마지막 갱신\\n\\n" +
          "소스, task, git은 바꾸지 않습니다."
        );
        if (!confirmed) return;
        const previousLabel = toolboxPublishTarget.textContent;
        toolboxPublishTarget.disabled = true;
        toolboxPublishTarget.textContent = "배포 중...";
        log("팀 데이터 배포를 시작했습니다. 완료되면 성공/실패 알림을 띄웁니다.");
        post("/api/toolbox/run", { tool_id:toolboxPublishTarget.dataset.toolboxPublish, data_version:dataVersion })
          .then((result) => {
            log(result);
            notifyTeamDataPublish(result);
          })
          .catch((error) => {
            log(error);
            notifyTeamDataPublish(error);
          })
          .finally(() => {
            toolboxPublishTarget.disabled = false;
            toolboxPublishTarget.textContent = previousLabel || "배포 실행";
          });
        return;
      }
      const meetingPresetTarget = event.target.closest("button[data-meeting-preset]");
      if (meetingPresetTarget) {
        applyMeetingPreset(meetingPresetTarget.dataset.meetingPreset);
        return;
      }
      const navTarget = event.target.closest("button[data-nav], button[data-nav-jump]");
      if (navTarget) {
        setPage(navTarget.dataset.nav || navTarget.dataset.navJump);
        return;
      }
      const departmentTarget = event.target.closest("button[data-filter-department]");
      if (departmentTarget) {
        const page = departmentTarget.dataset.targetPage || "staff";
        if (page === "staff") filters.staffDepartment = departmentTarget.dataset.filterDepartment;
        if (page === "work") filters.workDepartment = departmentTarget.dataset.filterDepartment;
        setPage(page);
        render();
        return;
      }
      const agentTarget = event.target.closest("button[data-filter-agent]");
      if (agentTarget) {
        filters.runSearch = agentTarget.dataset.filterAgent;
        setPage(agentTarget.dataset.targetPage || "runs");
        render();
        return;
      }
      const meetingTurnTarget = event.target.closest("button[data-meeting-turn]");
      if (meetingTurnTarget) {
        el("meetingTurnId").value = meetingTurnTarget.dataset.meetingTurn;
        el("meetingTurnSpeaker").value = "human_director";
        setPage("meetings");
        writeResult('<div class="item"><h3>내 의견 기록 준비</h3><p class="summary">선택한 회의 ID를 입력칸에 넣었습니다. 내용을 적고 <strong>내 의견 기록</strong>을 누르면 Human Director 의견으로 회의록에 저장됩니다.</p><ul class="small"><li>AI 직원에게 보내는 메시지가 아니라 회의록에 남기는 내 의견입니다.</li><li>공식 설정 확정 없음</li><li>task 생성 없음</li><li>git 변경 없음</li></ul></div>');
        el("meetingTurnContent").focus();
        el("meetingTurnId").scrollIntoView({ behavior:"smooth", block:"center" });
        return;
      }
      const toolRunAdapterTarget = event.target.closest("button[data-toolrun-adapter]");
      if (toolRunAdapterTarget) {
        el("toolRunCreateAdapter").value = toolRunAdapterTarget.dataset.toolrunAdapter;
        setPage("systems");
        return;
      }
      const clearTarget = event.target.closest("button[data-clear-filter]");
      if (clearTarget) {
        const scope = clearTarget.dataset.clearFilter;
        if (scope === "staff") { filters.staffSearch = ""; filters.staffDepartment = ""; }
        if (scope === "runs") { filters.runSearch = ""; filters.runStatus = ""; }
        if (scope === "work") { filters.workSearch = ""; filters.workDepartment = ""; }
        render();
      }
    });
    document.addEventListener("change", (event) => {
      if (event.target.matches("#meetingCreateType")) {
        renderMeetingTypeHelp();
        updateMeetingCreateImpact();
        return;
      }
      if (event.target.matches("input[data-meeting-participant]")) {
        syncMeetingChairOptions();
        return;
      }
      if (event.target.matches("#meetingCreateChair")) {
        updateMeetingCreateImpact();
      }
      if (event.target.matches("#workCreateDepartment")) {
        renderWorkAgentPicker([]);
        return;
      }
      if (event.target.matches("#workCreateStatus")) {
        renderWorkStatusHelp();
        updateWorkCreateImpact();
        return;
      }
      if (event.target.matches("input[data-work-agent]")) {
        updateWorkCreateImpact();
        return;
      }
    });
    el("studioIntakeSubmit").addEventListener("click", () => submitStudioIntake().catch(log));
    document.querySelectorAll("button[data-goal-sample]").forEach((buttonEl) => {
      buttonEl.addEventListener("click", () => {
        el("goalCreateText").value = buttonEl.dataset.goalSample || "";
        el("goalCreateConstraints").value = buttonEl.dataset.goalConstraints || "";
      });
    });
    el("goalPlanSubmit").addEventListener("click", () => previewDirectorGoalPlan().catch(log));
    el("goalStoreSubmit").addEventListener("click", () => storeDirectorGoalPlan().catch(log));
    el("goalBundleSubmit").addEventListener("click", () => createDirectorGoalBundle().catch(log));
    el("gitSelectWorkflow").addEventListener("click", () => {
      document.querySelectorAll("input[data-git-file]").forEach((input) => { input.checked = isWorkflowPath(input.dataset.gitFile); });
    });
    el("gitClearSelection").addEventListener("click", () => {
      document.querySelectorAll("input[data-git-file]").forEach((input) => { input.checked = false; });
    });
    el("gitCommitSelected").addEventListener("click", () => commitSelected(false).catch(log));
    el("gitCommitPushSelected").addEventListener("click", () => commitSelected(true).catch(log));
    el("gitPushOnly").addEventListener("click", () => pushOnly().catch(log));
    el("diffGitSelectWorkflow").addEventListener("click", () => {
      document.querySelectorAll("input[data-git-file]").forEach((input) => { input.checked = isWorkflowPath(input.dataset.gitFile); });
    });
    el("diffGitClearSelection").addEventListener("click", () => {
      document.querySelectorAll("input[data-git-file]").forEach((input) => { input.checked = false; });
    });
    el("diffGitCommitSelected").addEventListener("click", () => commitSelected(false).catch(log));
    el("diffGitCommitPushSelected").addEventListener("click", () => commitSelected(true).catch(log));
    el("meetingCreateSubmit").addEventListener("click", () => createMeetingFromForm().catch(log));
    el("meetingTurnSubmit").addEventListener("click", () => addMeetingTurnFromForm().catch(log));
    el("meetingResultClose").addEventListener("click", () => { el("meetingResultPanel").hidden = true; });
    el("globalResultClose").addEventListener("click", () => { el("globalResultPanel").hidden = true; });
    el("workCreateSubmit").addEventListener("click", () => createWorkOrderFromForm().catch(log));
    el("proposalCreateSubmit").addEventListener("click", () => createProposalFromForm().catch(log));
    el("decisionCreateSubmit").addEventListener("click", () => createDecisionFromForm().catch(log));
    el("memoryCreateSubmit").addEventListener("click", () => createMemoryFromForm().catch(log));
    el("toolRunPlanSubmit").addEventListener("click", () => planToolRunFromForm().catch(log));
    el("toolRunCreateSubmit").addEventListener("click", () => createToolRunFromForm().catch(log));
    function bindFilter(id, key) {
      el(id).addEventListener("input", (event) => { filters[key] = event.target.value; render(); });
      el(id).addEventListener("change", (event) => { filters[key] = event.target.value; render(); });
    }
    bindFilter("departmentSearch", "departmentSearch");
    bindFilter("staffSearch", "staffSearch");
    bindFilter("staffDepartmentFilter", "staffDepartment");
    bindFilter("meetingSearch", "meetingSearch");
    bindFilter("meetingStatusFilter", "meetingStatus");
    bindFilter("runSearch", "runSearch");
    bindFilter("runStatusFilter", "runStatus");
    bindFilter("workSearch", "workSearch");
    bindFilter("workDepartmentFilter", "workDepartment");
    bindFilter("knowledgeSearch", "knowledgeSearch");
    bindFilter("proposalDecisionFilter", "proposalDecision");
    bindFilter("memoryStatusFilter", "memoryStatus");
    el("decisionCreateTarget").addEventListener("change", () => syncDecisionTypeOptions());
    el("refresh").addEventListener("click", () => refresh().catch(log));
    el("export-dashboard").addEventListener("click", () => exportDashboard().catch(log));
    setPage((location.hash || "").replace("#", "") || "home");
    window.addEventListener("hashchange", () => setPage((location.hash || "").replace("#", "") || "home"));
    refresh().catch(log);
  </script>
</body>
</html>`;
}

module.exports = {
  directorConsoleHtml,
};

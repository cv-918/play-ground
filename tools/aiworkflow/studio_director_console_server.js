#!/usr/bin/env node
"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 47831;

function parseArgs(argv) {
  const result = {
    repoRoot: path.resolve(__dirname, "..", ".."),
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    once: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--repo-root") {
      i += 1;
      result.repoRoot = path.resolve(argv[i]);
    } else if (arg === "--host") {
      i += 1;
      result.host = argv[i];
    } else if (arg === "--port") {
      i += 1;
      result.port = Number(argv[i]);
    } else if (arg === "--once") {
      result.once = true;
    } else if (arg === "--json") {
      result.json = true;
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(result.port) || result.port < 1 || result.port > 65535) {
    throw new Error(`Invalid --port: ${result.port}`);
  }
  if (result.host !== "127.0.0.1" && result.host !== "localhost") {
    throw new Error("Studio Director Console is local-only. Use --host 127.0.0.1 or --host localhost.");
  }

  return result;
}

function slash(value) {
  return String(value || "").replace(/\\/g, "/");
}

function repoPath(repoRoot, relativePath) {
  return path.resolve(repoRoot, relativePath);
}

function toRepoRelative(repoRoot, fullPath) {
  return slash(path.relative(repoRoot, fullPath));
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function safeResolveReadable(repoRoot, relativePath) {
  const clean = String(relativePath || "");
  if (!clean.trim()) {
    throw new Error("Missing path.");
  }

  const resolved = path.resolve(repoRoot, clean);
  const allowedRoots = [
    repoPath(repoRoot, "_Docs/AIWorkflow/Studio"),
    repoPath(repoRoot, "_Temp/AIWorkflowStudio"),
  ];

  if (!allowedRoots.some((root) => isInside(root, resolved))) {
    throw new Error(`Path is outside allowed Studio read roots: ${clean}`);
  }

  return resolved;
}

async function readJsonIfExists(filePath) {
  try {
    const text = await fsp.readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function listFiles(root, predicate) {
  const result = [];

  async function walk(current) {
    let entries = [];
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (!predicate || predicate(full, entry.name)) {
        result.push(full);
      }
    }
  }

  await walk(root);
  return result;
}

async function countJsonFiles(dir) {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

async function getReviewPackets(repoRoot) {
  const dir = repoPath(repoRoot, "_Temp/AIWorkflowStudio/review_packets");
  let entries = [];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
    const full = path.join(dir, entry.name);
    const stat = await fsp.stat(full);
    items.push({
      id: path.basename(entry.name, ".html"),
      path: toRepoRelative(repoRoot, full),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, full))}`,
      updated_at: stat.mtime.toISOString(),
    });
  }
  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function getStaffRuns(repoRoot) {
  const root = repoPath(repoRoot, "_Temp/AIWorkflowStudio/staff_runs");
  const files = await listFiles(root, (_full, name) => name === "staff_run.json");
  const items = [];

  for (const file of files) {
    const json = await readJsonIfExists(file);
    if (!json) continue;
    const stat = await fsp.stat(file);
    const outputPath = json.role_run_output_path || "";
    const exitCode = Number.isFinite(Number(json.exit_code)) ? Number(json.exit_code) : null;
    items.push({
      role_run_id: json.role_run_id || "",
      context_packet_id: json.context_packet_id || "",
      agent_id: json.agent_id || "",
      model: json.model || "",
      reasoning: json.reasoning || "",
      exit_code: exitCode,
      output_validation_ok: Boolean(json.output_validation_ok),
      status: Boolean(json.output_validation_ok) ? "valid_output" : exitCode === 0 ? "completed" : "failed",
      staff_run_path: toRepoRelative(repoRoot, file),
      output_path: outputPath,
      output_href: outputPath ? `/file?path=${encodeURIComponent(outputPath)}` : "",
      updated_at: stat.mtime.toISOString(),
    });
  }

  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function getHandoffCandidates(repoRoot) {
  const roots = [
    repoPath(repoRoot, "_Docs/AIWorkflow/Studio/Handoffs"),
    repoPath(repoRoot, "_Docs/AIWorkflow/Studio/Examples"),
  ];
  const files = [];
  for (const root of roots) {
    files.push(...(await listFiles(root, (_full, name) => name.endsWith(".json"))));
  }

  const seen = new Set();
  const items = [];
  for (const file of files) {
    if (seen.has(file)) continue;
    seen.add(file);
    const json = await readJsonIfExists(file);
    if (!json || !json.handoff_id) continue;
    items.push({
      handoff_id: json.handoff_id,
      from_agent_id: json.from_agent_id || "",
      to_agent_id: json.to_agent_id || "",
      reason: json.reason || "",
      status: json.status || "",
      path: toRepoRelative(repoRoot, file),
    });
  }

  return items.sort((a, b) => a.handoff_id.localeCompare(b.handoff_id));
}

async function getSummary(repoRoot) {
  const studioRoot = repoPath(repoRoot, "_Docs/AIWorkflow/Studio");
  const registry = (await readJsonIfExists(path.join(studioRoot, "Registries", "staff_agents.initial.json"))) || {};
  const toolRegistry = (await readJsonIfExists(path.join(studioRoot, "Registries", "tool_adapters.initial.json"))) || {};
  const reviewPackets = await getReviewPackets(repoRoot);
  const staffRuns = await getStaffRuns(repoRoot);
  const handoffs = await getHandoffCandidates(repoRoot);

  const stores = {
    work_orders: await countJsonFiles(path.join(studioRoot, "WorkOrders")),
    proposals: await countJsonFiles(path.join(studioRoot, "Proposals")),
    decisions: await countJsonFiles(path.join(studioRoot, "Decisions")),
    memories: await countJsonFiles(path.join(studioRoot, "MemoryRecords")),
    meetings: await countJsonFiles(path.join(studioRoot, "MeetingSessions")),
    context_packets: await countJsonFiles(path.join(studioRoot, "ContextPackets")),
    role_runs: await countJsonFiles(path.join(studioRoot, "RoleRuns")),
    materializations: await countJsonFiles(path.join(studioRoot, "Materializations")),
    task_bindings: await countJsonFiles(path.join(studioRoot, "TaskBindings")),
  };

  return {
    ok: true,
    repo_root: repoRoot,
    generated_at: new Date().toISOString(),
    metrics: {
      departments: 8,
      staff: Array.isArray(registry.staff_agents) ? registry.staff_agents.length : 0,
      planned_staff: Array.isArray(registry.planned_staff_agents) ? registry.planned_staff_agents.length : 0,
      tool_adapters: Array.isArray(toolRegistry.tool_adapters) ? toolRegistry.tool_adapters.length : 0,
      review_packets: reviewPackets.length,
      staff_runs: staffRuns.length,
      handoffs: handoffs.length,
      ...stores,
    },
    handoffs,
    recent_staff_runs: staffRuns.slice(0, 12),
    review_packets: reviewPackets.slice(0, 12),
    safety: {
      server_changes_state_by_itself: false,
      button_actions_are_allowlisted: true,
      default_llm_route: "signed-in Codex App/CLI, not OpenAI API billing",
      blocked_actions: ["approve work", "create Backlog tasks", "write canon", "modify source files", "commit", "push"],
    },
  };
}

function quoteCmd(value) {
  const text = String(value);
  if (!/[ \t&()^|<>"]/u.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function runTool(repoRoot, command, args, timeoutMs = 20 * 60 * 1000) {
  return new Promise((resolve) => {
    const isWindowsBatch = process.platform === "win32" && /\.(bat|cmd)$/i.test(command);
    const executable = isWindowsBatch ? "cmd.exe" : command;
    const finalArgs = isWindowsBatch
      ? ["/d", "/s", "/c", [quoteCmd(command), ...args.map(quoteCmd)].join(" ")]
      : args;

    const child = spawn(executable, finalArgs, {
      cwd: repoRoot,
      windowsHide: true,
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      stderr += `\nProcess timed out after ${timeoutMs} ms.`;
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, exit_code: null, stdout, stderr: `${stderr}\n${error.message}`, json: null });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      let parsed = null;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        parsed = null;
      }
      resolve({
        ok: code === 0 && (!parsed || parsed.ok !== false),
        exit_code: code,
        stdout,
        stderr,
        json: parsed,
      });
    });
  });
}

async function readRequestJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function sendHtml(res, html) {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(html);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".md") return "text/markdown; charset=utf-8";
  if (ext === ".log" || ext === ".txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

async function serveFile(repoRoot, res, fileParam) {
  const full = safeResolveReadable(repoRoot, fileParam || "");
  const data = await fsp.readFile(full);
  res.writeHead(200, {
    "content-type": contentType(full),
    "cache-control": "no-store",
  });
  res.end(data);
}

function dashboardHtml() {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AIWorkflow Studio Director Console</title>
  <style>
    :root {
      color-scheme: dark;
      --bg:#101319;
      --panel:#1b202a;
      --panel2:#242b37;
      --line:#3a4353;
      --text:#edf1f7;
      --muted:#aeb8c7;
      --accent:#79a9ff;
      --good:#28a564;
      --warn:#f0b84d;
      --danger:#ff6464;
    }
    * { box-sizing: border-box; }
    body { margin:0; font-family:"Segoe UI", system-ui, sans-serif; background:var(--bg); color:var(--text); line-height:1.45; }
    header { padding:22px 18px; background:#171b23; border-bottom:1px solid var(--line); }
    main { max-width:1180px; margin:0 auto; padding:18px; }
    h1 { margin:0 0 6px; font-size:26px; letter-spacing:0; }
    h2 { margin:0 0 10px; font-size:18px; letter-spacing:0; }
    h3 { margin:0 0 6px; font-size:15px; letter-spacing:0; }
    p { margin:6px 0; }
    button, select, input { font:inherit; }
    button { border:0; border-radius:7px; padding:8px 11px; color:white; background:#4f6cff; cursor:pointer; }
    button.secondary { background:#2f3747; }
    button.good { background:#168b4f; }
    button.warn { background:#a56d10; }
    button:disabled { opacity:.55; cursor:not-allowed; }
    code { background:#12151c; border:1px solid var(--line); border-radius:5px; padding:1px 5px; }
    a { color:#c6d8ff; text-decoration:none; }
    a:hover { text-decoration:underline; }
    .muted { color:var(--muted); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px; margin:14px 0; }
    .card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:14px; }
    .metric { font-size:28px; font-weight:700; }
    .row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .pill { display:inline-block; border:1px solid var(--line); border-radius:999px; background:var(--panel2); color:var(--muted); padding:2px 7px; font-size:12px; }
    .list { display:grid; gap:10px; }
    .item { background:var(--panel2); border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:7px; padding:11px; }
    .item.warn { border-left-color:var(--warn); }
    .item.good { border-left-color:var(--good); }
    .item.danger { border-left-color:var(--danger); }
    .small { font-size:13px; }
    pre { white-space:pre-wrap; word-break:break-word; background:#0f1218; border:1px solid var(--line); border-radius:8px; padding:12px; max-height:360px; overflow:auto; }
    @media (max-width: 720px) { main { padding:12px; } h1 { font-size:22px; } .metric { font-size:24px; } }
  </style>
</head>
<body>
  <header>
    <h1>AIWorkflow Studio Director Console</h1>
    <p class="muted">로컬 전용 감독자 콘솔입니다. 버튼은 허용된 Studio 도구만 호출하며, 승인/캐논/소스/커밋 권한은 가지지 않습니다.</p>
  </header>
  <main>
    <section class="card">
      <div class="row">
        <button id="refresh">새로고침</button>
        <button id="export-dashboard" class="secondary">정적 대시보드 갱신</button>
        <span id="stamp" class="muted"></span>
      </div>
    </section>
    <section id="metrics" class="grid"></section>
    <section class="grid">
      <div class="card">
        <h2>감독자 Inbox</h2>
        <p class="muted">지금 볼 만한 handoff, 직원 실행 결과, 리뷰 패킷을 한 곳에 모읍니다.</p>
        <div id="inbox" class="list"></div>
      </div>
      <div class="card">
        <h2>Handoff 실행</h2>
        <p class="muted">직원 간 인수인계 후보입니다. “계획 보기”는 안전한 미리보기이고, “직원 실행”은 서명된 Codex CLI를 호출합니다.</p>
        <div id="handoffs" class="list"></div>
      </div>
    </section>
    <section class="grid">
      <div class="card">
        <h2>리뷰 패킷</h2>
        <p class="muted">AI 직원 산출물을 사람이 읽기 좋게 정리한 HTML입니다.</p>
        <div id="packets" class="list"></div>
      </div>
      <div class="card">
        <h2>안전 경계</h2>
        <div class="list">
          <div class="item good">
            <h3>콘솔이 혼자 하지 않는 일</h3>
            <p class="small">task 생성, 승인, 캐논 기록, 소스 수정, 커밋, 푸시는 실행하지 않습니다.</p>
          </div>
          <div class="item warn">
            <h3>버튼으로 가능한 일</h3>
            <p class="small">대시보드 갱신, handoff 계획 보기, 명시 클릭 후 read-only 직원 handoff 실행만 가능합니다.</p>
          </div>
        </div>
      </div>
    </section>
    <section class="card">
      <h2>직원 실행 Timeline</h2>
      <div id="runs" class="list"></div>
    </section>
    <section class="card">
      <h2>작업 로그</h2>
      <pre id="log">대기 중</pre>
    </section>
  </main>
  <script>
    let state = null;
    const el = (id) => document.getElementById(id);
    const log = (value) => { el("log").textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2); };
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));

    async function api(path, options) {
      const res = await fetch(path, options);
      const json = await res.json();
      if (!res.ok || json.ok === false) throw json;
      return json;
    }

    function metric(label, value) {
      return '<div class="card"><h2>' + esc(label) + '</h2><div class="metric">' + esc(value) + '</div></div>';
    }

    function actionButton(label, action, filePath, className = "secondary") {
      return '<button class="' + esc(className) + '" data-action="' + esc(action) + '" data-path="' + esc(filePath) + '">' + esc(label) + '</button>';
    }

    function renderInbox() {
      const items = [];
      if (state.handoffs.length) {
        items.push('<div class="item warn"><h3>다음 직원에게 넘길 수 있는 일이 있습니다</h3><p class="small">' + esc(state.handoffs[0].from_agent_id) + ' → ' + esc(state.handoffs[0].to_agent_id) + '</p><p class="muted small">' + esc(state.handoffs[0].reason) + '</p></div>');
      }
      if (state.recent_staff_runs.length) {
        const run = state.recent_staff_runs[0];
        items.push('<div class="item"><h3>최근 직원 실행</h3><p class="small"><code>' + esc(run.role_run_id) + '</code> · ' + esc(run.agent_id) + ' · ' + esc(run.status) + '</p></div>');
      }
      if (state.review_packets.length) {
        const packet = state.review_packets[0];
        items.push('<div class="item good"><h3>최근 리뷰 패킷</h3><p class="small"><a href="' + esc(packet.href) + '" target="_blank">' + esc(packet.id) + '</a></p></div>');
      }
      el("inbox").innerHTML = items.length ? items.join("") : '<p class="muted">현재 표시할 Studio 항목이 없습니다.</p>';
    }

    function render() {
      el("stamp").textContent = "updated " + new Date(state.generated_at).toLocaleString();
      const m = state.metrics;
      el("metrics").innerHTML = [
        metric("직원", m.staff),
        metric("직원 실행", m.staff_runs),
        metric("리뷰 패킷", m.review_packets),
        metric("Handoff", m.handoffs),
        metric("도구 어댑터", m.tool_adapters),
        metric("Task 연결", m.task_bindings)
      ].join("");

      renderInbox();

      el("handoffs").innerHTML = state.handoffs.length ? state.handoffs.map((h) =>
        '<div class="item warn"><h3><code>' + esc(h.handoff_id) + '</code> <span class="pill">' + esc(h.status) + '</span></h3>' +
        '<p>' + esc(h.from_agent_id) + ' → ' + esc(h.to_agent_id) + '</p>' +
        '<p class="muted small">' + esc(h.reason) + '</p>' +
        '<div class="row">' +
        actionButton("계획 보기", "plan", h.path, "secondary") +
        actionButton("직원 실행", "execute", h.path, "good") +
        '<a href="/file?path=' + encodeURIComponent(h.path) + '" target="_blank">원본</a>' +
        '</div></div>'
      ).join("") : '<p class="muted">Handoff 후보가 없습니다.</p>';

      el("packets").innerHTML = state.review_packets.length ? state.review_packets.map((p) =>
        '<div class="item good"><h3><code>' + esc(p.id) + '</code></h3>' +
        '<p class="muted small">' + esc(p.updated_at) + '</p>' +
        '<a href="' + esc(p.href) + '" target="_blank">리뷰 패킷 열기</a></div>'
      ).join("") : '<p class="muted">리뷰 패킷이 없습니다.</p>';

      el("runs").innerHTML = state.recent_staff_runs.length ? state.recent_staff_runs.map((r) =>
        '<div class="item ' + (r.status === "failed" ? "danger" : "") + '"><h3><code>' + esc(r.role_run_id) + '</code> <span class="pill">' + esc(r.status) + '</span></h3>' +
        '<p>' + esc(r.agent_id) + ' · ' + esc(r.model) + ' / ' + esc(r.reasoning) + '</p>' +
        '<p class="muted small">exit ' + esc(r.exit_code) + ' · ' + esc(r.updated_at) + '</p>' +
        (r.output_href ? '<a href="' + esc(r.output_href) + '" target="_blank">RoleRunOutput 열기</a>' : '') +
        '</div>'
      ).join("") : '<p class="muted">직원 실행 기록이 없습니다.</p>';
    }

    async function refresh() {
      state = await api("/api/summary");
      render();
    }

    async function exportDashboard() {
      log("정적 대시보드를 갱신하는 중입니다.");
      log(await api("/api/dashboard/export", { method:"POST", headers:{ "content-type":"application/json" }, body:"{}" }));
      await refresh();
    }

    async function planHandoff(filePath) {
      log("handoff 계획을 생성하는 중입니다.");
      log(await api("/api/handoff/plan", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ path:filePath }) }));
    }

    async function executeHandoff(filePath) {
      if (!confirm("서명된 Codex 직원 실행을 시작할까요? 결과는 _Temp에 기록되고, source/task/canon/git은 변경하지 않습니다.")) return;
      log("직원 실행 중입니다. 시간이 걸릴 수 있습니다.");
      log(await api("/api/handoff/execute", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ path:filePath, model:"gpt-5.5", reasoning:"high" }) }));
      await refresh();
    }

    document.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      const filePath = button.dataset.path;
      if (action === "plan") planHandoff(filePath).catch(log);
      if (action === "execute") executeHandoff(filePath).catch(log);
    });
    el("refresh").addEventListener("click", () => refresh().catch(log));
    el("export-dashboard").addEventListener("click", () => exportDashboard().catch(log));
    refresh().catch(log);
  </script>
</body>
</html>`;
}

async function handleApi(repoRoot, req, res, parsedUrl) {
  if (req.method === "GET" && parsedUrl.pathname === "/api/summary") {
    return sendJson(res, 200, await getSummary(repoRoot));
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/dashboard/export") {
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_dashboard_export.bat");
    const result = await runTool(repoRoot, bat, ["--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/handoff/plan") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_staff_pipeline.bat");
    const result = await runTool(repoRoot, bat, ["handoff", body.path, "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/handoff/execute") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const model = body.model || "gpt-5.5";
    const reasoning = body.reasoning || "high";
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_staff_pipeline.bat");
    const args = [
      "handoff",
      body.path,
      "--execute",
      "--context-store-path",
      "_Temp/AIWorkflowStudio/console_contexts",
      "--model",
      model,
      "--reasoning",
      reasoning,
      "--timeout-seconds",
      "900",
      "--ephemeral",
      "--json",
    ];
    const result = await runTool(repoRoot, bat, args, 20 * 60 * 1000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  return sendJson(res, 404, { ok: false, error: "Not found" });
}

async function startServer(options) {
  const repoRoot = path.resolve(options.repoRoot);
  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url, `http://${options.host}:${options.port}`);
      if (req.method === "GET" && parsedUrl.pathname === "/") {
        return sendHtml(res, dashboardHtml());
      }
      if (req.method === "GET" && parsedUrl.pathname === "/file") {
        return await serveFile(repoRoot, res, parsedUrl.searchParams.get("path") || "");
      }
      if (parsedUrl.pathname.startsWith("/api/")) {
        return await handleApi(repoRoot, req, res, parsedUrl);
      }
      return sendJson(res, 404, { ok: false, error: "Not found" });
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message || String(error) });
    }
  });

  await new Promise((resolve) => server.listen(options.port, options.host, resolve));
  const url = `http://${options.host}:${options.port}/`;
  if (options.json) {
    console.log(JSON.stringify({ ok: true, url, repo_root: repoRoot }, null, 2));
  } else {
    console.log("AIWorkflow Studio Director Console");
    console.log(`url: ${url}`);
    console.log(`repo: ${repoRoot}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: studio_director_console.bat [--host 127.0.0.1] [--port 47831] [--once] [--json]");
    return;
  }
  if (options.once) {
    console.log(JSON.stringify(await getSummary(path.resolve(options.repoRoot)), null, 2));
    return;
  }
  await startServer(options);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});

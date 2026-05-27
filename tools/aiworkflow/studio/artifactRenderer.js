#!/usr/bin/env node
"use strict";

const path = require("path");

function htmlEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function markdownInline(value) {
  let text = htmlEscape(value);
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const safeHref = String(href || "");
    if (!/^(https?:\/\/|\/file\?|#)/i.test(safeHref)) {
      return label;
    }
    return `<a href="${htmlEscape(safeHref)}">${label}</a>`;
  });
  return text;
}

function renderMarkdownBody(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let inCode = false;
  let inUl = false;
  let inOl = false;
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${markdownInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const closeLists = () => {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  };

  for (const line of lines) {
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      flushParagraph();
      closeLists();
      if (inCode) {
        html.push("</code></pre>");
        inCode = false;
      } else {
        const lang = fence[1] ? ` data-lang="${htmlEscape(fence[1].trim())}"` : "";
        html.push(`<pre${lang}><code>`);
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      html.push(`${htmlEscape(line)}\n`);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeLists();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeLists();
      const level = Math.min(6, heading[1].length);
      html.push(`<h${level}>${markdownInline(heading[2])}</h${level}>`);
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.*)$/);
    if (unordered) {
      flushParagraph();
      if (inOl) {
        html.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        html.push("<ul>");
        inUl = true;
      }
      html.push(`<li>${markdownInline(unordered[1])}</li>`);
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      if (inUl) {
        html.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        html.push("<ol>");
        inOl = true;
      }
      html.push(`<li>${markdownInline(ordered[1])}</li>`);
      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeLists();
      html.push(`<blockquote>${markdownInline(quote[1])}</blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  closeLists();
  if (inCode) {
    html.push("</code></pre>");
  }
  return html.join("\n");
}

function renderMarkdownDocument(relativePath, markdown) {
  const title = path.basename(relativePath || "Markdown document");
  const rawUrl = `/file?path=${encodeURIComponent(relativePath)}&raw=1`;
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(title)}</title>
  <style>
    :root { color-scheme: light dark; --bg:#f6f7fb; --paper:#ffffff; --text:#1b1f2a; --muted:#6b7280; --line:#d7dce5; --code:#eef2f7; --link:#315cff; }
    @media (prefers-color-scheme: dark) {
      :root { --bg:#0f1218; --paper:#171c25; --text:#e7ecf5; --muted:#9ba6b8; --line:#303846; --code:#242b37; --link:#8fb3ff; }
    }
    body { margin:0; background:var(--bg); color:var(--text); font-family:"Segoe UI", system-ui, sans-serif; line-height:1.68; }
    main { max-width:980px; margin:0 auto; padding:36px 24px 72px; }
    article { background:var(--paper); border:1px solid var(--line); border-radius:14px; padding:32px; box-shadow:0 20px 60px rgba(15,18,24,.08); }
    header { margin-bottom:28px; color:var(--muted); font-size:14px; }
    h1, h2, h3, h4, h5, h6 { line-height:1.28; margin:1.5em 0 .55em; }
    h1 { margin-top:0; font-size:32px; border-bottom:1px solid var(--line); padding-bottom:14px; }
    h2 { font-size:23px; border-bottom:1px solid var(--line); padding-bottom:8px; }
    h3 { font-size:18px; }
    p { margin:.75em 0; }
    ul, ol { padding-left:1.5rem; }
    li { margin:.25em 0; }
    code { background:var(--code); border:1px solid var(--line); border-radius:5px; padding:.08em .34em; font-family:Consolas, "Cascadia Mono", monospace; font-size:.92em; }
    pre { background:var(--code); border:1px solid var(--line); border-radius:10px; padding:14px; overflow:auto; }
    pre code { background:transparent; border:0; padding:0; }
    blockquote { border-left:4px solid var(--line); margin:1em 0; padding:.2em 1em; color:var(--muted); }
    a { color:var(--link); text-decoration:none; }
    a:hover { text-decoration:underline; }
    details { margin-top:28px; border-top:1px solid var(--line); padding-top:18px; }
    summary { cursor:pointer; color:var(--muted); }
    .raw { white-space:pre-wrap; font-family:Consolas, "Cascadia Mono", monospace; font-size:13px; }
  </style>
</head>
<body>
  <main>
    <article>
      <header>Markdown preview · <code>${htmlEscape(relativePath)}</code> · <a href="${htmlEscape(rawUrl)}">원문으로 보기</a></header>
      ${renderMarkdownBody(markdown)}
      <details>
        <summary>원본 Markdown 접어보기</summary>
        <pre class="raw">${htmlEscape(markdown)}</pre>
      </details>
    </article>
  </main>
</body>
</html>`;
}

function artifactListHtml(items, emptyText = "없음") {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!values.length) return `<p class="muted">${htmlEscape(emptyText)}</p>`;
  return `<ul>${values.map((item) => {
    if (typeof item === "string") return `<li>${markdownInline(item)}</li>`;
    if (!item || typeof item !== "object") return `<li>${htmlEscape(String(item))}</li>`;
    const title = item.name || item.label || item.kind || item.status || item.decision || item.ref || item.adapter_id || item.schema || "";
    const status = item.status || item.level || item.verdict || item.decision || "";
    const detail = item.meaning || item.summary || item.reason || item.when_to_use || item.effect || item.ref || JSON.stringify(item);
    return `<li>${markdownInline([title, status].filter(Boolean).join(" · "))}${detail ? `<br><span class="muted">${markdownInline(detail)}</span>` : ""}</li>`;
  }).join("")}</ul>`;
}

function artifactMetric(label, value) {
  return `<div class="metric-card"><span>${htmlEscape(label)}</span><strong>${htmlEscape(value || "-")}</strong></div>`;
}

function artifactSection(title, items, emptyText) {
  return `<section><h2>${htmlEscape(title)}</h2>${artifactListHtml(items, emptyText)}</section>`;
}

function artifactStatusClass(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("fail") || text.includes("blocked") || text.includes("danger")) return "danger";
  if (text.includes("concern") || text.includes("needs") || text.includes("mixed") || text.includes("warn")) return "warn";
  if (text.includes("pass") || text.includes("done") || text.includes("ready") || text.includes("accept")) return "good";
  return "";
}

function jsonBrief(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    const preview = value.slice(0, 3).map((item) => {
      if (item && typeof item === "object") {
        return item.title || item.name || item.id || item.type || JSON.stringify(item);
      }
      return String(item);
    }).join(", ");
    return `${value.length}개 항목${preview ? `: ${shortText(preview, 140)}` : ""}`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    return `${keys.length}개 필드${keys.length ? `: ${keys.slice(0, 6).join(", ")}` : ""}`;
  }
  return shortText(String(value), 220);
}

function jsonListItems(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, child]) => ({
      name: key,
      summary: jsonBrief(child),
    }));
  }
  return value === undefined || value === null || value === "" ? [] : [String(value)];
}

function renderGenericJsonSummary(relativePath, json) {
  const entries = json && typeof json === "object" && !Array.isArray(json) ? Object.entries(json) : [];
  const title =
    json?.director_goal_plan_id ||
    json?.meeting_session_id ||
    json?.work_order_id ||
    json?.proposal_id ||
    json?.decision_id ||
    json?.memory_id ||
    json?.id ||
    json?.title ||
    path.basename(relativePath || "JSON");
  return {
    kind: "JSON 문서",
    id: title,
    title,
    status: json?.status || json?.state || "읽기용",
    summary: json?.goal || json?.summary || json?.reason || "JSON 내용을 사람이 읽기 쉬운 형태로 정리했습니다.",
    metrics: [
      ["경로", relativePath],
      ["상위 필드", Array.isArray(json) ? json.length : entries.length],
      ["원본 형식", Array.isArray(json) ? "array" : typeof json],
    ],
    sections: entries.map(([key, value]) => [key, jsonListItems(value)]),
  };
}

function renderArtifactSummary(relativePath, json) {
  if (json.completion_card_id) {
    const p = json.presentation || {};
    return {
      kind: "완료 카드",
      id: json.completion_card_id,
      title: p.task_line || json.task_id || json.completion_card_id,
      status: p.verdict || p.readiness_level || p.state,
      summary: p.summary || "완료 판단용 카드입니다.",
      metrics: [
        ["Task", json.task_id],
        ["Verdict", p.verdict],
        ["상태", p.state],
        ["완료 처리 가능", p.can_mark_task_done_manually ? "yes" : "no"],
        ["커밋 검토 가능", p.can_commit_after_review ? "yes" : "no"],
      ],
      sections: [
        ["우려 사항", p.concerns],
        ["경고", p.warnings],
        ["차단 항목", p.blockers],
        ["실패한 검사", p.failed_checks],
        ["사람 결정", p.human_decisions],
        ["다음 행동", p.next_manual_commands],
      ],
    };
  }
  if (json.completion_report_id) {
    const readiness = json.completion_readiness || {};
    const risks = json.remaining_risks || {};
    const verification = json.verification_summary || {};
    return {
      kind: "완료 보고서",
      id: json.completion_report_id,
      title: json.task_context?.title || json.task_id || json.completion_report_id,
      status: verification.verdict || readiness.level || json.completion_state,
      summary: readiness.summary || "완료 가능 여부와 남은 위험을 정리한 보고서입니다.",
      metrics: [
        ["Task", json.task_id],
        ["완료 상태", json.completion_state],
        ["검증 판정", verification.verdict],
        ["경고", verification.warning_count],
        ["우려", verification.concern_count],
        ["차단", verification.blocker_count],
      ],
      sections: [
        ["우려 사항", risks.concerns],
        ["경고", risks.warnings],
        ["차단 항목", risks.blockers],
        ["실패한 검사", risks.failed_checks],
        ["사람 결정", json.human_decisions_required],
        ["다음 행동", json.suggested_next_manual_commands],
        ["후속 후보", json.follow_up_candidates],
      ],
    };
  }
  if (json.verification_report_id) {
    const verdict = json.verdict || {};
    const gates = Object.values(json.gates || {});
    return {
      kind: "검증 보고서",
      id: json.verification_report_id,
      title: json.task_context?.title || json.task_id || json.verification_report_id,
      status: verdict.level,
      summary: verdict.summary || verdict.recommended_user_action || "검증 gate별 판정을 정리한 보고서입니다.",
      metrics: [
        ["Task", json.task_id],
        ["판정", verdict.level],
        ["Gate 수", gates.length],
        ["사람 결정 필요", verdict.human_decision_required ? "yes" : "no"],
      ],
      sections: [
        ["Gate 요약", gates.map((gate) => ({
          name: gate.name,
          status: gate.status,
          summary: gate.summary,
        }))],
        ["우려 사항", gates.flatMap((gate) => gate.concerns || [])],
        ["경고", gates.flatMap((gate) => gate.warnings || [])],
        ["차단 항목", gates.flatMap((gate) => gate.blockers || [])],
        ["실패한 검사", gates.flatMap((gate) => gate.failed_checks || [])],
        ["사람 결정", gates.flatMap((gate) => gate.human_decisions || [])],
      ],
    };
  }
  if (json.runner_run_id) {
    const gate = json.human_gate_state || {};
    const reports = json.report_ids || {};
    return {
      kind: "Runner 실행 기록",
      id: json.runner_run_id,
      title: json.task_id || json.runner_run_id,
      status: gate.stop_reason || json.current_step || json.status,
      summary: gate.human_gate || "PC Runner 실행 세션 기록입니다.",
      metrics: [
        ["Task", json.task_id],
        ["Run 상태", json.status],
        ["단계", [json.current_phase, json.current_step].filter(Boolean).join(" / ")],
        ["중단 이유", gate.stop_reason],
        ["시작", json.started_at],
        ["종료", json.ended_at],
      ],
      sections: [
        ["세션", json.session_ids],
        ["검증 자료", json.evidence_ids],
        ["보고서", Object.keys(reports).map((key) => `${key}: ${reports[key]}`)],
        ["사람 확인 지점", [gate.human_gate]],
      ],
    };
  }
  return null;
}

function renderJsonArtifactDocument(relativePath, json, rawText) {
  const summary = renderArtifactSummary(relativePath, json) || renderGenericJsonSummary(relativePath, json);
  const rawUrl = `/file?path=${encodeURIComponent(relativePath)}&raw=1`;
  const statusClass = artifactStatusClass(summary.status);
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(summary.kind)} · ${htmlEscape(summary.id)}</title>
  <style>
    :root { color-scheme: light dark; --bg:#f6f7fb; --paper:#fff; --panel:#f9fafc; --text:#1b1f2a; --muted:#6b7280; --line:#d7dce5; --code:#eef2f7; --good:#15803d; --warn:#b45309; --danger:#b91c1c; --link:#315cff; }
    @media (prefers-color-scheme: dark) {
      :root { --bg:#0f1218; --paper:#171c25; --panel:#1f2632; --text:#e7ecf5; --muted:#9ba6b8; --line:#303846; --code:#242b37; --link:#8fb3ff; }
    }
    body { margin:0; background:var(--bg); color:var(--text); font-family:"Segoe UI", system-ui, sans-serif; line-height:1.62; }
    main { max-width:1040px; margin:0 auto; padding:34px 24px 72px; }
    article { background:var(--paper); border:1px solid var(--line); border-radius:14px; padding:30px; box-shadow:0 20px 60px rgba(15,18,24,.08); }
    header { color:var(--muted); font-size:14px; margin-bottom:22px; }
    h1 { margin:0 0 8px; line-height:1.25; font-size:30px; }
    h2 { margin:28px 0 10px; font-size:20px; border-bottom:1px solid var(--line); padding-bottom:8px; }
    .summary { font-size:16px; margin:12px 0 20px; }
    .badge { display:inline-block; border:1px solid var(--line); border-radius:999px; padding:4px 10px; background:var(--code); font-family:Consolas, "Cascadia Mono", monospace; }
    .badge.good { color:var(--good); border-color:color-mix(in srgb, var(--good), var(--line) 60%); }
    .badge.warn { color:var(--warn); border-color:color-mix(in srgb, var(--warn), var(--line) 60%); }
    .badge.danger { color:var(--danger); border-color:color-mix(in srgb, var(--danger), var(--line) 60%); }
    .metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:10px; margin:18px 0 8px; }
    .metric-card { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:12px; }
    .metric-card span { display:block; color:var(--muted); font-size:12px; margin-bottom:6px; }
    .metric-card strong { overflow-wrap:anywhere; }
    ul { padding-left:1.35rem; }
    li { margin:.35em 0; overflow-wrap:anywhere; }
    code { background:var(--code); border:1px solid var(--line); border-radius:5px; padding:.08em .34em; font-family:Consolas, "Cascadia Mono", monospace; font-size:.92em; }
    pre { background:var(--code); border:1px solid var(--line); border-radius:10px; padding:14px; overflow:auto; }
    a { color:var(--link); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .muted { color:var(--muted); }
    details { margin-top:28px; border-top:1px solid var(--line); padding-top:18px; }
    summary { cursor:pointer; color:var(--muted); }
  </style>
</head>
<body>
  <main>
    <article>
      <header>${htmlEscape(summary.kind)} · <code>${htmlEscape(relativePath)}</code> · <a href="${htmlEscape(rawUrl)}">원본 JSON 보기</a></header>
      <h1>${htmlEscape(summary.title)}</h1>
      <div class="badge ${htmlEscape(statusClass)}">${htmlEscape(summary.status || summary.kind)}</div>
      <p class="summary">${markdownInline(summary.summary)}</p>
      <div class="metrics">${summary.metrics.map(([label, value]) => artifactMetric(label, value)).join("")}</div>
      ${summary.sections.map(([title, items]) => artifactSection(title, items)).join("")}
      <details>
        <summary>원본 JSON 접어보기</summary>
        <pre><code>${htmlEscape(rawText)}</code></pre>
      </details>
    </article>
  </main>
</body>
</html>`;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".md") return "text/markdown; charset=utf-8";
  if (ext === ".log" || ext === ".txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

module.exports = {
  renderMarkdownDocument,
  renderJsonArtifactDocument,
  contentType,
};

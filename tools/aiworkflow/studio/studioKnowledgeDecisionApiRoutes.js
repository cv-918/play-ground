#!/usr/bin/env node
"use strict";

const fsp = require("fs/promises");
const path = require("path");
const {
  readStudioRecordRequest,
  runPayloadToolJson,
  sendStudioPayload,
} = require("./studioApiRouteUtils");

function slugifyWikiPart(value, fallback = "wiki-note") {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[^\w가-힣-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return (slug || fallback).slice(0, 60);
}

function compactTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function markdownListValue(value) {
  return String(value || "").replace(/\r?\n/gu, " ").trim();
}

function extractMarkdownTitle(text, fallback) {
  const heading = String(text || "").split(/\r?\n/u).find((line) => /^#\s+/.test(line));
  return heading ? heading.replace(/^#\s+/u, "").trim() : fallback;
}

function extractMarkdownSummary(text) {
  return String(text || "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !/^-\s*(status|source|created_at|promotion_target|tags)\s*:/i.test(line))
    .slice(0, 3)
    .join(" ");
}

async function readWikiMarkdownRecord(repoRoot, body) {
  const requestedPath = String(body.path || body.relative_path || "").trim();
  if (!requestedPath) throw new Error("Wiki document path is required.");
  const wikiRoot = path.resolve(repoRoot, "_Docs/AIWorkflow/StudioWiki");
  const full = path.isAbsolute(requestedPath)
    ? path.resolve(requestedPath)
    : path.resolve(repoRoot, requestedPath);
  if (!isInside(wikiRoot, full)) throw new Error("Wiki document path escapes StudioWiki root.");
  const stat = await fsp.stat(full);
  if (!stat.isFile()) throw new Error("Wiki document path is not a file.");
  const content = await fsp.readFile(full, "utf8");
  const relativePath = path.relative(repoRoot, full).replace(/\\/g, "/");
  const relativeFromWiki = path.relative(wikiRoot, full).replace(/\\/g, "/");
  const category = relativeFromWiki.includes("/") ? relativeFromWiki.split("/")[0] : "Root";
  const basename = path.basename(full, path.extname(full));
  return {
    wiki_id: basename,
    title: extractMarkdownTitle(content, basename),
    summary: extractMarkdownSummary(content),
    content,
    category,
    status: category === "Inbox" ? "triage_needed" : "available",
    path: relativePath,
    href: `/file?path=${encodeURIComponent(relativePath)}`,
  };
}

async function writeWikiInboxNote(repoRoot, body) {
  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  if (!title) throw new Error("Wiki Inbox title is required.");
  if (!content) throw new Error("Wiki Inbox content is required.");

  const wikiRoot = path.resolve(repoRoot, "_Docs/AIWorkflow/StudioWiki");
  const inboxDir = path.resolve(wikiRoot, "Inbox");
  if (!isInside(wikiRoot, inboxDir)) throw new Error("Wiki Inbox path escapes StudioWiki root.");
  await fsp.mkdir(inboxDir, { recursive: true });

  const id = `WI-${compactTimestamp()}-${slugifyWikiPart(title)}`;
  const full = path.resolve(inboxDir, `${id}.md`);
  if (!isInside(inboxDir, full)) throw new Error("Wiki note path escapes Inbox directory.");
  const source = markdownListValue(body.source || "Studio");
  const now = new Date().toISOString();
  const text = [
    `# ${title}`,
    "",
    `- status: inbox`,
    `- source: ${source}`,
    `- created_at: ${now}`,
    `- promotion_target: needs_triage`,
    "",
    "## 원문",
    "",
    content,
    "",
    "## 정리 메모",
    "",
    "- 아직 공식 결정, 공식 설정, 업무 지시가 아닙니다.",
    "- 나중에 AI Librarian이 Concept, Decision, Proposal, Lesson, Research, Canon 후보 중 어디로 승격할지 검토합니다.",
    "- Human Director 승인 전에는 canon이나 실행 근거로 쓰지 않습니다.",
    "",
  ].join("\n");
  await fsp.writeFile(full, text, "utf8");
  const relativePath = path.relative(repoRoot, full).replace(/\\/g, "/");
  return {
    ok: true,
    command: "wiki-inbox-create",
    wiki_inbox_id: id,
    title,
    source,
    path: relativePath,
    href: `/file?path=${encodeURIComponent(relativePath)}`,
    safety: {
      wiki_inbox_written: true,
      canon_written: false,
      task_created: false,
      source_changed: false,
      commit_push: false,
    },
  };
}

function createKnowledgeDecisionApiHandler(deps = {}) {
  const {
    buildCanonConflictReport,
    buildDecisionFromProposalPayload,
    buildDecisionPayload,
    buildKnowledgeTransitionPlan,
    buildWikiPromotionPlan,
    buildMemoryFromDecisionPayload,
    buildMemoryPayload,
    buildProposalPayload,
    readRequestJson,
    readStudioRecordFromBody,
    repoPath,
    runTool,
    sendJson,
    writeTempStudioInput,
  } = deps;

  return async function handleKnowledgeDecisionApi({ repoRoot, req, res, parsedUrl, serverContext = {} }) {
    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/wiki-inbox/create") {
      try {
        const body = await readRequestJson(req);
        return sendJson(res, 200, await writeWikiInboxNote(repoRoot, body));
      } catch (error) {
        return sendJson(res, 400, {
          ok: false,
          command: "wiki-inbox-create",
          error: error.message || String(error),
          safety: {
            wiki_inbox_written: false,
            canon_written: false,
            task_created: false,
            source_changed: false,
            commit_push: false,
          },
        });
      }
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/proposal/create") {
      const body = await readRequestJson(req);
      const payload = buildProposalPayload(body);
      return runPayloadToolJson(
        repoRoot,
        res,
        { repoPath, runTool, sendJson, writeTempStudioInput },
        "proposal",
        payload,
        "tools/aiworkflow/studio_decision_store.bat",
        (inputPath) => ["create-proposal", inputPath, "--execute", "--json"],
      );
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/decision/create") {
      const body = await readRequestJson(req);
      const payload = buildDecisionPayload(body);
      return runPayloadToolJson(
        repoRoot,
        res,
        { repoPath, runTool, sendJson, writeTempStudioInput },
        "decision",
        payload,
        "tools/aiworkflow/studio_decision_store.bat",
        (inputPath) => ["create-decision", inputPath, "--execute", "--json"],
      );
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/memory/create") {
      const body = await readRequestJson(req);
      const payload = buildMemoryPayload(body);
      return runPayloadToolJson(
        repoRoot,
        res,
        { repoPath, runTool, sendJson, writeTempStudioInput },
        "memory",
        payload,
        "tools/aiworkflow/studio_memory_store.bat",
        (inputPath) => ["create", inputPath, "--execute", "--json"],
      );
    }









    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/proposal/create-decision") {
      const { body, json: proposal } = await readStudioRecordRequest(repoRoot, req, readRequestJson, readStudioRecordFromBody, "proposal");
      const payload = buildDecisionFromProposalPayload(proposal, String(body.decision_type || "approve").trim() || "approve");
      return runPayloadToolJson(
        repoRoot,
        res,
        { repoPath, runTool, sendJson, writeTempStudioInput },
        "decision_from_proposal",
        payload,
        "tools/aiworkflow/studio_decision_store.bat",
        (inputPath) => ["create-decision", inputPath, "--execute", "--json"],
      );
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/knowledge/transition-plan") {
      const { json, relativePath } = await readStudioRecordRequest(repoRoot, req, readRequestJson, readStudioRecordFromBody, "knowledge record");
      const payload = buildKnowledgeTransitionPlan(json, relativePath);
      return sendStudioPayload(sendJson, res, "knowledge_transition_plan", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/wiki/promotion-plan") {
      try {
        const body = await readRequestJson(req);
        const record = await readWikiMarkdownRecord(repoRoot, body);
        const payload = buildWikiPromotionPlan(record);
        return sendStudioPayload(sendJson, res, "wiki_promotion_plan", payload);
      } catch (error) {
        return sendJson(res, 400, {
          ok: false,
          command: "wiki-promotion-plan",
          error: error.message,
          safety: {
            read_only: true,
            wiki_moved: false,
            decision_written: false,
            canon_changed: false,
            task_created: false,
            source_changed: false,
            commit_or_push: false,
          },
        });
      }
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/knowledge/canon-conflict-report") {
      const payload = await buildCanonConflictReport(repoRoot);
      return sendStudioPayload(sendJson, res, "canon_conflict_report", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/decision/create-memory") {
      const { body, json: decision } = await readStudioRecordRequest(repoRoot, req, readRequestJson, readStudioRecordFromBody, "decision");
      if (!String(decision.target_ref || "").trim()) {
        return sendJson(res, 400, {
          ok: false,
          command: "decision-create-memory",
          error: "Decision target is empty. Nothing was written.",
          decision_id: decision.decision_id || "",
          decision_type: decision.decision_type || "",
          summary: decision.decision_summary || "",
          validation: {
            errors: ["대상 ID가 비어 있어 이 판단을 참고 기록으로 저장할 수 없습니다."],
          },
          safety: {
            memory_written: false,
            canon_written: false,
            source_changed: false,
            commit_push: false,
          },
        });
      }
      const payload = buildMemoryFromDecisionPayload(decision, String(body.status || "").trim());
      return runPayloadToolJson(
        repoRoot,
        res,
        { repoPath, runTool, sendJson, writeTempStudioInput },
        "memory_from_decision",
        payload,
        "tools/aiworkflow/studio_memory_store.bat",
        (inputPath) => ["create", inputPath, "--execute", "--json"],
      );
    }







    return false;
  };
}

module.exports = { createKnowledgeDecisionApiHandler };

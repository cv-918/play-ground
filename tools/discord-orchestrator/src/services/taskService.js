import fs from "node:fs/promises";
import path from "node:path";

const TASK_ID_PATTERN = /^(WF|GAME|DOC|VAL|UNITY)-[A-Za-z0-9_-]+$/;
const BACKLOG_RELATIVE_PATH = "_Docs/AIWorkflow/Backlog.md";
const ACTIVE_TASK_RELATIVE_PATH = "_Docs/AIWorkflow/ActiveTask.md";
const BACKUP_RELATIVE_DIR = "_Temp/AIWorkflowDiscordBot/backups";
const BACKLOG_HEADER = ["ID", "Priority", "Status", "Kind", "Item", "Reason", "Tool Route", "Validation"];
const CLOSED_STATUSES = new Set(["done", "deferred"]);
const CATEGORY_VALUES = new Set(["WF", "GAME", "DOC", "VAL", "UNITY"]);
const PRIORITY_VALUES = new Set(["P0", "P1", "P2", "P3"]);
const CREATE_KIND_VALUES = new Set(["automation", "implementation", "documentation", "validation", "maintenance", "game"]);

export async function getCurrentTask(config) {
  const filePath = resolveRepoPath(config, ACTIVE_TASK_RELATIVE_PATH);
  const content = await fs.readFile(filePath, "utf8");
  return {
    ok: true,
    data: {
      metadata: parseActiveTaskMetadata(content),
      next_recommended_task: extractSectionText(content, "Next Recommended Task"),
    },
  };
}

export async function listBacklogTasks(config, filters = {}) {
  const filePath = resolveRepoPath(config, BACKLOG_RELATIVE_PATH);
  const content = await fs.readFile(filePath, "utf8");
  const table = parseBacklogTable(content);
  let tasks = table.rows.map((row) => rowToTask(row));

  if (filters.status) {
    tasks = tasks.filter((task) => sameValue(task.status, filters.status));
  } else {
    tasks = tasks.filter((task) => !CLOSED_STATUSES.has(String(task.status).toLowerCase()));
  }

  if (filters.kind) {
    tasks = tasks.filter((task) => sameValue(task.kind, filters.kind));
  }

  return {
    ok: true,
    data: {
      tasks,
      filters,
    },
  };
}

export async function createTask(config, input) {
  const category = normalizeEnum(input.category, "WF", CATEGORY_VALUES, "category", (value) => value.toUpperCase());
  const priority = normalizeEnum(input.priority, "P2", PRIORITY_VALUES, "priority", (value) => value.toUpperCase());
  const kind = normalizeEnum(input.kind, "automation", CREATE_KIND_VALUES, "kind", (value) => value.toLowerCase());
  const title = normalizeRequiredText(input.title, "title");
  const reason = normalizeChoice(input.reason, "Created from Discord task command");
  const taskId = await generateUniqueTaskId(config, category);

  const task = {
    id: taskId,
    priority,
    status: "todo",
    kind,
    item: title,
    reason,
    tool_route: "Discord -> human review",
    validation: "pending",
  };

  const filePath = resolveRepoPath(config, BACKLOG_RELATIVE_PATH);
  assertAllowedWrite(config, filePath);
  await createBackup(config, filePath, "Backlog");

  const content = await fs.readFile(filePath, "utf8");
  const table = parseBacklogTable(content);
  const nextContent = appendBacklogRow(content, table, task);
  await fs.writeFile(filePath, nextContent, "utf8");

  return {
    ok: true,
    data: task,
  };
}

export async function setActiveTask(config, taskId) {
  const id = normalizeTaskId(taskId);
  const backlogPath = resolveRepoPath(config, BACKLOG_RELATIVE_PATH);
  const activePath = resolveRepoPath(config, ACTIVE_TASK_RELATIVE_PATH);
  assertAllowedWrite(config, activePath);

  const backlogContent = await fs.readFile(backlogPath, "utf8");
  const table = parseBacklogTable(backlogContent);
  const selected = table.rows.map((row) => rowToTask(row)).find((task) => task.id === id);

  if (!selected) {
    return {
      ok: false,
      error: `Task not found in Backlog.md: ${id}`,
    };
  }

  await createBackup(config, activePath, "ActiveTask");
  const now = formatDate(new Date());
  const activeContent = buildActiveTaskMarkdown(selected, now);
  await fs.writeFile(activePath, activeContent, "utf8");

  return {
    ok: true,
    data: {
      task: selected,
      metadata: {
        task_id: selected.id,
        title: selected.item,
        status: "in_progress",
        priority: selected.priority,
        risk_level: selected.priority === "P0" ? "medium" : "low",
        workflow_path: "discord_task_management",
      },
    },
  };
}

function resolveRepoPath(config, relativePath) {
  return path.resolve(config.repoRoot, relativePath);
}

function assertAllowedWrite(config, targetPath) {
  const resolved = path.resolve(targetPath);
  const allowedFiles = [
    resolveRepoPath(config, BACKLOG_RELATIVE_PATH),
    resolveRepoPath(config, ACTIVE_TASK_RELATIVE_PATH),
  ].map((item) => path.resolve(item));
  const backupDir = path.resolve(resolveRepoPath(config, BACKUP_RELATIVE_DIR));

  if (allowedFiles.includes(resolved)) {
    return;
  }

  if (resolved.startsWith(`${backupDir}${path.sep}`)) {
    return;
  }

  throw new Error(`Refusing to write outside approved AIWorkflow task paths: ${resolved}`);
}

async function createBackup(config, sourcePath, prefix) {
  const backupDir = resolveRepoPath(config, BACKUP_RELATIVE_DIR);
  assertAllowedWrite(config, path.join(backupDir, "write-check.tmp"));
  await fs.mkdir(backupDir, { recursive: true });

  const stamp = formatTimestampForFile(new Date());
  let backupPath = path.join(backupDir, `${prefix}_${stamp}.md`);
  let suffix = 1;
  while (await exists(backupPath)) {
    backupPath = path.join(backupDir, `${prefix}_${stamp}_${suffix}.md`);
    suffix += 1;
  }

  assertAllowedWrite(config, backupPath);
  await fs.copyFile(sourcePath, backupPath);
  return backupPath;
}

async function generateUniqueTaskId(config, category) {
  const content = await fs.readFile(resolveRepoPath(config, BACKLOG_RELATIVE_PATH), "utf8");
  const existing = new Set(parseBacklogTable(content).rows.map((row) => rowToTask(row).id));
  const baseDate = new Date();

  for (let offsetSeconds = 0; offsetSeconds < 60; offsetSeconds += 1) {
    const candidateDate = new Date(baseDate.getTime() + offsetSeconds * 1000);
    const candidate = `${category}-${formatTimestampForId(candidateDate)}`;
    if (!existing.has(candidate)) {
      return candidate;
    }
  }

  throw new Error("Failed to generate a unique task id within one minute.");
}

function parseBacklogTable(content) {
  const lines = content.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => arraysEqual(parseTableLine(line), BACKLOG_HEADER));

  if (headerIndex < 0 || headerIndex + 1 >= lines.length) {
    throw new Error("Backlog table header was not found.");
  }

  const rows = [];
  let rowEndIndex = headerIndex + 2;
  while (rowEndIndex < lines.length && lines[rowEndIndex].trim().startsWith("|")) {
    const values = parseTableLine(lines[rowEndIndex]);
    if (values.length === BACKLOG_HEADER.length) {
      rows.push(values);
    }
    rowEndIndex += 1;
  }

  return {
    headerIndex,
    rowEndIndex,
    rows,
  };
}

function appendBacklogRow(content, table, task) {
  const lines = content.split(/\r?\n/);
  const row = [
    task.id,
    task.priority,
    task.status,
    task.kind,
    task.item,
    task.reason,
    task.tool_route,
    task.validation,
  ];
  lines.splice(table.rowEndIndex, 0, formatTableRow(row));
  return lines.join("\n");
}

function parseTableLine(line) {
  const trimmed = String(line).trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return [];
  }

  const values = [];
  let current = "";
  const inner = trimmed.slice(1, -1);

  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index];
    const previous = index > 0 ? inner[index - 1] : "";
    if (char === "|" && previous !== "\\") {
      values.push(cleanTableCell(current));
      current = "";
    } else {
      current += char;
    }
  }

  values.push(cleanTableCell(current));
  return values;
}

function cleanTableCell(value) {
  return String(value).trim().replaceAll("\\|", "|");
}

function formatTableRow(values) {
  return `| ${values.map(formatTableCell).join(" | ")} |`;
}

function formatTableCell(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replaceAll("|", "\\|")
    .trim();
}

function rowToTask(row) {
  return {
    id: row[0] ?? "",
    priority: row[1] ?? "",
    status: row[2] ?? "",
    kind: row[3] ?? "",
    item: row[4] ?? "",
    reason: row[5] ?? "",
    tool_route: row[6] ?? "",
    validation: row[7] ?? "",
  };
}

function parseActiveTaskMetadata(content) {
  const match = content.match(/## Active Task Metadata\s+```ya?ml\s+([\s\S]*?)```/i);
  if (!match) {
    return {};
  }

  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    const parts = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (parts) {
      metadata[parts[1]] = parts[2].trim();
    }
  }

  return metadata;
}

function extractSectionText(content, sectionTitle) {
  const pattern = new RegExp(`## ${escapeRegExp(sectionTitle)}\\s+([\\s\\S]*?)(?:\\n---\\n|\\n## |$)`, "i");
  const match = content.match(pattern);
  if (!match) {
    return "";
  }

  return match[1]
    .replaceAll("```text", "")
    .replaceAll("```yaml", "")
    .replaceAll("```", "")
    .trim();
}

function buildActiveTaskMarkdown(task, date) {
  const riskLevel = task.priority === "P0" ? "medium" : "low";
  return `# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

\`\`\`yaml
task_id: ${task.id}
title: ${task.item}
status: in_progress
workflow_path: discord_task_management
priority: ${task.priority}
risk_level: ${riskLevel}
requested_by: human_director
requested_at: ${date}
last_updated: ${date}
\`\`\`

---

## Goal

${task.item}

---

## Tool Route

\`\`\`yaml
discord: task selection command
human: review and approval
codex: only after explicit approval for implementation
validation: ${task.validation || "pending"}
\`\`\`

---

## Files In Scope

\`\`\`text
Define during task intake before implementation.
\`\`\`

---

## Human Action Required

\`\`\`text
1. Review the selected active task.
2. Approve architecture and scope before implementation if source or runtime behavior will change.
\`\`\`

---

## Validation Plan

\`\`\`text
${task.validation || "pending"}
\`\`\`

---

## Next Recommended Task

\`\`\`text
Review Backlog.md for the next highest-priority open task after this task is complete.
\`\`\`

---

## Completion Criteria

\`\`\`text
[ ] Task scope reviewed
[ ] Required approvals recorded
[ ] Implementation completed within approved scope, if applicable
[ ] Review completed, if applicable
[ ] Validation completed or explicitly deferred
[ ] Dev Log created for meaningful work
[ ] User decides whether to commit
\`\`\`
`;
}

function normalizeTaskId(value) {
  const id = String(value ?? "").trim();
  if (!TASK_ID_PATTERN.test(id)) {
    throw new Error("Invalid task id. Expected pattern: ^(WF|GAME|DOC|VAL|UNITY)-[A-Za-z0-9_-]+$");
  }
  return id;
}

function normalizeRequiredText(value, fieldName) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return text;
}

function normalizeChoice(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeEnum(value, fallback, allowedValues, fieldName, transform) {
  const normalized = transform(normalizeChoice(value, fallback));
  if (!allowedValues.has(normalized)) {
    throw new Error(`Invalid ${fieldName}: ${normalized}`);
  }
  return normalized;
}

function sameValue(actual, expected) {
  return String(actual).toLowerCase() === String(expected).toLowerCase();
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function formatTimestampForId(date) {
  return `${formatDateCompact(date)}-${formatTimeCompact(date)}`;
}

function formatTimestampForFile(date) {
  return `${formatDateCompact(date)}_${formatTimeCompact(date)}`;
}

function formatDate(date) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join("-");
}

function formatDateCompact(date) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
}

function formatTimeCompact(date) {
  return `${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

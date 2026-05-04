import fs from "node:fs/promises";
import path from "node:path";
import { getBacklogTaskById, getCurrentTask } from "./taskService.js";

const ACTIVE_PROJECT_RELATIVE_PATH = "_Docs/AIWorkflow/ActiveProject.json";
const PROJECT_PROFILES_RELATIVE_DIR = "_Docs/AIWorkflow/ProjectProfiles";
const OUTPUT_RELATIVE_DIR = "_Temp/AIWorkflowTaskRequests";
const CODEX_MODEL = "GPT-5.5 Thinking or strongest available Codex coding model";
const MODE_VALUES = new Set(["analysis", "implementation", "review"]);
const CONTEXT_VALUES = new Set(["compact", "standard", "full"]);
const MEDIUM_ALLOWED_PRIORITIES = new Set(["P2", "P3"]);

const RELEVANT_WORKFLOW_DOCS = [
  "_Docs/AIWorkflow/README.md",
  "_Docs/AIWorkflow/00_AI_Orchestrator_Overview.md",
  "_Docs/AIWorkflow/01_AI_Orchestrator_Protocol.md",
  "_Docs/AIWorkflow/04_Human_Approval_Gates.md",
  "_Docs/AIWorkflow/05_Tool_Routing_Rules.md",
  "_Docs/AIWorkflow/07_Review_Validation_Rules.md",
  "_Docs/AIWorkflow/08_DevLog_Rules.md",
  "_Docs/AIWorkflow/Task_State_Model.md",
  "_Docs/AIWorkflow/Active_Project_Selector.md",
];

export async function prepareCodexPrompt(config, input = {}) {
  const mode = normalizeChoice(input.mode, "implementation", MODE_VALUES, "mode");
  const contextLevel = normalizeChoice(input.context, "standard", CONTEXT_VALUES, "context");
  const activeTask = await getCurrentTask(config);
  const selectedFromActive = !String(input.id ?? "").trim();
  const taskId = selectedFromActive ? activeTask.data.metadata?.task_id : input.id;
  const backlogResult = await getBacklogTaskById(config, taskId);

  if (!backlogResult.ok) {
    return backlogResult;
  }

  const task = selectedFromActive
    ? mergeActiveTaskMetadata(backlogResult.data, activeTask.data.metadata)
    : backlogResult.data;
  const projectContext = await readProjectContext(config);
  const recommendation = buildRecommendation(task, mode, contextLevel);
  const prompt = buildCodexPrompt({
    config,
    task,
    activeTask: activeTask.data,
    projectContext,
    mode,
    contextLevel,
    recommendation,
    selectedFromActive,
  });
  const outputPath = await writePromptFile(config, task.id, prompt);

  return {
    ok: true,
    data: {
      task,
      mode,
      context_level: contextLevel,
      recommended_model: recommendation.model,
      recommended_reasoning: recommendation.reasoning,
      generated_path: outputPath.relativePath,
      absolute_path: outputPath.absolutePath,
    },
  };
}

function buildCodexPrompt(input) {
  return [
    "# Codex App Task Request",
    "",
    buildExecutionSettings(input),
    "",
    buildTaskSection(input.task),
    "",
    buildProjectContextSection(input),
    "",
    buildScopeSection(input),
    "",
    buildSafetySection(),
    "",
    buildExpectedOutputSection(),
    "",
    buildValidationChecklistSection(input),
    "",
    buildReturnInstructionsSection(),
    "",
  ].join("\n");
}

function buildExecutionSettings({ config, mode, contextLevel, recommendation }) {
  return [
    "## 1. Execution Settings",
    "- Recommended tool: Codex App",
    "- Mode: " + mode,
    "- Context level: " + contextLevel,
    "- Recommended model:",
    "  - analysis: " + CODEX_MODEL,
    "  - implementation: " + CODEX_MODEL,
    "  - review: " + CODEX_MODEL,
    "- Selected recommended model: " + recommendation.model,
    "- Recommended reasoning:",
    "  - analysis: high",
    "  - implementation: high",
    "  - review: high",
    "  - P2/P3 compact context may use medium.",
    "- Selected recommended reasoning: " + recommendation.reasoning,
    "- Repository:",
    "  " + config.repoRoot,
  ].join("\n");
}

function buildTaskSection(task) {
  return [
    "## 2. Task",
    "- task_id: " + formatValue(task.id),
    "- title: " + formatValue(task.item),
    "- status: " + formatValue(task.status),
    "- priority: " + formatValue(task.priority),
    "- kind: " + formatValue(task.kind),
    "- item: " + formatValue(task.item),
    "- reason: " + formatValue(task.reason),
    "- validation expectation: " + formatValue(task.validation),
  ].join("\n");
}

function buildProjectContextSection({ projectContext, contextLevel, activeTask, task }) {
  const activeProject = projectContext.activeProject;
  const profile = projectContext.profile;
  const lines = [
    "## 3. Project Context",
    "- active_project_id: " + formatValue(activeProject.active_project_id),
    "- profile_path: " + formatValue(activeProject.profile_path),
    "- project display_name: " + formatValue(profile.display_name),
    "- engine: " + formatValue(profile.engine),
    "- project_type: " + formatValue(profile.project_type),
  ];

  if (contextLevel === "compact") {
    lines.push("- source roots: " + formatInlineList(profile.source_roots));
    lines.push("- data roots: " + formatInlineList(profile.data_roots));
    return lines.join("\n");
  }

  lines.push("- source roots:");
  appendList(lines, profile.source_roots);
  lines.push("- data roots:");
  appendList(lines, profile.data_roots);
  lines.push("- validation profiles summary:");
  appendValidationProfiles(lines, profile.validation_profiles);

  if (contextLevel === "full") {
    lines.push("");
    lines.push("### ActiveProject");
    lines.push(jsonBlock(activeProject));
    lines.push("");
    lines.push("### ProjectProfile");
    lines.push(jsonBlock(profile));
    lines.push("");
    lines.push("### Relevant Workflow Docs");
    appendList(lines, RELEVANT_WORKFLOW_DOCS);
    lines.push("");
    lines.push("### Active Task Metadata");
    lines.push(jsonBlock(activeTask.metadata ?? {}));
    lines.push("");
    lines.push("### Backlog Row");
    lines.push(jsonBlock(task));
    lines.push("");
    lines.push("### Validation Profiles");
    lines.push(jsonBlock(profile.validation_profiles ?? []));
    lines.push("");
    lines.push("### Release Target Summary");
    lines.push(jsonBlock(profile.release_targets ?? []));
  }

  return lines.join("\n");
}

function buildScopeSection({ task, mode }) {
  const lines = [
    "## 4. Scope",
    "- What Codex should do: work only on task " + task.id + " - " + task.item,
  ];

  if (mode === "analysis") {
    lines.push("- Analysis only. Do not modify files.");
    lines.push("- Analyze task scope, risks, likely files, validation needs, and approval gates.");
    lines.push("- Do not modify files unless explicitly asked.");
  } else if (mode === "implementation") {
    lines.push("- Implement only within task scope.");
    lines.push("- File modifications are allowed only within the approved task scope.");
    lines.push("- Do not commit.");
    lines.push("- Do not push.");
    lines.push("- Do not modify _Local/.");
    lines.push("- Do not modify node_modules/.");
    lines.push("- Do not expose secrets.");
    lines.push("- Request a final implementation summary.");
  } else if (mode === "review") {
    lines.push("- Review current diff and identify risks. Do not modify files unless explicitly asked.");
    lines.push("- Prioritize bugs, regressions, missing validation, and scope violations.");
  }

  return lines.join("\n");
}

function buildSafetySection() {
  return [
    "## 5. Required Safety Constraints",
    "- Do not commit.",
    "- Do not push.",
    "- Do not modify _Local/.",
    "- Do not modify node_modules/.",
    "- Do not expose secrets.",
    "- Do not run release/deploy steps.",
    "- Do not modify files outside the approved scope.",
    "- If the task is ambiguous, summarize assumptions and stop before invasive changes.",
  ].join("\n");
}

function buildExpectedOutputSection() {
  return [
    "## 6. Expected Output From Codex",
    "- implementation summary",
    "- files changed",
    "- validation commands run",
    "- validation results",
    "- known risks",
    "- whether commit is recommended",
  ].join("\n");
}

function buildValidationChecklistSection({ task }) {
  const lines = [
    "## 7. Validation Checklist",
    "- `git status --short`",
    "- `git diff --check`",
    "- `git diff --stat`",
  ];

  if (task.validation) {
    lines.push("- task-specific validation: " + task.validation);
  } else {
    lines.push("- task-specific validation: define before completion if implementation changes behavior.");
  }

  if (isDataRelatedTask(task)) {
    lines.push("- data-related smoke check: run or request `tools/aiworkflow/json_smoke_check.bat`.");
  }

  if (isDiscordWorkflowTask(task)) {
    lines.push("- Discord workflow check: if command schema changed, suggest `npm --prefix tools\\discord-orchestrator run register`.");
    lines.push("- Discord workflow check: if command schema changed, suggest `tools\\discord-orchestrator\\restart_bot.bat` and `tools\\discord-orchestrator\\status_bot.bat`.");
  }

  return lines.join("\n");
}

function buildReturnInstructionsSection() {
  return [
    "## 8. Return Instructions",
    "- Do not commit.",
    "- Return summary and validation results to the human.",
    "- The human will paste results back into ChatGPT/Discord for review.",
  ].join("\n");
}

function mergeActiveTaskMetadata(backlogTask, activeMetadata = {}) {
  return {
    ...backlogTask,
    id: activeMetadata.task_id || backlogTask.id,
    item: activeMetadata.title || backlogTask.item,
    status: activeMetadata.status || backlogTask.status,
    priority: activeMetadata.priority || backlogTask.priority,
  };
}

async function readProjectContext(config) {
  const activeProjectPath = resolveRepoPath(config, ACTIVE_PROJECT_RELATIVE_PATH);
  const activeProject = await readJson(activeProjectPath, "ActiveProject.json");
  const profilePath = resolveProfilePath(config, activeProject.profile_path);
  const profile = await readJson(profilePath, "project profile");

  return {
    activeProject,
    profile,
    profileAbsolutePath: profilePath,
  };
}

async function writePromptFile(config, taskId, content) {
  const outputDir = resolveRepoPath(config, OUTPUT_RELATIVE_DIR);
  await fs.mkdir(outputDir, { recursive: true });

  for (let offsetSeconds = 0; offsetSeconds < 60; offsetSeconds += 1) {
    const stamp = formatTimestampForFile(new Date(Date.now() + offsetSeconds * 1000));
    const relativePath = path.join(OUTPUT_RELATIVE_DIR, `codex_request_${taskId}_${stamp}.md`);
    const absolutePath = resolveRepoPath(config, relativePath);
    assertAllowedOutputPath(config, absolutePath);

    if (await exists(absolutePath)) {
      continue;
    }

    await fs.writeFile(absolutePath, content, "utf8");
    return {
      relativePath: normalizePathForDiscord(relativePath),
      absolutePath,
    };
  }

  throw new Error("Failed to allocate a unique Codex prompt output path within one minute.");
}

function buildRecommendation(task, mode, contextLevel) {
  const priority = String(task.priority ?? "").toUpperCase();
  const reasoning = contextLevel === "compact" && MEDIUM_ALLOWED_PRIORITIES.has(priority)
    ? "medium"
    : "high";

  return {
    mode,
    model: CODEX_MODEL,
    reasoning,
  };
}

function normalizeChoice(value, fallback, allowedValues, fieldName) {
  const normalized = String(value ?? fallback).trim().toLowerCase();
  if (!allowedValues.has(normalized)) {
    throw new Error(`Invalid ${fieldName}: ${normalized}`);
  }
  return normalized;
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to read ${label}: ${error.message}`);
  }
}

function resolveProfilePath(config, profilePath) {
  const profilesRoot = resolveRepoPath(config, PROJECT_PROFILES_RELATIVE_DIR);
  const resolved = resolveRepoPath(config, profilePath);
  const relative = path.relative(profilesRoot, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`ActiveProject profile_path is outside ProjectProfiles: ${profilePath}`);
  }

  return resolved;
}

function assertAllowedOutputPath(config, targetPath) {
  const outputDir = resolveRepoPath(config, OUTPUT_RELATIVE_DIR);
  const resolved = path.resolve(targetPath);

  if (resolved === outputDir || resolved.startsWith(`${outputDir}${path.sep}`)) {
    return;
  }

  throw new Error(`Refusing to write outside approved Codex prompt output path: ${resolved}`);
}

function resolveRepoPath(config, relativePath) {
  return path.resolve(config.repoRoot, relativePath);
}

function appendValidationProfiles(lines, profiles) {
  const items = Array.isArray(profiles) ? profiles : [];
  if (items.length === 0) {
    lines.push("  - (none)");
    return;
  }

  for (const profile of items) {
    const details = [
      profile.id,
      profile.label,
      profile.type,
      profile.command ? `command: ${profile.command}` : "",
    ].filter(Boolean).join(" | ");
    lines.push("  - " + details);
  }
}

function appendList(lines, values) {
  const items = Array.isArray(values) ? values : [];
  if (items.length === 0) {
    lines.push("  - (none)");
    return;
  }

  for (const value of items) {
    lines.push("  - " + formatValue(value));
  }
}

function formatInlineList(values) {
  const items = Array.isArray(values) ? values : [];
  return items.length > 0 ? items.join(", ") : "(none)";
}

function formatValue(value) {
  const text = String(value ?? "").trim();
  return text || "(none)";
}

function jsonBlock(value) {
  return ["```json", JSON.stringify(value, null, 2), "```"].join("\n");
}

function isDataRelatedTask(task) {
  return taskText(task).match(/\b(data|json|loader|schema|gamedataloader)\b/i) !== null;
}

function isDiscordWorkflowTask(task) {
  return taskText(task).match(/\b(discord|bot|command|slash|orchestrator)\b/i) !== null;
}

function taskText(task) {
  return [
    task.id,
    task.kind,
    task.item,
    task.reason,
    task.tool_route,
    task.validation,
  ].filter(Boolean).join(" ");
}

function normalizePathForDiscord(value) {
  return String(value).replaceAll("\\", "/");
}

function formatTimestampForFile(date) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}_${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

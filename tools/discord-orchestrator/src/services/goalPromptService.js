import fs from "node:fs/promises";
import path from "node:path";
import { getBacklogTaskById, getCurrentTask } from "./taskService.js";

const ACTIVE_PROJECT_RELATIVE_PATH = "_Docs/AIWorkflow/ActiveProject.json";
const PROJECT_PROFILES_RELATIVE_DIR = "_Docs/AIWorkflow/ProjectProfiles";
const OUTPUT_RELATIVE_DIR = "_Temp/AIWorkflowTaskRequests";
const MODE_VALUES = new Set(["analysis", "implementation", "prototype", "review"]);
const CONTEXT_VALUES = new Set(["compact", "standard", "full"]);

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

export async function prepareGoalPrompt(config, input = {}) {
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
  const prompt = buildGoalPrompt({
    config,
    task,
    activeTask: activeTask.data,
    projectContext,
    mode,
    contextLevel,
    selectedFromActive,
  });
  const outputPath = await writePromptFile(config, task.id, prompt);

  return {
    ok: true,
    data: {
      task,
      mode,
      context_level: contextLevel,
      generated_path: outputPath.relativePath,
      absolute_path: outputPath.absolutePath,
    },
  };
}

function buildGoalPrompt(input) {
  return [
    buildGoalCommand(input.task, input.mode),
    "",
    "# Codex CLI Goal Task Request",
    "",
    buildObjectiveSection(input),
    "",
    buildContextSection(input),
    "",
    buildScopeSection(input),
    "",
    buildNonGoalsSection(),
    "",
    buildSafetySection(),
    "",
    buildHumanDecisionGatesSection(input),
    "",
    buildValidationPlanSection(input),
    "",
    buildStopConditionsSection(),
    "",
    buildRequiredReturnFormatSection(),
    "",
  ].join("\n");
}

function buildGoalCommand(task, mode) {
  return `/goal ${goalVerb(mode)} ${oneLine(task.id)}: ${oneLine(task.item)}`;
}

function buildObjectiveSection({ task, mode }) {
  return [
    "## 1. Objective",
    "- Task id: " + formatValue(task.id),
    "- Task title: " + formatValue(task.item),
    "- Mode: " + mode,
    "- Objective: " + modeObjective(mode, task),
  ].join("\n");
}

function buildContextSection({ config, projectContext, contextLevel, activeTask, task, selectedFromActive }) {
  const activeProject = projectContext.activeProject;
  const profile = projectContext.profile;
  const lines = [
    "## 2. Context",
    "- Repository: " + formatValue(config.repoRoot),
    "- Task source: " + (selectedFromActive ? "ActiveTask.md task_id resolved through Backlog.md" : "explicit Discord command id resolved through Backlog.md"),
    "- Active project id: " + formatValue(activeProject.active_project_id),
    "- Project profile path: " + formatValue(activeProject.profile_path),
    "- Project name: " + formatValue(profile.display_name),
    "- Engine: " + formatValue(profile.engine),
    "- Project type: " + formatValue(profile.project_type),
  ];

  if (contextLevel === "compact") {
    lines.push("- Source roots: " + formatInlineList(profile.source_roots));
    lines.push("- Data roots: " + formatInlineList(profile.data_roots));
    return lines.join("\n");
  }

  lines.push("- Source roots:");
  appendList(lines, profile.source_roots);
  lines.push("- Data roots:");
  appendList(lines, profile.data_roots);
  lines.push("- Validation profiles:");
  appendValidationProfiles(lines, profile.validation_profiles);

  if (contextLevel === "full") {
    lines.push("");
    lines.push("### ActiveProject");
    lines.push(jsonBlock(activeProject));
    lines.push("");
    lines.push("### ProjectProfile");
    lines.push(jsonBlock(profile));
    lines.push("");
    lines.push("### Relevant workflow docs");
    appendList(lines, RELEVANT_WORKFLOW_DOCS);
    lines.push("");
    lines.push("### Active task metadata");
    lines.push(jsonBlock(activeTask.metadata ?? {}));
    lines.push("");
    lines.push("### Backlog task row");
    lines.push(jsonBlock(task));
  }

  return lines.join("\n");
}

function buildScopeSection({ task, mode }) {
  const lines = [
    "## 3. Scope",
    "- Work only on task " + task.id + ": " + formatValue(task.item),
  ];

  if (mode === "analysis") {
    lines.push("- Analyze scope, architecture boundaries, risks, likely files, validation needs, and approval gates.");
    lines.push("- Do not modify files.");
  } else if (mode === "implementation") {
    lines.push("- Implement only the approved reduced-scope version of this task.");
    lines.push("- Keep command dispatch, loading/parsing, generation, formatting, and validation concerns separated.");
    lines.push("- Keep diffs small and reviewable.");
  } else if (mode === "prototype") {
    lines.push("- Produce a reduced-scope proof of the final-form architecture, not a disposable rewrite path.");
    lines.push("- Keep prototype changes explicitly bounded and easy to remove or promote.");
    lines.push("- Stop before broad runtime, schema, or architecture changes that need fresh approval.");
  } else if (mode === "review") {
    lines.push("- Review the current diff for bugs, regressions, missing validation, and scope violations.");
    lines.push("- Do not modify files unless the human explicitly asks for fixes.");
  }

  return lines.join("\n");
}

function buildNonGoalsSection() {
  return [
    "## 4. Non-goals",
    "- Do not execute Codex CLI automatically from Discord or scripts.",
    "- Do not execute OpenClaw.",
    "- Do not execute Claude.",
    "- Do not implement subagents.",
    "- Do not implement Unity AI.",
    "- Do not implement computer-use.",
    "- Do not add release, deploy, commit, or push automation.",
    "- Do not modify unrelated game source code.",
  ].join("\n");
}

function buildSafetySection() {
  return [
    "## 5. Required safety constraints",
    "- Do not execute Codex CLI automatically.",
    "- Do not execute OpenClaw.",
    "- Do not execute Claude.",
    "- Do not implement subagents.",
    "- Do not implement Unity AI.",
    "- Do not implement computer-use.",
    "- Do not commit.",
    "- Do not push.",
    "- Do not modify game source code except files required for the approved task.",
    "- Do not modify Backlog.md or ActiveTask.md unless the approved task explicitly requires workflow task-state edits.",
    "- Do not modify _Local/.",
    "- Do not modify node_modules/.",
    "- Do not expose secrets or local Discord configuration.",
    "- Do not run release or deployment scripts.",
  ].join("\n");
}

function buildHumanDecisionGatesSection({ mode }) {
  const lines = [
    "## 6. Human decision gates",
    "- Stop for human approval before source code implementation if this request is analysis or review mode.",
    "- Stop for human approval before any JSON schema, save/load, actor lifecycle, scene lifecycle, runtime behavior, build setting, or workflow rule change.",
    "- Stop for human approval if the implementation scope expands beyond the selected task.",
  ];

  if (mode === "implementation" || mode === "prototype") {
    lines.push("- Treat the pasted /goal request as approval only for the explicitly described task scope.");
  }

  return lines.join("\n");
}

function buildValidationPlanSection({ task }) {
  const lines = [
    "## 7. Validation plan",
    "- Run `git status --short` before and after implementation.",
    "- Run `git diff --check`.",
    "- Run `git diff --stat`.",
  ];

  if (task.validation) {
    lines.push("- Task-specific validation: " + task.validation);
  } else {
    lines.push("- Task-specific validation: define before completion if behavior changes.");
  }

  if (isDiscordWorkflowTask(task)) {
    lines.push("- If Discord command schema changes, run `npm --prefix tools\\discord-orchestrator run register`.");
    lines.push("- If bot behavior changes, run `tools\\discord-orchestrator\\restart_bot.bat` and `tools\\discord-orchestrator\\status_bot.bat`.");
  }

  if (isDataRelatedTask(task)) {
    lines.push("- If JSON/data loading changes, run or request `tools\\aiworkflow\\json_smoke_check.bat` and relevant runtime loader validation.");
  }

  lines.push("- Confirm `_Local/`, `node_modules/`, `.env`, `discord_bot.local.json`, and `_Temp/` artifacts are not tracked.");
  return lines.join("\n");
}

function buildStopConditionsSection() {
  return [
    "## 8. Stop conditions",
    "- Required approval is missing.",
    "- Repository context is insufficient for file-level instructions.",
    "- Scope mixes feature work with broad refactoring.",
    "- The task requires guessing about critical runtime behavior.",
    "- Validation criteria cannot be identified.",
    "- A requested change violates project architecture principles.",
    "- Tool permissions or safety constraints are unclear.",
    "- Unexpected dirty worktree changes affect files needed for this task.",
  ].join("\n");
}

function buildRequiredReturnFormatSection() {
  return [
    "## 9. Required return format",
    "1. Implementation summary",
    "2. Files changed",
    "3. Generated goal request behavior",
    "4. Validation commands run",
    "5. Validation results",
    "6. Known risks",
    "7. Commit recommendation",
  ].join("\n");
}

function goalVerb(mode) {
  switch (mode) {
    case "analysis":
      return "Analyze";
    case "prototype":
      return "Prototype";
    case "review":
      return "Review";
    default:
      return "Implement";
  }
}

function modeObjective(mode, task) {
  switch (mode) {
    case "analysis":
      return `Analyze ${task.id} and return architecture, scope, risk, validation, and stop-condition guidance without editing files.`;
    case "prototype":
      return `Prototype a reduced-scope final-form path for ${task.id}, staying within approved boundaries and preserving maintainable architecture.`;
    case "review":
      return `Review the current work for ${task.id}, focusing on bugs, regressions, missing validation, and scope violations.`;
    default:
      return `Implement ${task.id} within the approved reduced scope and return validation evidence without committing.`;
  }
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
    const relativePath = path.join(OUTPUT_RELATIVE_DIR, `goal_request_${taskId}_${stamp}.md`);
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

  throw new Error("Failed to allocate a unique goal request output path within one minute.");
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

  throw new Error(`Refusing to write outside approved goal request output path: ${resolved}`);
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

function oneLine(value) {
  return formatValue(value).replace(/\s+/g, " ");
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

import fs from "node:fs/promises";
import path from "node:path";
import { getRoleRouterRecommendationForTask } from "./roleRouterService.js";
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
  const roleRecommendation = getRoleRouterRecommendationForTask({
    task,
    activeTask: activeTask.data,
  });
  const prompt = buildGoalPrompt({
    config,
    task,
    activeTask: activeTask.data,
    projectContext,
    roleRecommendation,
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
    "# Codex Goal Prompt Contract v2",
    "",
    buildGoalHeaderSection(input),
    "",
    buildObjectiveSection(input),
    "",
    buildTaskContextSection(input),
    "",
    buildProjectContextSection(input),
    "",
    buildScopeSection(input),
    "",
    buildNonGoalsSection(),
    "",
    buildExecutionModeSection(input),
    "",
    buildSafetyConstraintsSection(),
    "",
    buildRoleRouterRecommendationsSection(input),
    "",
    buildHumanDecisionGatesSection(input),
    "",
    buildSubagentPolicySection(input),
    "",
    buildValidationPlanSection(input),
    "",
    buildStopConditionsSection(),
    "",
    buildCompletionAuditSection(),
    "",
    buildRequiredReturnFormatSection(),
    "",
  ].join("\n");
}

function buildRoleRouterRecommendationsSection({ roleRecommendation }) {
  const recommendation = roleRecommendation ?? {};
  const lines = [
    "## Role Router Recommendations",
    "- Source: roleRouterService recommendation for the selected task.",
    "- Purpose: make this Codex /goal request role-aware without executing agents, approving tasks, or changing task state.",
    "",
    "### Recommended Roles",
  ];

  appendList(lines, recommendation.recommended_roles);
  lines.push("", "### Role Rationale");
  appendList(lines, recommendation.role_rationale);
  lines.push("", "### Human Decision Gates");
  appendList(lines, recommendation.human_gates);
  lines.push("", "### Required Validation");
  appendList(lines, recommendation.required_validation);
  lines.push("", "### Suggested Execution Route");
  appendList(lines, recommendation.execution_route);
  lines.push("", "### Verdict Format Reminder");
  lines.push(formatValue(recommendation.verdict_format));
  lines.push("", "### Path-Scoped Rule Reminders");
  appendList(lines, recommendation.path_scoped_rule_reminders);

  return lines.join("\n");
}

function buildGoalCommand(task, mode) {
  return `/goal ${goalVerb(mode)} ${oneLine(task.id)}: ${oneLine(task.item)}`;
}

function buildGoalHeaderSection({ task, mode }) {
  return [
    "## 1. Goal Header",
    "- First-line command:",
    "```text",
    buildGoalCommand(task, mode),
    "```",
    "- The command above is the only Codex CLI command implied by this request.",
    "- Review the full request before treating the first line as executable.",
  ].join("\n");
}

function buildObjectiveSection({ task, mode }) {
  return [
    "## 2. Objective",
    "- Achieve the selected task without vague or expanded goals.",
    "- Task: " + formatValue(task.id) + " - " + formatValue(task.item),
    "- Reason: " + formatTaskField(task.reason, "reason"),
    "- Required outcome: " + modeObjective(mode, task),
  ].join("\n");
}

function buildTaskContextSection({ contextLevel, activeTask, task, selectedFromActive }) {
  const lines = [
    "## 3. Task Context",
    "- Task id: " + formatTaskField(task.id, "task id"),
    "- Title: " + formatTaskField(task.item, "title"),
    "- Status: " + formatTaskField(task.status, "status"),
    "- Priority: " + formatTaskField(task.priority, "priority"),
    "- Kind: " + formatTaskField(task.kind, "kind"),
    "- Reason: " + formatTaskField(task.reason, "reason"),
    "- Tool route: " + formatTaskField(task.tool_route, "tool route"),
    "- Validation: " + formatTaskField(task.validation, "validation"),
    "- Task source: " + (selectedFromActive ? "ActiveTask.md task_id resolved through Backlog.md" : "explicit Discord command id resolved through Backlog.md"),
  ];

  if (contextLevel === "full") {
    lines.push("");
    lines.push("### Active task metadata");
    lines.push(jsonBlock(activeTask.metadata ?? {}));
    lines.push("");
    lines.push("### Backlog task row");
    lines.push(jsonBlock(task));
  }

  return lines.join("\n");
}

function buildProjectContextSection({ config, projectContext, contextLevel }) {
  const activeProject = projectContext.activeProject;
  const profile = projectContext.profile;
  const lines = [
    "## 4. Project Context",
    "- Repository root: " + formatValue(config.repoRoot),
    "- Active project id: " + formatTaskField(activeProject.active_project_id, "active project id"),
    "- Project profile path: " + formatTaskField(activeProject.profile_path, "project profile path"),
    "- Project profile summary: " + formatProjectSummary(profile),
    "- Docs path: " + formatTaskField(profile.docs_path, "docs path"),
    "- Dev log path: " + formatTaskField(profile.devlog_path, "dev log path"),
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
  lines.push("- Asset roots:");
  appendList(lines, profile.asset_roots);
  lines.push("- Workflow state files:");
  appendWorkflowStateFiles(lines, profile.workflow_state_files);
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
  }

  return lines.join("\n");
}

function buildScopeSection({ task, mode }) {
  const lines = [
    "## 5. Scope",
    "- Work only on task " + task.id + ": " + formatValue(task.item),
    "- Treat the mode as binding for allowed behavior.",
  ];

  if (mode === "analysis") {
    lines.push("- Allowed: inspect files, command output, architecture boundaries, risks, likely files, validation needs, and approval gates.");
    lines.push("- Required: report findings and recommended next steps only.");
    lines.push("- Forbidden in this mode: file modifications.");
  } else if (mode === "implementation") {
    lines.push("- Allowed: modify only files required by the approved reduced-scope task.");
    lines.push("- Required: keep changes bounded to the task and document validation evidence.");
    lines.push("- Keep command dispatch, loading/parsing, generation, formatting, and validation concerns separated.");
    lines.push("- Keep diffs small and reviewable.");
  } else if (mode === "prototype") {
    lines.push("- Allowed: create an isolated prototype or experiment only if this request explicitly asks for one.");
    lines.push("- Required: keep prototype work aligned with final-form architecture, not a disposable rewrite path.");
    lines.push("- Keep prototype changes explicitly bounded and easy to remove or promote.");
    lines.push("- Stop before broad runtime, schema, or architecture changes that need fresh approval.");
  } else if (mode === "review") {
    lines.push("- Allowed: inspect the current diff, changed files, risks, regressions, missing validation, and scope violations.");
    lines.push("- Required: return review findings first, ordered by severity.");
    lines.push("- Forbidden in this mode: file modifications unless the human explicitly asks for fixes.");
  }

  return lines.join("\n");
}

function buildNonGoalsSection() {
  return [
    "## 6. Non-goals",
    "- Do not commit.",
    "- Do not push.",
    "- Do not release.",
    "- Do not expose secrets, credentials, tokens, or local private configuration.",
    "- Do not modify unrelated source files.",
    "- Do not modify _Local/.",
    "- Do not modify node_modules/.",
    "- Do not execute external agents unless explicitly approved.",
    "- Do not execute Codex CLI automatically from Discord or scripts.",
    "- Do not execute OpenClaw.",
    "- Do not execute Claude.",
    "- Do not implement Unity AI.",
    "- Do not implement computer-use.",
    "- Do not add release, deploy, commit, or push automation.",
  ].join("\n");
}

function buildExecutionModeSection({ mode }) {
  const lines = [
    "## 7. Execution Mode",
    "- Mode: " + mode,
    "- Expected behavior: " + modeBehavior(mode),
  ];

  if (mode === "analysis" || mode === "review") {
    lines.push("- No file modifications are allowed in this mode.");
    lines.push("- Return evidence-based findings, risks, and next-step recommendations.");
  } else if (mode === "implementation") {
    lines.push("- Bounded file changes are allowed only within the approved task scope.");
    lines.push("- Run or report validation evidence before declaring completion.");
  } else if (mode === "prototype") {
    lines.push("- Prototype work must remain isolated and explicitly labeled as prototype work.");
    lines.push("- Stop before promoting prototype behavior into production paths without approval.");
  }

  return lines.join("\n");
}

function buildSafetyConstraintsSection() {
  return [
    "## 8. Safety Constraints",
    "- Follow repository AGENTS.md and AIWorkflow source-of-truth documents.",
    "- Preserve final-form architecture first; use reduced scope only as a smaller version of that structure.",
    "- Keep decision, execution, and data responsibilities separated.",
    "- Avoid monolithic growth in actor, scene, manager, and data-manager classes.",
    "- Preserve debuggability, traceability, explicit state names, ownership, validation points, and failure messages.",
    "- Do not introduce GDI+ or rendering-policy changes without explicit approval.",
    "- Keep gameplay state, animation playback, rendering, and data building as separate responsibilities.",
    "- Request approval before source implementation, structural refactoring, schema/save changes, lifecycle changes, build setting changes, workflow rule changes, destructive commands, or tool execution that may modify files.",
    "- Do not execute Codex CLI automatically.",
    "- Do not execute OpenClaw.",
    "- Do not execute Claude.",
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
    "## 9. Human Decision Gates",
    "- Codex must not decide schema changes alone.",
    "- Codex must not decide save format changes alone.",
    "- Codex must not decide broad architecture changes alone.",
    "- Codex must not install external tools alone.",
    "- Codex must not perform computer-use actions alone.",
    "- Codex must not perform credential, login, or subscription setup alone.",
    "- Codex must not run destructive commands alone.",
    "- Codex must not commit, push, or release alone.",
    "- Stop for human approval before source code implementation if this request is analysis or review mode.",
    "- Stop for human approval before any JSON schema, save/load, actor lifecycle, scene lifecycle, runtime behavior, build setting, or workflow rule change.",
    "- Stop for human approval if the implementation scope expands beyond the selected task.",
  ];

  if (mode === "implementation" || mode === "prototype") {
    lines.push("- Treat the pasted /goal request as approval only for the explicitly described task scope.");
  }

  return lines.join("\n");
}

function buildSubagentPolicySection({ mode }) {
  const lines = [
    "## 10. Subagent Policy",
    "- Subagents are optional and must materially help the task.",
    "- If subagents are used, the final orchestrator must consolidate their findings before declaring completion.",
  ];

  if (mode === "analysis" || mode === "review") {
    lines.push("- Analysis/review mode: read-only subagents are allowed if useful.");
    lines.push("- Subagents must not modify files in this mode.");
  } else if (mode === "implementation") {
    lines.push("- Implementation mode: subagents may analyze or review, but must not modify files unless explicitly approved for a bounded write scope.");
    lines.push("- The primary Codex run remains responsible for integrating and verifying any findings.");
  } else if (mode === "prototype") {
    lines.push("- Prototype mode: subagents are allowed for planning and review.");
    lines.push("- Subagents must not expand prototype scope into production implementation without explicit approval.");
  }

  return lines.join("\n");
}

function buildValidationPlanSection({ task }) {
  const lines = [
    "## 11. Validation Plan",
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
    lines.push("- If JSON/data loading changes, run `tools\\aiworkflow\\json_smoke_check.bat` and relevant runtime loader validation.");
  }

  if (isGameRuntimeRelatedTask(task)) {
    lines.push("- If game runtime behavior changes, request human runtime validation and report the user-provided evidence.");
  }

  lines.push("- Confirm `_Local/`, `node_modules/`, `.env`, `discord_bot.local.json`, and `_Temp/` artifacts are not tracked.");
  return lines.join("\n");
}

function buildStopConditionsSection() {
  return [
    "## 12. Stop Conditions",
    "- Required approval is missing.",
    "- Repository context is insufficient for file-level instructions.",
    "- Scope becomes ambiguous.",
    "- Schema or save format changes appear necessary.",
    "- External credentials are needed.",
    "- Destructive commands are needed.",
    "- Validation fails repeatedly.",
    "- Implementation requires a human design decision.",
    "- Changes exceed reduced scope.",
    "- Scope mixes feature work with broad refactoring.",
    "- The task requires guessing about critical runtime behavior.",
    "- Validation criteria cannot be identified.",
    "- A requested change violates project architecture principles.",
    "- Tool permissions or safety constraints are unclear.",
    "- Unexpected dirty worktree changes affect files needed for this task.",
  ].join("\n");
}

function buildCompletionAuditSection() {
  return [
    "## 13. Completion Audit",
    "Before declaring complete, verify and report:",
    "- Objective satisfied.",
    "- Non-goals respected.",
    "- Files changed are in scope.",
    "- Validation commands were run, or explicitly not run with reasons.",
    "- Risks are documented.",
    "- No commit was performed.",
    "- Final `git status --short` is reported.",
  ].join("\n");
}

function buildRequiredReturnFormatSection() {
  return [
    "## 14. Required Return Format",
    "1. Implementation summary",
    "2. Files changed",
    "3. Contract v2 behavior, or analysis/review summary if no implementation was done",
    "4. Validation commands run",
    "5. Validation results",
    "6. Known risks",
    "7. Human decisions needed",
    "8. Commit recommendation",
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

function modeBehavior(mode) {
  switch (mode) {
    case "analysis":
      return "inspect and report only; do not modify files.";
    case "prototype":
      return "create an isolated reduced-scope experiment only when explicitly requested.";
    case "review":
      return "inspect current diff and risks only; do not modify files.";
    default:
      return "implement bounded approved changes only, with validation evidence and no commit.";
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

function appendWorkflowStateFiles(lines, files) {
  const entries = Object.entries(files ?? {});
  if (entries.length === 0) {
    lines.push("  - (none)");
    return;
  }

  for (const [key, value] of entries) {
    lines.push(`  - ${key}: ${formatValue(value)}`);
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

function formatTaskField(value, fieldName) {
  const text = String(value ?? "").trim();
  return text || `(incomplete: ${fieldName} unavailable)`;
}

function formatProjectSummary(profile) {
  const parts = [
    profile.project_id ? `id=${profile.project_id}` : "id unavailable",
    profile.display_name ? `name=${profile.display_name}` : "name unavailable",
    profile.engine ? `engine=${profile.engine}` : "engine unavailable",
    profile.project_type ? `type=${profile.project_type}` : "type unavailable",
  ];
  return parts.join(", ");
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

function isGameRuntimeRelatedTask(task) {
  return taskText(task).match(/\b(runtime|game|scene|actor|enemy|player|combat|reward|save|load|boot|outgame|ingame)\b/i) !== null;
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

import fs from "node:fs/promises";
import path from "node:path";
import { evaluateGoalExecutionReadiness } from "./goalReadinessService.js";
import { getPathRuleChecklistForTask } from "./pathRuleReminderService.js";
import { getRoleRouterRecommendationForTask } from "./roleRouterService.js";
import { getBacklogTaskById, getCurrentTask } from "./taskService.js";

const ACTIVE_PROJECT_RELATIVE_PATH = "_Docs/AIWorkflow/ActiveProject.json";
const PROJECT_PROFILES_RELATIVE_DIR = "_Docs/AIWorkflow/ProjectProfiles";
const OUTPUT_RELATIVE_DIR = "_Temp/AIWorkflowTaskRequests";
const MODE_VALUES = new Set(["analysis", "implementation", "prototype", "review"]);
const CONTEXT_VALUES = new Set(["compact", "standard", "full"]);
const COMPACT_PROMPT_WARNING_LENGTH = 9000;

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
  const pathRuleChecklist = getPathRuleChecklistForTask({
    task,
    activeTask: activeTask.data,
  });
  const prompt = buildGoalPrompt({
    config,
    task,
    activeTask: activeTask.data,
    projectContext,
    roleRecommendation,
    pathRuleChecklist,
    mode,
    contextLevel,
    selectedFromActive,
  });
  const outputPath = await writePromptFile(config, task.id, prompt);
  const readiness = evaluateGoalExecutionReadiness({
    task,
    activeTask: activeTask.data,
    mode,
    roleRecommendation,
    pathRuleChecklist,
  });

  return {
    ok: true,
    data: {
      task,
      mode,
      context_level: contextLevel,
      prompt_length: prompt.length,
      prompt_length_warning: contextLevel === "compact" && prompt.length > COMPACT_PROMPT_WARNING_LENGTH
        ? `Compact goal request is ${prompt.length} characters; target is below ${COMPACT_PROMPT_WARNING_LENGTH}.`
        : "",
      generated_path: outputPath.relativePath,
      absolute_path: outputPath.absolutePath,
      readiness,
    },
  };
}

function buildGoalPrompt(input) {
  if (input.contextLevel === "compact") {
    return buildCompactGoalPrompt(input);
  }

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
    buildPathScopedRuleRemindersSection(input),
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

function buildRoleRouterRecommendationsSection({ roleRecommendation, contextLevel }) {
  const recommendation = roleRecommendation ?? {};
  const lines = [
    "## Role Router Recommendations",
    "- Source: roleRouterService recommendation for the selected task.",
    "- Purpose: keep this request role-aware without duplicating full workflow policy.",
    "",
    "### Routing Summary",
    "- Roles: " + formatInlineList(recommendation.recommended_roles),
    "- Route: " + formatInlineList(recommendation.execution_route),
  ];

  lines.push("", "### Role Rationale");
  appendLimitedList(lines, recommendation.role_rationale, contextLevel === "full" ? 8 : 2, "rationale item");
  lines.push("", "### Human Decision Gates");
  appendLimitedList(lines, recommendation.human_gates, contextLevel === "full" ? 8 : 3, "gate");
  lines.push("", "### Required Validation");
  appendLimitedList(lines, recommendation.required_validation, contextLevel === "full" ? 10 : 5, "validation item");
  lines.push("", "### Verdict Format Reminder");
  lines.push(formatValue(recommendation.verdict_format));
  lines.push("", "### Path-Scoped Rule Reminders");
  appendLimitedList(lines, recommendation.path_scoped_rule_reminders, contextLevel === "full" ? 8 : 3, "path reminder");

  return lines.join("\n");
}

function buildPathScopedRuleRemindersSection({ pathRuleChecklist, contextLevel }) {
  const checklist = pathRuleChecklist ?? {};
  const lines = [
    "## Path-Scoped Rule Reminders",
    "- Source: " + formatValue(checklist.source),
    "- Purpose: include only reminders for likely affected paths. These reminders do not approve extra files or expand scope.",
    "- Selection inputs:",
  ];

  const selectionInputs = checklist.selection_inputs ?? {};
  for (const [key, value] of Object.entries(selectionInputs)) {
    lines.push(`  - ${key}: ${formatValue(value)}`);
  }

  const scopes = Array.isArray(checklist.matched_scopes) ? checklist.matched_scopes : [];
  if (scopes.length === 0) {
    lines.push("", "### No path-specific scope inferred");
    lines.push("- [ ] Apply global repository safety, review, validation, and no-commit rules.");
    return lines.join("\n");
  }

  for (const scope of scopes) {
    lines.push("", "### " + formatValue(scope.path));
    const displayPaths = Array.isArray(scope.display_paths) ? scope.display_paths : [];
    if (displayPaths.length > 0) {
      lines.push("- Applies to: " + displayPaths.map(formatValue).join(", "));
    }

    appendLimitedChecklist(lines, scope.checklist_items, contextLevel === "full" ? 10 : 4, "checklist item");
  }

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
    "- Do not commit, push, release, or add automation for those actions.",
    "- Do not expose secrets, credentials, tokens, or local private configuration.",
    "- Do not modify unrelated files, `_Local/`, `node_modules/`, or tracked `_Temp/` artifacts.",
    "- Do not execute external agents, Codex CLI, OpenClaw, Claude, Unity AI, or computer-use unless this request explicitly approves that behavior.",
  ].join("\n");
}

function buildCompactGoalPrompt(input) {
  return [
    buildGoalCommand(input.task, input.mode),
    "",
    "# Compact Codex Goal Prompt Contract v2",
    "",
    buildCompactGoalHeaderSection(input),
    "",
    buildCompactTaskSummarySection(input),
    "",
    buildCompactApprovedScopeSection(input),
    "",
    buildCompactNonGoalsSection(),
    "",
    buildCompactTaskSpecificRequirementsSection(input.task),
    "",
    buildCompactAcceptanceCriteriaSection(input.task),
    "",
    buildCompactScopeGuardSection(input.task),
    "",
    buildCompactPathRemindersSection(input),
    "",
    buildCompactValidationPlanSection(input.task),
    "",
    buildCompactReturnFormatSection(),
    "",
  ].join("\n");
}

function buildCompactGoalHeaderSection({ task, mode }) {
  return [
    "## Goal Header",
    "```text",
    buildGoalCommand(task, mode),
    "```",
    "- This is the only Codex CLI command implied by this request.",
    "- Read the full request before treating the first line as executable.",
  ].join("\n");
}

function buildCompactTaskSummarySection({ config, projectContext, task, mode, selectedFromActive }) {
  const profile = projectContext?.profile ?? {};
  const activeProject = projectContext?.activeProject ?? {};
  return [
    "## Task Summary",
    "- Task: " + formatValue(task.id) + " - " + formatValue(task.item),
    "- Mode: " + mode,
    "- Status/Priority/Kind: " + [task.status, task.priority, task.kind].map(formatValue).join(" / "),
    "- Tool route: " + formatTaskField(task.tool_route, "tool route"),
    "- Source: " + (selectedFromActive ? "ActiveTask.md task_id resolved through Backlog.md" : "explicit Discord command id resolved through Backlog.md"),
    "- Repository root: " + formatValue(config?.repoRoot),
    "- Active project: " + formatValue(activeProject.active_project_id),
    "- Source roots: " + formatInlineList(profile.source_roots),
    "- Data roots: " + formatInlineList(profile.data_roots),
    "- Reason: " + formatTaskField(task.reason, "reason"),
  ].join("\n");
}

function buildCompactApprovedScopeSection({ task }) {
  const validation = String(task.validation ?? "").trim();
  const lines = [
    "## Approved Scope",
    validation ? "- " + validation : "- Use the approved task scope in Backlog.md.",
    "- Keep Task Lifecycle State separate from Runtime Execution State.",
    "- Keep changes bounded to this task and report validation evidence.",
  ];

  return lines.join("\n");
}

function buildCompactNonGoalsSection() {
  return [
    "## Non-goals",
    "- No commit, push, release, or deploy.",
    "- No private/local/_Temp tracking or secret exposure.",
    "- No Verification Gate or Completion Card.",
    "- No automatic approval, auto-done, or pass/fail judgment.",
    "- No Runtime Control, pause/stop/retry/replan control unless explicitly approved.",
    "- No game source/data changes unless explicitly required.",
  ].join("\n");
}

function buildCompactTaskSpecificRequirementsSection(task) {
  const requirements = inferTaskSpecificRequirements(task);
  return [
    "## Task-specific Requirements",
    ...requirements.map((item) => "- " + item),
  ].join("\n");
}

function buildCompactAcceptanceCriteriaSection(task) {
  const criteria = inferAcceptanceCriteria(task);
  return [
    "## Acceptance Criteria",
    ...criteria.map((item) => "- " + item),
  ].join("\n");
}

function buildCompactScopeGuardSection(task) {
  const guards = inferTaskScopeGuards(task);
  const lines = ["## Scope Guard"];

  if (guards.length === 0) {
    lines.push("- Treat generated requirements as bounded task scope only; do not infer extra implementation authority.");
  } else {
    lines.push(...guards.map((item) => "- " + item));
  }

  lines.push(...implementationSanityGuardrails().map((item) => "- " + item));
  return lines.join("\n");
}

function buildCompactPathRemindersSection({ pathRuleChecklist }) {
  const scopes = Array.isArray(pathRuleChecklist?.matched_scopes)
    ? pathRuleChecklist.matched_scopes
    : [];

  const lines = [
    "## Relevant Path Reminders",
    "- Source: " + formatValue(pathRuleChecklist?.source),
  ];

  if (scopes.length === 0) {
    lines.push("- Apply global repository safety: keep scope bounded, validate honestly, and do not commit.");
    return lines.join("\n");
  }

  for (const scope of scopes.slice(0, 4)) {
    lines.push("- " + formatValue(scope.path) + ":");
    const items = Array.isArray(scope.checklist_items) ? scope.checklist_items.slice(0, 4) : [];
    for (const item of items) {
      lines.push("  - " + formatValue(item));
    }
  }

  return lines.join("\n");
}

function buildCompactValidationPlanSection(task) {
  const lines = [
    "## Validation Plan",
    "- Run `git status --short` before and after implementation.",
    "- Run `git diff --check`.",
    "- Run `git diff --stat`.",
    "- Run changed script syntax/check commands for modified local workflow scripts.",
  ];

  if (task.validation) {
    lines.push("- Task-specific validation: " + summarizeText(task.validation, 360));
  }

  if (isDiscordWorkflowTask(task)) {
    lines.push("- If Discord schema or bot behavior changes, run register/restart/status validation.");
  }

  lines.push("- Confirm no `PlayGround/Project` or `PlayGround/Data` changes unless explicitly approved.");
  lines.push("- Confirm `_Local/`, `node_modules/`, `.env`, `discord_bot.local.json`, and `_Temp/` artifacts are not tracked.");
  return lines.join("\n");
}

function buildCompactReturnFormatSection() {
  return [
    "## Return Format",
    "1. Implementation summary",
    "2. Files changed",
    "3. Validation commands run",
    "4. Validation results",
    "5. Known risks",
    "6. Human decisions needed",
    "7. Commit recommendation",
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
    "- Keep work inside the selected task, approved mode, and allowed file scope.",
    "- Preserve final-form architecture: separate decision, execution, data, animation, rendering, and validation responsibilities.",
    "- Stop for explicit approval before source implementation, structural refactoring, schema/save/load, lifecycle, runtime, build setting, workflow rule, destructive, or external-tool changes outside this request.",
    "- Do not commit, push, release, expose secrets, modify private/local/dependency folders, or execute agents/Codex CLI automatically.",
    ...implementationSanityGuardrails().map((item) => "- " + item),
  ].join("\n");
}

function implementationSanityGuardrails() {
  return [
    "Think before coding: restate objective, success criteria, and validation plan internally before editing.",
    "Simplicity first: implement the smallest useful slice of the approved final-form boundary.",
    "Surgical changes: every changed file must map to the approved task.",
    "No drive-by refactors, speculative abstractions, unrelated cleanup, or validation claims without evidence.",
  ];
}

function buildHumanDecisionGatesSection({ mode }) {
  const lines = [
    "## 9. Human Decision Gates",
    "- Stop if approval is missing for the current mode or task scope.",
    "- Stop before schema/save/load, broad architecture, lifecycle/runtime, build setting, workflow rule, external-tool, credential, computer-use, destructive, commit, push, or release decisions.",
    "- Stop if scope expands beyond the selected task.",
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
    "- Required approval, repository context, validation criteria, or tool permissions are unclear.",
    "- Scope expands, mixes feature work with broad refactoring, or requires guessing about critical runtime behavior.",
    "- Schema/save/load, external credentials, destructive commands, or human design decisions become necessary.",
    "- Validation fails repeatedly or unexpected dirty worktree changes affect task files.",
    "- A requested change violates project architecture or safety constraints.",
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

function appendLimitedList(lines, values, maxCount, label) {
  const items = Array.isArray(values) ? values : [];
  if (items.length === 0) {
    lines.push("  - (none)");
    return;
  }

  for (const value of items.slice(0, maxCount)) {
    lines.push("  - " + formatValue(value));
  }

  if (items.length > maxCount) {
    lines.push(`  - ... ${items.length - maxCount} more ${label}s omitted from compact request.`);
  }
}

function appendLimitedChecklist(lines, values, maxCount, label) {
  const items = Array.isArray(values) ? values : [];
  if (items.length === 0) {
    lines.push("- [ ] (none)");
    return;
  }

  for (const value of items.slice(0, maxCount)) {
    lines.push("- [ ] " + formatValue(value));
  }

  if (items.length > maxCount) {
    lines.push(`- [ ] ... ${items.length - maxCount} more ${label}s omitted from compact request.`);
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
  const text = taskText(task);
  if (/do not modify game source|no game source files|do not change game source|no game source\/data files/i.test(text)) {
    return false;
  }

  return text.match(/\b(runtime|gameplay|scene|actor|enemy|player|combat|reward|save|load|boot|outgame|ingame)\b/i) !== null;
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

function inferTaskSpecificRequirements(task) {
  const text = taskText(task);

  if (isFileWatcherDiffSnapshotTask(text)) {
    return [
      "workspace_path 기준 파일 변경 감지 인터페이스.",
      "session_id 기준 changed_files 기록.",
      "git diff snapshot 파일 저장.",
      "EvidenceRecord에 changed_files와 diff_snapshot_path 연결.",
      "ProgressEventLog에 file change event 기록.",
      "/task-style detail에서 최근 변경 파일 확인 가능.",
      "ignore path policy.",
      "workspace/session/git diff 오류 기록.",
      "WF-209 Runtime Control handoff.",
      "File watcher and diff snapshots는 변경 감지와 snapshot 저장만 담당하고, diff gate pass/fail 판정은 하지 않는다.",
    ];
  }

  if (isProgressHeartbeatTask(text)) {
    return [
      "Implement session_id-based progress/heartbeat collection only.",
      "Record last_heartbeat_at, last_activity, and activity_summary.",
      "Use or extend ProgressEventLog for progress/activity events.",
      "Expose task/session runtime summary data for /tasks-style and /task-style views.",
      "Document WF-208 file watcher and diff snapshot handoff.",
      "Do not implement execution control, verification judgment, or completion automation.",
    ];
  }

  return [
    "Implement only the approved reduced scope for this task.",
    "Preserve existing task state semantics and source-of-truth documents.",
    "Keep decision, execution, state, evidence, and formatting concerns separated.",
  ];
}

function inferAcceptanceCriteria(task) {
  const text = taskText(task);

  if (isFileWatcherDiffSnapshotTask(text)) {
    return [
      "workspace_path 기준 파일 변경 감시가 가능함.",
      "session_id 기준 changed_files가 기록됨.",
      "git diff snapshot이 파일로 저장됨.",
      "EvidenceRecord에 changed_files와 diff_snapshot_path가 연결됨.",
      "ProgressEventLog에 파일 변경 이벤트가 기록됨.",
      "/task WF-XXX 스타일 상세에서 최근 변경 파일을 확인할 수 있음.",
      "ignore path 정책이 설정으로 분리됨.",
      "workspace/session/git diff 오류가 기록됨.",
      "diff 해석이나 pass/fail 판정은 하지 않음.",
    ];
  }

  if (isProgressHeartbeatTask(text)) {
    return [
      "session_id-based heartbeat update is possible.",
      "last_heartbeat_at, last_activity, and activity_summary are recorded.",
      "ProgressEventLog is updated or extended.",
      "Codex CLI and Local CLI execution activity can be reflected as progress.",
      "idle/stalled display state can be computed.",
      "/tasks-style summary data is available.",
      "/task-style session detail data is available.",
      "idle/stalled is display-only and does not control execution.",
      "WF-208 file watcher and diff snapshot handoff is documented.",
    ];
  }

  return [
    "Objective is satisfied within the approved scope.",
    "Required validation is run or explicitly deferred with reason.",
    "No forbidden automation, commit/push, private-file tracking, or unrelated game changes occur.",
  ];
}

function inferTaskScopeGuards(task) {
  const text = taskText(task);

  if (isFileWatcherDiffSnapshotTask(text)) {
    return [
      "File watcher and diff snapshots는 변경 감지와 snapshot 저장만 담당하고, diff gate pass/fail 판정은 하지 않는다.",
      "Treat changed_files, diff_snapshot_path, and file-change ProgressEventLog entries as evidence metadata only.",
      "Do not use file change detection to approve, complete, reject, or change task state.",
    ];
  }

  return [];
}

function isFileWatcherDiffSnapshotTask(text) {
  const describesFileChangeCollection = /file watcher|detect file changes|file changes in a task workspace|file change events?/i.test(text);
  const describesDiffSnapshots = /diff snapshot|diff_snapshot_path|git diff snapshots?/i.test(text);
  return describesFileChangeCollection
    && describesDiffSnapshots
    && !/do not implement file watcher|do not implement.*diff snapshotter/i.test(text);
}

function isProgressHeartbeatTask(text) {
  return /WF-207|progress and heartbeat|progress\/heartbeat|heartbeat|last_activity|activity_summary|idle\/stalled/i.test(text);
}

function summarizeText(value, maxLength) {
  const text = oneLine(value);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
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

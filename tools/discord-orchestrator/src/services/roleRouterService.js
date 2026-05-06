import { runScript } from "./commandRunner.js";

const ROLE_ROUTER_SCRIPT = "tools/aiworkflow/role_router_status.bat";
const REVIEW_VALIDATION_VERDICT_FORMAT =
  "Use Review_Validation_Verdict_Format_v1.md with PASS, PASS_WITH_NOTES, CONCERNS, BLOCKED, or FAIL. Do not use PASS when required validation was skipped.";

export async function getRoleRouterStatus(config) {
  const result = await runScript(config, ROLE_ROUTER_SCRIPT, ["--json"]);

  if (!result.ok) {
    return {
      ok: false,
      error: buildScriptError(result),
      raw: result,
    };
  }

  if (!result.stdout || result.stdout.trim().length === 0) {
    return {
      ok: false,
      error: [
        "Role router status script produced empty stdout.",
        `Script: ${result.script}`,
        `Exit code: ${result.code}`,
        `stdout length: ${result.stdoutLength ?? 0}`,
        `stderr length: ${result.stderrLength ?? 0}`,
        result.stderr ? `stderr: ${result.stderr.slice(0, 800)}` : "",
        "Next action: run tools\\aiworkflow\\role_router_status.bat --json from repo root and compare output.",
      ].filter(Boolean).join("\n"),
      raw: result,
    };
  }

  try {
    const data = JSON.parse(result.stdout);
    if (data?.ok === false) {
      return {
        ok: false,
        error: data.error || "Role router status script reported failure.",
        raw: result,
        data,
      };
    }

    return {
      ok: true,
      data,
      raw: result,
    };
  } catch (error) {
    return {
      ok: false,
      error: [
        `Failed to parse role router status JSON: ${error.message}`,
        `stdout length: ${result.stdoutLength ?? result.stdout.length}`,
        `stderr length: ${result.stderrLength ?? 0}`,
        result.stderr ? `stderr: ${result.stderr.slice(0, 800)}` : "",
        "stdout preview:",
        result.stdout.slice(0, 800),
      ].filter(Boolean).join("\n"),
      raw: result,
    };
  }
}

export function getRoleRouterRecommendationForTask(input = {}) {
  const task = input.task ?? {};
  const activeTask = input.activeTask ?? {};
  const activeMetadata = activeTask.metadata ?? {};
  const taskId = task.id || activeMetadata.task_id || "unknown";
  const taskTitle = task.item || activeMetadata.title || "unknown";
  const category = getCategory(taskId);
  const kind = String(task.kind || "").trim() || "unknown";
  const priority = String(task.priority || activeMetadata.priority || "").trim() || "unknown";
  const risk = String(activeMetadata.risk_level || "").trim() || "unknown";
  const status = String(task.status || activeMetadata.status || "").trim() || "unknown";
  const contextText = [
    taskId,
    taskTitle,
    status,
    category,
    kind,
    priority,
    risk,
    task.reason,
    task.tool_route,
    task.validation,
    activeMetadata.workflow_path,
  ].filter(Boolean).join("\n");

  const recommendedRoles = [];
  const roleRationale = [];
  const humanGates = [];
  const requiredValidation = [];
  const executionRoute = [];
  const pathScopedRuleReminders = [];

  addUnique(recommendedRoles, "Orchestrator");
  addUnique(roleRationale, "Every AIWorkflow task activates Orchestrator for scope, routing, human gates, and next-step control.");

  const isDocumentation = matches(kind, /documentation|doc/i)
    || category === "DOC"
    || testTerm(contextText, [/_Docs\/AIWorkflow/i, /_DevLog/i, /documentation/i, /document/i]);
  const isAutomation = matches(kind, /automation|tool|workflow/i)
    || category === "WF"
    || testTerm(contextText, [/tools[\\/]+aiworkflow/i, /role router/i, /script/i, /automation/i, /workflow tool/i]);
  const isGameplay = category === "GAME"
    || testTerm(contextText, [/PlayGround[\\/]+Project[\\/]+Gameplay/i, /gameplay implementation/i, /runtime behavior/i, /manual runtime validation/i]);
  const isData = category === "DATA"
    || testTerm(contextText, [/PlayGround[\\/]+Data/i, /json schema/i, /schema/i, /save\/load/i, /data validation/i, /data loader/i]);
  const isDiscord = testTerm(contextText, [/tools[\\/]+discord-orchestrator/i, /discord command/i, /command.*discord/i, /prepare goal/i, /goal prompt/i, /bot register/i, /bot restart/i, /bot status/i, /\/ai /i]);

  const negativeDiscord = testTerm(contextText, [/do not (modify|change) discord command behavior/i, /no discord command behavior/i]);
  const positiveDiscordChange = isDiscord
    && !negativeDiscord
    && testTerm(contextText, [/modif(y|ies|ication).*discord command/i, /change.*discord command/i, /discord command behavior change/i, /bot runtime behavior/i, /\/ai prepare goal/i]);

  const negativeGameSource = testTerm(contextText, [/do not modify game source/i, /no game source files/i, /do not change game source/i]);
  const positiveGameplayRuntime = isGameplay && !negativeGameSource;

  const positiveDataChange = isData
    && testTerm(contextText, [/PlayGround[\\/]+Data/i, /json schema/i, /schema/i, /data validation/i, /data loader/i])
    && !testTerm(contextText, [/do not modify.*data/i, /no data files/i]);

  if (isDocumentation) {
    addManyUnique(recommendedRoles, ["Documentation Keeper", "Reviewer"]);
    addUnique(roleRationale, "Documentation scope activates Documentation Keeper and Reviewer for durable records, policy consistency, and document-map review.");
    addUnique(pathScopedRuleReminders, "_Docs/AIWorkflow/** and _DevLog/** changes require policy consistency review, accurate evidence, document map checks when indexes change, and no invented validation results.");
  }

  if (isAutomation) {
    addManyUnique(recommendedRoles, ["Tool/Workflow Engineer", "Reviewer", "Validator"]);
    addUnique(roleRationale, "Automation/workflow scope activates Tool/Workflow Engineer, Reviewer, and Validator for command behavior, safety boundaries, and validation evidence.");
    addUnique(pathScopedRuleReminders, "tools/aiworkflow/** changes require explicit command behavior, no automatic approval/source modification/agent execution, command validation, and private file tracking checks.");
  }

  if (isDiscord) {
    addManyUnique(recommendedRoles, ["Tool/Workflow Engineer", "Reviewer", "Validator", "Documentation Keeper"]);
    addUnique(roleRationale, "Discord orchestrator scope activates Tool/Workflow Engineer, Reviewer, Validator, and Documentation Keeper for command contract safety and documentation alignment.");
    addUnique(pathScopedRuleReminders, "tools/discord-orchestrator/** changes must not execute Codex, agents, commits, pushes, releases, or expose local Discord config; register/restart/status validation is required when command behavior changes.");
  }

  if (isGameplay) {
    addManyUnique(recommendedRoles, ["Explorer", "Technical Architect", "Gameplay Implementer", "Reviewer", "Validator"]);
    addUnique(roleRationale, "Gameplay scope activates Explorer, Technical Architect, Gameplay Implementer, Reviewer, and Validator for runtime behavior, lifecycle, and component risk.");
    addUnique(pathScopedRuleReminders, "PlayGround/Project/** changes require explicit source/runtime approval, Debug x64 build evidence, and manual runtime validation when behavior changes.");
  }

  if (isData) {
    addManyUnique(recommendedRoles, ["Explorer", "Technical Architect", "Validator", "Reviewer"]);
    addUnique(roleRationale, "Data or JSON scope activates Explorer, Technical Architect, Validator, and Reviewer for schema, loader, and semantic validation risk.");
    addUnique(pathScopedRuleReminders, "PlayGround/Data/** changes require JSON syntax validation, schema/default/invalid-data behavior clarity, and runtime loader validation when behavior changes.");
  }

  if (!isDocumentation && !isAutomation && !isDiscord && !isGameplay && !isData) {
    addUnique(recommendedRoles, "Reviewer");
    addUnique(recommendedRoles, "Validator");
    addUnique(roleRationale, "No path-specific specialization was inferred; keep normal review, validation, and Human Director commit decision gates.");
    addUnique(pathScopedRuleReminders, "Apply global Path_Scoped_Rule_Mapping_DustLand_v1 rules: review scope, validate actual diffs, avoid forbidden paths, and do not commit automatically.");
  }

  if (/^P[01]$/i.test(priority) || /high/i.test(risk)) {
    addUnique(humanGates, "Human Director Gate: P0/P1 or high-risk task requires explicit approval before implementation and before accepting validation deferral.");
  }

  if (testTerm(contextText, [/schema/i, /save\/load/i, /runtime behavior/i, /external tool/i, /computer-use/i, /destructive command/i])) {
    addUnique(humanGates, "Human Decision Gate: schema/save/runtime/external-tool/computer-use/destructive-command scope must be explicitly approved if actually modified or executed.");
  }

  if (positiveDiscordChange) {
    addUnique(humanGates, "Human Decision Gate: Discord command behavior or prompt generation behavior changes require explicit approval.");
  }

  if (positiveDataChange) {
    addUnique(humanGates, "Human Decision Gate: PlayGround/Data or JSON/schema behavior change requires explicit approval.");
  }

  if (positiveGameplayRuntime) {
    addUnique(humanGates, "Human Decision Gate: gameplay runtime behavior change requires explicit approval.");
  }

  if (humanGates.length === 0) {
    addUnique(humanGates, "No additional high-risk gate inferred beyond normal Human Director review, validation acceptance, and commit decision.");
  }

  addManyUnique(requiredValidation, [
    "Run git status --short.",
    "Run git diff --check.",
    "Run git diff --stat.",
    "Verify no forbidden paths were modified.",
  ]);

  if (isAutomation) {
    addManyUnique(requiredValidation, [
      "Run changed local AIWorkflow command validation when a local workflow script changes.",
      "Verify JSON output is valid when JSON mode is affected.",
      "Verify no agents are executed and no automatic approval occurs.",
    ]);
  }

  if (isDiscord || positiveDiscordChange) {
    addManyUnique(requiredValidation, [
      "Run npm --prefix tools\\discord-orchestrator run register.",
      "Run tools\\discord-orchestrator\\restart_bot.bat.",
      "Run tools\\discord-orchestrator\\status_bot.bat.",
      "Run Discord command smoke tests for affected /ai commands.",
      "Run private file tracking check.",
    ]);
  }

  if (isDocumentation) {
    addUnique(requiredValidation, "Verify README/document map links new durable workflow documents when updated.");
  }

  if (positiveDataChange) {
    addManyUnique(requiredValidation, [
      "Run tools\\aiworkflow\\json_smoke_check.bat.",
      "Record semantic validation notes for data/schema behavior.",
    ]);
  }

  if (positiveGameplayRuntime) {
    addManyUnique(requiredValidation, [
      "Run Debug x64 build.",
      "Run manual runtime validation and record observed result.",
    ]);
  }

  addUnique(executionRoute, "Orchestrator");
  if (isAutomation || isDiscord) {
    addUnique(executionRoute, "Tool/Workflow Engineer");
  }
  if (isGameplay || isData) {
    addUnique(executionRoute, "Explorer");
    addUnique(executionRoute, "Technical Architect");
  }
  if (isGameplay) {
    addUnique(executionRoute, "Gameplay Implementer after approval");
  }
  if (isDocumentation) {
    addUnique(executionRoute, "Documentation Keeper");
  }
  addManyUnique(executionRoute, ["Reviewer", "Validator", "Human Director commit decision"]);

  addUnique(pathScopedRuleReminders, "Global rule: do not modify _Local/, node_modules/, _Temp/ tracked artifacts, secrets, release/deploy scripts, or unrelated files.");

  return {
    ok: true,
    task: {
      task_id: taskId,
      title: taskTitle,
      status,
      category,
      kind,
      priority,
      risk_level: risk,
    },
    recommended_roles: recommendedRoles,
    role_rationale: roleRationale,
    human_gates: humanGates,
    required_validation: requiredValidation,
    execution_route: executionRoute,
    verdict_format: REVIEW_VALIDATION_VERDICT_FORMAT,
    path_scoped_rule_reminders: pathScopedRuleReminders,
  };
}

function buildScriptError(result) {
  return [
    "Role router status script failed.",
    `Script: ${result.script}`,
    `Exit code: ${result.code}`,
    result.timedOut ? "Timed out: yes" : "Timed out: no",
    result.stderr ? `stderr: ${result.stderr.slice(0, 800)}` : "",
    result.stdout ? `stdout: ${result.stdout.slice(0, 800)}` : "",
  ].filter(Boolean).join("\n");
}

function getCategory(taskId) {
  const match = String(taskId ?? "").match(/^([A-Za-z]+)-/);
  return match ? match[1].toUpperCase() : "UNKNOWN";
}

function matches(value, pattern) {
  return pattern.test(String(value ?? ""));
}

function testTerm(text, patterns) {
  return patterns.some((pattern) => pattern.test(String(text ?? "")));
}

function addUnique(list, value) {
  const text = String(value ?? "").trim();
  if (text && !list.includes(text)) {
    list.push(text);
  }
}

function addManyUnique(list, values) {
  for (const value of values) {
    addUnique(list, value);
  }
}

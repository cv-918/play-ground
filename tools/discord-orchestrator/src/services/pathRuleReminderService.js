const PATH_RULE_SOURCE = "_Docs/AIWorkflow/Path_Scoped_Rule_Mapping_DustLand_v1.md";

const ROOT_CONFIG_FILES = [
  "AGENTS.md",
  "README.md",
  ".editorconfig",
  ".gitattributes",
];

const PATH_RULE_SCOPES = [
  {
    path: "PlayGround/Project/Gameplay/**",
    patterns: [
      /PlayGround[\\/]+Project[\\/]+Gameplay/i,
      /\bgameplay\b/i,
      /\bcombat\b/i,
      /\bplayer\b/i,
      /\benemy\b/i,
      /\bscene\b/i,
      /\bactor\b/i,
      /\bcomponent\b/i,
      /\bruntime behavior\b/i,
    ],
    negativePatterns: [/do not modify game source/i, /no game source files/i],
    items: [
      "Confirm source/runtime approval before modifying gameplay files or behavior.",
      "Keep FSM/gameplay decisions, animator playback, renderer drawing, and data assembly separated.",
      "Review actor, scene, component, ownership, registration, delayed-destruction, and cleanup lifecycle effects.",
      "Avoid broad early returns after partial scene initialization unless the lifecycle function is fail-atomic.",
      "Validate source behavior changes with Debug x64 build evidence and manual runtime observations.",
      "Run JSON/data checks when gameplay behavior depends on PlayGround/Data changes.",
    ],
  },
  {
    path: "PlayGround/Project/EngineSystems/**",
    patterns: [
      /PlayGround[\\/]+Project[\\/]+EngineSystems/i,
      /\bengine system/i,
      /\brenderer\b/i,
      /\brendering\b/i,
      /\bWinAPI\b/i,
      /\binput\b/i,
      /\bcollision\b/i,
      /\btiming\b/i,
      /\bresource service\b/i,
    ],
    items: [
      "Confirm explicit approval before engine, renderer, input, collision, timing, resource, or lifecycle behavior changes.",
      "Preserve the existing WinAPI/custom rendering pipeline; do not introduce GDI+ without a separate rendering-policy approval.",
      "Keep engine execution, gameplay decisions, and data parsing in separate responsibilities.",
      "Review initialization, update, render, ownership, registration, scene transition, and callback cleanup ordering.",
      "Validate source changes with Debug x64 build evidence and manual runtime validation for affected engine behavior.",
      "Run resource/data validation when engine changes affect resource lookup or data loading.",
    ],
  },
  {
    path: "PlayGround/Data/**",
    patterns: [
      /PlayGround[\\/]+Data(?![\\/]+Resources)/i,
      /\bDATA-\d+/i,
      /\bdata\b/i,
      /\bschema\b/i,
      /\bloader\b/i,
      /\bGameDataLoader\b/i,
      /\bSkill\.json\b/i,
      /\bPlayableCharacter\.json\b/i,
      /\bAttributeNode\.json\b/i,
      /\bsave\/load\b/i,
    ],
    negativePatterns: [/do not modify.*data/i, /no data files/i],
    items: [
      "Confirm explicit approval before JSON schema, field meaning/default, save/load, or data-loader behavior changes.",
      "Define field names, meanings, required/optional status, defaults, invalid-data behavior, and migration needs for schema changes.",
      "Keep raw data, loader/builder behavior, gameplay decisions, and runtime execution responsibilities separated.",
      "Review data IDs, resource paths, loader expectations, and backward compatibility.",
      "Run `tools\\aiworkflow\\json_smoke_check.bat` for JSON edits.",
      "Record runtime loader validation and manual gameplay evidence when data changes affect visible behavior.",
    ],
  },
  {
    path: "PlayGround/Data/Resources/**",
    patterns: [
      /PlayGround[\\/]+Data[\\/]+Resources/i,
      /\bresources?\b/i,
      /\bassets?\b/i,
      /\btexture\b/i,
      /\bsprite\b/i,
      /\bsound\b/i,
      /\bimage\b/i,
      /\bresource path\b/i,
    ],
    items: [
      "Confirm approval before adding large/binary/generated assets or changing resource path conventions.",
      "Keep resource paths consistent with existing data and loader conventions.",
      "Check case-sensitive path spelling, missing files, unsupported formats, and source/data references.",
      "Do not include local-only, temporary, or private generated assets unless explicitly approved.",
      "Run JSON smoke validation when JSON references resources.",
      "Validate player-visible resource changes with Debug x64 build evidence and manual visual/runtime observations, or document accepted deferral.",
    ],
  },
  {
    path: "tools/aiworkflow/**",
    patterns: [
      /tools[\\/]+aiworkflow/i,
      /\bworkflow script/i,
      /\brole_router_status\b/i,
      /\bjson_smoke_check\b/i,
      /\bcapture-diff\b/i,
      /\bvalidation script\b/i,
      /\btool behavior\b/i,
    ],
    items: [
      "Keep workflow tool behavior explicit, auditable, and bounded to approved command side effects.",
      "Do not add automatic approval, source modification, agent execution, commit, push, release, or deploy behavior.",
      "Review script allowlists, output locations, timeout behavior, JSON mode behavior, and local/private path handling.",
      "Run changed workflow scripts directly, including JSON output checks when JSON mode is affected.",
      "Run private file tracking checks when local/private paths are touched or mentioned.",
      "Document any skipped command validation with the exact reason and remaining risk.",
    ],
  },
  {
    path: "tools/discord-orchestrator/**",
    patterns: [
      /tools[\\/]+discord-orchestrator/i,
      /\bdiscord\b/i,
      /\bbot\b/i,
      /\bslash command\b/i,
      /\/ai\b/i,
      /\bprepare goal\b/i,
      /\bgoal prompt\b/i,
      /\brole router\b/i,
      /\bregister\b/i,
      /\brestart_bot\b/i,
      /\bstatus_bot\b/i,
    ],
    items: [
      "Keep Discord commands as manual recommendation/prompt generation paths; do not execute Codex, agents, commits, pushes, releases, deploys, destructive commands, or source modifications.",
      "Preserve separation between command dispatch, task loading, role routing, path-rule selection, goal prompt generation, and response formatting.",
      "Do not expose `_Local/AIWorkflow/discord_bot.local.json`, tokens, `.env`, credentials, or machine-local configuration.",
      "Review prompt-generation changes for approval-gate bypasses, command contract drift, and local automation side effects.",
      "Run `npm --prefix tools\\discord-orchestrator run register` when slash command schema or command contract behavior changes.",
      "Run `tools\\discord-orchestrator\\restart_bot.bat` and `tools\\discord-orchestrator\\status_bot.bat` when bot runtime or generated prompt behavior changes.",
      "Smoke test affected `/ai` commands in Discord and inspect generated request files.",
    ],
  },
  {
    path: "_Docs/AIWorkflow/**",
    patterns: [
      /_Docs[\\/]+AIWorkflow/i,
      /\bworkflow doc/i,
      /\bAIWorkflow document/i,
      /\bpolicy\b/i,
      /\bapproval gate\b/i,
      /\btool routing\b/i,
      /\bContract v2\b/i,
      /\bREADME document map\b/i,
    ],
    items: [
      "Keep workflow policy, approval gates, validation rules, and tool-routing claims consistent with the AIWorkflow source of truth.",
      "Link new durable AIWorkflow documents from `_Docs/AIWorkflow/README.md` when they become part of the document set.",
      "Do not claim executable automation, validation success, approval, completion, commit, push, release, or deploy behavior that did not happen.",
      "Review document map/index updates, cross-document references, and policy conflicts.",
      "Run markdown/diff checks and private file tracking checks when local/private paths are mentioned.",
      "State skipped validation explicitly with remaining risk.",
    ],
  },
  {
    path: "_DevLog/**",
    patterns: [
      /_DevLog/i,
      /\bdev ?log\b/i,
      /\bwork ?log\b/i,
      /\bfix ?log\b/i,
      /\bretrospective\b/i,
      /\bvalidation evidence\b/i,
    ],
    items: [
      "Store investigation records in `_DevLog/WorkLog/`, fixes in `_DevLog/FixLog/`, and retrospectives in `_DevLog/Retrospective/`.",
      "Keep Dev Log evidence accurate: list what was run, what was not run, and what results were observed.",
      "Do not invent build, runtime, Discord, data-loader, or manual validation results.",
      "Record files changed, architecture notes, review summary, validation summary, remaining risks, and next tasks.",
      "Review log location, task traceability, and consistency with the final diff.",
      "Treat commit recommendation as a Human Director decision, not an automated action.",
    ],
  },
  {
    path: "root config files",
    patterns: [
      /\bAGENTS\.md\b/i,
      /\bREADME\.md\b/i,
      /\.editorconfig\b/i,
      /\.gitattributes\b/i,
      /\broot config\b/i,
      /\brepository config\b/i,
      /\bline[- ]ending\b/i,
      /\bworkflow entry point\b/i,
    ],
    items: [
      "Confirm explicit approval before repository-wide policy, editor, line-ending, Git attribute, or workflow entry-point changes.",
      "Keep `AGENTS.md`, root `README.md`, and `_Docs/AIWorkflow/` policy consistent.",
      "Do not change `.editorconfig` or `.gitattributes` without config impact and line-ending validation.",
      "Review private/local file handling and repository-wide automation implications.",
      "Run document map/policy consistency checks for workflow entry-point updates.",
      "Run `git diff --check` and inspect line-ending or whitespace effects before recommending commit.",
    ],
    displayPaths: ROOT_CONFIG_FILES,
  },
];

export function getPathRuleChecklistForTask(input = {}) {
  const task = input.task ?? {};
  const activeTask = input.activeTask ?? {};
  const activeMetadata = activeTask.metadata ?? {};
  const category = getCategory(task.id || activeMetadata.task_id);
  const contextText = buildContextText(task, activeMetadata, category);
  const scopes = [];

  for (const scope of PATH_RULE_SCOPES) {
    if (matchesScope(scope, contextText)) {
      scopes.push({
        path: scope.path,
        display_paths: scope.displayPaths ?? [scope.path],
        checklist_items: scope.items,
      });
    }
  }

  if (scopes.length === 0) {
    scopes.push({
      path: "global path safety",
      display_paths: ["global path safety"],
      checklist_items: [
        "Run `git status --short`, `git diff --check`, and `git diff --stat` before completion.",
        "Verify the diff stays inside the approved task scope and does not touch forbidden paths.",
        "Do not modify `_Local/`, `node_modules/`, tracked `_Temp/` artifacts, secrets, release/deploy scripts, or unrelated files.",
        "Report validation that was actually run; do not claim skipped build, runtime, Discord, data, or manual validation passed.",
        "Leave commit, push, release, deploy, and validation-deferral acceptance decisions to the Human Director.",
      ],
    });
  }

  return {
    source: PATH_RULE_SOURCE,
    selection_inputs: {
      task_id: formatValue(task.id || activeMetadata.task_id),
      category,
      kind: formatValue(task.kind),
      workflow_path: formatValue(activeMetadata.workflow_path),
      title: formatValue(task.item || activeMetadata.title),
      reason: formatValue(task.reason),
    },
    matched_scopes: scopes,
  };
}

function matchesScope(scope, contextText) {
  const positive = scope.patterns.some((pattern) => pattern.test(contextText));
  if (!positive) {
    return false;
  }

  const negative = Array.isArray(scope.negativePatterns)
    && scope.negativePatterns.some((pattern) => pattern.test(contextText));

  return !negative;
}

function buildContextText(task, activeMetadata, category) {
  return [
    task.id,
    activeMetadata.task_id,
    category,
    task.kind,
    activeMetadata.workflow_path,
    task.item,
    activeMetadata.title,
    task.reason,
    task.tool_route,
    task.validation,
    task.status,
    activeMetadata.status,
    activeMetadata.risk_level,
  ].filter(Boolean).join("\n");
}

function getCategory(taskId) {
  const match = String(taskId ?? "").match(/^([A-Za-z]+)-/);
  return match ? match[1].toUpperCase() : "UNKNOWN";
}

function formatValue(value) {
  const text = String(value ?? "").trim();
  return text || "(none)";
}

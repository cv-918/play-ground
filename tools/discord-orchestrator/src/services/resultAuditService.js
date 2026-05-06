import { getBacklogTaskById } from "./taskService.js";

const MAX_RESULT_TEXT_LENGTH = 3000;
const PATH_TOKEN_PATTERN = /(?:[A-Za-z0-9_.-]+[\\/])+[A-Za-z0-9_.-]+\.(?:js|md|json|cpp|c|h|hpp|bat|ps1|txt|yml|yaml|cs|sln|vcxproj)/gi;
const VALIDATION_PATTERNS = [
  ["node --check", /node\s+--check/i],
  ["npm register", /npm(?:\s+--prefix\s+\S+)?\s+run\s+register|npm\s+register/i],
  ["bot restart/status", /restart_bot\.bat|status_bot\.bat|bot restart|bot status/i],
  ["git diff --check", /git\s+diff\s+--check/i],
  ["git status", /git\s+status/i],
  ["git diff --stat", /git\s+diff\s+--stat/i],
  ["JSON smoke", /json\s+smoke|json\s+syntax|parseability/i],
  ["build/test", /build\s+passed|tests?\s+passed/i],
  ["general validation pass", /validation\s+passed|smoke\s+passed/i],
  ["runtime validation", /runtime\s+validation|manual\s+runtime|debug\s+x64/i],
];

export async function auditGoalResult(config, input = {}) {
  const id = normalizeTaskIdInput(input.id);
  const resultText = normalizeResultText(input.result);
  const taskResult = await getBacklogTaskById(config, id);

  if (!taskResult.ok) {
    return {
      ok: false,
      error: taskResult.error,
    };
  }

  const task = taskResult.data;
  const intake = analyzeResultText(resultText);
  const files = extractClaimedFiles(resultText);
  const validation = extractValidationEvidence(resultText);
  const missingEvidence = buildMissingEvidence(task, intake, files, validation);
  const riskNotes = buildRiskNotes(task, resultText, files, intake, validation);
  const completionVerdict = chooseCompletionVerdict(intake, files, validation, missingEvidence);
  const commitRecommendation = chooseCommitRecommendation(completionVerdict, files, validation, riskNotes);

  return {
    ok: true,
    data: {
      task,
      result_intake_summary: intake,
      claimed_files_changed: files,
      validation_evidence: validation.evidence,
      missing_evidence: missingEvidence,
      risk_notes: riskNotes,
      completion_verdict: completionVerdict,
      commit_recommendation: commitRecommendation,
      suggested_next_manual_commands: buildNextManualCommands(task.id, completionVerdict, commitRecommendation),
      safety: {
        read_only: true,
        backlog_updated: false,
        active_task_updated: false,
        task_marked_done: false,
        task_approved: false,
        codex_executed: false,
        agents_executed: false,
        committed: false,
        pushed: false,
      },
    },
  };
}

function normalizeTaskIdInput(value) {
  const id = String(value ?? "").trim();
  if (!id) {
    throw new Error("Missing required field: id");
  }
  return id;
}

function normalizeResultText(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error("Missing required field: result");
  }
  if (text.length > MAX_RESULT_TEXT_LENGTH) {
    throw new Error(`Result summary is too long. Limit: ${MAX_RESULT_TEXT_LENGTH} characters.`);
  }
  return text;
}

function analyzeResultText(resultText) {
  const lower = resultText.toLowerCase();
  const failed = /failed|failure|test failed|validation failed|error|unresolved|regression/i.test(resultText);
  const blocked = /blocked|blocker|cannot proceed|could not proceed|permission denied|missing approval/i.test(resultText);
  const implementationCompleted = /implementation completed|implemented|fixed|updated|changed|files changed/i.test(resultText);
  const analysisCompleted = /analysis completed|review completed|investigation completed|analyzed|no files changed/i.test(resultText);
  const validationMissing = /validation (?:was )?not run|not run|required validation.*missing|unrun|required validation was skipped|skipped/i.test(resultText);
  const noFilesChanged = /no files changed|no file changes|files changed:\s*none|changed files:\s*none/i.test(resultText);
  const vague = resultText.length < 80 || (!implementationCompleted && !analysisCompleted && !failed && !blocked);

  return {
    summary: summarizeResultIntent({
      implementationCompleted,
      analysisCompleted,
      noFilesChanged,
      validationMissing,
      failed,
      blocked,
      vague,
    }),
    implementation_completed: implementationCompleted,
    analysis_completed: analysisCompleted,
    no_files_changed: noFilesChanged,
    validation_missing_claimed: validationMissing,
    failed,
    blocked,
    too_vague: vague,
    excerpt: resultText.slice(0, 220),
    contains_commit_claim: /\bcommitted\b|git commit|commit created/i.test(lower),
  };
}

function summarizeResultIntent(flags) {
  if (flags.failed) {
    return "Result reports a failure or unresolved error.";
  }
  if (flags.blocked) {
    return "Result reports a blocker.";
  }
  if (flags.validationMissing) {
    return "Result reports incomplete or missing validation.";
  }
  if (flags.implementationCompleted) {
    return "Result claims implementation or file changes completed.";
  }
  if (flags.analysisCompleted || flags.noFilesChanged) {
    return "Result claims analysis/review completed without implementation changes.";
  }
  return "Result is too vague to classify confidently.";
}

function extractClaimedFiles(resultText) {
  if (/no files changed|no file changes|files changed:\s*none|changed files:\s*none/i.test(resultText)) {
    return {
      has_files_changed: false,
      files: [],
      summary: "No files changed claimed.",
    };
  }

  const files = new Set();
  const pathMatches = resultText.match(PATH_TOKEN_PATTERN) ?? [];
  for (const match of pathMatches) {
    files.add(normalizePathToken(match));
  }

  const filesLine = resultText.match(/(?:files changed|changed files|modified files)\s*:\s*([^\n.]+)/i);
  if (filesLine) {
    for (const part of filesLine[1].split(/[,;]/)) {
      const value = normalizePathToken(part);
      if (value && /\.[A-Za-z0-9]+$/.test(value)) {
        files.add(value);
      }
    }
  }

  const list = [...files].filter(Boolean);
  return {
    has_files_changed: list.length > 0,
    files: list,
    summary: list.length > 0 ? `${list.length} claimed file(s) changed.` : "No concrete changed file paths found.",
  };
}

function normalizePathToken(value) {
  return String(value ?? "")
    .trim()
    .replace(/^[`"']+|[`"',.]+$/g, "")
    .replaceAll("\\", "/");
}

function extractValidationEvidence(resultText) {
  const evidence = [];
  for (const [label, pattern] of VALIDATION_PATTERNS) {
    if (pattern.test(resultText)) {
      evidence.push(label);
    }
  }

  const explicitPassed = /validation passed|passed validation|required validation passed|all checks passed/i.test(resultText);
  const explicitMissing = /validation (?:was )?not run|not run|required validation.*missing|unrun|required validation was skipped|skipped/i.test(resultText);

  return {
    evidence,
    has_validation_evidence: evidence.length > 0 || explicitPassed,
    explicit_passed: explicitPassed,
    explicit_missing: explicitMissing,
  };
}

function buildMissingEvidence(task, intake, files, validation) {
  const missing = [];

  if (intake.too_vague) {
    missing.push("Result summary is too vague; include what changed, validation run, and remaining risks.");
  }

  if (!files.has_files_changed && !intake.no_files_changed) {
    missing.push("Changed-file evidence is missing; state files changed or explicitly say no files changed.");
  }

  if (validation.explicit_missing || intake.validation_missing_claimed) {
    missing.push("Result says required validation was not run or was skipped.");
  }

  if (!validation.has_validation_evidence) {
    missing.push("Validation evidence is missing or too vague.");
  }

  if (String(task.status ?? "").toLowerCase() === "blocked") {
    missing.push("Task is currently blocked in Backlog; unblock or create follow-up before completion.");
  }

  return missing;
}

function buildRiskNotes(task, resultText, files, intake, validation) {
  const notes = [];
  const text = resultText.toLowerCase();
  const paths = files.files.join("\n").toLowerCase();
  const combined = `${text}\n${paths}`;

  if (/_local|node_modules|\.env|discord_bot\.local\.json|secret|token|password/.test(combined)) {
    notes.push("Private/local/secret-like path or token wording was mentioned; verify nothing private is tracked or exposed.");
  }

  if (/playground\/project|playground\\project/.test(combined)) {
    notes.push("Game source path was mentioned; confirm this was expected for the task and required build/runtime validation exists.");
  }

  if (/playground\/data|playground\\data/.test(combined)) {
    notes.push("Game data path was mentioned; confirm JSON syntax, reference integrity, and semantic validation evidence.");
  }

  if (/_docs\/aiworkflow|_docs\\aiworkflow|_devlog|_devlog/.test(combined)) {
    notes.push("Workflow docs/dev log path was mentioned; verify source-of-truth consistency and avoid stale validation claims.");
  }

  if (intake.contains_commit_claim) {
    notes.push("Result mentions a commit; this workflow expects commit decisions to remain manual.");
  }

  if (files.has_files_changed && !validation.has_validation_evidence) {
    notes.push("Files changed but validation evidence is incomplete.");
  }

  if (String(task.priority ?? "").toUpperCase() === "P0" || /high/.test(String(task.validation ?? "").toLowerCase())) {
    notes.push("High-priority or high-risk task; Human Director review is required before done/commit decisions.");
  }

  return notes;
}

function chooseCompletionVerdict(intake, files, validation, missingEvidence) {
  if (intake.failed) {
    return "FAILED";
  }

  if (intake.blocked) {
    return "BLOCKED";
  }

  if (validation.explicit_missing || intake.validation_missing_claimed) {
    return "NEEDS_VALIDATION";
  }

  if (!validation.has_validation_evidence) {
    return "NEEDS_VALIDATION";
  }

  if (missingEvidence.length > 0 && intake.too_vague) {
    return "NEEDS_REVIEW";
  }

  if (!files.has_files_changed && intake.no_files_changed && (intake.analysis_completed || validation.has_validation_evidence)) {
    return "READY_TO_MARK_DONE";
  }

  if (files.has_files_changed && validation.has_validation_evidence) {
    return "NEEDS_REVIEW";
  }

  return "NEEDS_REVIEW";
}

function chooseCommitRecommendation(verdict, files, validation, riskNotes) {
  if (!files.has_files_changed) {
    return "NO_COMMIT_NEEDED";
  }

  if (["FAILED", "BLOCKED", "NEEDS_VALIDATION"].includes(verdict)) {
    return "DO_NOT_COMMIT_YET";
  }

  if (validation.has_validation_evidence && riskNotes.length === 0 && verdict === "READY_TO_MARK_DONE") {
    return "COMMIT_RECOMMENDED";
  }

  if (validation.has_validation_evidence) {
    return "COMMIT_AFTER_REVIEW";
  }

  return "DO_NOT_COMMIT_YET";
}

function buildNextManualCommands(taskId, verdict, commitRecommendation) {
  const commands = [];

  if (verdict === "READY_TO_MARK_DONE") {
    commands.push(`/ai task done id:${taskId} evidence:"Human reviewed result audit and validation evidence."`);
  } else if (verdict === "NEEDS_REVIEW") {
    commands.push(`/ai prepare goal id:${taskId} mode:review context:compact`);
  } else if (verdict === "NEEDS_VALIDATION") {
    commands.push("Run missing validation manually, then paste updated evidence into /ai result audit.");
  } else {
    commands.push("Resolve the blocker or failed result before marking done.");
  }

  if (commitRecommendation === "COMMIT_AFTER_REVIEW" || commitRecommendation === "COMMIT_RECOMMENDED") {
    commands.push("Review git diff and commit manually only after validation is accepted.");
  }

  commands.push("/ai status");
  commands.push("/ai active");
  return commands;
}

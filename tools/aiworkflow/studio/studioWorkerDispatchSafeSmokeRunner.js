#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  SAFE_SMOKE_EXECUTOR,
  SAFE_SMOKE_MODE,
  SAFE_SMOKE_ROUTE,
  WORKER_DISPATCH_ID_PATTERN,
  createSafetyState,
  getWorkerDispatchStorePath,
  validateWorkerDispatch,
} = require("../studio_worker_dispatch_planner");
const {
  getResultReviewStorePath,
  validateResultReview,
} = require("../studio_result_review_planner");

const SAFE_SMOKE_PROFILE = "validation";
const SAFE_SMOKE_READY_STATE = "ready_to_start";
const SAFE_SMOKE_RESULT_STATE = "result_ready";
const SAFE_SMOKE_INPUT_MODE = "dispatch_request_record_only";
const RESULT_REVIEW_STATUS = "ready_for_director_review";
const WORKLOG_REF = "_DevLog/WorkLog/2026-06-06_Studio_Goal_E2_Safe_Live_Runner_Smoke.md";

function text(value, fallback = "") {
  return String(value ?? fallback ?? "").trim();
}

function normalizePath(filePath) {
  return path.resolve(filePath);
}

function slash(value) {
  return String(value || "").replace(/\\/g, "/");
}

function isInsideOrSame(parent, candidate) {
  const resolvedParent = normalizePath(parent);
  const resolvedCandidate = normalizePath(candidate);
  return resolvedCandidate === resolvedParent || resolvedCandidate.startsWith(resolvedParent + path.sep);
}

function toRepoRelative(repoRoot, fullPath) {
  return slash(path.relative(repoRoot, fullPath));
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function getSafeSmokeEvidenceStorePath(repoRoot, overridePath = "") {
  const root = normalizePath(repoRoot);
  if (!text(overridePath)) {
    return path.join(root, "_Docs", "AIWorkflow", "Studio", "WorkerDispatchEvidence");
  }

  const resolved = path.isAbsolute(overridePath)
    ? normalizePath(overridePath)
    : normalizePath(path.join(root, overridePath));

  if (!isInsideOrSame(root, resolved)) {
    throw new Error(`Safe smoke evidence override must stay inside repository root: ${resolved}`);
  }

  const tempRoot = path.join(root, "_Temp", "AIWorkflowStudio", "worker_dispatch_evidence");
  if (!isInsideOrSame(tempRoot, resolved)) {
    throw new Error(`Safe smoke evidence override is only allowed under _Temp/AIWorkflowStudio/worker_dispatch_evidence for validation: ${resolved}`);
  }

  return resolved;
}

function getWorkerDispatchFiles(storePath) {
  if (!fs.existsSync(storePath)) return [];
  return fs.readdirSync(storePath)
    .filter((name) => /^WD-.*\.json$/.test(name))
    .sort()
    .map((name) => path.join(storePath, name));
}

function resultReviewIdFor(workerDispatchId) {
  const parts = String(workerDispatchId || "").split("-");
  const date = parts[1] || "00000000";
  const time = parts[2] || "000000";
  const slug = parts.slice(3).join("-").replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return `RR-${date}-${time}-safe-smoke-${slug || "worker-dispatch"}`;
}

function runnerPlanIdFor(workerDispatchId) {
  return `SSMOKE-PLAN-${workerDispatchId}`;
}

function runnerRunIdFor(workerDispatchId) {
  return `SSMOKE-RUN-${workerDispatchId}`;
}

function evidenceFileNameFor(workerDispatchId) {
  return `${workerDispatchId}-safe-smoke-evidence.json`;
}

function issue(field, expected, actual, message) {
  return {
    field,
    expected,
    actual,
    message,
  };
}

function check(errors, checks, name, ok, expected, actual, message) {
  checks.push({ name, ok, expected, actual });
  if (!ok) errors.push(issue(name, expected, actual, message));
}

function validateSafeSmokeRunEligibility(dispatch, baseValidation = null) {
  const errors = [];
  const checks = [];
  const validation = baseValidation || validateWorkerDispatch(dispatch);
  const evidenceRefs = Array.isArray(dispatch?.evidence_refs) ? dispatch.evidence_refs : [];

  check(errors, checks, "worker_dispatch_validation", validation.ok === true, true, validation.ok === true, "Worker Dispatch schema validation must pass.");
  check(errors, checks, "schema_version", text(dispatch?.schema_version) === "worker_dispatch.v1", "worker_dispatch.v1", text(dispatch?.schema_version), "schema_version must be worker_dispatch.v1.");
  check(errors, checks, "dispatch_state", text(dispatch?.dispatch_state) === SAFE_SMOKE_READY_STATE, SAFE_SMOKE_READY_STATE, text(dispatch?.dispatch_state), "dispatch_state must be ready_to_start before safe smoke.");
  check(errors, checks, "dispatch_mode", text(dispatch?.dispatch_mode) === SAFE_SMOKE_INPUT_MODE, SAFE_SMOKE_INPUT_MODE, text(dispatch?.dispatch_mode), "dispatch_mode must be dispatch_request_record_only before safe smoke.");
  check(errors, checks, "profile", text(dispatch?.profile) === SAFE_SMOKE_PROFILE, SAFE_SMOKE_PROFILE, text(dispatch?.profile), "profile must be validation.");
  check(errors, checks, "executor", text(dispatch?.executor) === "none", "none", text(dispatch?.executor), "executor must be none before the safe smoke transition.");
  check(errors, checks, "command_id_or_runner_route", text(dispatch?.command_id_or_runner_route) === SAFE_SMOKE_ROUTE, SAFE_SMOKE_ROUTE, text(dispatch?.command_id_or_runner_route), "command_id_or_runner_route must be studio.validation.report.");
  check(errors, checks, "result_review_id", text(dispatch?.result_review_id) === "pending", "pending", text(dispatch?.result_review_id), "result_review_id must be pending before safe smoke.");
  check(errors, checks, "runner_plan_id", !text(dispatch?.runner_plan_id), "(empty)", text(dispatch?.runner_plan_id), "runner_plan_id must be empty before safe smoke.");
  check(errors, checks, "runner_run_id", !text(dispatch?.runner_run_id), "(empty)", text(dispatch?.runner_run_id), "runner_run_id must be empty before safe smoke.");
  check(errors, checks, "evidence_refs", evidenceRefs.length === 0, "[]", JSON.stringify(evidenceRefs), "evidence_refs must be empty before safe smoke.");

  if (!validation.ok) {
    for (const validationError of validation.errors || []) {
      errors.push(issue("worker_dispatch_validation", "valid worker_dispatch.v1", validationError, `Worker Dispatch validation failed: ${validationError}`));
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    checks,
  };
}

function safeSmokeStatusFor(dispatch, validation) {
  if (validation.ok && text(dispatch.dispatch_mode) === SAFE_SMOKE_MODE && text(dispatch.dispatch_state) === SAFE_SMOKE_RESULT_STATE) {
    return {
      status: "completed",
      ok: true,
      message: "Safe smoke result is linked to evidence and Result Review.",
    };
  }
  const eligibility = validateSafeSmokeRunEligibility(dispatch, validation);
  return {
    status: eligibility.ok ? "eligible" : "not_eligible",
    ok: eligibility.ok,
    message: eligibility.ok ? "Worker Dispatch is eligible for E.2 safe smoke." : "Worker Dispatch is not eligible for E.2 safe smoke.",
    errors: eligibility.errors,
  };
}

function loadWorkerDispatch(repoRoot, workerDispatchId, storePathOverride = "") {
  const id = text(workerDispatchId);
  if (!WORKER_DISPATCH_ID_PATTERN.test(id)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid worker_dispatch_id: ${workerDispatchId}`,
      safety: createSafetyState(),
    };
  }

  const storePath = getWorkerDispatchStorePath(repoRoot, storePathOverride);
  const targetPath = path.join(storePath, `${id}.json`);
  if (!fs.existsSync(targetPath)) {
    return {
      ok: false,
      status: 404,
      error: `Worker Dispatch not found: ${id}`,
      worker_dispatch_id: id,
      store_path: storePath,
      safety: createSafetyState(),
    };
  }

  const workerDispatch = readJsonFile(targetPath);
  const validation = validateWorkerDispatch(workerDispatch);
  return {
    ok: true,
    status: 200,
    worker_dispatch_id: id,
    worker_dispatch_path: targetPath,
    worker_dispatch: workerDispatch,
    validation,
    safe_smoke_status: safeSmokeStatusFor(workerDispatch, validation),
    safety: createSafetyState(),
  };
}

function buildEvidence(dispatch, context) {
  const safety = createSafetyState({
    worker_dispatch_written: true,
    worker_dispatch_updated: true,
    result_review_created: true,
    safe_smoke_runner_started: true,
    safe_smoke_evidence_written: true,
  });
  return {
    schema_version: "worker_dispatch_safe_smoke_evidence.v1",
    evidence_id: `WDE-${dispatch.worker_dispatch_id}`,
    worker_dispatch_id: dispatch.worker_dispatch_id,
    execution_request_id: dispatch.execution_request_id,
    profile: SAFE_SMOKE_PROFILE,
    executor: SAFE_SMOKE_EXECUTOR,
    command_id_or_runner_route: SAFE_SMOKE_ROUTE,
    runner_plan_id: context.runnerPlanId,
    runner_run_id: context.runnerRunId,
    result_review_id: context.resultReviewId,
    generated_at: context.iso,
    deterministic_checks: context.eligibility.checks,
    validation_ok: context.eligibility.ok,
    validation_results: [
      "Worker Dispatch schema validation passed.",
      "E.2 route allowlist matched validation/hermes_safe_smoke/studio.validation.report.",
      "No PC Runner, Codex/local execution, build/test dispatch, source changes, git changes, commit, or push were started.",
    ],
    safety,
  };
}

function buildResultReview(dispatch, context) {
  return {
    result_review_id: context.resultReviewId,
    schema_version: "result_review.v1",
    execution_request_id: dispatch.execution_request_id,
    worker_dispatch_id: dispatch.worker_dispatch_id,
    source_evidence_refs: [context.evidenceRef],
    status: RESULT_REVIEW_STATUS,
    summary: {
      implementation_summary: "E.2 safe live runner smoke completed for the allowlisted Studio validation route.",
      behavior_or_model_summary: "The smoke runner performed deterministic Worker Dispatch validation/report generation only, linked durable evidence, and did not close or decide the Execution Request.",
      validation_not_run: false,
    },
    changed_files_summary: [
      `Worker Dispatch updated: ${context.workerDispatchRef}`,
      `Safe smoke evidence written: ${context.evidenceRef}`,
      `Result Review generated: ${context.resultReviewRef}`,
    ],
    validation_commands: [
      `node tools/aiworkflow/studio_safe_smoke_runner.js run ${dispatch.worker_dispatch_id} --execute`,
    ],
    validation_results: [
      "Safe smoke deterministic eligibility checks passed.",
      "Result Review generated for Director review.",
      "Execution Request was not accepted, rejected, closed, or marked done.",
    ],
    risks: [
      "This smoke validates only the E.2 allowlisted Studio validation report route; it does not run PC Runner, Codex, build/test commands, or game runtime validation.",
    ],
    human_decisions_needed: [
      "Human Director/Hermes must review the Result Review; no automatic accept/reject/close/done decision was made.",
    ],
    recommended_next_action: "director_review",
    commit_recommendation: {
      advisory_only: true,
      recommendation: "Do not commit until Hermes review and required validation pass.",
    },
    record_refs: [WORKLOG_REF],
    created_at: context.iso,
    updated_at: context.iso,
  };
}

function buildUpdatedDispatch(dispatch, context) {
  return {
    ...dispatch,
    dispatch_state: SAFE_SMOKE_RESULT_STATE,
    dispatch_mode: SAFE_SMOKE_MODE,
    executor: SAFE_SMOKE_EXECUTOR,
    runner_plan_id: context.runnerPlanId,
    runner_run_id: context.runnerRunId,
    evidence_refs: [context.evidenceRef],
    result_review_id: context.resultReviewId,
    status_summary: "E.2 safe smoke runner completed the allowlisted Studio validation report route and generated linked evidence/Result Review without starting PC Runner, Codex/local execution, build/test dispatch, source changes, git, commit, or push.",
    safe_smoke_result: {
      status: "completed",
      completed_at: context.iso,
      profile: SAFE_SMOKE_PROFILE,
      executor: SAFE_SMOKE_EXECUTOR,
      command_id_or_runner_route: SAFE_SMOKE_ROUTE,
      validation_ok: true,
      evidence_ref: context.evidenceRef,
      result_review_id: context.resultReviewId,
    },
    safety: createSafetyState({
      worker_dispatch_written: true,
      worker_dispatch_updated: true,
      result_review_created: true,
      safe_smoke_runner_started: true,
      safe_smoke_evidence_written: true,
    }),
    updated_at: context.iso,
  };
}

function buildRunPlan(repoRoot, loaded, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const iso = now.toISOString();
  const dispatch = loaded.worker_dispatch;
  const eligibility = validateSafeSmokeRunEligibility(dispatch, loaded.validation);
  const runnerPlanId = runnerPlanIdFor(dispatch.worker_dispatch_id);
  const runnerRunId = runnerRunIdFor(dispatch.worker_dispatch_id);
  const resultReviewId = resultReviewIdFor(dispatch.worker_dispatch_id);
  const evidenceStorePath = getSafeSmokeEvidenceStorePath(repoRoot, options.evidenceStorePathOverride || "");
  const resultReviewStorePath = getResultReviewStorePath(repoRoot, options.resultReviewStorePathOverride || "");
  const evidencePath = path.join(evidenceStorePath, evidenceFileNameFor(dispatch.worker_dispatch_id));
  const resultReviewPath = path.join(resultReviewStorePath, `${resultReviewId}.json`);
  const context = {
    iso,
    eligibility,
    runnerPlanId,
    runnerRunId,
    resultReviewId,
    workerDispatchRef: toRepoRelative(repoRoot, loaded.worker_dispatch_path),
    evidenceRef: toRepoRelative(repoRoot, evidencePath),
    resultReviewRef: toRepoRelative(repoRoot, resultReviewPath),
  };

  const evidence = buildEvidence(dispatch, context);
  const resultReview = buildResultReview(dispatch, context);
  const updatedDispatch = buildUpdatedDispatch(dispatch, context);
  const resultReviewValidation = validateResultReview(resultReview);
  const updatedDispatchValidation = validateWorkerDispatch(updatedDispatch);
  const errors = eligibility.errors.slice();

  if (!resultReviewValidation.ok) {
    for (const error of resultReviewValidation.errors) {
      errors.push(issue("result_review_validation", "valid result_review.v1", error, `Generated Result Review validation failed: ${error}`));
    }
  }
  if (!updatedDispatchValidation.ok) {
    for (const error of updatedDispatchValidation.errors) {
      errors.push(issue("worker_dispatch_update_validation", "valid worker_dispatch.v1", error, `Updated Worker Dispatch validation failed: ${error}`));
    }
  }
  if (fs.existsSync(evidencePath)) {
    errors.push(issue("evidence_path", "new evidence artifact", context.evidenceRef, "Safe smoke evidence artifact already exists."));
  }
  if (fs.existsSync(resultReviewPath)) {
    errors.push(issue("result_review_path", "new Result Review", context.resultReviewRef, "Result Review already exists."));
  }

  return {
    ok: errors.length === 0,
    errors,
    context,
    paths: {
      worker_dispatch_path: loaded.worker_dispatch_path,
      evidence_path: evidencePath,
      result_review_path: resultReviewPath,
      evidence_store_path: evidenceStorePath,
      result_review_store_path: resultReviewStorePath,
    },
    evidence,
    result_review: resultReview,
    worker_dispatch: updatedDispatch,
    validations: {
      eligibility,
      result_review: resultReviewValidation,
      worker_dispatch: updatedDispatchValidation,
    },
  };
}

function executeRunPlan(plan) {
  writeJsonFile(plan.paths.evidence_path, plan.evidence);
  writeJsonFile(plan.paths.result_review_path, plan.result_review);
  writeJsonFile(plan.paths.worker_dispatch_path, plan.worker_dispatch);
}

function statusResult(repoRoot, options = {}) {
  const storePath = getWorkerDispatchStorePath(repoRoot, options.workerDispatchStorePathOverride || "");
  const files = getWorkerDispatchFiles(storePath);
  const summaries = files.map((filePath) => {
    try {
      const dispatch = readJsonFile(filePath);
      const validation = validateWorkerDispatch(dispatch);
      const status = safeSmokeStatusFor(dispatch, validation);
      return {
        worker_dispatch_id: text(dispatch.worker_dispatch_id) || path.basename(filePath, ".json"),
        dispatch_state: text(dispatch.dispatch_state),
        dispatch_mode: text(dispatch.dispatch_mode),
        profile: text(dispatch.profile),
        executor: text(dispatch.executor),
        command_id_or_runner_route: text(dispatch.command_id_or_runner_route),
        result_review_id: text(dispatch.result_review_id),
        validation_ok: validation.ok,
        safe_smoke_status: status.status,
        file: path.basename(filePath),
      };
    } catch (error) {
      return {
        worker_dispatch_id: path.basename(filePath, ".json"),
        dispatch_state: "invalid",
        dispatch_mode: "",
        profile: "",
        executor: "",
        command_id_or_runner_route: "",
        result_review_id: "",
        validation_ok: false,
        safe_smoke_status: "invalid",
        warning: error && error.message ? error.message : String(error),
        file: path.basename(filePath),
      };
    }
  });

  return {
    ok: true,
    command: "status",
    store_path: storePath,
    worker_dispatch_count: summaries.length,
    eligible_count: summaries.filter((item) => item.safe_smoke_status === "eligible").length,
    completed_count: summaries.filter((item) => item.safe_smoke_status === "completed").length,
    invalid_count: summaries.filter((item) => item.validation_ok === false).length,
    worker_dispatches: summaries,
    safety: createSafetyState(),
  };
}

function parseArgs(args) {
  const clean = [];
  const options = {
    execute: false,
    json: false,
    repoRoot: "",
    workerDispatchStorePathOverride: "",
    resultReviewStorePathOverride: "",
    evidenceStorePathOverride: "",
    now: null,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = String(args[i]);
    if (arg === "--execute") options.execute = true;
    else if (arg === "--json" || arg === "-json") options.json = true;
    else if (arg === "--repo-root") {
      i += 1;
      if (i >= args.length) throw new Error("--repo-root requires a path argument.");
      options.repoRoot = String(args[i]);
    } else if (arg === "--store-path" || arg === "--worker-dispatch-store-path") {
      i += 1;
      if (i >= args.length) throw new Error(`${arg} requires a path argument.`);
      options.workerDispatchStorePathOverride = String(args[i]);
    } else if (arg === "--result-review-store-path") {
      i += 1;
      if (i >= args.length) throw new Error("--result-review-store-path requires a path argument.");
      options.resultReviewStorePathOverride = String(args[i]);
    } else if (arg === "--evidence-path" || arg === "--evidence-store-path") {
      i += 1;
      if (i >= args.length) throw new Error(`${arg} requires a path argument.`);
      options.evidenceStorePathOverride = String(args[i]);
    } else if (arg === "--now") {
      i += 1;
      if (i >= args.length) throw new Error("--now requires an ISO timestamp argument.");
      const date = new Date(String(args[i]));
      if (Number.isNaN(date.getTime())) throw new Error(`Invalid --now timestamp: ${args[i]}`);
      options.now = date;
    } else if (arg.trim()) {
      clean.push(arg);
    }
  }

  return { clean, options };
}

function usageResult() {
  return {
    ok: false,
    error: "Usage: tools/aiworkflow/studio_safe_smoke_runner.js status|read <worker_dispatch_id>|preflight <worker_dispatch_id>|run <worker_dispatch_id> [--execute] [--store-path <path>] [--result-review-store-path <path>] [--evidence-path <path>] [--json]",
    safety: createSafetyState(),
  };
}

async function runSafeSmokeRunner(repoRoot, args) {
  try {
    const { clean, options } = parseArgs(args);
    const root = normalizePath(options.repoRoot || repoRoot);
    const command = String(clean[0] || "").toLowerCase();

    if (command === "status" && clean.length === 1) {
      return statusResult(root, options);
    }

    if ((command === "read" || command === "preflight") && clean.length === 2) {
      const loaded = loadWorkerDispatch(root, clean[1], options.workerDispatchStorePathOverride);
      return {
        ...loaded,
        command,
      };
    }

    if (command === "run" && clean.length === 2) {
      const loaded = loadWorkerDispatch(root, clean[1], options.workerDispatchStorePathOverride);
      if (!loaded.ok) return { ...loaded, command };
      const plan = buildRunPlan(root, loaded, options);
      if (!plan.ok) {
        return {
          ok: false,
          status: 409,
          command,
          execute: options.execute,
          worker_dispatch_id: loaded.worker_dispatch_id,
          error: "Worker Dispatch is not eligible for E.2 safe smoke.",
          preflight: {
            ok: false,
            errors: plan.errors,
          },
          validations: plan.validations,
          safety: createSafetyState(),
        };
      }

      if (!options.execute) {
        return {
          ok: true,
          command,
          execute: false,
          execute_required: true,
          worker_dispatch_id: loaded.worker_dispatch_id,
          message: "Dry-run only. Re-run with run <worker_dispatch_id> --execute to write safe smoke evidence, Result Review, and Worker Dispatch update.",
          runner_plan_id: plan.context.runnerPlanId,
          runner_run_id: plan.context.runnerRunId,
          result_review_id: plan.context.resultReviewId,
          evidence_ref: plan.context.evidenceRef,
          validations: plan.validations,
          safety: createSafetyState(),
        };
      }

      executeRunPlan(plan);
      return {
        ok: true,
        status: 200,
        command,
        execute: true,
        worker_dispatch_id: loaded.worker_dispatch_id,
        dispatch_state: plan.worker_dispatch.dispatch_state,
        dispatch_mode: plan.worker_dispatch.dispatch_mode,
        executor: plan.worker_dispatch.executor,
        runner_plan_id: plan.context.runnerPlanId,
        runner_run_id: plan.context.runnerRunId,
        evidence_refs: plan.worker_dispatch.evidence_refs,
        result_review_id: plan.context.resultReviewId,
        validations: plan.validations,
        safety: createSafetyState({
          worker_dispatch_written: true,
          worker_dispatch_updated: true,
          result_review_created: true,
          safe_smoke_runner_started: true,
          safe_smoke_evidence_written: true,
        }),
        internal: plan.paths,
      };
    }

    return usageResult();
  } catch (error) {
    return {
      ok: false,
      error: error && error.message ? error.message : String(error),
      safety: createSafetyState(),
    };
  }
}

function printHuman(result) {
  if (result.command === "status") {
    console.log("============================================================");
    console.log("AIWorkflow Studio E.2 Safe Smoke Runner");
    console.log("============================================================");
    console.log(`Store: ${result.store_path}`);
    console.log(`Worker Dispatches: ${result.worker_dispatch_count}`);
    console.log(`Eligible: ${result.eligible_count}`);
    console.log(`Completed: ${result.completed_count}`);
    console.log("Safety: read-only status; no runner start; no source/git changes");
    return;
  }
  if ((result.command === "read" || result.command === "preflight") && result.ok) {
    console.log("============================================================");
    console.log("AIWorkflow Studio E.2 Safe Smoke Worker Dispatch");
    console.log("============================================================");
    console.log(`ID: ${result.worker_dispatch_id}`);
    console.log(`Validation: ${result.validation.ok ? "ok" : result.validation.errors.join("; ")}`);
    console.log(`Safe smoke status: ${result.safe_smoke_status.status}`);
    if (result.safe_smoke_status.errors) {
      for (const error of result.safe_smoke_status.errors) console.log(`- ${error.field}: ${error.message}`);
    }
    return;
  }
  if (result.command === "run") {
    if (!result.ok) {
      console.log("Safe smoke run failed.");
      console.log(result.error || "Unknown error");
      const errors = result.preflight?.errors || [];
      for (const error of errors) console.log(`- ${error.field}: ${error.message}`);
      return;
    }
    console.log(result.execute ? "Safe smoke run completed." : "Safe smoke run dry-run passed.");
    console.log(`Worker Dispatch: ${result.worker_dispatch_id}`);
    console.log(`Result Review: ${result.result_review_id}`);
    console.log(`Evidence: ${result.evidence_ref || (result.evidence_refs || []).join(", ")}`);
    console.log("Safety: hermes_safe_smoke only; no PC Runner, Codex/local execution, build/test dispatch, source/git changes, commit, or push");
    return;
  }
  if (!result.ok) console.log(`[ERROR] ${result.error || "Unknown error"}`);
  else console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  const result = await runSafeSmokeRunner(process.cwd(), args);
  const { options } = parseArgs(args);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else printHuman(result);
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  SAFE_SMOKE_INPUT_MODE,
  SAFE_SMOKE_PROFILE,
  SAFE_SMOKE_READY_STATE,
  SAFE_SMOKE_RESULT_STATE,
  buildRunPlan,
  getSafeSmokeEvidenceStorePath,
  loadWorkerDispatch,
  main,
  resultReviewIdFor,
  runSafeSmokeRunner,
  validateSafeSmokeRunEligibility,
};

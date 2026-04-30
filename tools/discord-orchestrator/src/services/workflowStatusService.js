import { runScript } from "./commandRunner.js";

export async function getWorkflowStatus(config) {
  const result = await runScript(config, "tools/aiworkflow/workflow_status.bat", ["--json"]);

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
        "Workflow status script produced empty stdout.",
        `Script: ${result.script}`,
        `Exit code: ${result.code}`,
        `stdout length: ${result.stdoutLength ?? 0}`,
        `stderr length: ${result.stderrLength ?? 0}`,
        result.stderr ? `stderr: ${result.stderr.slice(0, 800)}` : "",
        "Next action: run tools\\aiworkflow\\workflow_status.bat --json from repo root and compare output.",
      ].filter(Boolean).join("\n"),
      raw: result,
    };
  }

  try {
    return {
      ok: true,
      data: JSON.parse(result.stdout),
      raw: result,
    };
  } catch (error) {
    return {
      ok: false,
      error: [
        `Failed to parse workflow status JSON: ${error.message}`,
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

function buildScriptError(result) {
  return [
    "Workflow status script failed.",
    `Script: ${result.script}`,
    `Exit code: ${result.code}`,
    result.timedOut ? "Timed out: yes" : "Timed out: no",
    result.stderr ? `stderr: ${result.stderr.slice(0, 800)}` : "",
    result.stdout ? `stdout: ${result.stdout.slice(0, 800)}` : "",
  ].filter(Boolean).join("\n");
}

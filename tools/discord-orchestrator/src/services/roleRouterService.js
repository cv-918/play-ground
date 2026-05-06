import { runScript } from "./commandRunner.js";

const ROLE_ROUTER_SCRIPT = "tools/aiworkflow/role_router_status.bat";

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

import { runScript } from "./commandRunner.js";
import { validateProjectId } from "../safety/validation.js";

export async function listProjectProfiles(config) {
  const result = await runScript(config, "tools/aiworkflow/project_profile_status.bat", ["--list", "--json"]);

  if (!result.ok) {
    return {
      ok: false,
      error: buildScriptError("Project profile list script failed.", result),
      raw: result,
    };
  }

  if (!result.stdout || result.stdout.trim().length === 0) {
    return {
      ok: false,
      error: [
        "Project profile list script produced empty stdout.",
        `Script: ${result.script}`,
        `Exit code: ${result.code}`,
        `stdout length: ${result.stdoutLength ?? 0}`,
        `stderr length: ${result.stderrLength ?? 0}`,
        result.stderr ? `stderr: ${result.stderr.slice(0, 800)}` : "",
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
        `Failed to parse project profile list JSON: ${error.message}`,
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

export async function getProjectProfile(config, projectId) {
  const selectedProjectId = projectId || config.defaultProjectId;

  if (!validateProjectId(selectedProjectId)) {
    return {
      ok: false,
      error: "Invalid project id. Allowed characters: A-Z, a-z, 0-9, underscore, hyphen.",
    };
  }

  const result = await runScript(config, "tools/aiworkflow/project_profile_status.bat", [
    "--project",
    selectedProjectId,
    "--json",
  ]);

  if (!result.ok) {
    return {
      ok: false,
      error: buildScriptError("Project profile script failed.", result),
      raw: result,
    };
  }

  if (!result.stdout || result.stdout.trim().length === 0) {
    return {
      ok: false,
      error: [
        "Project profile script produced empty stdout.",
        `Script: ${result.script}`,
        `Exit code: ${result.code}`,
        `stdout length: ${result.stdoutLength ?? 0}`,
        `stderr length: ${result.stderrLength ?? 0}`,
        result.stderr ? `stderr: ${result.stderr.slice(0, 800)}` : "",
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
        `Failed to parse project profile JSON: ${error.message}`,
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

function buildScriptError(prefix, result) {
  return [
    prefix,
    `Script: ${result.script}`,
    `Exit code: ${result.code}`,
    result.timedOut ? "Timed out: yes" : "Timed out: no",
    result.stderr ? `stderr: ${result.stderr.slice(0, 800)}` : "",
    result.stdout ? `stdout: ${result.stdout.slice(0, 800)}` : "",
  ].filter(Boolean).join("\n");
}

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
  const args = [];

  if (projectId && projectId.trim().length > 0) {
    const selectedProjectId = projectId.trim();

    if (!validateProjectId(selectedProjectId)) {
      return {
        ok: false,
        error: "Invalid project id. Allowed characters: A-Z, a-z, 0-9, underscore, hyphen.",
      };
    }

    args.push("--project", selectedProjectId);
  }

  // If no project id is provided, do not inject config.defaultProjectId here.
  // project_profile_status.bat resolves the default through ActiveProject.json.
  args.push("--json");

  const result = await runScript(config, "tools/aiworkflow/project_profile_status.bat", args);

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

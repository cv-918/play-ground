#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function repoPath(repoRoot, relativePath) {
  return path.resolve(repoRoot, relativePath);
}

function quoteCmd(value) {
  const text = String(value);
  if (!/[ \t&()^|<>"]/u.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function createStudioToolboxService(options = {}) {
  const DEFAULT_HOST = options.defaultHost || "127.0.0.1";
  const DEFAULT_PORT = options.defaultPort || 47831;
  const serverEntrypoint = options.serverEntrypoint || "";

  function runTool(repoRoot, command, args, timeoutMs = 20 * 60 * 1000) {
    return new Promise((resolve) => {
      const isWindowsBatch = process.platform === "win32" && /\.(bat|cmd)$/i.test(command);
      const executable = isWindowsBatch ? "cmd.exe" : command;
      const commandLine = [quoteCmd(command), ...args.map(quoteCmd)].join(" ");
      const finalArgs = isWindowsBatch
        ? ["/d", "/s", "/c", `chcp 65001>nul & ${commandLine}`]
        : args;

      const child = spawn(executable, finalArgs, {
        cwd: repoRoot,
        windowsHide: true,
        shell: false,
      });

      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        stderr += `\nProcess timed out after ${timeoutMs} ms.`;
        child.kill();
      }, timeoutMs);

      child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
      child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
      child.on("error", (error) => {
        clearTimeout(timer);
        resolve({ ok: false, exit_code: null, stdout, stderr: `${stderr}\n${error.message}`, json: null });
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        let parsed = null;
        try {
          parsed = JSON.parse(stdout);
        } catch {
          parsed = null;
        }
        resolve({
          ok: code === 0 && (!parsed || parsed.ok !== false),
          exit_code: code,
          stdout,
          stderr,
          json: parsed,
        });
      });
    });
  }

  const TOOLBOX_TOOLS = [
    {
      id: "studio_restart",
      category: "핵심 도구",
      label: "Studio 서버 재시작",
      purpose: "Studio 코드를 고친 뒤 현재 서버를 새로 띄웁니다.",
      when_to_use: "화면이 예전 상태로 보이거나 서버를 다시 켜야 할 때 사용합니다.",
      script: "tools/aiworkflow/studio_director_console.bat",
      args: [],
      command_display: "tools\\aiworkflow\\studio_director_console.bat --host 127.0.0.1 --port 47831",
      kind: "restart_studio",
      timeout_ms: 1000,
      safety: "소스, task, git은 바꾸지 않고 Studio 서버 프로세스만 다시 시작합니다.",
      primary: true,
      confirm_message: "Studio 서버를 재시작할까요? 현재 페이지가 잠시 끊길 수 있고, 잠시 뒤 새로고침하면 됩니다.",
    },
    {
      id: "google_drive_data_upload",
      category: "핵심 도구",
      label: "팀 데이터 배포",
      purpose: "검증된 PlayGround/Data를 Google Drive 최신 배포본으로 공개합니다.",
      when_to_use: "게임 데이터 JSON을 팀/테스트 배포본으로 갱신할 때 사용합니다.",
      script: "tools/google-drive-data-upload/upload_playground_data.bat",
      args: [],
      command_display: "tools\\google-drive-data-upload\\upload_playground_data.bat --publish-team-data --data-version <version>",
      timeout_ms: 20 * 60 * 1000,
      safety: "원본 Data와 배포 zip을 검증한 뒤 versioned zip을 올리고, latest manifest는 마지막에 갱신합니다. 소스, task, git은 바꾸지 않습니다.",
      primary: true,
      publish_data: true,
    },
    {
      id: "studio_smoke",
      category: "Studio",
      label: "Studio 기본 점검",
      purpose: "Studio 화면, API, 직원 보고서 버튼이 기본적으로 작동하는지 확인합니다.",
      when_to_use: "Studio 기능을 수정한 뒤 빠르게 정상 여부를 확인할 때 사용합니다.",
      script: "tools/aiworkflow/studio_smoke_check.bat",
      args: [],
      command_display: "tools\\aiworkflow\\studio_smoke_check.bat",
      timeout_ms: 120000,
      safety: "읽기 중심 점검입니다. _Temp 아래 smoke 결과만 만들 수 있습니다.",
    },
    {
      id: "workflow_status",
      category: "AIWorkflow",
      label: "워크플로우 상태 확인",
      purpose: "현재 Backlog, ActiveTask, workflow 상태를 요약해서 봅니다.",
      when_to_use: "지금 어떤 작업이 선택되어 있고 어디서 멈췄는지 헷갈릴 때 사용합니다.",
      script: "tools/aiworkflow/workflow_status.bat",
      args: ["--json"],
      command_display: "tools\\aiworkflow\\workflow_status.bat --json",
      timeout_ms: 30000,
      safety: "읽기 전용입니다.",
    },
    {
      id: "repo_status",
      category: "AIWorkflow",
      label: "작업대 상태 확인",
      purpose: "Git 변경, diff check, workflow 핵심 파일 존재 여부를 확인합니다.",
      when_to_use: "커밋 전 또는 작업대가 섞였는지 확인할 때 사용합니다.",
      script: "tools/aiworkflow/status.bat",
      args: [],
      command_display: "tools\\aiworkflow\\status.bat",
      timeout_ms: 60000,
      safety: "읽기 전용입니다.",
    },
    {
      id: "project_profile_status",
      category: "프로젝트",
      label: "프로젝트 프로필 확인",
      purpose: "현재 프로젝트의 빌드, 데이터, 검증 진입점 설정을 확인합니다.",
      when_to_use: "게임 검증이나 빌드 경로가 맞는지 확인할 때 사용합니다.",
      script: "tools/aiworkflow/project_profile_status.bat",
      args: ["--json"],
      command_display: "tools\\aiworkflow\\project_profile_status.bat --json",
      timeout_ms: 30000,
      safety: "읽기 전용입니다.",
    },
    {
      id: "json_smoke",
      category: "게임 검증",
      label: "JSON 문법 점검",
      purpose: "PlayGround/Data JSON 파일이 파싱 가능한지 확인합니다.",
      when_to_use: "게임 데이터 JSON을 바꾼 뒤 가장 먼저 사용합니다.",
      script: "tools/aiworkflow/json_smoke_check.bat",
      args: [],
      command_display: "tools\\aiworkflow\\json_smoke_check.bat",
      timeout_ms: 60000,
      safety: "읽기 전용입니다. 게임 데이터 파일을 수정하지 않습니다.",
    },
    {
      id: "game_data_loader_readability",
      category: "게임 검증",
      label: "게임 데이터 로더 점검",
      purpose: "GameDataLoader가 기대하는 JSON 파일을 읽을 수 있는지 확인합니다.",
      when_to_use: "데이터 구조나 로더 관련 작업을 검증할 때 사용합니다.",
      script: "tools/aiworkflow/game_data_loader_readability_check.bat",
      args: [],
      command_display: "tools\\aiworkflow\\game_data_loader_readability_check.bat",
      timeout_ms: 60000,
      safety: "읽기 전용입니다. 게임 소스나 데이터를 수정하지 않습니다.",
    },
  ];

  function toolboxToolExists(repoRoot, tool) {
    if (tool.kind === "restart_studio") {
      return fs.existsSync(repoPath(repoRoot, tool.script));
    }
    return fs.existsSync(repoPath(repoRoot, tool.script));
  }

  function buildToolboxCatalog(repoRoot) {
    const categories = [];
    const toolView = (tool) => ({
      id: tool.id,
      label: tool.label,
      purpose: tool.purpose,
      when_to_use: tool.when_to_use,
      command_display: tool.command_display,
      safety: tool.safety,
      available: toolboxToolExists(repoRoot, tool),
      primary: tool.primary === true,
      confirm_message: tool.confirm_message || "",
      publish_data: tool.publish_data === true,
    });
    const primaryOrder = ["studio_restart", "google_drive_data_upload"];
    const primaryTools = primaryOrder
      .map((id) => TOOLBOX_TOOLS.find((tool) => tool.id === id))
      .filter(Boolean)
      .map(toolView);
    for (const tool of TOOLBOX_TOOLS) {
      if (tool.primary) continue;
      let category = categories.find((item) => item.category === tool.category);
      if (!category) {
        category = { category: tool.category, tools: [] };
        categories.push(category);
      }
      category.tools.push(toolView(tool));
    }
    return {
      primary_tools: primaryTools,
      categories,
      tool_count: TOOLBOX_TOOLS.length,
      safety: {
        allowlisted_only: true,
        arbitrary_command_execution: false,
        source_changed_by_catalog: false,
        task_state_changed_by_catalog: false,
        commit_or_push: false,
      },
    };
  }

  function scheduleStudioRestart(repoRoot, context = {}) {
    const host = context.host || DEFAULT_HOST;
    const port = context.requestedPort || DEFAULT_PORT;
    const child = spawn(process.execPath, [
      serverEntrypoint || __filename,
      "--repo-root",
      repoRoot,
      "--host",
      host,
      "--port",
      String(port),
      "--wait-for-pid",
      String(process.pid),
    ], {
      cwd: repoRoot,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
    setTimeout(() => process.exit(0), 250);
  }

  function normalizeDataVersion(value) {
    const version = String(value || "").trim();
    if (!version) return "";
    if (!/^[0-9A-Za-z._-]{1,80}$/.test(version)) {
      throw new Error("Data version can use only letters, numbers, dot, underscore, and hyphen.");
    }
    return version;
  }

  function infoLineValue(text, label) {
    const regex = new RegExp(`^\\[INFO\\]\\s+${label}:\\s*(.+)$`, "mi");
    const match = String(text || "").match(regex);
    return match ? match[1].trim() : "";
  }

  function buildGoogleDrivePublishSummary(result, dataVersion) {
    const output = [result.stdout || "", result.stderr || ""].filter(Boolean).join("\n");
    const archiveName = infoLineValue(output, "Archive name");
    const archiveFileId = infoLineValue(output, "Archive File ID");
    const archiveSize = infoLineValue(output, "Archive size");
    const archiveLink = infoLineValue(output, "Archive link");
    const manifestFileId = infoLineValue(output, "Manifest File ID");
    const manifestUrl = infoLineValue(output, "Manifest URL");
    const backupManifestFileId = infoLineValue(output, "Backup Manifest File ID");
    const backupManifestName = infoLineValue(output, "Backup Manifest name");
    const logPath = infoLineValue(output, "Log");
    const failureStage = /VALIDATION_ERROR/i.test(output)
      ? "Data 검증 단계"
      : /ZIP_ERROR/i.test(output)
        ? "배포 zip 생성 단계"
        : /UPLOAD_ERROR/i.test(output)
          ? "Google Drive 업로드 또는 manifest 갱신 단계"
          : /CONFIG_ERROR/i.test(output)
            ? "Google Drive 설정 단계"
            : result.ok
              ? ""
              : "도구 실행 단계";
    return {
      data_version: dataVersion || "",
      archive_name: archiveName,
      archive_file_id: archiveFileId,
      archive_size: archiveSize,
      archive_link: archiveLink,
      manifest_file_id: manifestFileId,
      manifest_url: manifestUrl,
      backup_manifest_file_id: backupManifestFileId,
      backup_manifest_name: backupManifestName,
      log_path: logPath,
      failure_stage: failureStage,
      source_validation_seen: /Validating source Data/i.test(output),
      archive_validation_seen: /Validating publish archive extraction/i.test(output),
      latest_manifest_updated: Boolean(manifestFileId || manifestUrl),
    };
  }

  async function runToolboxTool(repoRoot, toolId, context = {}) {
    const tool = TOOLBOX_TOOLS.find((item) => item.id === toolId);
    if (!tool) {
      throw new Error("Unknown toolbox tool.");
    }
    if (!toolboxToolExists(repoRoot, tool)) {
      throw new Error(`Tool script does not exist: ${tool.script}`);
    }
    if (tool.kind === "restart_studio") {
      scheduleStudioRestart(repoRoot, context);
      return {
        ok: true,
        toolbox_result: {
          tool_id: tool.id,
          label: tool.label,
          status: "restart_scheduled",
          summary: "Studio 서버 재시작을 예약했습니다. 잠시 후 브라우저를 새로고침하세요.",
          command_display: tool.command_display,
          stdout: "",
          stderr: "",
        },
        safety: {
          process_restart_scheduled: true,
          source_changed: false,
          task_state_changed: false,
          commit_or_push: false,
        },
      };
    }
    let args = tool.args || [];
    let dataVersion = "";
    let commandDisplay = tool.command_display;
    if (tool.publish_data) {
      dataVersion = normalizeDataVersion(context.data_version || "");
      args = ["--publish-team-data"];
      if (dataVersion) args.push("--data-version", dataVersion);
      commandDisplay = `${tool.command_display.replace(" <version>", dataVersion ? ` ${dataVersion}` : " <auto>")}`;
    }
    const result = await runTool(repoRoot, repoPath(repoRoot, tool.script), args, tool.timeout_ms || 120000);
    const publishSummary = tool.publish_data ? buildGoogleDrivePublishSummary(result, dataVersion) : null;
    return {
      ok: result.ok,
      toolbox_result: {
        tool_id: tool.id,
        label: tool.label,
        status: result.ok ? "success" : "failed",
        summary: tool.publish_data
          ? (result.ok ? "팀 데이터 배포가 완료되었습니다." : "팀 데이터 배포가 실패했습니다. 최신 manifest가 바뀌었는지 결과를 확인하세요.")
          : (result.ok ? "도구 실행이 완료되었습니다." : "도구 실행이 실패했습니다. 출력 내용을 확인하세요."),
        command_display: commandDisplay,
        exit_code: result.exit_code,
        stdout: result.stdout,
        stderr: result.stderr,
        parsed_json: result.json,
        publish_summary: publishSummary,
      },
      safety: {
        allowlisted_tool: true,
        source_changed: false,
        task_state_changed: false,
        commit_or_push: false,
      },
    };
  }

  return {
    buildToolboxCatalog,
    runTool,
    runToolboxTool,
  };
}

module.exports = { createStudioToolboxService };

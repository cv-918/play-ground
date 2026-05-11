import { SlashCommandBuilder } from "discord.js";
import { isAuthorized, rejectUnauthorized } from "../safety/authorization.js";
import { getWorkflowStatus } from "../services/workflowStatusService.js";
import { listProjectProfiles, getProjectProfile } from "../services/projectProfileService.js";
import { getRoleRouterStatus } from "../services/roleRouterService.js";
import { executeRunCommand } from "../services/scriptRunService.js";
import { prepareCodexPrompt } from "../services/codexPromptService.js";
import { prepareGoalPrompt } from "../services/goalPromptService.js";
import { auditGoalResult } from "../services/resultAuditService.js";
import { setActiveTaskWithSafety } from "../services/activeTaskActivationService.js";
import { getManagedBotStatus, prepareBotRestart, scheduleBotRestart } from "../services/botControlService.js";
import { createTaskFromIntake } from "../services/intakeTaskCreationService.js";
import { reviewIntakeTask } from "../services/intakeTaskReviewService.js";
import { approveTaskWithSafety } from "../services/taskApprovalSafetyService.js";
import { getCodexIntakeEngineStatus } from "../services/codexCliIntakeService.js";
import { generateCompletionCard, generateCompletionReport, getCompletionStatus } from "../services/completionService.js";
import { suggestTaskFromIntake } from "../services/taskIntakeService.js";
import { koText } from "../services/koreanOutput.js";
import {
  blockTask,
  completeTask,
  createTask,
  deferTask,
  getCurrentTask,
  listBacklogTasks,
} from "../services/taskService.js";
import {
  formatActive,
  formatBacklog,
  formatBotControlResult,
  formatCompletionCardPayload,
  formatCompletionReportPayload,
  formatCompletionStatusPayload,
  formatBlockers,
  formatCodexPrepareResult,
  formatDocs,
  formatGoalPrepareResult,
  formatIntakeEngineStatusPayload,
  formatIntakeTaskCreatedPayload,
  formatIntakeTaskReviewPayload,
  formatIntakeSuggestionPayload,
  formatNext,
  formatProjectList,
  formatProjectProfile,
  formatResultAudit,
  formatRoleRouterStatus,
  formatRunCommandResult,
  formatStatus,
  formatTaskCreated,
  formatTaskCurrent,
  formatTaskList,
  formatTaskSetActive,
  formatTaskStatusUpdated,
  truncateForDiscord,
} from "../services/responseFormatter.js";

const CATEGORY_CHOICES = ["WF", "GAME", "DOC", "VAL", "UNITY"].map((value) => ({ name: value, value }));
const PRIORITY_CHOICES = ["P0", "P1", "P2", "P3"].map((value) => ({ name: value, value }));
const KIND_CHOICES = ["automation", "implementation", "documentation", "validation", "maintenance", "game", "data", "refactoring", "prototype"]
  .map((value) => ({ name: value, value }));
const BACKLOG_KIND_CHOICES = ["workflow", "architecture", "implementation", "refactoring", "validation", "data", "documentation", "automation", "unity", "release", "maintenance", "game"]
  .map((value) => ({ name: value, value }));
const STATUS_CHOICES = ["todo", "analysis", "awaiting_approval", "ready_for_implementation", "in_progress", "review", "validation", "blocked", "done", "deferred", "partial_done"]
  .map((value) => ({ name: value, value }));
const CODEX_MODE_CHOICES = ["analysis", "implementation", "review"].map((value) => ({ name: value, value }));
const GOAL_MODE_CHOICES = ["analysis", "implementation", "prototype", "review"].map((value) => ({ name: value, value }));
const CODEX_CONTEXT_CHOICES = ["compact", "standard", "full"].map((value) => ({ name: value, value }));

export function buildAiCommand() {
  return new SlashCommandBuilder()
    .setName("ai")
    .setDescription("AIWorkflow 상태와 작업 명령을 실행합니다")
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("전체 AIWorkflow 상태를 표시합니다"),
    )
    .addSubcommand((sub) =>
      sub.setName("active").setDescription("현재 active 작업을 표시합니다"),
    )
    .addSubcommand((sub) =>
      sub.setName("backlog").setDescription("상위 Backlog 항목을 표시합니다"),
    )
    .addSubcommand((sub) =>
      sub.setName("next").setDescription("다음 권장 조치를 표시합니다"),
    )
    .addSubcommand((sub) =>
      sub.setName("blockers").setDescription("blocker 요약을 표시합니다"),
    )
    .addSubcommand((sub) =>
      sub.setName("docs").setDescription("주요 workflow 문서 경로를 표시합니다"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("intake")
        .setDescription("자연어 요청을 Codex CLI로 해석해 Backlog 작업을 생성합니다")
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("자연어 작업 요청")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("intake-create")
        .setDescription("/ai intake와 같은 방식으로 Backlog 작업을 생성합니다")
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("자연어 작업 요청")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("intake-preview")
        .setDescription("Backlog를 쓰지 않고 자연어 요청을 TaskDraft로 미리 확인합니다")
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("자연어 작업 요청")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("intake-test")
        .setDescription("Backlog나 Codex 실행 없이 작업 접수 생성 완료 응답 양식을 테스트합니다")
        .addIntegerOption((option) =>
          option
            .setName("validation-count")
            .setDescription("샘플 필수 검증 항목 수, 기본값 31")
            .setMinValue(1)
            .setMaxValue(50)
            .setRequired(false),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("intake-engine")
        .setDescription("Codex CLI intake 엔진 상태를 점검합니다")
        .addSubcommand((sub) =>
          sub.setName("status").setDescription("Codex CLI intake 엔진 설정과 실행 가능 여부를 확인합니다"),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("bot")
        .setDescription("Discord 봇 프로세스를 확인하거나 재시작합니다")
        .addSubcommand((sub) =>
          sub.setName("status").setDescription("현재 봇이 start_bot.bat 관리 상태인지 확인합니다"),
        )
        .addSubcommand((sub) =>
          sub.setName("restart").setDescription("관리 중인 봇 프로세스를 재시작합니다"),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("project")
        .setDescription("Project profile 조회 명령입니다")
        .addSubcommand((sub) =>
          sub.setName("list").setDescription("사용 가능한 project profile 목록을 표시합니다"),
        )
        .addSubcommand((sub) =>
          sub
            .setName("profile")
            .setDescription("project profile 요약을 표시합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("project profile ID")
                .setRequired(false),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("role")
        .setDescription("Role router 권장 정보를 조회합니다")
        .addSubcommand((sub) =>
          sub.setName("status").setDescription("현재 ActiveTask의 role routing 권장을 표시합니다"),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("run")
        .setDescription("허용된 local workflow script를 실행합니다")
        .addSubcommand((sub) =>
          sub.setName("workflow-status").setDescription("workflow_status.bat --json을 실행합니다"),
        )
        .addSubcommand((sub) =>
          sub.setName("active-project").setDescription("active_project_status.bat --json을 실행합니다"),
        )
        .addSubcommand((sub) =>
          sub
            .setName("project-profile")
            .setDescription("project_profile_status.bat을 실행합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("선택 project profile ID")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub.setName("json-smoke").setDescription("JSON 문법 smoke 검증을 실행합니다"),
        )
        .addSubcommand((sub) =>
          sub
            .setName("capture-diff")
            .setDescription("리뷰용 diff 파일을 캡처합니다")
            .addBooleanOption((option) =>
              option
                .setName("include-untracked")
                .setDescription("untracked 파일 포함 여부, 기본값 false")
                .setRequired(false),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("prepare")
        .setDescription("수동 실행용 작업 routing prompt 패키지를 생성합니다")
        .addSubcommand((sub) =>
          sub
            .setName("codex")
            .setDescription("Codex App prompt 패키지를 생성합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("선택 workflow 작업 ID, 기본값은 ActiveTask.md task_id")
                .setRequired(false),
            )
            .addStringOption((option) =>
              option
                .setName("mode")
                .setDescription("prompt mode, 기본값 implementation")
                .setRequired(false)
                .addChoices(...CODEX_MODE_CHOICES),
            )
            .addStringOption((option) =>
              option
                .setName("context")
                .setDescription("prompt context level, 기본값 standard")
                .setRequired(false)
                .addChoices(...CODEX_CONTEXT_CHOICES),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("goal")
            .setDescription("Codex CLI /goal 요청 markdown 파일을 생성합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("선택 workflow 작업 ID, 기본값은 ActiveTask.md task_id")
                .setRequired(false),
            )
            .addStringOption((option) =>
              option
                .setName("mode")
                .setDescription("goal mode, 기본값 implementation")
                .setRequired(false)
                .addChoices(...GOAL_MODE_CHOICES),
            )
            .addStringOption((option) =>
              option
                .setName("context")
                .setDescription("goal context level, 기본값 standard")
                .setRequired(false)
                .addChoices(...CODEX_CONTEXT_CHOICES),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("result")
        .setDescription("수동 Codex 결과 접수 명령입니다")
        .addSubcommand((sub) =>
          sub
            .setName("audit")
            .setDescription("붙여 넣은 Codex goal 결과 요약을 감사합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("result")
                .setDescription("붙여 넣거나 요약한 Codex 결과")
                .setRequired(true)
                .setMaxLength(3000),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("completion")
        .setDescription("완료 보고서와 완료 카드를 생성/확인합니다")
        .addSubcommand((sub) =>
          sub
            .setName("status")
            .setDescription("작업의 CompletionReport와 완료 카드 상태를 확인합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("report")
            .setDescription("VerificationReport를 바탕으로 CompletionReport를 생성합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("verification-report-id")
                .setDescription("사용할 VerificationReport ID, 없으면 최신 보고서")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("card")
            .setDescription("CompletionReport를 Discord 완료 검토 카드로 표시합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("completion-report-id")
                .setDescription("사용할 CompletionReport ID, 없으면 최신 보고서")
                .setRequired(false),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("task")
        .setDescription("workflow 작업 관리 명령입니다")
        .addSubcommand((sub) =>
          sub.setName("current").setDescription("현재 active 작업 metadata를 표시합니다"),
        )
        .addSubcommand((sub) =>
          sub
            .setName("list")
            .setDescription("상위 Backlog 작업을 표시합니다")
            .addStringOption((option) =>
              option
                .setName("status")
                .setDescription("선택 status filter")
                .setRequired(false)
                .addChoices(...STATUS_CHOICES),
            )
            .addStringOption((option) =>
              option
                .setName("kind")
                .setDescription("선택 kind filter")
                .setRequired(false)
                .addChoices(...BACKLOG_KIND_CHOICES),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("create")
            .setDescription("Backlog 작업을 생성합니다")
            .addStringOption((option) =>
              option
                .setName("title")
                .setDescription("작업 제목")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("category")
                .setDescription("작업 ID category")
                .setRequired(false)
                .addChoices(...CATEGORY_CHOICES),
            )
            .addStringOption((option) =>
              option
                .setName("priority")
                .setDescription("작업 priority")
                .setRequired(false)
                .addChoices(...PRIORITY_CHOICES),
            )
            .addStringOption((option) =>
              option
                .setName("kind")
                .setDescription("작업 kind")
                .setRequired(false)
                .addChoices(...KIND_CHOICES),
            )
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("작업 사유")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("review-intake")
            .setDescription("업무 접수로 생성된 Backlog 작업의 활성화 준비 상태를 검토합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("set-active")
            .setDescription("Backlog.md의 작업을 active 작업으로 선택합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("approve")
            .setDescription("작업 구현 범위를 승인합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("note")
                .setDescription("승인 메모")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("block")
            .setDescription("작업을 사유와 함께 blocked 상태로 표시합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("block 사유")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("defer")
            .setDescription("작업을 deferred 상태로 보류합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("defer 사유")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("done")
            .setDescription("작업을 done 상태로 표시하고 선택 근거를 기록합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("evidence")
                .setDescription("완료 근거")
                .setRequired(false),
            ),
        ),
    );
}

export async function handleAiCommand(interaction, config) {
  if (!isAuthorized(interaction, config)) {
    await rejectUnauthorized(interaction);
    return;
  }

  await interaction.deferReply({ flags: 64 });

  const group = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();

  if (group === "project") {
    await handleProjectCommand(interaction, config, subcommand);
    return;
  }

  if (group === "task") {
    await handleTaskCommand(interaction, config, subcommand);
    return;
  }

  if (group === "completion") {
    await handleCompletionCommand(interaction, config, subcommand);
    return;
  }

  if (group === "role") {
    await handleRoleCommand(interaction, config, subcommand);
    return;
  }

  if (group === "run") {
    await handleRunCommand(interaction, config, subcommand);
    return;
  }

  if (group === "prepare") {
    await handlePrepareCommand(interaction, config, subcommand);
    return;
  }

  if (group === "result") {
    await handleResultCommand(interaction, config, subcommand);
    return;
  }

  if (group === "intake-engine") {
    await handleIntakeEngineCommand(interaction, config, subcommand);
    return;
  }

  if (group === "bot") {
    await handleBotCommand(interaction, config, subcommand);
    return;
  }

  if (subcommand === "docs") {
    await interaction.editReply({ content: truncateForDiscord(formatDocs(), config.limits.maxDiscordChars) });
    return;
  }

  if (subcommand === "intake") {
    await handleIntakeCommand(interaction, config);
    return;
  }

  if (subcommand === "intake-preview") {
    await handleIntakePreviewCommand(interaction, config);
    return;
  }

  if (subcommand === "intake-test") {
    await handleIntakeTestCommand(interaction, config);
    return;
  }

  if (subcommand === "intake-create") {
    await handleIntakeCommand(interaction, config);
    return;
  }

  const statusResult = await getWorkflowStatus(config);
  if (!statusResult.ok) {
    await interaction.editReply({ content: truncateForDiscord(koText(statusResult.error), config.limits.maxDiscordChars) });
    return;
  }

  const status = statusResult.data;
  const formatted = formatBySubcommand(subcommand, status);
  await interaction.editReply({ content: truncateForDiscord(formatted, config.limits.maxDiscordChars) });
}

async function handleIntakeCommand(interaction, config) {
  try {
    const result = await createTaskFromIntake(config, {
      text: interaction.options.getString("text"),
    });

    await interaction.editReply(formatIntakeTaskCreatedPayload(result));
  } catch (error) {
    await interaction.editReply({
      content: truncateForDiscord(`작업 접수 실패: ${koText(error.message)}`, config.limits.maxDiscordChars),
    });
  }
}

async function handleIntakePreviewCommand(interaction, config) {
  try {
    const result = await suggestTaskFromIntake(config, {
      text: interaction.options.getString("text"),
    });

    await interaction.editReply(formatIntakeSuggestionPayload(result));
  } catch (error) {
    await interaction.editReply({
      content: truncateForDiscord(`작업 접수 task 생성 실패: ${koText(error.message)}`, config.limits.maxDiscordChars),
    });
  }
}

async function handleIntakeTestCommand(interaction, config) {
  const validationCount = interaction.options.getInteger("validation-count") ?? 31;
  const result = buildIntakeFormatTestResult(validationCount);

  await interaction.editReply(formatIntakeTaskCreatedPayload(result));
}

function buildIntakeFormatTestResult(validationCount) {
  const requiredValidation = Array.from(
    { length: validationCount },
    (_, index) => `샘플 검증 항목 ${index + 1}: 실제 작업 없이 응답 표시만 확인합니다.`,
  );
  const taskDraft = {
    title: "Workflow task: intake 응답 양식 스모크 테스트",
    category: "WF",
    priority: "P2",
    kind: "automation",
    suggested_risk: "low",
    workflow_path: "discord_task_management",
    reason: "Backlog를 쓰지 않고 Discord intake 생성 완료 응답 양식만 확인하기 위한 샘플입니다.",
    recommended_roles: ["Orchestrator", "Tool/Workflow Engineer", "Reviewer", "Validator"],
    required_validation: requiredValidation,
    confidence: 1,
  };

  return {
    ok: true,
    data: {
      test_mode: true,
      task: {
        id: "WF-FORMAT-TEST",
        item: taskDraft.title,
        priority: taskDraft.priority,
        kind: taskDraft.kind,
      },
      draft: taskDraft,
      suggestion: {
        task_draft: taskDraft,
        llm: {
          used: false,
          fallback_used: false,
          status: "format_test",
          provider: "none",
          model: "none",
        },
      },
      safety: {
        backlog_updated: false,
        active_task_updated: false,
        approved: false,
        codex_intake_executed: false,
      },
    },
  };
}

async function handleIntakeEngineCommand(interaction, config, subcommand) {
  if (subcommand !== "status") {
    await interaction.editReply({ content: "알 수 없는 intake-engine 명령입니다." });
    return;
  }

  const result = await getCodexIntakeEngineStatus(config);
  await interaction.editReply(formatIntakeEngineStatusPayload(result));
}

async function handleBotCommand(interaction, config, subcommand) {
  if (subcommand === "status") {
    const result = await getManagedBotStatus(config);
    await interaction.editReply({
      content: truncateForDiscord(formatBotControlResult(result), config.limits.maxDiscordChars),
    });
    return;
  }

  if (subcommand === "restart") {
    const result = await prepareBotRestart(config);
    await interaction.editReply({
      content: truncateForDiscord(formatBotControlResult(result), config.limits.maxDiscordChars),
    });
    if (result.ok) {
      scheduleBotRestart(config);
    }
    return;
  }

  await interaction.editReply({ content: "Unknown bot command." });
}

async function handleRoleCommand(interaction, config, subcommand) {
  if (subcommand !== "status") {
    await interaction.editReply({ content: "알 수 없는 role command입니다." });
    return;
  }

  const result = await getRoleRouterStatus(config);
  if (!result.ok) {
    await interaction.editReply({ content: truncateForDiscord(koText(result.error), config.limits.maxDiscordChars) });
    return;
  }

  await interaction.editReply({
    content: truncateForDiscord(formatRoleRouterStatus(result.data), config.limits.maxDiscordChars),
  });
}

async function handlePrepareCommand(interaction, config, subcommand) {
  if (subcommand === "goal") {
    await handlePrepareGoalCommand(interaction, config);
    return;
  }

  if (subcommand !== "codex") {
    await interaction.editReply({ content: "알 수 없는 prepare command입니다." });
    return;
  }

  try {
    const result = await prepareCodexPrompt(config, {
      id: interaction.options.getString("id"),
      mode: interaction.options.getString("mode"),
      context: interaction.options.getString("context"),
    });

    await interaction.editReply({
      content: truncateForDiscord(formatCodexPrepareResult(result), config.limits.maxDiscordChars),
    });
  } catch (error) {
    await interaction.editReply({
      content: truncateForDiscord(formatCodexPrepareResult({
        ok: false,
        error: `Codex prompt 생성 실패: ${koText(error.message)}`,
      }), config.limits.maxDiscordChars),
    });
  }
}

async function handlePrepareGoalCommand(interaction, config) {
  try {
    const result = await prepareGoalPrompt(config, {
      id: interaction.options.getString("id"),
      mode: interaction.options.getString("mode"),
      context: interaction.options.getString("context"),
    });

    await interaction.editReply({
      content: truncateForDiscord(formatGoalPrepareResult(result), config.limits.maxDiscordChars),
    });
  } catch (error) {
    await interaction.editReply({
      content: truncateForDiscord(formatGoalPrepareResult({
        ok: false,
        error: `goal 요청서 생성 실패: ${koText(error.message)}`,
      }), config.limits.maxDiscordChars),
    });
  }
}

async function handleResultCommand(interaction, config, subcommand) {
  if (subcommand !== "audit") {
    await interaction.editReply({ content: "알 수 없는 result command입니다." });
    return;
  }

  try {
    const result = await auditGoalResult(config, {
      id: interaction.options.getString("id"),
      result: interaction.options.getString("result"),
    });

    await interaction.editReply({
      content: truncateForDiscord(formatResultAudit(result), config.limits.maxDiscordChars),
    });
  } catch (error) {
    await interaction.editReply({
      content: truncateForDiscord(formatResultAudit({
        ok: false,
        error: `result audit 실패: ${koText(error.message)}`,
      }), config.limits.maxDiscordChars),
    });
  }
}

async function handleCompletionCommand(interaction, config, subcommand) {
  const id = interaction.options.getString("id");

  if (subcommand === "status") {
    const result = await getCompletionStatus(config, { id });
    await interaction.editReply(formatCompletionStatusPayload(result));
    return;
  }

  if (subcommand === "report") {
    const result = await generateCompletionReport(config, {
      id,
      verificationReportId: interaction.options.getString("verification-report-id"),
    });
    await interaction.editReply(formatCompletionReportPayload(result));
    return;
  }

  if (subcommand === "card") {
    const result = await generateCompletionCard(config, {
      id,
      completionReportId: interaction.options.getString("completion-report-id"),
    });
    await interaction.editReply(formatCompletionCardPayload(result));
    return;
  }

  await interaction.editReply({ content: "알 수 없는 completion 명령입니다." });
}

async function handleRunCommand(interaction, config, subcommand) {
  const result = await executeRunCommand(config, subcommand, {
    id: interaction.options.getString("id"),
    includeUntracked: interaction.options.getBoolean("include-untracked") === true,
  });

  await interaction.editReply({
    content: truncateForDiscord(formatRunCommandResult(result), config.limits.maxDiscordChars),
  });
}

async function handleTaskCommand(interaction, config, subcommand) {
  try {
    if (subcommand === "current") {
      const result = await getCurrentTask(config);
      await interaction.editReply({
        content: truncateForDiscord(formatTaskCurrent(result.data), config.limits.maxDiscordChars),
      });
      return;
    }

    if (subcommand === "list") {
      const result = await listBacklogTasks(config, {
        status: interaction.options.getString("status"),
        kind: interaction.options.getString("kind"),
      });
      await interaction.editReply({
        content: truncateForDiscord(formatTaskList(result.data), config.limits.maxDiscordChars),
      });
      return;
    }

    if (subcommand === "create") {
      const result = await createTask(config, {
        title: interaction.options.getString("title"),
        category: interaction.options.getString("category"),
        priority: interaction.options.getString("priority"),
        kind: interaction.options.getString("kind"),
        reason: interaction.options.getString("reason"),
      });
      await interaction.editReply({
        content: truncateForDiscord(formatTaskCreated(result.data), config.limits.maxDiscordChars),
      });
      return;
    }

    if (subcommand === "review-intake") {
      const result = await reviewIntakeTask(config, {
        id: interaction.options.getString("id"),
      });
      await interaction.editReply(formatIntakeTaskReviewPayload(result));
      return;
    }

    if (subcommand === "set-active") {
      const result = await setActiveTaskWithSafety(config, interaction.options.getString("id"));
      if (!result.ok) {
        await interaction.editReply({ content: truncateForDiscord(koText(result.error), config.limits.maxDiscordChars) });
        return;
      }

      await interaction.editReply({
        content: truncateForDiscord(formatTaskSetActive(result.data), config.limits.maxDiscordChars),
      });
      return;
    }

    if (subcommand === "approve") {
      await handleTaskStatusCommand(interaction, config, approveTaskWithSafety, {
        id: interaction.options.getString("id"),
        note: interaction.options.getString("note"),
      });
      return;
    }

    if (subcommand === "block") {
      await handleTaskStatusCommand(interaction, config, blockTask, {
        id: interaction.options.getString("id"),
        reason: interaction.options.getString("reason"),
      });
      return;
    }

    if (subcommand === "defer") {
      await handleTaskStatusCommand(interaction, config, deferTask, {
        id: interaction.options.getString("id"),
        reason: interaction.options.getString("reason"),
      });
      return;
    }

    if (subcommand === "done") {
      await handleTaskStatusCommand(interaction, config, completeTask, {
        id: interaction.options.getString("id"),
        evidence: interaction.options.getString("evidence"),
      });
      return;
    }

    await interaction.editReply({ content: "알 수 없는 task command입니다." });
  } catch (error) {
    await interaction.editReply({
      content: truncateForDiscord(`task command 실패: ${koText(error.message)}`, config.limits.maxDiscordChars),
    });
  }
}

async function handleTaskStatusCommand(interaction, config, action, input) {
  const result = await action(config, input);
  if (!result.ok) {
    await interaction.editReply({ content: truncateForDiscord(koText(result.error), config.limits.maxDiscordChars) });
    return;
  }

  await interaction.editReply({
    content: truncateForDiscord(formatTaskStatusUpdated(result.data), config.limits.maxDiscordChars),
  });
}

async function handleProjectCommand(interaction, config, subcommand) {
  if (subcommand === "list") {
    const result = await listProjectProfiles(config);
    if (!result.ok) {
      await interaction.editReply({ content: truncateForDiscord(koText(result.error), config.limits.maxDiscordChars) });
      return;
    }

    await interaction.editReply({
      content: truncateForDiscord(formatProjectList(result.data), config.limits.maxDiscordChars),
    });
    return;
  }

  if (subcommand === "profile") {
    // Important:
    // Do not fall back to config.defaultProjectId here.
    // If id is omitted, projectProfileService calls project_profile_status.bat without --project,
    // and the local script resolves the default from _Docs/AIWorkflow/ActiveProject.json.
    const projectId = interaction.options.getString("id");
    const result = await getProjectProfile(config, projectId);

    if (!result.ok) {
      await interaction.editReply({ content: truncateForDiscord(koText(result.error), config.limits.maxDiscordChars) });
      return;
    }

    await interaction.editReply({
      content: truncateForDiscord(formatProjectProfile(result.data), config.limits.maxDiscordChars),
    });
    return;
  }

  await interaction.editReply({ content: "알 수 없는 project command입니다." });
}

function formatBySubcommand(subcommand, status) {
  switch (subcommand) {
    case "status":
      return formatStatus(status);
    case "active":
      return formatActive(status);
    case "backlog":
      return formatBacklog(status);
    case "next":
      return formatNext(status);
    case "blockers":
      return formatBlockers(status);
    default:
      return "알 수 없는 /ai subcommand입니다.";
  }
}

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
import { getFinalizationStatus, readFinalizationLog, recordFinalizationDecision } from "../services/finalizationService.js";
import { evaluateAutoApprovalPolicy, getAutoApprovalStatus, readAutoApprovalPolicy } from "../services/autoApprovalPolicyService.js";
import { generateFollowUpPlan, getFollowUpStatus, readFollowUpPlan } from "../services/followUpTaskService.js";
import { continuePcRunner, getPcRunnerStatus, planPcRunner, readPcRunner, startPcRunner, stopPcRunner } from "../services/pcRunnerService.js";
import { acceptCompletionAndContinueRunner } from "../services/runnerCompletionService.js";
import { commitAndPushWorkflowChanges, commitWorkflowChanges, pushWorkflowChanges } from "../services/gitService.js";
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
  formatFinalizationReadPayload,
  formatFinalizationRecordPayload,
  formatFinalizationStatusPayload,
  formatAutoApprovalEvaluatePayload,
  formatAutoApprovalReadPayload,
  formatAutoApprovalStatusPayload,
  formatFollowUpGeneratePayload,
  formatFollowUpReadPayload,
  formatFollowUpStatusPayload,
  formatGitCommandPayload,
  formatPcRunnerPayload,
  formatRunnerAcceptCompletionPayload,
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
  formatTextCardPayload,
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
const RUNNER_PROFILE_CHOICES = ["validation", "implementation", "documentation"].map((value) => ({ name: value, value }));
const RUNNER_EXECUTOR_CHOICES = ["local_cli", "codex_cli"].map((value) => ({ name: value, value }));
const RUNNER_COMPLETION_DECISION_CHOICES = ["accept", "accept-concerns"].map((value) => ({ name: value, value }));

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
        .setDescription("진단/복구용 local workflow script를 실행합니다")
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
        .setDescription("수동 승격용 작업 prompt 패키지를 생성합니다")
        .addSubcommand((sub) =>
          sub
            .setName("codex")
            .setDescription("수동 승격용 Codex App prompt 패키지를 생성합니다")
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
            .setDescription("수동 승격용 Codex CLI /goal 요청 파일을 생성합니다")
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
        .setDescription("수동 승격 결과를 감사하는 명령입니다")
        .addSubcommand((sub) =>
          sub
            .setName("audit")
            .setDescription("붙여 넣은 수동 실행 결과 요약을 검토합니다")
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
        .setName("finalization")
        .setDescription("완료 승인 이력과 최종화 기록을 생성/확인합니다")
        .addSubcommand((sub) =>
          sub
            .setName("status")
            .setDescription("작업의 ApprovalHistory와 FinalizationLog 상태를 확인합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("accept")
            .setDescription("CompletionReport를 사람이 검토하고 완료 수락으로 기록합니다")
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
        )
        .addSubcommand((sub) =>
          sub
            .setName("accept-concerns")
            .setDescription("검토한 CONCERNS 완료 보고서를 우려 수락으로 기록합니다")
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
        )
        .addSubcommand((sub) =>
          sub
            .setName("request-changes")
            .setDescription("완료 검토 결과 수정 필요로 기록합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("completion-report-id")
                .setDescription("참조할 CompletionReport ID")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("reject")
            .setDescription("완료 검토 결과 반려로 기록합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("completion-report-id")
                .setDescription("참조할 CompletionReport ID")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("defer")
            .setDescription("완료 검토를 보류로 기록합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("completion-report-id")
                .setDescription("참조할 CompletionReport ID")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("read")
            .setDescription("FinalizationLog 상세를 읽습니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("finalization-log-id")
                .setDescription("읽을 FinalizationLog ID, 없으면 최신 기록")
                .setRequired(false),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("auto-approval")
        .setDescription("자동 승인 정책 후보 여부를 평가하고 기록합니다")
        .addSubcommand((sub) =>
          sub
            .setName("status")
            .setDescription("작업의 Auto Approval Policy 평가 상태를 확인합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("evaluate")
            .setDescription("완료/최종화 근거로 자동 승인 후보 여부를 평가합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("completion-report-id")
                .setDescription("참조할 CompletionReport ID, 없으면 최신 보고서")
                .setRequired(false),
            )
            .addStringOption((option) =>
              option
                .setName("finalization-log-id")
                .setDescription("참조할 FinalizationLog ID, 없으면 최신 기록")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("read")
            .setDescription("Auto Approval Policy 평가 상세를 읽습니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("policy-evaluation-id")
                .setDescription("읽을 Auto Approval 평가 ID, 없으면 최신 평가")
                .setRequired(false),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("follow-up")
        .setDescription("후속 작업 후보를 생성하고 검토합니다")
        .addSubcommand((sub) =>
          sub
            .setName("status")
            .setDescription("작업의 Follow-up Plan 생성 상태를 확인합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("generate")
            .setDescription("완료/최종화/정책 근거로 후속 작업 후보를 생성합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("completion-report-id")
                .setDescription("참조할 CompletionReport ID, 없으면 최신 보고서")
                .setRequired(false),
            )
            .addStringOption((option) =>
              option
                .setName("finalization-log-id")
                .setDescription("참조할 FinalizationLog ID, 없으면 최신 기록")
                .setRequired(false),
            )
            .addStringOption((option) =>
              option
                .setName("policy-evaluation-id")
                .setDescription("참조할 Auto Approval 평가 ID, 없으면 최신 평가")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("read")
            .setDescription("Follow-up Plan 상세와 후보 목록을 읽습니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("follow-up-plan-id")
                .setDescription("읽을 Follow-up Plan ID, 없으면 최신 계획")
                .setRequired(false),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("runner")
        .setDescription("정규 PC Runner 경로로 작업 실행과 검증을 진행합니다")
        .addSubcommand((sub) =>
          sub
            .setName("status")
            .setDescription("PC Runner 상태와 최신 실행 기록을 확인합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("plan")
            .setDescription("정규 Runner 실행 계획과 중단 지점을 확인합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("profile")
                .setDescription("Runner profile, validation/implementation/documentation")
                .setRequired(false)
                .addChoices(...RUNNER_PROFILE_CHOICES),
            )
            .addStringOption((option) =>
              option
                .setName("executor")
                .setDescription("Runner executor, 기본값 local_cli")
                .setRequired(false)
                .addChoices(...RUNNER_EXECUTOR_CHOICES),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("start")
            .setDescription("승인된 작업을 정규 Runner 경로로 시작합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("profile")
                .setDescription("Runner profile, validation/implementation/documentation")
                .setRequired(false)
                .addChoices(...RUNNER_PROFILE_CHOICES),
            )
            .addStringOption((option) =>
              option
                .setName("executor")
                .setDescription("Runner executor, 기본값 local_cli")
                .setRequired(false)
                .addChoices(...RUNNER_EXECUTOR_CHOICES),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("continue")
            .setDescription("finalization 이후 Runner 후속 단계를 진행합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("runner-run-id")
                .setDescription("RunnerRun ID, 없으면 최신 run")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("accept-completion")
            .setDescription("완료 검토 승인과 Runner 계속 진행을 한 번에 처리합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("completion-report-id")
                .setDescription("CompletionReport ID, 없으면 최신 report")
                .setRequired(false),
            )
            .addStringOption((option) =>
              option
                .setName("runner-run-id")
                .setDescription("RunnerRun ID, 없으면 최신 run")
                .setRequired(false),
            )
            .addStringOption((option) =>
              option
                .setName("decision")
                .setDescription("완료 승인 방식, 기본값 accept")
                .setRequired(false)
                .addChoices(...RUNNER_COMPLETION_DECISION_CHOICES),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("stop")
            .setDescription("Runner run을 수동 중단 상태로 기록합니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("runner-run-id")
                .setDescription("RunnerRun ID, 없으면 최신 run")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("read")
            .setDescription("Runner run 상세 기록을 읽습니다")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog 작업 ID")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("runner-run-id")
                .setDescription("RunnerRun ID, 없으면 최신 run")
                .setRequired(false),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("git")
        .setDescription("검토된 변경분을 commit, push, commit-push로 처리합니다")
        .addSubcommand((sub) =>
          sub
            .setName("commit")
            .setDescription("안전 경로만 확인한 뒤 현재 변경분을 commit합니다")
            .addStringOption((option) =>
              option
                .setName("message")
                .setDescription("커밋 메시지")
                .setRequired(true)
                .setMaxLength(180),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("push")
            .setDescription("현재 브랜치를 push합니다"),
        )
        .addSubcommand((sub) =>
          sub
            .setName("commit-push")
            .setDescription("안전 경로 확인 후 commit하고 이어서 push합니다")
            .addStringOption((option) =>
              option
                .setName("message")
                .setDescription("커밋 메시지")
                .setRequired(true)
                .setMaxLength(180),
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

  if (group === "finalization") {
    await handleFinalizationCommand(interaction, config, subcommand);
    return;
  }

  if (group === "auto-approval") {
    await handleAutoApprovalCommand(interaction, config, subcommand);
    return;
  }

  if (group === "follow-up") {
    await handleFollowUpCommand(interaction, config, subcommand);
    return;
  }

  if (group === "runner") {
    await handlePcRunnerCommand(interaction, config, subcommand);
    return;
  }

  if (group === "git") {
    await handleGitCommand(interaction, config, subcommand);
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
    await replyCard(interaction, config, "AIWorkflow 문서", formatDocs());
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

  const statusResult = await getWorkflowStatus(config);
  if (!statusResult.ok) {
    await replyCard(interaction, config, "AIWorkflow 상태 확인 실패", koText(statusResult.error), 0xc62828);
    return;
  }

  const status = statusResult.data;
  const formatted = formatBySubcommand(subcommand, status);
  await replyCard(interaction, config, getSubcommandTitle(subcommand), formatted);
}

async function handleIntakeCommand(interaction, config) {
  try {
    const result = await createTaskFromIntake(config, {
      text: interaction.options.getString("text"),
    });

    await interaction.editReply(formatIntakeTaskCreatedPayload(result));
  } catch (error) {
    await replyCard(interaction, config, "작업 접수 실패", koText(error.message), 0xc62828);
  }
}

async function handleIntakePreviewCommand(interaction, config) {
  try {
    const result = await suggestTaskFromIntake(config, {
      text: interaction.options.getString("text"),
    });

    await interaction.editReply(formatIntakeSuggestionPayload(result));
  } catch (error) {
    await replyCard(interaction, config, "작업 접수 미리보기 실패", koText(error.message), 0xc62828);
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
    await replyCard(interaction, config, "알 수 없는 명령", "알 수 없는 intake-engine 명령입니다.", 0xc62828);
    return;
  }

  const result = await getCodexIntakeEngineStatus(config);
  await interaction.editReply(formatIntakeEngineStatusPayload(result));
}

async function handleBotCommand(interaction, config, subcommand) {
  if (subcommand === "status") {
    const result = await getManagedBotStatus(config);
    await replyCard(interaction, config, "봇 제어 상태", formatBotControlResult(result), result.ok ? 0x1565c0 : 0xc62828);
    return;
  }

  if (subcommand === "restart") {
    const result = await prepareBotRestart(config);
    await replyCard(interaction, config, "봇 재시작", formatBotControlResult(result), result.ok ? 0xf9a825 : 0xc62828);
    if (result.ok) {
      scheduleBotRestart(config);
    }
    return;
  }

  await replyCard(interaction, config, "알 수 없는 명령", "알 수 없는 bot 명령입니다.", 0xc62828);
}

async function handleRoleCommand(interaction, config, subcommand) {
  if (subcommand !== "status") {
    await replyCard(interaction, config, "알 수 없는 명령", "알 수 없는 role 명령입니다.", 0xc62828);
    return;
  }

  const result = await getRoleRouterStatus(config);
  if (!result.ok) {
    await replyCard(interaction, config, "Role Router 상태 확인 실패", koText(result.error), 0xc62828);
    return;
  }

  await replyCard(interaction, config, "Role Router 상태", formatRoleRouterStatus(result.data));
}

async function handlePrepareCommand(interaction, config, subcommand) {
  if (subcommand === "goal") {
    await handlePrepareGoalCommand(interaction, config);
    return;
  }

  if (subcommand !== "codex") {
    await replyCard(interaction, config, "알 수 없는 명령", "알 수 없는 prepare 명령입니다.", 0xc62828);
    return;
  }

  try {
    const result = await prepareCodexPrompt(config, {
      id: interaction.options.getString("id"),
      mode: interaction.options.getString("mode"),
      context: interaction.options.getString("context"),
    });

    await replyCard(interaction, config, "Codex prompt 생성", formatCodexPrepareResult(result), result.ok ? 0x1565c0 : 0xc62828);
  } catch (error) {
    await replyCard(interaction, config, "Codex prompt 생성 실패", formatCodexPrepareResult({
      ok: false,
      error: `Codex prompt 생성 실패: ${koText(error.message)}`,
    }), 0xc62828);
  }
}

async function handlePrepareGoalCommand(interaction, config) {
  try {
    const result = await prepareGoalPrompt(config, {
      id: interaction.options.getString("id"),
      mode: interaction.options.getString("mode"),
      context: interaction.options.getString("context"),
    });

    await replyCard(interaction, config, "goal 요청서 생성", formatGoalPrepareResult(result), result.ok ? 0x1565c0 : 0xc62828);
  } catch (error) {
    await replyCard(interaction, config, "goal 요청서 생성 실패", formatGoalPrepareResult({
      ok: false,
      error: `goal 요청서 생성 실패: ${koText(error.message)}`,
    }), 0xc62828);
  }
}

async function handleResultCommand(interaction, config, subcommand) {
  if (subcommand !== "audit") {
    await replyCard(interaction, config, "알 수 없는 명령", "알 수 없는 result 명령입니다.", 0xc62828);
    return;
  }

  try {
    const result = await auditGoalResult(config, {
      id: interaction.options.getString("id"),
      result: interaction.options.getString("result"),
    });

    await replyCard(interaction, config, "결과 감사", formatResultAudit(result), result.ok ? 0x1565c0 : 0xc62828);
  } catch (error) {
    await replyCard(interaction, config, "결과 감사 실패", formatResultAudit({
      ok: false,
      error: `result audit 실패: ${koText(error.message)}`,
    }), 0xc62828);
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

  await replyCard(interaction, config, "알 수 없는 명령", "알 수 없는 completion 명령입니다.", 0xc62828);
}

async function handleFinalizationCommand(interaction, config, subcommand) {
  const id = interaction.options.getString("id");

  if (subcommand === "status") {
    const result = await getFinalizationStatus(config, { id });
    await interaction.editReply(formatFinalizationStatusPayload(result));
    return;
  }

  if (subcommand === "read") {
    const result = await readFinalizationLog(config, {
      id,
      finalizationLogId: interaction.options.getString("finalization-log-id"),
    });
    await interaction.editReply(formatFinalizationReadPayload(result));
    return;
  }

  if (["accept", "accept-concerns", "reject", "request-changes", "defer"].includes(subcommand)) {
    const result = await recordFinalizationDecision(config, {
      id,
      command: subcommand,
      completionReportId: interaction.options.getString("completion-report-id"),
      actor: interaction.user?.id,
    });
    await interaction.editReply(formatFinalizationRecordPayload(result));
    return;
  }

  await replyCard(interaction, config, "알 수 없는 명령", "알 수 없는 finalization 명령입니다.", 0xc62828);
}

async function handleAutoApprovalCommand(interaction, config, subcommand) {
  const id = interaction.options.getString("id");

  if (subcommand === "status") {
    const result = await getAutoApprovalStatus(config, { id });
    await interaction.editReply(formatAutoApprovalStatusPayload(result));
    return;
  }

  if (subcommand === "evaluate") {
    const result = await evaluateAutoApprovalPolicy(config, {
      id,
      completionReportId: interaction.options.getString("completion-report-id"),
      finalizationLogId: interaction.options.getString("finalization-log-id"),
    });
    await interaction.editReply(formatAutoApprovalEvaluatePayload(result));
    return;
  }

  if (subcommand === "read") {
    const result = await readAutoApprovalPolicy(config, {
      id,
      policyEvaluationId: interaction.options.getString("policy-evaluation-id"),
    });
    await interaction.editReply(formatAutoApprovalReadPayload(result));
    return;
  }

  await replyCard(interaction, config, "알 수 없는 명령", "알 수 없는 auto-approval 명령입니다.", 0xc62828);
}

async function handleFollowUpCommand(interaction, config, subcommand) {
  const id = interaction.options.getString("id");

  if (subcommand === "status") {
    const result = await getFollowUpStatus(config, { id });
    await interaction.editReply(formatFollowUpStatusPayload(result));
    return;
  }

  if (subcommand === "generate") {
    const result = await generateFollowUpPlan(config, {
      id,
      completionReportId: interaction.options.getString("completion-report-id"),
      finalizationLogId: interaction.options.getString("finalization-log-id"),
      policyEvaluationId: interaction.options.getString("policy-evaluation-id"),
    });
    await interaction.editReply(formatFollowUpGeneratePayload(result));
    return;
  }

  if (subcommand === "read") {
    const result = await readFollowUpPlan(config, {
      id,
      followUpPlanId: interaction.options.getString("follow-up-plan-id"),
    });
    await interaction.editReply(formatFollowUpReadPayload(result));
    return;
  }

  await replyCard(interaction, config, "알 수 없는 명령", "알 수 없는 follow-up 명령입니다.", 0xc62828);
}

async function handlePcRunnerCommand(interaction, config, subcommand) {
  const input = {
    id: interaction.options.getString("id"),
    profile: interaction.options.getString("profile"),
    executor: interaction.options.getString("executor"),
    runnerRunId: interaction.options.getString("runner-run-id"),
    completionReportId: interaction.options.getString("completion-report-id"),
    decision: interaction.options.getString("decision"),
    actor: interaction.user?.id,
  };

  if (subcommand === "status") {
    await interaction.editReply(formatPcRunnerPayload(await getPcRunnerStatus(config, input)));
    return;
  }

  if (subcommand === "plan") {
    await interaction.editReply(formatPcRunnerPayload(await planPcRunner(config, input)));
    return;
  }

  if (subcommand === "start") {
    await interaction.editReply(formatPcRunnerPayload(await startPcRunner(config, input)));
    return;
  }

  if (subcommand === "continue") {
    await interaction.editReply(formatPcRunnerPayload(await continuePcRunner(config, input)));
    return;
  }

  if (subcommand === "accept-completion") {
    await interaction.editReply(formatRunnerAcceptCompletionPayload(await acceptCompletionAndContinueRunner(config, input)));
    return;
  }

  if (subcommand === "stop") {
    await interaction.editReply(formatPcRunnerPayload(await stopPcRunner(config, input)));
    return;
  }

  if (subcommand === "read") {
    await interaction.editReply(formatPcRunnerPayload(await readPcRunner(config, input)));
    return;
  }

  await replyCard(interaction, config, "알 수 없는 명령", "알 수 없는 runner 명령입니다.", 0xc62828);
}

async function handleGitCommand(interaction, config, subcommand) {
  const input = {
    message: interaction.options.getString("message"),
  };

  if (subcommand === "commit") {
    await interaction.editReply(formatGitCommandPayload(await commitWorkflowChanges(config, input)));
    return;
  }

  if (subcommand === "push") {
    await interaction.editReply(formatGitCommandPayload(await pushWorkflowChanges(config)));
    return;
  }

  if (subcommand === "commit-push") {
    await interaction.editReply(formatGitCommandPayload(await commitAndPushWorkflowChanges(config, input)));
    return;
  }

  await replyCard(interaction, config, "알 수 없는 명령", "알 수 없는 git 명령입니다.", 0xc62828);
}

async function handleRunCommand(interaction, config, subcommand) {
  const result = await executeRunCommand(config, subcommand, {
    id: interaction.options.getString("id"),
    includeUntracked: interaction.options.getBoolean("include-untracked") === true,
  });

  await replyCard(interaction, config, "실행 명령 결과", formatRunCommandResult(result), result.ok ? 0x1565c0 : 0xc62828);
}

async function handleTaskCommand(interaction, config, subcommand) {
  try {
    if (subcommand === "current") {
      const result = await getCurrentTask(config);
      await replyCard(interaction, config, "현재 작업", formatTaskCurrent(result.data));
      return;
    }

    if (subcommand === "list") {
      const result = await listBacklogTasks(config, {
        status: interaction.options.getString("status"),
        kind: interaction.options.getString("kind"),
      });
      await replyCard(interaction, config, "작업 Backlog 목록", formatTaskList(result.data));
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
      await replyCard(interaction, config, "작업 생성 완료", formatTaskCreated(result.data), 0x2e7d32);
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
        await replyCard(interaction, config, "작업 선택 실패", koText(result.error), 0xc62828);
        return;
      }

      await replyCard(interaction, config, "현재 작업 업데이트", formatTaskSetActive(result.data), 0x2e7d32);
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

    await replyCard(interaction, config, "알 수 없는 명령", "알 수 없는 task 명령입니다.", 0xc62828);
  } catch (error) {
    await replyCard(interaction, config, "task 명령 실패", koText(error.message), 0xc62828);
  }
}

async function handleTaskStatusCommand(interaction, config, action, input) {
  const result = await action(config, input);
  if (!result.ok) {
    await replyCard(interaction, config, "작업 상태 변경 실패", koText(result.error), 0xc62828);
    return;
  }

  await replyCard(interaction, config, "작업 상태 업데이트", formatTaskStatusUpdated(result.data), 0x2e7d32);
}

async function handleProjectCommand(interaction, config, subcommand) {
  if (subcommand === "list") {
    const result = await listProjectProfiles(config);
    if (!result.ok) {
      await replyCard(interaction, config, "Project profile 목록 실패", koText(result.error), 0xc62828);
      return;
    }

    await replyCard(interaction, config, "Project profile 목록", formatProjectList(result.data));
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
      await replyCard(interaction, config, "Project profile 조회 실패", koText(result.error), 0xc62828);
      return;
    }

    await replyCard(interaction, config, "Project profile 요약", formatProjectProfile(result.data));
    return;
  }

  await replyCard(interaction, config, "알 수 없는 명령", "알 수 없는 project 명령입니다.", 0xc62828);
}

async function replyCard(interaction, config, title, text, color) {
  await interaction.editReply(formatTextCardPayload(title, truncateForDiscord(text, config.limits.maxDiscordChars), { color }));
}

function getSubcommandTitle(subcommand) {
  const titles = {
    status: "AIWorkflow 상태",
    active: "현재 작업",
    backlog: "Backlog 요약",
    next: "다음 권장 작업",
    blockers: "Blocker 요약",
  };
  return titles[subcommand] ?? "AIWorkflow";
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

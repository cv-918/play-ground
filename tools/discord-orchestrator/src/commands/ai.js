import { SlashCommandBuilder } from "discord.js";
import { isAuthorized, rejectUnauthorized } from "../safety/authorization.js";
import { getWorkflowStatus } from "../services/workflowStatusService.js";
import { listProjectProfiles, getProjectProfile } from "../services/projectProfileService.js";
import { executeRunCommand } from "../services/scriptRunService.js";
import { prepareCodexPrompt } from "../services/codexPromptService.js";
import {
  approveTask,
  blockTask,
  completeTask,
  createTask,
  deferTask,
  getCurrentTask,
  listBacklogTasks,
  setActiveTask,
} from "../services/taskService.js";
import {
  formatActive,
  formatBacklog,
  formatBlockers,
  formatCodexPrepareResult,
  formatDocs,
  formatNext,
  formatProjectList,
  formatProjectProfile,
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
const KIND_CHOICES = ["automation", "implementation", "documentation", "validation", "maintenance", "game"]
  .map((value) => ({ name: value, value }));
const BACKLOG_KIND_CHOICES = ["workflow", "architecture", "implementation", "refactoring", "validation", "data", "documentation", "automation", "unity", "release", "maintenance", "game"]
  .map((value) => ({ name: value, value }));
const STATUS_CHOICES = ["todo", "analysis", "awaiting_approval", "ready_for_implementation", "in_progress", "review", "validation", "blocked", "done", "deferred", "partial_done"]
  .map((value) => ({ name: value, value }));
const CODEX_MODE_CHOICES = ["analysis", "implementation", "review"].map((value) => ({ name: value, value }));
const CODEX_CONTEXT_CHOICES = ["compact", "standard", "full"].map((value) => ({ name: value, value }));

export function buildAiCommand() {
  return new SlashCommandBuilder()
    .setName("ai")
    .setDescription("AIWorkflow status and task commands")
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Show overall AIWorkflow status"),
    )
    .addSubcommand((sub) =>
      sub.setName("active").setDescription("Show active task"),
    )
    .addSubcommand((sub) =>
      sub.setName("backlog").setDescription("Show top backlog items"),
    )
    .addSubcommand((sub) =>
      sub.setName("next").setDescription("Show next recommended action"),
    )
    .addSubcommand((sub) =>
      sub.setName("blockers").setDescription("Show blocker summary"),
    )
    .addSubcommand((sub) =>
      sub.setName("docs").setDescription("Show key workflow document paths"),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("project")
        .setDescription("Project profile commands")
        .addSubcommand((sub) =>
          sub.setName("list").setDescription("List available project profiles"),
        )
        .addSubcommand((sub) =>
          sub
            .setName("profile")
            .setDescription("Show a project profile summary")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Project profile id")
                .setRequired(false),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("run")
        .setDescription("Run allowlisted local workflow scripts")
        .addSubcommand((sub) =>
          sub.setName("workflow-status").setDescription("Run workflow_status.bat --json"),
        )
        .addSubcommand((sub) =>
          sub.setName("active-project").setDescription("Run active_project_status.bat --json"),
        )
        .addSubcommand((sub) =>
          sub
            .setName("project-profile")
            .setDescription("Run project_profile_status.bat")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Optional project profile id")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub.setName("json-smoke").setDescription("Run JSON syntax smoke validation"),
        )
        .addSubcommand((sub) =>
          sub
            .setName("capture-diff")
            .setDescription("Capture review diff files")
            .addBooleanOption((option) =>
              option
                .setName("include-untracked")
                .setDescription("Include untracked files; default false")
                .setRequired(false),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("prepare")
        .setDescription("Generate manual task routing prompt packages")
        .addSubcommand((sub) =>
          sub
            .setName("codex")
            .setDescription("Generate a Codex App prompt package")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Optional workflow task id; defaults to ActiveTask.md task_id")
                .setRequired(false),
            )
            .addStringOption((option) =>
              option
                .setName("mode")
                .setDescription("Prompt mode; default implementation")
                .setRequired(false)
                .addChoices(...CODEX_MODE_CHOICES),
            )
            .addStringOption((option) =>
              option
                .setName("context")
                .setDescription("Prompt context level; default standard")
                .setRequired(false)
                .addChoices(...CODEX_CONTEXT_CHOICES),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("task")
        .setDescription("Workflow task management commands")
        .addSubcommand((sub) =>
          sub.setName("current").setDescription("Show current active task metadata"),
        )
        .addSubcommand((sub) =>
          sub
            .setName("list")
            .setDescription("Show top backlog tasks")
            .addStringOption((option) =>
              option
                .setName("status")
                .setDescription("Optional status filter")
                .setRequired(false)
                .addChoices(...STATUS_CHOICES),
            )
            .addStringOption((option) =>
              option
                .setName("kind")
                .setDescription("Optional kind filter")
                .setRequired(false)
                .addChoices(...BACKLOG_KIND_CHOICES),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("create")
            .setDescription("Create a backlog task")
            .addStringOption((option) =>
              option
                .setName("title")
                .setDescription("Task title")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("category")
                .setDescription("Task id category")
                .setRequired(false)
                .addChoices(...CATEGORY_CHOICES),
            )
            .addStringOption((option) =>
              option
                .setName("priority")
                .setDescription("Task priority")
                .setRequired(false)
                .addChoices(...PRIORITY_CHOICES),
            )
            .addStringOption((option) =>
              option
                .setName("kind")
                .setDescription("Task kind")
                .setRequired(false)
                .addChoices(...KIND_CHOICES),
            )
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("Task reason")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("set-active")
            .setDescription("Set the active task from Backlog.md")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog task id")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("approve")
            .setDescription("Approve a task for implementation")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog task id")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("note")
                .setDescription("Approval note")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("block")
            .setDescription("Mark a task blocked with a reason")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog task id")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("Block reason")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("defer")
            .setDescription("Defer a task")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog task id")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("Defer reason")
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("done")
            .setDescription("Mark a task done with optional evidence")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Backlog task id")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("evidence")
                .setDescription("Completion evidence")
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

  await interaction.deferReply({ ephemeral: true });

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

  if (group === "run") {
    await handleRunCommand(interaction, config, subcommand);
    return;
  }

  if (group === "prepare") {
    await handlePrepareCommand(interaction, config, subcommand);
    return;
  }

  if (subcommand === "docs") {
    await interaction.editReply({ content: truncateForDiscord(formatDocs(), config.limits.maxDiscordChars) });
    return;
  }

  const statusResult = await getWorkflowStatus(config);
  if (!statusResult.ok) {
    await interaction.editReply({ content: truncateForDiscord(statusResult.error, config.limits.maxDiscordChars) });
    return;
  }

  const status = statusResult.data;
  const formatted = formatBySubcommand(subcommand, status);
  await interaction.editReply({ content: truncateForDiscord(formatted, config.limits.maxDiscordChars) });
}

async function handlePrepareCommand(interaction, config, subcommand) {
  if (subcommand !== "codex") {
    await interaction.editReply({ content: "Unknown prepare command." });
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
        error: `Codex prompt preparation failed: ${error.message}`,
      }), config.limits.maxDiscordChars),
    });
  }
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

    if (subcommand === "set-active") {
      const result = await setActiveTask(config, interaction.options.getString("id"));
      if (!result.ok) {
        await interaction.editReply({ content: truncateForDiscord(result.error, config.limits.maxDiscordChars) });
        return;
      }

      await interaction.editReply({
        content: truncateForDiscord(formatTaskSetActive(result.data), config.limits.maxDiscordChars),
      });
      return;
    }

    if (subcommand === "approve") {
      await handleTaskStatusCommand(interaction, config, approveTask, {
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

    await interaction.editReply({ content: "Unknown task command." });
  } catch (error) {
    await interaction.editReply({
      content: truncateForDiscord(`Task command failed: ${error.message}`, config.limits.maxDiscordChars),
    });
  }
}

async function handleTaskStatusCommand(interaction, config, action, input) {
  const result = await action(config, input);
  if (!result.ok) {
    await interaction.editReply({ content: truncateForDiscord(result.error, config.limits.maxDiscordChars) });
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
      await interaction.editReply({ content: truncateForDiscord(result.error, config.limits.maxDiscordChars) });
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
      await interaction.editReply({ content: truncateForDiscord(result.error, config.limits.maxDiscordChars) });
      return;
    }

    await interaction.editReply({
      content: truncateForDiscord(formatProjectProfile(result.data), config.limits.maxDiscordChars),
    });
    return;
  }

  await interaction.editReply({ content: "Unknown project command." });
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
      return "Unknown /ai subcommand.";
  }
}

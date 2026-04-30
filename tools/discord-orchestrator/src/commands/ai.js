import { SlashCommandBuilder } from "discord.js";
import { isAuthorized, rejectUnauthorized } from "../safety/authorization.js";
import { getWorkflowStatus } from "../services/workflowStatusService.js";
import { listProjectProfiles, getProjectProfile } from "../services/projectProfileService.js";
import {
  formatActive,
  formatBacklog,
  formatBlockers,
  formatDocs,
  formatNext,
  formatProjectList,
  formatProjectProfile,
  formatStatus,
  truncateForDiscord,
} from "../services/responseFormatter.js";

export function buildAiCommand() {
  return new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Read-only AIWorkflow status commands")
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

import { Client, Events, GatewayIntentBits } from "discord.js";
import { loadConfig } from "./config.js";
import { buildAiCommand, handleAiCommand } from "./commands/ai.js";

const config = loadConfig();

const token = process.env[config.discordTokenEnv];
if (!token) {
  console.error(`[ERROR] Missing Discord bot token environment variable: ${config.discordTokenEnv}`);
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`[OK] Discord AIWorkflow bot logged in as ${readyClient.user.tag}`);
  console.log(`[INFO] Registered local command definition: /${buildAiCommand().name}`);
  console.log(`[INFO] Read-only mode: enabled`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName !== "ai") {
    return;
  }

  try {
    await handleAiCommand(interaction, config);
  } catch (error) {
    console.error("[ERROR] Unhandled command failure:", error);
    const message = [
      "Command failed.",
      "Reason: unhandled bot error.",
      "Next action: check local bot console logs.",
    ].join("\n");

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: message });
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
});

client.login(token);

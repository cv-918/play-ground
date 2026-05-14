import { Client, Events, GatewayIntentBits } from "discord.js";
import { loadConfig } from "./config.js";
import { buildAiCommand, handleAiButton, handleAiCommand } from "./commands/ai.js";
import { formatTextCardPayload } from "./services/responseFormatter.js";

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
  if (interaction.isButton() && String(interaction.customId ?? "").startsWith("aiw:")) {
    try {
      await handleAiButton(interaction, config);
    } catch (error) {
      console.error("[ERROR] Unhandled button failure:", error);
      const payload = formatTextCardPayload("버튼 실행 실패", [
        "**이유**",
        "처리되지 않은 bot 오류입니다.",
        "",
        "**다음 조치**",
        "로컬 bot console log를 확인하세요.",
      ].join("\n"));

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload);
      } else {
        await interaction.reply({ ...payload, flags: 64 });
      }
    }
    return;
  }

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
    const payload = formatTextCardPayload("명령 실행 실패", [
      "**이유**",
      "처리되지 않은 bot 오류입니다.",
      "",
      "**다음 조치**",
      "로컬 bot console log를 확인하세요.",
    ].join("\n"));

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
    } else {
      await interaction.reply({ ...payload, flags: 64 });
    }
  }
});

client.login(token);

import { REST, Routes } from "discord.js";
import { loadConfig } from "./config.js";
import { buildAiCommand } from "./commands/ai.js";

const config = loadConfig();
const token = process.env[config.discordTokenEnv];

if (!token) {
  console.error(`[ERROR] Missing Discord bot token environment variable: ${config.discordTokenEnv}`);
  process.exit(1);
}

if (!config.clientId || !config.guildId) {
  console.error("[ERROR] client_id and guild_id must be set in local config.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);
const commands = [buildAiCommand().toJSON()];

try {
  console.log("[INFO] Registering guild slash commands...");
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands },
  );
  console.log("[OK] Registered /ai command.");
} catch (error) {
  console.error("[ERROR] Failed to register slash commands:", error);
  process.exit(1);
}

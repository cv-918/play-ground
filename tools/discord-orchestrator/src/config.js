import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findRepoRootFromSource() {
  // src -> discord-orchestrator -> tools -> repo root
  return path.resolve(__dirname, "../../..");
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

export function loadConfig() {
  const repoRoot = findRepoRootFromSource();
  const defaultConfigPath = path.join(repoRoot, "_Local", "AIWorkflow", "discord_bot.local.json");
  const configPath = process.env.AIWORKFLOW_DISCORD_CONFIG || defaultConfigPath;

  if (!fs.existsSync(configPath)) {
    console.error(`[ERROR] Local config not found: ${configPath}`);
    console.error("[INFO] Copy tools/discord-orchestrator/config.example.json to _Local/AIWorkflow/discord_bot.local.json and fill it.");
    process.exit(1);
  }

  const raw = readJson(configPath);

  const config = {
    discordTokenEnv: raw.discord_token_env || "AIWORKFLOW_DISCORD_BOT_TOKEN",
    clientId: raw.client_id || "",
    guildId: raw.guild_id || "",
    repoRoot: raw.repo_root || repoRoot,
    defaultProjectId: raw.default_project_id || "dustland_custom_cpp_prototype",
    allowedUserIds: Array.isArray(raw.allowed_user_ids) ? raw.allowed_user_ids : [],
    allowedChannelIds: Array.isArray(raw.allowed_channel_ids) ? raw.allowed_channel_ids : [],
    llmIntake: {
      enabled: raw?.llm_intake?.enabled !== false,
      provider: raw?.llm_intake?.provider || "codex_cli",
      command: raw?.llm_intake?.command || "codex",
      args: Array.isArray(raw?.llm_intake?.args) ? raw.llm_intake.args.map(String) : [],
      model: raw?.llm_intake?.model || "gpt-5.5",
      reasoningEffort: raw?.llm_intake?.reasoning_effort || "medium",
      ephemeral: raw?.llm_intake?.ephemeral === true,
      modelRoutes: Array.isArray(raw?.llm_intake?.model_routes) ? raw.llm_intake.model_routes : [],
      sandbox: raw?.llm_intake?.sandbox || "read-only",
      approvalPolicy: raw?.llm_intake?.approval_policy || "never",
      timeoutMs: raw?.llm_intake?.timeout_ms ?? 60000,
      fallbackOnError: raw?.llm_intake?.fallback_on_error === true,
      outputDir: raw?.llm_intake?.output_dir || "_Temp/AIWorkflowDiscordBot/intake",
    },
    intakeAutoHandoff: {
      enabled: raw?.intake_auto_handoff?.enabled !== false,
      autoStartLowRisk: raw?.intake_auto_handoff?.auto_start_low_risk !== false,
    },
    autoApprovalApply: {
      enabled: raw?.auto_approval_apply?.enabled === true || raw?.autoApprovalApply?.enabled === true,
    },
    limits: {
      scriptTimeoutMs: raw?.limits?.script_timeout_ms ?? 15000,
      maxDiscordChars: raw?.limits?.max_discord_chars ?? 1800,
    },
  };

  config.repoRoot = path.resolve(config.repoRoot);
  return config;
}

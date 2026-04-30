export function isAuthorized(interaction, config) {
  const userAllowed =
    Array.isArray(config.allowedUserIds) &&
    config.allowedUserIds.includes(interaction.user.id);

  const channelAllowed =
    Array.isArray(config.allowedChannelIds) &&
    config.allowedChannelIds.includes(interaction.channelId);

  return userAllowed && channelAllowed;
}

export async function rejectUnauthorized(interaction) {
  await interaction.reply({
    content: "Not authorized.",
    ephemeral: true,
  });
}

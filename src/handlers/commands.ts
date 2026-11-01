import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
} from 'discord.js';
import { config } from '../config';
import { logger } from '../utils/logger';
import { memoryService } from '../services/memory';

const log = logger.child({ module: 'handler:commands' });

export async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user, guildId, channelId } = interaction;

  if (commandName === 'lisa') {
    // Check if in correct guild/channel
    if (guildId !== config.discord.guildId || channelId !== config.discord.channelId) {
      await interaction.reply({
        content: 'This command only works in the designated channel.',
        ephemeral: true,
      });
      return;
    }

    const userId = user.id;
    const username = user.globalName || user.username;

    // Get or create profile
    let profile = await memoryService.getUserProfile(userId);
    if (!profile) {
      // Create profile if doesn't exist
      const member = interaction.member;
      const displayName = member && 'displayName' in member ? member.displayName : username;
      await memoryService.updateUserProfile({
        userId,
        username,
        displayName: displayName || username,
      });
      profile = await memoryService.getUserProfile(userId);
    }

    const relationship = profile?.relationship;

    if (!relationship) {
      await interaction.reply({
        content: 'Something went wrong retrieving your relationship data. Try talking to me first!',
        ephemeral: true,
      });
      return;
    }

    const { level, points, maxPoints, percentage, totalInteractions } = relationship;

    const levelLabels: Record<string, { label: string; color: number; description: string }> = {
      stranger: {
        label: '🤝 Stranger',
        color: Colors.Grey,
        description: 'Just getting to know each other. Polite, professional warmth.',
      },
      acquaintance: {
        label: '😊 Acquaintance',
        color: Colors.Blue,
        description: 'Comfortable familiarity. Light teasing, easy conversation.',
      },
      friends: {
        label: '🤝 Friends',
        color: Colors.Green,
        description: 'Genuine friendship. Emotional support, inside jokes, trust.',
      },
      close_friends: {
        label: '💕 Close Friends',
        color: Colors.Purple,
        description: 'Deep bond. Vulnerability, protectiveness, shared history.',
      },
      lovers: {
        label: '💖 Lovers',
        color: Colors.Red,
        description: 'Romantic partnership. Intimacy, deep understanding, commitment.',
      },
    };

    const levelInfo = levelLabels[level] || levelLabels.stranger;

    // Progress bar
    const barWidth = 20;
    const filled = Math.floor((percentage / 100) * barWidth);
    const empty = barWidth - filled;
    const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

    const nextLevelPoints = maxPoints - points;
    const nextLevelLabel = level === 'lovers' ? 'Max Level! 🎉' : `${nextLevelPoints} points to next level`;

    const embed = new EmbedBuilder()
      .setTitle(`${levelInfo.label} — ${username}`)
      .setDescription(
        `**${levelInfo.description}**\n\n` +
        `**Progress:** ${progressBar} ${percentage}%\n` +
        `**Points:** ${points}/${maxPoints} (${nextLevelLabel})\n` +
        `**Total Interactions:** ${totalInteractions}`
      )
      .setColor(levelInfo.color)
      .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
      .setFooter({ text: 'Lisa • Relationship Meter' })
      .setTimestamp();

    // Add relationship-specific flavor text
    const flavorTexts: Record<string, string> = {
      stranger: '*"Everyone starts somewhere. I\'m curious to see where this goes." 😊*',
      acquaintance: '*"You\'re growing on me. Not many people put in the effort." 😉*',
      friends: '*"I genuinely enjoy our time together. You\'re a good friend." 💕*',
      close_friends: '*"There\'s very little I wouldn\'t do for you. You know that, right?" 🥂*',
      lovers: '*"You\'re my person. Through everything, it\'s always been you." 💖*',
    };

    embed.addFields({
      name: '◈',
      value: flavorTexts[level] || flavorTexts.stranger,
    });

    await interaction.reply({ embeds: [embed] });
    log.info({ userId, username, level, points, percentage }, 'Relationship meter displayed');
  }
}

export async function registerCommands(client: any): Promise<void> {
  // Slash commands are registered via Discord Developer Portal or at runtime
  // For now, we handle them in the interactionCreate event
  log.info('Slash command handler ready');
}
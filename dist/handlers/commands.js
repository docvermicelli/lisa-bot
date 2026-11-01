"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSlashCommand = handleSlashCommand;
exports.registerCommands = registerCommands;
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const memory_1 = require("../services/memory");
const log = logger_1.logger.child({ module: 'handler:commands' });
async function handleSlashCommand(interaction) {
    if (!interaction.isChatInputCommand())
        return;
    const { commandName, user, guildId, channelId } = interaction;
    if (commandName === 'lisa') {
        // Check if in correct guild/channel
        if (guildId !== config_1.config.discord.guildId || channelId !== config_1.config.discord.channelId) {
            await interaction.reply({
                content: 'This command only works in the designated channel.',
                ephemeral: true,
            });
            return;
        }
        const userId = user.id;
        const username = user.globalName || user.username;
        // Get or create profile
        let profile = await memory_1.memoryService.getUserProfile(userId);
        if (!profile) {
            // Create profile if doesn't exist
            const member = interaction.member;
            const displayName = member && 'displayName' in member ? member.displayName : username;
            await memory_1.memoryService.updateUserProfile({
                userId,
                username,
                displayName: displayName || username,
            });
            profile = await memory_1.memoryService.getUserProfile(userId);
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
        const levelLabels = {
            stranger: {
                label: '🤝 Stranger',
                color: discord_js_1.Colors.Grey,
                description: 'Just getting to know each other. Polite, professional warmth.',
            },
            acquaintance: {
                label: '😊 Acquaintance',
                color: discord_js_1.Colors.Blue,
                description: 'Comfortable familiarity. Light teasing, easy conversation.',
            },
            friends: {
                label: '🤝 Friends',
                color: discord_js_1.Colors.Green,
                description: 'Genuine friendship. Emotional support, inside jokes, trust.',
            },
            close_friends: {
                label: '💕 Close Friends',
                color: discord_js_1.Colors.Purple,
                description: 'Deep bond. Vulnerability, protectiveness, shared history.',
            },
            lovers: {
                label: '💖 Lovers',
                color: discord_js_1.Colors.Red,
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
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`${levelInfo.label} — ${username}`)
            .setDescription(`**${levelInfo.description}**\n\n` +
            `**Progress:** ${progressBar} ${percentage}%\n` +
            `**Points:** ${points}/${maxPoints} (${nextLevelLabel})\n` +
            `**Total Interactions:** ${totalInteractions}`)
            .setColor(levelInfo.color)
            .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
            .setFooter({ text: 'Lisa • Relationship Meter' })
            .setTimestamp();
        // Add relationship-specific flavor text
        const flavorTexts = {
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
async function registerCommands(client) {
    // Slash commands are registered via Discord Developer Portal or at runtime
    // For now, we handle them in the interactionCreate event
    log.info('Slash command handler ready');
}
//# sourceMappingURL=commands.js.map
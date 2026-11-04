"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryService = exports.MemoryService = void 0;
exports.closeDatabase = closeDatabase;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const log = logger_1.logger.child({ module: 'memory' });
const TURSO_URL = config_1.config.memory.tursoUrl?.replace('libsql://', 'https://')?.replace('.turso.io', '.turso.io/v2/pipeline');
const TURSO_TOKEN = config_1.config.memory.tursoAuthToken;
async function tursoExecute(sql, args = []) {
    if (!TURSO_URL || !TURSO_TOKEN) {
        throw new Error('Turso not configured');
    }
    const res = await fetch(TURSO_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TURSO_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requests: [{ type: 'execute', stmt: { sql, args } }]
        }),
    });
    const data = await res.json();
    if (data.results?.[0]?.error) {
        throw new Error(data.results[0].error.message);
    }
    const resp = data.results?.[0]?.response || { rows: [], rowsAffected: 0, lastInsertRowid: null };
    return {
        rows: resp.rows || [],
        rowsAffected: resp.rowsAffected || 0,
        lastInsertRowid: resp.lastInsertRowid,
    };
}
function closeDatabase() {
    // No-op for REST API
}
function rowToConversationMessage(row) {
    return {
        id: row.id,
        userId: row.userId,
        username: row.username,
        content: row.content,
        role: row.role,
        timestamp: row.timestamp,
        channelId: row.channelId,
    };
}
function rowToMemoryEntry(row) {
    return {
        id: row.id,
        userId: row.userId,
        key: row.key,
        value: row.value,
        importance: row.importance,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        accessCount: row.accessCount,
    };
}
class MemoryService {
    static instance;
    static getInstance() {
        if (!MemoryService.instance) {
            MemoryService.instance = new MemoryService();
        }
        return MemoryService.instance;
    }
    async addConversation(message) {
        const result = await tursoExecute(`INSERT INTO conversations (user_id, username, content, role, timestamp, channel_id) VALUES (?, ?, ?, ?, ?, ?)`, [message.userId, message.username, message.content, message.role, message.timestamp, message.channelId]);
        return Number(result.lastInsertRowid);
    }
    async getConversationHistory(userId, channelId, limit = config_1.config.memory.maxConversationHistory) {
        const result = await tursoExecute(`SELECT id, user_id as userId, username, content, role, timestamp, channel_id as channelId FROM conversations WHERE user_id = ? AND channel_id = ? ORDER BY timestamp DESC LIMIT ?`, [userId, channelId, limit]);
        return result.rows.map((r) => rowToConversationMessage(r)).reverse();
    }
    async getRecentConversations(channelId, limit = 20) {
        const result = await tursoExecute(`SELECT id, user_id as userId, username, content, role, timestamp, channel_id as channelId FROM conversations WHERE channel_id = ? ORDER BY timestamp DESC LIMIT ?`, [channelId, limit]);
        return result.rows.map((r) => rowToConversationMessage(r)).reverse();
    }
    async storeMemory(userId, key, value, importance = 5) {
        const now = Date.now();
        await tursoExecute(`INSERT INTO memories (user_id, key, value, importance, created_at, updated_at, access_count) VALUES (?, ?, ?, ?, ?, ?, 0) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, importance = CASE WHEN excluded.importance > memories.importance THEN excluded.importance ELSE memories.importance END, updated_at = excluded.updated_at, access_count = memories.access_count + 1`, [userId, key, value, Math.min(10, Math.max(1, importance)), now, now]);
        log.debug({ userId, key, importance }, 'Memory stored/updated');
    }
    async getMemories(userId, limit = 10) {
        const result = await tursoExecute(`SELECT id, user_id as userId, key, value, importance, created_at as createdAt, updated_at as updatedAt, access_count as accessCount FROM memories WHERE user_id = ? ORDER BY importance DESC, updated_at DESC LIMIT ?`, [userId, limit]);
        return result.rows.map((r) => rowToMemoryEntry(r));
    }
    async getMemory(userId, key) {
        const result = await tursoExecute(`SELECT id, user_id as userId, key, value, importance, created_at as createdAt, updated_at as updatedAt, access_count as accessCount FROM memories WHERE user_id = ? AND key = ?`, [userId, key]);
        const row = result.rows[0];
        if (row) {
            await tursoExecute('UPDATE memories SET access_count = access_count + 1 WHERE user_id = ? AND key = ?', [userId, key]);
            return rowToMemoryEntry(row);
        }
        return null;
    }
    async searchMemories(userId, query, limit = 5) {
        const searchTerm = `%${query}%`;
        const result = await tursoExecute(`SELECT id, user_id as userId, key, value, importance, created_at as createdAt, updated_at as updatedAt, access_count as accessCount FROM memories WHERE user_id = ? AND (key LIKE ? OR value LIKE ?) ORDER BY importance DESC, updated_at DESC LIMIT ?`, [userId, searchTerm, searchTerm, limit]);
        return result.rows.map((r) => rowToMemoryEntry(r));
    }
    async updateUserProfile(profile) {
        const now = Date.now();
        const existing = await this.getUserProfile(profile.userId);
        const username = profile.username ?? '';
        const displayName = profile.displayName ?? username;
        const favoriteTopicsJson = profile.favoriteTopics ? JSON.stringify(profile.favoriteTopics) : null;
        const personalityNotes = profile.personalityNotes ?? '';
        if (existing) {
            await tursoExecute(`UPDATE user_profiles SET username = COALESCE(?, username), display_name = COALESCE(?, display_name), last_seen = ?, message_count = message_count + 1, favorite_topics = COALESCE(?, favorite_topics), personality_notes = COALESCE(?, personality_notes), updated_at = ? WHERE user_id = ?`, [username, displayName, now, favoriteTopicsJson, personalityNotes, now, profile.userId]);
        }
        else {
            await tursoExecute(`INSERT INTO user_profiles (user_id, username, display_name, first_seen, last_seen, message_count, favorite_topics, personality_notes, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`, [profile.userId, username, displayName, now, now, favoriteTopicsJson || '[]', personalityNotes, now]);
        }
    }
    async getUserProfile(userId) {
        const result = await tursoExecute(`SELECT user_id as userId, username, display_name as displayName, first_seen as firstSeen, last_seen as lastSeen, message_count as messageCount, favorite_topics as favoriteTopics, personality_notes as personalityNotes, relationship_level as relationshipLevel, relationship_points as relationshipPoints, relationship_max_points as relationshipMaxPoints, total_interactions as totalInteractions, last_interaction as lastInteraction FROM user_profiles WHERE user_id = ?`, [userId]);
        const row = result.rows[0];
        if (!row)
            return null;
        const relationshipPoints = row.relationshipPoints;
        const relationshipMaxPoints = row.relationshipMaxPoints;
        const percentage = relationshipMaxPoints > 0 ? Math.floor((relationshipPoints / relationshipMaxPoints) * 100) : 0;
        return {
            userId: row.userId,
            username: row.username,
            displayName: row.displayName,
            firstSeen: row.firstSeen,
            lastSeen: row.lastSeen,
            messageCount: row.messageCount,
            favoriteTopics: JSON.parse(row.favoriteTopics || '[]'),
            personalityNotes: row.personalityNotes,
            relationship: {
                userId: row.userId,
                level: row.relationshipLevel,
                points: relationshipPoints,
                maxPoints: relationshipMaxPoints,
                percentage,
                lastInteraction: row.lastInteraction,
                totalInteractions: row.totalInteractions,
            },
        };
    }
    calculateRelationshipLevel(points) {
        const { strangerMaxPoints, acquaintanceMaxPoints, friendsMaxPoints, closeFriendsMaxPoints } = config_1.config.relationship;
        if (points >= closeFriendsMaxPoints)
            return { level: 'lovers', maxPoints: closeFriendsMaxPoints };
        if (points >= friendsMaxPoints)
            return { level: 'close_friends', maxPoints: friendsMaxPoints };
        if (points >= acquaintanceMaxPoints)
            return { level: 'friends', maxPoints: acquaintanceMaxPoints };
        if (points >= strangerMaxPoints)
            return { level: 'acquaintance', maxPoints: strangerMaxPoints };
        return { level: 'stranger', maxPoints: strangerMaxPoints };
    }
    async addRelationshipPoints(userId, points) {
        const now = Date.now();
        const profile = await this.getUserProfile(userId);
        let currentPoints = profile?.relationship?.points || 0;
        let currentMaxPoints = profile?.relationship?.maxPoints || config_1.config.relationship.strangerMaxPoints;
        let oldLevel = profile?.relationship?.level || 'stranger';
        currentPoints += points;
        const { level: newLevel, maxPoints: newMaxPoints } = this.calculateRelationshipLevel(currentPoints);
        const leveledUp = newLevel !== oldLevel;
        if (leveledUp)
            currentMaxPoints = newMaxPoints;
        await tursoExecute(`UPDATE user_profiles SET relationship_level = ?, relationship_points = ?, relationship_max_points = ?, total_interactions = total_interactions + 1, last_interaction = ?, updated_at = ? WHERE user_id = ?`, [newLevel, currentPoints, newMaxPoints, now, now, userId]);
        log.debug({ userId, pointsAdded: points, newPoints: currentPoints, newLevel, leveledUp }, 'Relationship points updated');
        return { level: newLevel, points: currentPoints, maxPoints: newMaxPoints, leveledUp };
    }
    async getRelationshipMeter(userId) {
        const profile = await this.getUserProfile(userId);
        if (!profile || !profile.relationship)
            return null;
        return profile.relationship;
    }
    getRelationshipLevelLabel(level) {
        const labels = {
            stranger: '🤝 Stranger', acquaintance: '😊 Acquaintance', friends: '🤝 Friends',
            close_friends: '💕 Close Friends', lovers: '💖 Lovers',
        };
        return labels[level] || level;
    }
    getRelationshipProgressBar(points, maxPoints, width = 20) {
        const percentage = maxPoints > 0 ? Math.min(points / maxPoints, 1) : 0;
        const filled = Math.floor(percentage * width);
        const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
        return `\`${bar}\` ${Math.floor(percentage * 100)}%`;
    }
    async cleanupOldData() {
        const convResult = await tursoExecute(`DELETE FROM conversations WHERE id NOT IN (SELECT id FROM conversations ORDER BY timestamp DESC LIMIT ?)`, [config_1.config.memory.maxConversationHistory * 10]);
        const memResult = await tursoExecute(`DELETE FROM memories WHERE id NOT IN (SELECT id FROM memories ORDER BY importance DESC, updated_at DESC LIMIT ?)`, [config_1.config.memory.maxMemoryEntries]);
        log.info({ deletedConversations: convResult.rowsAffected, deletedMemories: memResult.rowsAffected }, 'Cleanup completed');
        return { conversations: convResult.rowsAffected, memories: memResult.rowsAffected };
    }
    async getStats() {
        const [convResult, memResult, userResult] = await Promise.all([
            tursoExecute('SELECT COUNT(*) as count FROM conversations'),
            tursoExecute('SELECT COUNT(*) as count FROM memories'),
            tursoExecute('SELECT COUNT(*) as count FROM user_profiles'),
        ]);
        return {
            conversations: convResult.rows[0]?.count,
            memories: memResult.rows[0]?.count,
            users: userResult.rows[0]?.count,
        };
    }
}
exports.MemoryService = MemoryService;
exports.memoryService = MemoryService.getInstance();
//# sourceMappingURL=memory.js.map
import { config } from '../config';
import { logger } from '../utils/logger';
import type {
  ConversationMessage,
  MemoryEntry,
  UserProfile,
  RelationshipLevel,
  RelationshipMeter,
} from '../types';

const log = logger.child({ module: 'memory' });

let client: any = null;

async function getClient() {
  if (!client) {
    if (config.memory.tursoUrl && config.memory.tursoAuthToken) {
      // Remote Turso - use HTTP client (no native binary needed, works on all platforms including Termux ARM64)
      const { createClient } = await import('@libsql/client/http');
      client = createClient({
        url: config.memory.tursoUrl,
        authToken: config.memory.tursoAuthToken,
      });
      log.info('Connected to Turso database via HTTP');
    } else {
      // Local SQLite file - use dynamic import to avoid loading native binary on unsupported platforms
      const { createClient } = await import('@libsql/client');
      client = createClient({
        url: `file:${config.memory.dbPath}`,
      });
      log.info({ path: config.memory.dbPath }, 'Connected to local SQLite database');
    }
  }
  return client;
}

export function closeDatabase(): void {
  if (client) {
    client.close();
    client = null;
  }
}

function rowToConversationMessage(row: Record<string, unknown>): ConversationMessage {
  return {
    id: row.id as number,
    userId: row.userId as string,
    username: row.username as string,
    content: row.content as string,
    role: row.role as 'user' | 'assistant' | 'system',
    timestamp: row.timestamp as number,
    channelId: row.channelId as string,
  };
}

function rowToMemoryEntry(row: Record<string, unknown>): MemoryEntry {
  return {
    id: row.id as number,
    userId: row.userId as string,
    key: row.key as string,
    value: row.value as string,
    importance: row.importance as number,
    createdAt: row.createdAt as number,
    updatedAt: row.updatedAt as number,
    accessCount: row.accessCount as number,
  };
}

export class MemoryService {
  private static instance: MemoryService;

  static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  async addConversation(message: Omit<ConversationMessage, 'id'>): Promise<number> {
    const db = await getClient();
    const result = await db.execute(
      `INSERT INTO conversations (user_id, username, content, role, timestamp, channel_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [message.userId, message.username, message.content, message.role, message.timestamp, message.channelId]
    );
    return Number(result.lastInsertRowid);
  }

  async getConversationHistory(
    userId: string,
    channelId: string,
    limit: number = config.memory.maxConversationHistory
  ): Promise<ConversationMessage[]> {
    const db = await getClient();
    const result = await db.execute(
      `SELECT id, user_id as userId, username, content, role, timestamp, channel_id as channelId FROM conversations WHERE user_id = ? AND channel_id = ? ORDER BY timestamp DESC LIMIT ?`,
      [userId, channelId, limit]
    );
    return result.rows.map((r: Record<string, unknown>) => rowToConversationMessage(r)).reverse();
  }

  async getRecentConversations(channelId: string, limit: number = 20): Promise<ConversationMessage[]> {
    const db = await getClient();
    const result = await db.execute(
      `SELECT id, user_id as userId, username, content, role, timestamp, channel_id as channelId FROM conversations WHERE channel_id = ? ORDER BY timestamp DESC LIMIT ?`,
      [channelId, limit]
    );
    return result.rows.map((r: Record<string, unknown>) => rowToConversationMessage(r)).reverse();
  }

  async storeMemory(userId: string, key: string, value: string, importance: number = 5): Promise<void> {
    const now = Date.now();
    const db = await getClient();
    await db.execute(
      `INSERT INTO memories (user_id, key, value, importance, created_at, updated_at, access_count) VALUES (?, ?, ?, ?, ?, ?, 0) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, importance = CASE WHEN excluded.importance > memories.importance THEN excluded.importance ELSE memories.importance END, updated_at = excluded.updated_at, access_count = memories.access_count + 1`,
      [userId, key, value, Math.min(10, Math.max(1, importance)), now, now]
    );
    log.debug({ userId, key, importance }, 'Memory stored/updated');
  }

  async getMemories(userId: string, limit: number = 10): Promise<MemoryEntry[]> {
    const db = await getClient();
    const result = await db.execute(
      `SELECT id, user_id as userId, key, value, importance, created_at as createdAt, updated_at as updatedAt, access_count as accessCount FROM memories WHERE user_id = ? ORDER BY importance DESC, updated_at DESC LIMIT ?`,
      [userId, limit]
    );
    return result.rows.map((r: Record<string, unknown>) => rowToMemoryEntry(r));
  }

  async getMemory(userId: string, key: string): Promise<MemoryEntry | null> {
    const db = await getClient();
    const result = await db.execute(
      `SELECT id, user_id as userId, key, value, importance, created_at as createdAt, updated_at as updatedAt, access_count as accessCount FROM memories WHERE user_id = ? AND key = ?`,
      [userId, key]
    );
    const row = result.rows[0];
    if (row) {
      await db.execute('UPDATE memories SET access_count = access_count + 1 WHERE user_id = ? AND key = ?', [userId, key]);
      return rowToMemoryEntry(row as Record<string, unknown>);
    }
    return null;
  }

  async searchMemories(userId: string, query: string, limit: number = 5): Promise<MemoryEntry[]> {
    const db = await getClient();
    const searchTerm = `%${query}%`;
    const result = await db.execute(
      `SELECT id, user_id as userId, key, value, importance, created_at as createdAt, updated_at as updatedAt, access_count as accessCount FROM memories WHERE user_id = ? AND (key LIKE ? OR value LIKE ?) ORDER BY importance DESC, updated_at DESC LIMIT ?`,
      [userId, searchTerm, searchTerm, limit]
    );
    return result.rows.map((r: Record<string, unknown>) => rowToMemoryEntry(r));
  }

  async updateUserProfile(profile: Partial<UserProfile> & { userId: string }): Promise<void> {
    const now = Date.now();
    const existing = await this.getUserProfile(profile.userId);
    const db = await getClient();

    const username = profile.username ?? '';
    const displayName = profile.displayName ?? username;
    const favoriteTopicsJson = profile.favoriteTopics ? JSON.stringify(profile.favoriteTopics) : null;
    const personalityNotes = profile.personalityNotes ?? '';

    if (existing) {
      await db.execute(
        `UPDATE user_profiles SET username = COALESCE(?, username), display_name = COALESCE(?, display_name), last_seen = ?, message_count = message_count + 1, favorite_topics = COALESCE(?, favorite_topics), personality_notes = COALESCE(?, personality_notes), updated_at = ? WHERE user_id = ?`,
        [username, displayName, now, favoriteTopicsJson, personalityNotes, now, profile.userId]
      );
    } else {
      await db.execute(
        `INSERT INTO user_profiles (user_id, username, display_name, first_seen, last_seen, message_count, favorite_topics, personality_notes, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [profile.userId, username, displayName, now, now, favoriteTopicsJson || '[]', personalityNotes, now]
      );
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const db = await getClient();
    const result = await db.execute(
      `SELECT user_id as userId, username, display_name as displayName, first_seen as firstSeen, last_seen as lastSeen, message_count as messageCount, favorite_topics as favoriteTopics, personality_notes as personalityNotes, relationship_level as relationshipLevel, relationship_points as relationshipPoints, relationship_max_points as relationshipMaxPoints, total_interactions as totalInteractions, last_interaction as lastInteraction FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;

    const relationshipPoints = row.relationshipPoints as number;
    const relationshipMaxPoints = row.relationshipMaxPoints as number;
    const percentage = relationshipMaxPoints > 0 ? Math.floor((relationshipPoints / relationshipMaxPoints) * 100) : 0;

    return {
      userId: row.userId as string,
      username: row.username as string,
      displayName: row.displayName as string,
      firstSeen: row.firstSeen as number,
      lastSeen: row.lastSeen as number,
      messageCount: row.messageCount as number,
      favoriteTopics: JSON.parse((row.favoriteTopics as string) || '[]'),
      personalityNotes: row.personalityNotes as string,
      relationship: {
        userId: row.userId as string,
        level: row.relationshipLevel as RelationshipLevel,
        points: relationshipPoints,
        maxPoints: relationshipMaxPoints,
        percentage,
        lastInteraction: row.lastInteraction as number,
        totalInteractions: row.totalInteractions as number,
      },
    };
  }

  calculateRelationshipLevel(points: number): { level: RelationshipLevel; maxPoints: number } {
    const { strangerMaxPoints, acquaintanceMaxPoints, friendsMaxPoints, closeFriendsMaxPoints } = config.relationship;

    if (points >= closeFriendsMaxPoints) return { level: 'lovers', maxPoints: closeFriendsMaxPoints };
    if (points >= friendsMaxPoints) return { level: 'close_friends', maxPoints: friendsMaxPoints };
    if (points >= acquaintanceMaxPoints) return { level: 'friends', maxPoints: acquaintanceMaxPoints };
    if (points >= strangerMaxPoints) return { level: 'acquaintance', maxPoints: strangerMaxPoints };
    return { level: 'stranger', maxPoints: strangerMaxPoints };
  }

  async addRelationshipPoints(userId: string, points: number): Promise<{ level: RelationshipLevel; points: number; maxPoints: number; leveledUp: boolean }> {
    const now = Date.now();
    const profile = await this.getUserProfile(userId);

    let currentPoints = profile?.relationship?.points || 0;
    let currentMaxPoints = profile?.relationship?.maxPoints || config.relationship.strangerMaxPoints;
    let oldLevel = profile?.relationship?.level || 'stranger';

    currentPoints += points;
    const { level: newLevel, maxPoints: newMaxPoints } = this.calculateRelationshipLevel(currentPoints);
    const leveledUp = newLevel !== oldLevel;

    if (leveledUp) currentMaxPoints = newMaxPoints;

    const db = await getClient();
    await db.execute(
      `UPDATE user_profiles SET relationship_level = ?, relationship_points = ?, relationship_max_points = ?, total_interactions = total_interactions + 1, last_interaction = ?, updated_at = ? WHERE user_id = ?`,
      [newLevel, currentPoints, newMaxPoints, now, now, userId]
    );

    log.debug({ userId, pointsAdded: points, newPoints: currentPoints, newLevel, leveledUp }, 'Relationship points updated');

    return { level: newLevel, points: currentPoints, maxPoints: newMaxPoints, leveledUp };
  }

  async getRelationshipMeter(userId: string): Promise<RelationshipMeter | null> {
    const profile = await this.getUserProfile(userId);
    if (!profile || !profile.relationship) return null;
    return profile.relationship;
  }

  getRelationshipLevelLabel(level: RelationshipLevel): string {
    const labels: Record<RelationshipLevel, string> = {
      stranger: '🤝 Stranger', acquaintance: '😊 Acquaintance', friends: '🤝 Friends',
      close_friends: '💕 Close Friends', lovers: '💖 Lovers',
    };
    return labels[level] || level;
  }

  getRelationshipProgressBar(points: number, maxPoints: number, width: number = 20): string {
    const percentage = maxPoints > 0 ? Math.min(points / maxPoints, 1) : 0;
    const filled = Math.floor(percentage * width);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    return `\`${bar}\` ${Math.floor(percentage * 100)}%`;
  }

  async cleanupOldData(): Promise<{ conversations: number; memories: number }> {
    const db = await getClient();
    const convResult = await db.execute(
      `DELETE FROM conversations WHERE id NOT IN (SELECT id FROM conversations ORDER BY timestamp DESC LIMIT ?)`,
      [config.memory.maxConversationHistory * 10]
    );
    const memResult = await db.execute(
      `DELETE FROM memories WHERE id NOT IN (SELECT id FROM memories ORDER BY importance DESC, updated_at DESC LIMIT ?)`,
      [config.memory.maxMemoryEntries]
    );
    log.info({ deletedConversations: convResult.rowsAffected, deletedMemories: memResult.rowsAffected }, 'Cleanup completed');
    return { conversations: convResult.rowsAffected as number, memories: memResult.rowsAffected as number };
  }

  async getStats(): Promise<{ conversations: number; memories: number; users: number }> {
    const db = await getClient();
    const [convResult, memResult, userResult] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM conversations'),
      db.execute('SELECT COUNT(*) as count FROM memories'),
      db.execute('SELECT COUNT(*) as count FROM user_profiles'),
    ]);
    return {
      conversations: (convResult.rows[0] as Record<string, unknown>)?.count as number,
      memories: (memResult.rows[0] as Record<string, unknown>)?.count as number,
      users: (userResult.rows[0] as Record<string, unknown>)?.count as number,
    };
  }
}

export const memoryService = MemoryService.getInstance();
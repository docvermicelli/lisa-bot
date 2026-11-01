import type { ConversationMessage, MemoryEntry, UserProfile, RelationshipLevel, RelationshipMeter } from '../types';
export declare function closeDatabase(): void;
export declare class MemoryService {
    private static instance;
    static getInstance(): MemoryService;
    addConversation(message: Omit<ConversationMessage, 'id'>): Promise<number>;
    getConversationHistory(userId: string, channelId: string, limit?: number): Promise<ConversationMessage[]>;
    getRecentConversations(channelId: string, limit?: number): Promise<ConversationMessage[]>;
    storeMemory(userId: string, key: string, value: string, importance?: number): Promise<void>;
    getMemories(userId: string, limit?: number): Promise<MemoryEntry[]>;
    getMemory(userId: string, key: string): Promise<MemoryEntry | null>;
    searchMemories(userId: string, query: string, limit?: number): Promise<MemoryEntry[]>;
    updateUserProfile(profile: Partial<UserProfile> & {
        userId: string;
    }): Promise<void>;
    getUserProfile(userId: string): Promise<UserProfile | null>;
    calculateRelationshipLevel(points: number): {
        level: RelationshipLevel;
        maxPoints: number;
    };
    addRelationshipPoints(userId: string, points: number): Promise<{
        level: RelationshipLevel;
        points: number;
        maxPoints: number;
        leveledUp: boolean;
    }>;
    getRelationshipMeter(userId: string): Promise<RelationshipMeter | null>;
    getRelationshipLevelLabel(level: RelationshipLevel): string;
    getRelationshipProgressBar(points: number, maxPoints: number, width?: number): string;
    cleanupOldData(): Promise<{
        conversations: number;
        memories: number;
    }>;
    getStats(): Promise<{
        conversations: number;
        memories: number;
        users: number;
    }>;
}
export declare const memoryService: MemoryService;
//# sourceMappingURL=memory.d.ts.map
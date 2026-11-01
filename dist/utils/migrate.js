"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const config_1 = require("../config");
const logger_1 = require("./logger");
const log = logger_1.logger.child({ module: 'db:migrate' });
const MIGRATIONS = [
    {
        version: 1,
        name: 'initial_schema',
        up: (db) => {
            db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          content TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
          timestamp INTEGER NOT NULL,
          channel_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_conversations_user_channel
          ON conversations(user_id, channel_id, timestamp DESC);
      `);
        },
    },
    {
        version: 2,
        name: 'add_memories_table',
        up: (db) => {
            db.exec(`
        CREATE TABLE IF NOT EXISTS memories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          access_count INTEGER DEFAULT 0,
          UNIQUE(user_id, key)
        );
        CREATE INDEX IF NOT EXISTS idx_memories_user_importance
          ON memories(user_id, importance DESC, updated_at DESC);
      `);
        },
    },
    {
        version: 3,
        name: 'add_user_profiles',
        up: (db) => {
            db.exec(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          user_id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          display_name TEXT,
          first_seen INTEGER NOT NULL,
          last_seen INTEGER NOT NULL,
          message_count INTEGER DEFAULT 0,
          favorite_topics TEXT DEFAULT '[]',
          personality_notes TEXT DEFAULT '',
          updated_at INTEGER NOT NULL
        );
      `);
        },
    },
    {
        version: 4,
        name: 'add_bot_stats',
        up: (db) => {
            db.exec(`
        CREATE TABLE IF NOT EXISTS bot_stats (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          uptime_start INTEGER NOT NULL,
          messages_processed INTEGER DEFAULT 0,
          memories_stored INTEGER DEFAULT 0,
          errors INTEGER DEFAULT 0,
          total_ollama_latency_ms INTEGER DEFAULT 0,
          ollama_requests INTEGER DEFAULT 0,
          updated_at INTEGER NOT NULL
        );
        INSERT OR IGNORE INTO bot_stats (id, uptime_start, updated_at)
        VALUES (1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);
      `);
        },
    },
    {
        version: 5,
        name: 'add_conversation_timestamp_index',
        up: (db) => {
            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_conversations_timestamp
          ON conversations(timestamp DESC);
      `);
        },
    },
    {
        version: 6,
        name: 'add_relationship_meter',
        up: (db) => {
            db.exec(`
        ALTER TABLE user_profiles ADD COLUMN relationship_level TEXT DEFAULT 'stranger';
        ALTER TABLE user_profiles ADD COLUMN relationship_points INTEGER DEFAULT 0;
        ALTER TABLE user_profiles ADD COLUMN relationship_max_points INTEGER DEFAULT 50;
        ALTER TABLE user_profiles ADD COLUMN total_interactions INTEGER DEFAULT 0;
        ALTER TABLE user_profiles ADD COLUMN last_interaction INTEGER DEFAULT 0;
      `);
        },
    },
];
function getCurrentVersion(db) {
    try {
        const result = db.prepare('PRAGMA user_version').get();
        return result.user_version;
    }
    catch {
        return 0;
    }
}
function setVersion(db, version) {
    db.prepare(`PRAGMA user_version = ${version}`).run();
}
function runMigrations() {
    const db = new better_sqlite3_1.default(config_1.config.memory.dbPath);
    try {
        const currentVersion = getCurrentVersion(db);
        log.info({ currentVersion }, 'Current database version');
        for (const migration of MIGRATIONS) {
            if (migration.version > currentVersion) {
                log.info({ version: migration.version, name: migration.name }, 'Running migration');
                db.exec('BEGIN TRANSACTION');
                try {
                    migration.up(db);
                    setVersion(db, migration.version);
                    db.exec('COMMIT');
                    log.info({ version: migration.version }, 'Migration completed');
                }
                catch (error) {
                    db.exec('ROLLBACK');
                    throw error;
                }
            }
        }
        const finalVersion = getCurrentVersion(db);
        log.info({ finalVersion }, 'Migrations complete');
    }
    finally {
        db.close();
    }
}
const isMainModule = process.argv[1] && process.argv[1].endsWith('migrate.ts') ||
    process.argv[1] && process.argv[1].endsWith('migrate.js');
if (isMainModule) {
    try {
        runMigrations();
        process.exit(0);
    }
    catch (error) {
        log.error({ error }, 'Migration failed');
        process.exit(1);
    }
}
//# sourceMappingURL=migrate.js.map
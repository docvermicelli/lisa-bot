"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = closeDatabase;
exports.initializeDatabase = initializeDatabase;
exports.getDatabase = getDatabase;
const client_1 = require("@libsql/client");
const config_1 = require("../config");
const logger_1 = require("./logger");
const log = logger_1.logger.child({ module: 'db:init' });
let client = null;
function getClient() {
    if (!client) {
        if (config_1.config.memory.tursoUrl && config_1.config.memory.tursoAuthToken) {
            client = (0, client_1.createClient)({
                url: config_1.config.memory.tursoUrl,
                authToken: config_1.config.memory.tursoAuthToken,
            });
            log.info('Connected to Turso database');
        }
        else {
            client = (0, client_1.createClient)({
                url: `file:${config_1.config.memory.dbPath}`,
            });
            log.info({ path: config_1.config.memory.dbPath }, 'Connected to local SQLite database');
        }
    }
    return client;
}
function closeDatabase() {
    if (client) {
        client.close();
        client = null;
    }
}
async function initializeDatabase() {
    const db = getClient();
    if (!config_1.config.memory.tursoUrl) {
        await db.execute('PRAGMA journal_mode = WAL');
        await db.execute('PRAGMA synchronous = NORMAL');
        await db.execute('PRAGMA cache_size = -32768');
        await db.execute('PRAGMA temp_store = MEMORY');
        await db.execute('PRAGMA mmap_size = 268435456');
        log.info('Database pragmas configured');
    }
    // Use executeMultiple for Turso (doesn't support multi-statement in single execute)
    const schema = `
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

    CREATE INDEX IF NOT EXISTS idx_conversations_timestamp
      ON conversations(timestamp DESC);

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

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      display_name TEXT,
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      message_count INTEGER DEFAULT 0,
      favorite_topics TEXT DEFAULT '[]',
      personality_notes TEXT DEFAULT '',
      relationship_level TEXT DEFAULT 'stranger',
      relationship_points INTEGER DEFAULT 0,
      relationship_max_points INTEGER DEFAULT 50,
      total_interactions INTEGER DEFAULT 0,
      last_interaction INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

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
  `;
    await db.executeMultiple(schema);
    log.info('Database tables initialized');
}
function getDatabase() {
    return getClient();
}
const isMainModule = process.argv[1] && process.argv[1].endsWith('init-db.ts') ||
    process.argv[1] && process.argv[1].endsWith('init-db.js');
if (isMainModule) {
    initializeDatabase()
        .then(() => {
        log.info('Database initialization complete');
        process.exit(0);
    })
        .catch((error) => {
        log.error({ error }, 'Database initialization failed');
        process.exit(1);
    });
}
//# sourceMappingURL=init-db.js.map
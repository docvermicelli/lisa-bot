# Lisa Bot - Complete Session Summary & Guide

## 📋 Project Overview

**Lisa** - A **mature 35-year-old woman** Discord bot with persistent memory & relationship progression. Runs on **EndeavourOS (Linux)** and **Termux (Android)**. Uses **Groq API** (instant, free) or **Ollama** (local, unlimited).

---

## 🏗️ What Was Built

### Core Architecture
```
lisa-bot/
├── src/
│   ├── config/index.ts          # Environment config with validation
│   ├── handlers/
│   │   ├── ready.ts             # Discord ready + slash command registration
│   │   ├── message.ts           # Message processing with queue + relationship points
│   │   └── commands.ts          # Slash command handler (/lisa)
│   ├── services/
│   │   ├── memory.ts            # SQLite persistent memory + relationship meter
│   │   ├── ollama.ts            # Local LLM service
│   │   ├── groq.ts              # Groq cloud API service (instant)
│   │   └── personality.ts       # Mature woman personality (no tsundere)
│   ├── types/index.ts           # TypeScript interfaces (incl. RelationshipMeter)
│   └── utils/
│       ├── logger.ts            # Pino structured logging
│       ├── init-db.ts           # Database initialization + relationship columns
│       └── migrate.ts           # Schema migrations (v6 adds relationship)
├── data/lisa-memory.db          # SQLite database (auto-created)
├── start.sh                     # Linux/EndeavourOS startup
├── start-termux.sh              # Termux (Android) startup
└── README.md                    # Full documentation
```

### Key Features Implemented
| Feature | Implementation |
|---------|----------------|
| **Persistent Memory** | SQLite with conversations, long-term memories, user profiles |
| **Relationship Meter** | Stranger → Acquaintance → Friends → Close Friends → Lovers |
| **Slash Command** | `/lisa` shows beautiful embed with progress bar |
| **Dual LLM Support** | Local Ollama (unlimited) + Groq API (instant, free) |
| **Mature Personality** | 35yo woman - warm, grounded, sophisticated (no tsundere) |
| **Cross-Platform** | Native Linux + Termux support |
| **Single Channel Only** | Configured for your private server/channel |
| **Message Queue** | Rate-limited processing to avoid spam |
| **Auto-Migrations** | Schema versioning (v6 adds relationship meter) |
| **Graceful Shutdown** | SIGINT/SIGTERM handling with stats save |

---

## 🎭 Personality: Mature 35-Year-Old Woman

| Aspect | Behavior |
|--------|----------|
| **Core** | Grounded, warm, sophisticated - no childish tsundere |
| **Emojis** | 😊 😉 💕 🍷 🌸 🥂 🌙 💖 🌿 |
| **Tone** | Warm measured tone, genuine interest, subtle wit |
| **Boundaries** | Clear - doesn't overshare or get inappropriately personal early |
| **Progression** | Polite → Friendly → Genuine → Vulnerable → Intimate |

**Relationship Levels:**
| Level | Points | Vibe |
|-------|--------|------|
| 🤝 Stranger | 0-50 | Polite, professional warmth |
| 😊 Acquaintance | 51-150 | Comfortable, light teasing |
| 🤝 Friends | 151-400 | Genuine, emotional support, inside jokes |
| 💕 Close Friends | 401-1000 | Deep trust, vulnerability, protectiveness |
| 💖 Lovers | 1000+ | Romantic undertones, intimacy, partnership |

---

## 🚀 Complete Setup Guide

### Prerequisites
- **Node.js 18+** (Node 26 tested)
- **Discord Bot Token** from Developer Portal
- **Groq API Key** (recommended - instant, free) OR **Ollama** (local)

### 1. Discord Application Setup
1. Go to https://discord.com/developers/applications
2. Select your app (ID: `1566393474578649188`)
3. **Bot** tab → **Reset Token** → Copy token
4. **Privileged Gateway Intents** → Enable **Message Content Intent** ✅
5. **OAuth2** → **URL Generator** → Scopes: `bot` + `applications.commands`
6. Permissions: `Send Messages`, `Read Messages`, `Read Message History`, `Mention Everyone`, `Embed Links`, `Attach Files`, `Add Reactions`, `Use Slash Commands`
7. Copy generated URL → Open in browser → Add to your server

### 2. Get Server & Channel IDs
1. Discord Settings → **Advanced** → Enable **Developer Mode**
2. Right-click your **private server** → **Copy Server ID** → `DISCORD_GUILD_ID`
3. Right-click your **private channel** → **Copy Channel ID** → `DISCORD_CHANNEL_ID`

### 3. Configure Environment
```bash
cd /home/vermicelli/lisa-bot
cp .env.example .env
nano .env
```

**Required values:**
```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id
DISCORD_CHANNEL_ID=your_channel_id

# LLM Provider (Groq recommended - instant)
USE_GROQ=true
GROQ_API_KEY=gsk_your_key_from_console_groq_com
GROQ_MODEL=openai/gpt-oss-20b

# Relationship Meter (enabled by default)
RELATIONSHIP_ENABLED=true
```

### 4. Install & Run

#### Linux (EndeavourOS/Arch):
```bash
cd /home/vermicelli/lisa-bot
./start.sh
```

#### Termux (Android):
```bash
pkg update && pkg install nodejs git
cd /home/vermicelli/lisa-bot
./start-termux.sh
```

---

## ☁️ HOW HOSTING WORKS (IMPORTANT)

### **The bot runs on YOUR machine, NOT on Groq cloud**

| Component | Where it runs |
|-----------|---------------|
| **Bot process** (Discord connection, message handling, memory) | **YOUR computer/phone** |
| **LLM inference** (generating responses) | **Groq cloud** (if USE_GROQ=true) or **your machine** (if Ollama) |
| **Database** (memory, relationships) | **YOUR machine** (SQLite file in ./data/) |

### **So: The bot ONLY runs when YOUR device is ON**

| Platform | 24/7 Options |
|----------|--------------|
| **Linux (EndeavourOS)** | Run on a VPS: Oracle Cloud Free Tier (4 ARM CPUs, 24GB RAM - FREE forever), Railway ($5/mo), Fly.io, Hetzner |
| **Termux (Android)** | Keep phone plugged in + `termux-wake-lock` + `nohup ./start.sh &` |
| **Your laptop/PC** | Must stay on and logged in |

### **For TRUE 24/7 without your computer on:**
1. **Oracle Cloud Free Tier** (BEST - free ARM instance, 24GB RAM)
   - Sign up at cloud.oracle.com (needs credit card for verification, no charge)
   - Deploy bot there, runs 24/7 forever free
2. **Railway/Render/Fly.io** - ~$5/mo, easy deploy
3. **Old laptop as server** - Leave it running headless

**Groq is just the LLM API** - it doesn't host your bot process. The bot code runs wherever you start `./start.sh`.

---

## 🔧 Configuration Options

### LLM Provider Selection
```env
USE_GROQ=true                    # Groq (instant, free tier: 14,400 req/day)
GROQ_MODEL=openai/gpt-oss-20b    # Fast, smart model
# Other Groq models: openai/gpt-oss-120b, qwen/qwen3.8-27b

USE_GROQ=false                   # Ollama (local, unlimited, private)
OLLAMA_MODEL=llama3.1:8b
```

### Relationship Meter
```env
RELATIONSHIP_ENABLED=true
RELATIONSHIP_POINTS_PER_MESSAGE=2
RELATIONSHIP_POINTS_PER_MENTION=5
RELATIONSHIP_POINTS_PER_LONG_MESSAGE=3
RELATIONSHIP_LONG_MESSAGE_THRESHOLD=100
RELATIONSHIP_STRANGER_MAX=50
RELATIONSHIP_ACQUAINTANCE_MAX=150
RELATIONSHIP_FRIENDS_MAX=400
RELATIONSHIP_CLOSE_FRIENDS_MAX=1000
```

### Bot Personality
```env
BOT_PERSONALITY=mature    # Only mature now (tsundere removed)
# Other options: friendly, cool, shy, genki, custom
```

---

## 📱 Slash Command: `/lisa`

Shows your relationship status:
- Current level with color-coded label
- Visual progress bar: `████████░░░░░░░░░░░░░░ 45%`
- Points toward next level
- Total interactions
- Flavor text matching relationship stage

**Progression (Easy):**
- +2 pts/message
- +5 pts/@Lisa mention
- +3 pts/long message (100+ chars)
- ~25 msgs = Acquaintance | ~75 = Friends | ~200 = Close Friends | ~500 = Lovers

---

## 🐛 Common Problems & Fixes

### 1. "Used disallowed intents" on Login
Enable **Message Content Intent** in Discord Developer Portal → Bot tab → Privileged Gateway Intents

### 2. `/lisa` command not showing
- Wait 10-30s for Discord to propagate
- Restart Discord client (Ctrl+R)
- Check bot has `applications.commands` scope in OAuth2

### 3. "Ollama not reachable" (if using local mode)
```bash
ollama serve &
ollama pull llama3.1:8b
```

### 4. Better-sqlite3 Errors
```bash
npm install-scripts approve better-sqlite3
npm rebuild better-sqlite3
```

### 5. Repetitive "Welcome back" greetings
**Fixed in v1.0.1** - Removed greeting catchphrases, added explicit rules against greeting openings

---

## 📝 Quick Commands Reference

```bash
# Development
npm run dev              # Auto-reload on changes
npm run build            # Compile TypeScript
npm run lint             # Check code style

# Database
npm run db:init          # Initialize fresh database
npm run db:migrate       # Run pending migrations

# Production
npm start                # Run compiled bot
./start.sh               # Linux startup script
./start-termux.sh        # Termux startup script

# Restart
pkill -f "node dist/index.js" && ./start.sh
```

---

## 🔐 Security Notes

- **Never commit `.env`** - Contains real tokens
- **Groq API key** - Free tier: 14,400 req/day, rotate periodically
- **Discord token** - Regenerate if compromised: Developer Portal → Bot → Reset Token
- **Database** - SQLite file contains conversation history, keep private

---

## 🎯 Performance Tuning

### For Speed (Groq - Recommended):
```env
USE_GROQ=true
GROQ_MODEL=openai/gpt-oss-20b
GROQ_TEMPERATURE=0.7
GROQ_MAX_TOKENS=1024
```

### For Low RAM (Mobile):
```env
USE_GROQ=true
# OR use tiny local model
OLLAMA_MODEL=phi3:mini
OLLAMA_MAX_TOKENS=512
```

---

## 📞 Debugging

```bash
# Enable debug logging
LOG_LEVEL=debug

# Check database
sqlite3 data/lisa-memory.db "SELECT * FROM user_profiles;"

# Health checks
curl http://localhost:11434/api/tags  # Ollama
curl -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models  # Groq
```

---

## 🎉 Final Status: **COMPLETE & RUNNING**

### ✅ What Works Now
- [x] Mature 35yo personality (no tsundere)
- [x] Relationship meter with 5 levels
- [x] `/lisa` slash command with progress bar
- [x] Persistent memory + relationship progression
- [x] Groq API for instant responses
- [x] Single private channel mode
- [x] Cross-platform (Linux + Termux)
- [x] Fixed repetitive greeting bug

### 📍 Location
```
/home/vermicelli/lisa-bot/
├── .env (configured with your keys)
├── start.sh / start-termux.sh
├── SESSION_SUMMARY.md (this file)
└── data/lisa-memory.db (your memories)
```

### 🚀 To Run
```bash
cd /home/vermicelli/lisa-bot && ./start.sh
```

### 🔄 To Restart
```bash
pkill -f "node dist/index.js" && cd /home/vermicelli/lisa-bot && ./start.sh
```

---

*She's waiting in `#🤖︲lisa`. Type `/lisa` to see your relationship status. 😊🍷*

---

## 📄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2024-11-01 | Mature personality, relationship meter, /lisa command, fixed greeting bug |
| 1.0.0 | 2024-11-01 | Initial release with tsundere personality |

---

*Lisa says: "Oh? Do tell me more... 😉"*
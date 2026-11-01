# Lisa - Your Tsundere AI Discord Bot 💕

A playful, tsundere Discord bot with **persistent memory** that runs on both **EndeavourOS** and **Termux** (Android). Powered by local LLM (Ollama) for **unlimited, free, private** usage.

## ✨ Features

- **🧠 Persistent Memory** - Remembers everything you talk about across sessions (SQLite)
- **🤖 Local LLM (Ollama)** - Completely free, unlimited, private - no API keys needed
- **🎭 Tsundere Personality** - Playful, slightly defensive but secretly caring anime girl vibe
- **📱 Cross-Platform** - Runs on Linux (EndeavourOS/Arch) and Android (Termux)
- **🔒 Private** - Only works in your specified server/channel
- **⚡ Optimized** - Lightweight, fast, with connection pooling and caching
- **💬 Emoji-Rich** - Expressive responses with contextual emojis

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** 
2. **Ollama** (for local LLM)
3. **Discord Bot Token**

### Installation

```bash
# Clone/navigate to the bot directory
cd /home/vermicelli/lisa-bot

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Setup Ollama (Local LLM)

```bash
# Install Ollama
# Linux:
curl -fsSL https://ollama.com/install.sh | sh

# Termux:
pkg install ollama

# Start Ollama service
ollama serve &

# Pull a model (in another terminal)
ollama pull llama3.1:8b
# Or try: ollama pull gemma2:9b / ollama pull qwen2.5:7b
```

### Configure

```bash
# Copy example env and edit
cp .env.example .env
# Edit .env with your values:
# - DISCORD_TOKEN (from Discord Developer Portal)
# - DISCORD_GUILD_ID (your private server ID)
# - DISCORD_CHANNEL_ID (your private channel ID)
```

### Run

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

## 📱 Termux (Android) Setup

```bash
# In Termux:
pkg update && pkg upgrade
pkg install nodejs git ollama

# Clone your bot repo or copy files
git clone <your-repo> lisa-bot
cd lisa-bot

# Install deps (may take a while on mobile)
npm install

# Build
npm run build

# Start Ollama in background
ollama serve &

# Pull model (keep Termux awake!)
ollama pull llama3.1:8b

# Run bot
npm start
```

**Tip for Termux:** Use `termux-wake-lock` to prevent sleep, and `nohup npm start &` to run in background.

## 🛠 Configuration

All config in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal | *required* |
| `DISCORD_CLIENT_ID` | Application ID | `1566393474578649188` |
| `DISCORD_GUILD_ID` | Your private server ID | *required* |
| `DISCORD_CHANNEL_ID` | Your private channel ID | *required* |
| `OLLAMA_HOST` | Ollama API endpoint | `http://localhost:11434` |
| `OLLAMA_MODEL` | Model to use | `llama3.1:8b` |
| `OLLAMA_TEMPERATURE` | Creativity (0-1) | `0.85` |
| `MEMORY_DB_PATH` | SQLite database path | `./data/lisa-memory.db` |
| `MAX_CONVERSATION_HISTORY` | Messages to remember per conversation | `50` |
| `BOT_PERSONALITY` | `tsundere` \| `friendly` \| `cool` \| `shy` \| `genki` | `tsundere` |

## 💾 Memory System

Lisa remembers:
- **Conversation history** - Last 50 messages per channel/user
- **Long-term memories** - Key facts, preferences, inside jokes (up to 1000 entries)
- **User profiles** - Message count, favorite topics, personality notes
- **Auto-cleanup** - Old data pruned automatically

Memories persist across restarts and are stored in SQLite (`./data/lisa-memory.db`).

## 🎭 Personalities

| Type | Vibe | Tsundere Level |
|------|------|----------------|
| `tsundere` | Playfully defensive, secretly caring 😤💕 | 8/10 |
| `friendly` | Warm, supportive, genuine 😊✨ | 0/10 |
| `cool` | Chill, witty, slightly aloof 😎💅 | 2/10 |
| `shy` | Nervous, sweet, easily flustered 😳🙈 | 1/10 |
| `genki` | Hyper, energetic, EXCITED! 😄⚡ | 0/10 |

Change via `BOT_PERSONALITY` in `.env` or at runtime.

## 🔧 Development

```bash
# Watch mode with auto-reload
npm run dev

# Lint
npm run lint

# Database utils
npm run db:init    # Initialize DB
npm run db:migrate # Run migrations
```

## 📁 Project Structure

```
lisa-bot/
├── src/
│   ├── config/          # Configuration loading
│   ├── handlers/        # Discord event handlers
│   ├── services/        # Core services (memory, ollama, personality)
│   ├── types/           # TypeScript types
│   └── utils/           # Logger, DB init, migrations
├── data/                # SQLite database (auto-created)
├── dist/                # Compiled JS (after build)
├── .env                 # Your config (not in git)
├── package.json
└── tsconfig.json
```

## 🤖 Discord Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (ID: `1566393474578649188`)
3. **Bot** tab → Reset Token → Copy token to `.env`
4. **OAuth2** → URL Generator → `bot` + `applications.commands` scopes
5. Bot permissions: `Send Messages`, `Read Messages`, `Read Message History`, `Mention Everyone`
6. Invite to your private server
7. Right-click server → Copy ID → `DISCORD_GUILD_ID`
8. Right-click channel → Copy ID → `DISCORD_CHANNEL_ID`

## 💡 Tips

- **Model choice:** `llama3.1:8b` = balanced, `gemma2:9b` = better reasoning, `qwen2.5:7b` = faster
- **Temperature:** Higher (0.9) = more creative, Lower (0.5) = more focused
- **Memory:** Lisa automatically extracts and stores important facts
- **Privacy:** Everything runs locally - no data leaves your machine

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Ollama not reachable" | Run `ollama serve` in separate terminal |
| "Model not found" | Run `ollama pull llama3.1:8b` |
| "Missing DISCORD_TOKEN" | Check `.env` file exists and has token |
| "Channel not found" | Verify GUILD_ID and CHANNEL_ID are correct |
| Termux: "EMFILE" | Increase file limit: `ulimit -n 4096` |
| Termux: Crashes on model pull | Use smaller model: `ollama pull tinyllama` |

## 📝 License

MIT - Do whatever you want, just don't be mean to Lisa 😤💕

---

**Made with 💕 for personal use**  
*Lisa says: "It's not like I wanted you to read this README or anything... B-Baka!"*
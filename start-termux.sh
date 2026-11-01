#!/data/data/com.termux/files/usr/bin/bash
# Lisa Bot Startup Script - Termux (Android)
# Usage: ./start-termux.sh [dev|prod]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MODE="${1:-prod}"

echo "🌸 Starting Lisa bot on Termux... (mode: $MODE)"

# Prevent sleep
termux-wake-lock

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found! Copy .env.example to .env and configure it."
    termux-wake-unlock
    exit 1
fi

# Increase file descriptor limit
ulimit -n 4096

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "⚠️  Ollama not detected, starting..."
    ollama serve > /dev/null 2>&1 &
    OLLAMA_PID=$!
    sleep 5
    echo "   Ollama started (PID: $OLLAMA_PID)"
fi

# Check if model exists
MODEL=$(grep OLLAMA_MODEL .env | cut -d'=' -f2 | tr -d ' ' || echo "llama3.1:8b")
if ! ollama list | grep -q "$MODEL"; then
    echo "📥 Model '$MODEL' not found, pulling (this may take a while)..."
    echo "   Keep Termux awake! Don't lock screen."
    ollama pull "$MODEL"
fi

# Install deps if node_modules missing
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies (may take a few minutes on mobile)..."
    npm install
fi

# Build if dist missing or dev mode
if [ ! -d dist ] || [ "$MODE" = "dev" ]; then
    echo "🔨 Building..."
    npm run build
fi

echo "✅ Starting Lisa..."
echo "   Press Ctrl+C to stop"
echo ""

# Trap cleanup
trap 'termux-wake-unlock; exit 0' INT TERM

if [ "$MODE" = "dev" ]; then
    npm run dev
else
    npm start
fi

termux-wake-unlock
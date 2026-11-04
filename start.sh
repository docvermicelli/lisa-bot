#!/bin/bash
# Lisa Bot Startup Script - Linux/EndeavourOS
# Usage: ./start.sh [dev|prod]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MODE="${1:-prod}"

echo "🌸 Starting Lisa bot... (mode: $MODE)"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found! Copy .env.example to .env and configure it."
    exit 1
fi

# Read USE_GROQ from .env
USE_GROQ=$(grep "^USE_GROQ=" .env | cut -d'=' -f2 | tr -d ' ' | tr '[:upper:]' '[:lower:]')
USE_GROQ=${USE_GROQ:-false}

# Only start Ollama if NOT using Groq
if [ "$USE_GROQ" != "true" ]; then
    echo "🔧 Using local Ollama (USE_GROQ=false)..."

    # Check if Ollama is running
    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "⚠️  Ollama not detected on localhost:11434"
        echo "   Starting Ollama in background..."
        ollama serve > /dev/null 2>&1 &
        OLLAMA_PID=$!
        sleep 3
        echo "   Ollama started (PID: $OLLAMA_PID)"
    fi

    # Check if model exists
    MODEL=$(grep OLLAMA_MODEL .env | cut -d'=' -f2 | tr -d ' ' || echo "llama3.1:8b")
    if ! ollama list | grep -q "$MODEL"; then
        echo "📥 Model '$MODEL' not found, pulling..."
        ollama pull "$MODEL"
    fi
else
    echo "⚡ Using Groq API (USE_GROQ=true) — skipping Ollama"
fi

# Install deps if node_modules missing
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
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

if [ "$MODE" = "dev" ]; then
    npm run dev
else
    npm start
fi
#!/usr/bin/env bash
set -e

echo "============================================"
echo "  HeroWeb - Starting server"
echo "============================================"
echo

if [ ! -d "venv" ]; then
    echo "[ERROR] Virtual environment not found."
    echo "Run ./install.sh first."
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "[ERROR] .env file not found."
    echo "Create a .env file with your API key:"
    echo "  OPENROUTER_API_KEY=your-key-here"
    echo "Get a key at https://openrouter.ai/"
    exit 1
fi

source venv/bin/activate

echo "Opening browser in 2 seconds..."
(sleep 2 && open http://localhost:5000 2>/dev/null || xdg-open http://localhost:5000 2>/dev/null) &

echo "Server running at http://localhost:5000"
echo "Press Ctrl+C to stop."
echo
cd googleengine
python server.py

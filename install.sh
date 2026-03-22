#!/usr/bin/env bash
set -e

echo "============================================"
echo "  HeroWeb - Installing dependencies"
echo "============================================"
echo

if ! command -v python3 &>/dev/null; then
    echo "[ERROR] Python 3 is not installed."
    echo "Install it from https://www.python.org/downloads/"
    exit 1
fi

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "Virtual environment created."
else
    echo "Virtual environment already exists."
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt

echo
echo "============================================"
echo "  Done! Run ./start.sh to launch the app."
echo "============================================"

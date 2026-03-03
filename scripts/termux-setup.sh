#!/bin/bash
# ── Termux Setup Script for Chaos Shelter ────────────────────────
# Run this on an Android device with Termux installed.
# This sets up Node.js and starts the game server.

set -e

echo ""
echo "======================================"
echo "  כאוס במקלט: משמר הבקרי"
echo "  Termux Setup"
echo "======================================"
echo ""

# Update package list
echo "[1/4] Updating packages..."
pkg update -y

# Install Node.js
echo "[2/4] Installing Node.js..."
pkg install -y nodejs

# Navigate to project directory (if script is in scripts/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Install npm dependencies
echo "[3/4] Installing dependencies..."
npm install

# Start the server
echo "[4/4] Starting the game server..."
echo ""
echo "======================================"
echo "  All players connect to the IP shown below"
echo "  Make sure all devices are on the same WiFi!"
echo "======================================"
echo ""

node server.js

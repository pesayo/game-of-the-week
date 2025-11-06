#!/bin/bash
# Quick start script for Madison Curling Club integration

set -e

echo "🥌 Madison Curling Club Integration - Quick Start"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "mcc_api.py" ]; then
    echo "Error: Please run this script from the mcc_integration directory"
    exit 1
fi

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not found"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "Please edit .env and add your Madison Curling Club credentials:"
    echo "  nano .env"
    echo ""
    echo "Then run this script again."
    exit 0
fi

# Check if credentials are set
if grep -q "your_username_here" .env; then
    echo "⚠️  Please update .env with your actual credentials"
    echo "  nano .env"
    exit 1
fi

echo "✓ Environment configured"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "✓ Virtual environment ready"
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo "✓ Dependencies installed"
echo ""

# Run the export script
echo "Fetching team data from Madison Curling Club..."
echo ""
python export_team_cards.py

echo ""
echo "=================================================="
echo "✓ Done!"
echo ""
echo "Next steps:"
echo "  1. View team_cards.json to see the generated data"
echo "  2. Open team_cards_example.html in your browser"
echo "  3. Check the cache/ directory for downloaded avatars"
echo ""
echo "To integrate with your app:"
echo "  - Copy team_cards.json to your app directory"
echo "  - Use the example HTML as a reference"
echo "  - See README.md for more integration options"
echo ""

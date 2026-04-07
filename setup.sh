#!/bin/bash
# Invoicely — one-time setup script
# Run this after cloning: ./setup.sh

set -e

echo ""
echo "  Setting up Invoicely..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  Node.js not found. Installing via Homebrew..."
    if ! command -v brew &> /dev/null; then
        echo "  Homebrew not found either. Install it first:"
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    brew install node
fi

echo "  Node.js $(node -v)"

# Create .env from template if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "  Created .env from template"
fi

# Install dependencies
echo "  Installing dependencies..."
npm install --silent

# Set up database
echo "  Setting up database..."
npx prisma db push --accept-data-loss 2>/dev/null
echo "  Database ready"

# Build for production
echo "  Building app..."
npm run build > /dev/null 2>&1
echo "  Build complete"

echo ""
echo "  Invoicely is ready!"
echo ""
echo "  Start the app:  npm start"
echo "  Then open:       http://localhost:3000"
echo ""
echo "  First thing to do: go to My Profile and fill in your details."
echo ""

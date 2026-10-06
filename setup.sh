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

# Create macOS app shortcut
APP_DIR="$(pwd)"
APP_PATH="/Applications/Invoicely.app"
PORT=3000

echo "  Creating app shortcut..."

mkdir -p "$APP_PATH/Contents/MacOS"
mkdir -p "$APP_PATH/Contents/Resources"

# Build the app icon from the favicon SVG (padded to the macOS icon grid)
ICON_TMP="$(mktemp -d)"
sed 's/width="32" height="32" viewBox="0 0 32 32"/width="1024" height="1024" viewBox="-3.88 -3.88 39.77 39.77"/' \
    src/app/icon.svg > "$ICON_TMP/icon.svg"
# Render with AppKit rather than qlmanage, which fills the transparent corners with white
cat > "$ICON_TMP/render.swift" << 'SWIFT'
import AppKit
let args = CommandLine.arguments
let img = NSImage(contentsOfFile: args[1])!
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 1024, pixelsHigh: 1024,
                           bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                           colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
img.draw(in: NSRect(x: 0, y: 0, width: 1024, height: 1024))
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[2]))
SWIFT
swift "$ICON_TMP/render.swift" "$ICON_TMP/icon.svg" "$ICON_TMP/icon.png"
mkdir -p "$ICON_TMP/icon.iconset"
for s in 16 32 128 256 512; do
    sips -z $s $s "$ICON_TMP/icon.png" --out "$ICON_TMP/icon.iconset/icon_${s}x${s}.png" > /dev/null
    sips -z $((s*2)) $((s*2)) "$ICON_TMP/icon.png" --out "$ICON_TMP/icon.iconset/icon_${s}x${s}@2x.png" > /dev/null
done
iconutil -c icns "$ICON_TMP/icon.iconset" -o "$APP_PATH/Contents/Resources/icon.icns"
rm -rf "$ICON_TMP"

cat > "$APP_PATH/Contents/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Invoicely</string>
    <key>CFBundleIdentifier</key>
    <string>com.invoicely.app</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleExecutable</key>
    <string>launch</string>
    <key>CFBundleIconFile</key>
    <string>icon</string>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
PLIST

cat > "$APP_PATH/Contents/MacOS/launch" << LAUNCHER
#!/bin/bash

# Support both Apple Silicon (/opt/homebrew) and Intel (/usr/local) Macs
export PATH="/opt/homebrew/bin:/usr/local/bin:\$PATH"

APP_DIR="$APP_DIR"
PORT=$PORT
URL="http://localhost:\$PORT"

# Check if already running
if lsof -ti:\$PORT > /dev/null 2>&1; then
    open "\$URL"
    exit 0
fi

cd "\$APP_DIR"

# Build if no production build exists, or if source is newer than build
if [ ! -d ".next" ] || [ "\$(find src prisma -newer .next/BUILD_ID -print -quit 2>/dev/null)" ]; then
    npm run build > /tmp/invoicely-build.log 2>&1
fi

# Start production server in background
PORT=\$PORT npm start > /tmp/invoicely-server.log 2>&1 &

# Wait for server to be ready (up to 20 seconds)
for i in \$(seq 1 40); do
    if curl -s -o /dev/null "\$URL" 2>/dev/null; then
        open "\$URL"
        exit 0
    fi
    sleep 0.5
done

open "\$URL"
LAUNCHER

chmod +x "$APP_PATH/Contents/MacOS/launch"

echo ""
echo "  Invoicely is ready!"
echo ""
echo "  Open it from Spotlight/Raycast by searching 'Invoicely'"
echo "  Or run: npm start  →  http://localhost:$PORT"
echo ""
echo "  First thing to do: go to My Profile and fill in your details."
echo ""

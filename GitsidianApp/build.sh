#!/bin/bash
set -e

echo "=== Building Gitsidian Desktop ==="

# Step 1: Build React web app for desktop
echo "Building web app..."
cd "$(dirname "$0")/.."
VITE_BASE_PATH=./ npm run build -- --outDir GitsidianApp/Resources/web

# Step 2: Build Swift app
echo "Building Swift app..."
cd GitsidianApp
swift build

# Step 3: Sync Gitsidian.app with latest debug build
# swift run은 URL scheme 핸들러로 등록되지 않음.
# Gitsidian.app을 최신 상태로 유지하여 open Gitsidian.app으로 실행.
if [ -d "Gitsidian.app" ]; then
  echo "Syncing Gitsidian.app..."
  cp .build/debug/GitsidianApp Gitsidian.app/Contents/MacOS/GitsidianApp
  rm -rf Gitsidian.app/Contents/Resources/web
  cp -R Resources/web Gitsidian.app/Contents/Resources/web
  codesign --force --sign - Gitsidian.app 2>/dev/null || true
fi

echo "=== Build Complete ==="
echo "Run: open GitsidianApp/Gitsidian.app"

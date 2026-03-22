#!/bin/bash
set -e

echo "=== Building Gitsidian Desktop ==="

# Step 1: Build React web app for desktop
echo "Building web app..."
cd "$(dirname "$0")/.."
VITE_BASE_PATH=/ npm run build -- --outDir GitsidianApp/Resources/web

# Step 2: Build Swift app
echo "Building Swift app..."
cd GitsidianApp
swift build

echo "=== Build Complete ==="

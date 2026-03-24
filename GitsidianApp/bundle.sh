#!/bin/bash
set -e

APP_NAME="Gitsidian"
BUNDLE_DIR="${APP_NAME}.app"
PROJECT_ROOT="$(dirname "$0")/.."

echo "=== Building Gitsidian.app ==="

echo "Building web app..."
cd "$PROJECT_ROOT"
VITE_BASE_PATH=./ npm run build -- --outDir GitsidianApp/Resources/web

echo "Building Swift app (release)..."
cd GitsidianApp
swift build -c release

echo "Locating Sparkle framework..."
SPARKLE_FW=$(find .build -name "Sparkle.framework" -path "*/macos*" 2>/dev/null | head -1)

echo "Creating app bundle..."
rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR/Contents/MacOS"
mkdir -p "$BUNDLE_DIR/Contents/Resources"

cp ".build/release/GitsidianApp" "$BUNDLE_DIR/Contents/MacOS/GitsidianApp"

cp -R "Resources/web" "$BUNDLE_DIR/Contents/Resources/web"

python3 -c "
import plistlib
with open('Info.plist', 'rb') as f:
    plist = plistlib.load(f)
plist['CFBundleExecutable'] = 'GitsidianApp'
plist['CFBundlePackageType'] = 'APPL'
plist['NSHighResolutionCapable'] = True
plist['NSMainNibFile'] = ''
with open('$BUNDLE_DIR/Contents/Info.plist', 'wb') as f:
    plistlib.dump(plist, f)
"

echo -n "APPL????" > "$BUNDLE_DIR/Contents/PkgInfo"

echo "Signing..."
codesign --force --sign - --options runtime "$BUNDLE_DIR"

if [ -n "$SPARKLE_FW" ]; then
    mkdir -p "$BUNDLE_DIR/Contents/Frameworks"
    cp -R "$SPARKLE_FW" "$BUNDLE_DIR/Contents/Frameworks/"
    install_name_tool -add_rpath "@executable_path/../Frameworks" "$BUNDLE_DIR/Contents/MacOS/GitsidianApp" 2>/dev/null || true
    codesign --force --sign - "$BUNDLE_DIR/Contents/Frameworks/Sparkle.framework" 2>/dev/null || true
fi

echo "=== ✅ Created $BUNDLE_DIR ==="
echo "Run with: open GitsidianApp/$BUNDLE_DIR"

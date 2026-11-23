#!/usr/bin/env bash
set -e

cmd="${1:-dev}"
target="$2"

case "$cmd" in
  dev)
    echo "Starting SlateDraft Studio in dev mode..."
    npm run tauri:dev
    ;;
  build)
    if [ -n "$target" ]; then
      echo "Building for target platform: $target..."
      npm run tauri -- build --target "$target"
    else
      echo "Building for host platform..."
      npm run tauri:build
    fi
    ;;
  bundle)
    if [ -n "$target" ]; then
      echo "Building bundle format: $target..."
      npm run tauri -- build --bundles "$target"
    else
      echo "Usage: ./run.sh bundle <format> (e.g. dmg, app, deb, appimage, nsis, msi)"
      exit 1
    fi
    ;;
  clean)
    echo "Cleaning Rust build cache..."
    npm run rust:clean
    ;;
  *)
    echo "Usage: ./run.sh [dev | build [target] | bundle [format] | clean]"
    echo ""
    echo "Examples:"
    echo "  ./run.sh dev                                # Run dev mode"
    echo "  ./run.sh clean                              # Purge corrupted Rust build cache"
    echo "  ./run.sh build                              # Build current host"
    echo "  ./run.sh build aarch64-apple-darwin         # Build macOS Apple Silicon"
    echo "  ./run.sh build x86_64-apple-darwin          # Build macOS Intel"
    echo "  ./run.sh build x86_64-pc-windows-msvc       # Build Windows x64"
    echo "  ./run.sh build x86_64-unknown-linux-gnu     # Build Linux x64"
    echo "  ./run.sh bundle dmg                         # Build DMG bundle"
    exit 1
    ;;
esac

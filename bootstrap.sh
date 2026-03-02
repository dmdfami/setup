#!/bin/bash
# dmdfami/setup bootstrap — for fresh Mac with nothing installed
# Usage: curl -fsSL https://setup.dmd-fami.com | bash
set -e

echo ""
echo "  dmdfami/setup — Bootstrap"
echo "  ========================="
echo ""

# 1. Xcode Command Line Tools
if ! xcode-select -p &>/dev/null; then
  echo "[1/3] Installing Xcode CLI tools..."
  xcode-select --install
  echo "      Waiting for Xcode CLI install to complete..."
  until xcode-select -p &>/dev/null; do sleep 5; done
else
  echo "[1/3] Xcode CLI tools OK"
fi

# 2. Homebrew + Node
if ! command -v brew &>/dev/null; then
  echo "[2/3] Installing Homebrew..."
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

if ! command -v node &>/dev/null; then
  echo "      Installing Node.js..."
  brew install node
else
  echo "[2/3] Homebrew + Node OK"
fi

# 3. Run setup
echo "[3/3] Running dmdfami/setup..."
npx -y dmdfami-setup

echo ""
echo "  Bootstrap complete!"
echo ""

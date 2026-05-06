#!/bin/bash

# ─────────────────────────────────────────────
#  Premiere AI Editor — Mac Setup Script
#  הרץ פעם אחת בלבד להתקנה
# ─────────────────────────────────────────────

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Premiere AI Editor — התקנה למק"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── בדיקת Node.js ──────────────────────────────
echo -e "${YELLOW}[1/4]${NC} בודק Node.js..."

if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js לא מותקן.${NC}"
  echo ""
  echo "  אפשרות א׳ — התקן דרך Homebrew:"
  echo "    /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
  echo "    brew install node"
  echo ""
  echo "  אפשרות ב׳ — הורד ישירות מ: https://nodejs.org (גרסה 20 LTS)"
  echo ""
  echo "  אחרי ההתקנה, הרץ שוב: bash setup.sh"
  exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//' | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}✗ Node.js גרסה $NODE_VERSION ישנה מדי. נדרשת גרסה 18+${NC}"
  echo "  הורד עדכון מ: https://nodejs.org"
  exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# ── הגדרת API Key ──────────────────────────────
echo ""
echo -e "${YELLOW}[2/4]${NC} הגדרת Anthropic API Key..."

ENV_FILE="$SCRIPT_DIR/server/.env"

if [ ! -f "$ENV_FILE" ]; then
  cp "$SCRIPT_DIR/server/.env.example" "$ENV_FILE"
fi

if grep -q "your_api_key_here" "$ENV_FILE"; then
  echo ""
  echo -e "${CYAN}  צריך להזין Anthropic API Key.${NC}"
  echo "  קבל מפתח חינמי ב: https://console.anthropic.com"
  echo ""
  read -p "  הכנס את ה-API Key שלך (sk-ant-...): " API_KEY

  if [ -z "$API_KEY" ]; then
    echo -e "${RED}✗ לא הוזן API Key. ניתן להוסיף אחר כך בקובץ server/.env${NC}"
  else
    # macOS sed דורש '' אחרי -i
    sed -i '' "s/your_api_key_here/$API_KEY/" "$ENV_FILE"
    echo -e "${GREEN}✓ API Key נשמר${NC}"
  fi
else
  echo -e "${GREEN}✓ API Key כבר מוגדר${NC}"
fi

# ── התקנת תלויות Server ────────────────────────
echo ""
echo -e "${YELLOW}[3/4]${NC} מתקין חבילות Server..."
cd "$SCRIPT_DIR/server"
npm install --silent
echo -e "${GREEN}✓ Server מוכן${NC}"

# ── התקנת ובניית Plugin ────────────────────────
echo ""
echo -e "${YELLOW}[4/4]${NC} מתקין ובונה Plugin..."
cd "$SCRIPT_DIR/plugin"
npm install --silent
npm run build 2>&1 | tail -5
echo -e "${GREEN}✓ Plugin נבנה ב: plugin/dist/${NC}"

# ── יצירת סקריפט הפעלה יומי ──────────────────
cd "$SCRIPT_DIR"
chmod +x start.sh
echo -e "${GREEN}✓ סקריפט הפעלה (start.sh) מוכן${NC}"

# ── סיכום ─────────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ✓ ההתקנה הושלמה!"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  שלב הבא — טעינה ב-Premiere Pro:"
echo ""
echo "  1. הורד Adobe UXP Developer Tool:"
echo "     https://developers.adobe.com/uxp/devtool/download/"
echo ""
echo "  2. הרץ: bash start.sh"
echo "     (מפעיל את השרת ומסביר איך לטעון)"
echo ""

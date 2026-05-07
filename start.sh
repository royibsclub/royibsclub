#!/bin/bash

# ─────────────────────────────────────────────
#  Premiere AI Editor — הפעלה יומית
#  הרץ כל פעם לפני שפותח Premiere Pro
# ─────────────────────────────────────────────

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/server/.env"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Premiere AI Editor — מפעיל..."
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── בדיקת API Key ─────────────────────────────
if grep -q "your_api_key_here" "$ENV_FILE" 2>/dev/null; then
  echo -e "${RED}✗ API Key לא מוגדר!${NC}"
  echo "  ערוך את הקובץ: server/.env"
  echo "  והחלף 'your_api_key_here' במפתח שלך מ: console.anthropic.com"
  exit 1
fi

# ── בדיקת symlink ─────────────────────────────
PLUGIN_LINK="$HOME/Library/Application Support/Adobe/CEP/extensions/PremierAI"
if [ ! -L "$PLUGIN_LINK" ]; then
  echo -e "${YELLOW}⚠ תוסף לא מחובר. מריץ setup...${NC}"
  bash "$SCRIPT_DIR/setup.sh"
fi

# ── הפעלת Plugin Watch (rebuild אוטומטי) ──────
echo -e "${GREEN}✓ מפעיל Plugin (rebuild אוטומטי בשמירה)...${NC}"
cd "$SCRIPT_DIR/plugin"
npm run dev > /tmp/premiere-ai-webpack.log 2>&1 &
WEBPACK_PID=$!

# ── הוראות ────────────────────────────────────
echo ""
echo -e "${CYAN}  ─────────────────────────────────────────────${NC}"
echo -e "  פתח Premiere Pro ←"
echo -e "  Window → Extensions → AI Editor"
echo -e "${CYAN}  ─────────────────────────────────────────────${NC}"
echo ""
echo -e "  אם התוסף לא מופיע: הפעל מחדש את Premiere"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  שרת פועל — אל תסגור חלון זה  (Ctrl+C לעצירה)"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── ניקוי בסיום ──────────────────────────────
trap "echo ''; echo 'עוצר...'; kill $WEBPACK_PID 2>/dev/null; exit 0" EXIT INT TERM

# ── הפעלת השרת (בחזית, עד Ctrl+C) ───────────
cd "$SCRIPT_DIR/server"
npm run dev

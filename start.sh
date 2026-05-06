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

# ── בדיקה אם השרת כבר פועל ────────────────────
if lsof -i :3333 &>/dev/null; then
  echo -e "${YELLOW}⚠ שרת כבר פועל על port 3333${NC}"
  echo ""
else
  echo -e "${GREEN}✓ מפעיל שרת על http://localhost:3333${NC}"
fi

# ── הוראות UXP ────────────────────────────────
echo ""
echo -e "${CYAN}  ─── איך לטעון ב-Premiere Pro ───────────────${NC}"
echo ""
echo "  1. פתח Adobe UXP Developer Tool"
echo "     (אם עוד לא הורדת: developers.adobe.com/uxp/devtool)"
echo ""
echo "  2. לחץ 'Add Plugin'"
echo "     בחר תיקייה: $(dirname "$SCRIPT_DIR")/plugin"
echo "     (שם נמצא manifest.json)"
echo ""
echo "  3. לחץ 'Load'"
echo ""
echo "  4. ב-Premiere Pro:"
echo "     Window → Extensions → AI Editor"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  שרת פועל — אל תסגור את החלון הזה"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── הפעלת השרת (בחזית, עד Ctrl+C) ───────────
cd "$SCRIPT_DIR/server"
npm run dev

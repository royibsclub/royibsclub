# Premiere AI Editor

Claude-powered Adobe Premiere Pro plugin — AI editing partner that analyzes video and executes direct timeline actions.

## Architecture

```
plugin/   ← UXP Panel (Adobe Premiere Pro 25.6+)
server/   ← Local Node.js proxy (port 3333)
shared/   ← TypeScript types
```

## Setup

### 1. Server

```bash
cd server
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
npm install
npm run dev
```

### 2. Plugin

```bash
cd plugin
npm install
npm run build
```

Load in Adobe UXP Developer Tool → Add Plugin → point to `plugin/` folder.

## Capabilities

- **Video Analysis** — hook strength, retention curve, pacing, virality score
- **AI Chat** — streaming conversation with timeline context
- **Direct Actions** — cuts, zooms, captions, color, audio via Claude tools
- **Style Profile** — learns and maintains creator's editing style
- **Research Mode** — trend analysis and platform-specific best practices

## Requirements

- Adobe Premiere Pro 25.6+
- Node.js 20+
- Anthropic API key
- FFmpeg (optional, for frame-based video analysis)

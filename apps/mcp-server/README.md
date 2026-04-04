# NodeLabz MCP Server

MCP (Model Context Protocol) server that lets Claude Code and other AI tools interact with the NodeLabz platform.

## Available Tools

| Tool | Description |
|------|-------------|
| `list_contacts` | List contacts with optional search/filter |
| `get_contact` | Get contact details by ID |
| `create_contact` | Create a new contact |
| `list_deals` | List deals with optional status filter |
| `create_deal` | Create a new deal |
| `close_deal` | Close a deal as won or lost |
| `generate_image` | Generate a marketing image via AI |
| `generate_copy` | Generate marketing copy via AI |
| `get_health_score` | Get marketing health score |
| `get_dashboard_summary` | Get dashboard metrics |

## Setup

### 1. Get your API key

Go to **Settings > API Keys** in the NodeLabz app and create a new key.

### 2. Configure Claude Code

Add to your `claude_desktop_config.json` or `.claude/settings.json`:

```json
{
  "mcpServers": {
    "nodelabz": {
      "command": "npx",
      "args": ["@nodelabz/mcp-server"],
      "env": {
        "NODELABZ_API_KEY": "nlab_sk_your_key_here",
        "NODELABZ_API_URL": "https://app.nodelabz.com"
      }
    }
  }
}
```

### 3. Or run locally during development

```bash
cd apps/mcp-server
npm install
NODELABZ_API_KEY=nlab_sk_... npm run dev
```

## Build

```bash
npm run build
```

This compiles TypeScript to `dist/` so it can be run with `node dist/index.js`.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODELABZ_API_KEY` | Yes | — | Your NodeLabz API key |
| `NODELABZ_API_URL` | No | `https://app.nodelabz.com` | API base URL |

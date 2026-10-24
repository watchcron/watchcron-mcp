# watchcron-mcp

[![npm version](https://img.shields.io/npm/v/watchcron-mcp.svg)](https://www.npmjs.com/package/watchcron-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Monitor your cron jobs and scheduled tasks from AI agents. MCP server for [WatchCron](https://watchcron.com).

## Features

- List all cron job monitors and their current status
- Create new monitors with simple interval or cron expression schedules
- Get the ping URL to add to your crontab or task scheduler
- View ping history and incident timeline
- Pause and resume monitors
- Update monitor settings (schedule, grace period, tags)
- Delete monitors you no longer need
- List notification channels (email, Slack, webhook)

## Quick Start

### 1. Get your API key

Sign up and generate an API key at [watchcron.com](https://watchcron.com).

### 2. Configure your AI client

#### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "watchcron": {
      "command": "npx",
      "args": ["-y", "watchcron-mcp"],
      "env": {
        "WATCHCRON_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### Claude Code

```bash
claude mcp add watchcron \
  npx -y watchcron-mcp \
  -e WATCHCRON_API_KEY=your_api_key_here
```

#### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "watchcron": {
      "command": "npx",
      "args": ["-y", "watchcron-mcp"],
      "env": {
        "WATCHCRON_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### Windsurf

Add to your Windsurf MCP configuration with the same `npx -y watchcron-mcp` command and set the `WATCHCRON_API_KEY` environment variable.

## Available Tools

### `list_monitors`

List all cron job monitors in your project. Optionally filter by tag.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tag` | string | Filter monitors by tag (optional) |

### `get_monitor`

Get detailed info about a specific monitor.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uuid` | string | Monitor UUID |

### `create_monitor`

Create a new cron job monitor. Returns the ping URL to add to your cron job.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | *required* | Monitor name (e.g. "Daily backup") |
| `description` | string | — | Optional description |
| `schedule_type` | `simple` \| `cron` | *required* | Fixed interval or cron expression |
| `period_seconds` | number | — | Interval in seconds (for simple schedule, min 60) |
| `cron_expression` | string | — | Cron expression (for cron schedule) |
| `timezone` | string | UTC | Timezone for schedule |
| `grace_seconds` | number | — | Grace period before alerting |
| `tags` | string[] | — | Tags for organizing |

### `update_monitor`

Update an existing monitor's settings.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uuid` | string | Monitor UUID |
| `name` | string | New name |
| `description` | string | New description |
| `schedule_type` | `simple` \| `cron` | New schedule type |
| `period_seconds` | number | New interval |
| `cron_expression` | string | New cron expression |
| `timezone` | string | New timezone |
| `grace_seconds` | number | New grace period |
| `tags` | string[] | New tags |

### `delete_monitor`

Permanently delete a monitor.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uuid` | string | Monitor UUID |

### `pause_monitor`

Pause or resume a monitor.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `uuid` | string | *required* | Monitor UUID |
| `paused` | boolean | true | true to pause, false to resume |

### `get_pings`

Get recent ping history for a monitor.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `uuid` | string | *required* | Monitor UUID |
| `limit` | number | 10 | Number of pings to return (1-100) |

### `get_incidents`

Get status change history (down/up transitions).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `uuid` | string | *required* | Monitor UUID |
| `limit` | number | 10 | Number of incidents to return (1-100) |

### `list_channels`

List notification channels (email, Slack, webhook, etc.).

No parameters required.

## Example Prompts

- "Show me all my cron monitors"
- "Create a monitor for my daily backup that runs every 24 hours"
- "Create a monitor for '*/5 * * * *' called 'Health check'"
- "What's the status of my database cleanup monitor?"
- "Show me the last 20 pings for monitor abc-123"
- "Pause the nightly report monitor"
- "Has my backup job had any incidents recently?"
- "List my notification channels"

## How It Works

1. Your AI agent receives a request about cron job monitoring
2. The agent calls WatchCron tools (list, create, check status, etc.)
3. The MCP server communicates with the WatchCron API
4. Results are returned to the AI agent in a readable format

### Typical workflow

```
You: "Set up monitoring for my backup script that runs at 2am daily"

Agent: Creates a monitor with cron expression "0 2 * * *"
       Returns the ping URL

You: Add to your crontab:
     0 2 * * * /path/to/backup.sh && curl -fsS https://watchcron.com/ping/xxx > /dev/null
```

## Requirements

- Node.js 18+
- A WatchCron API key ([sign up](https://watchcron.com))

## Other Projects by WatchCron

- [ScreenshotRun](https://screenshotrun.com) — Screenshot API for developers and AI agents
- [SnapshotArchive](https://snapshotarchive.com) — Automated website monitoring with visual diff detection

## License

MIT

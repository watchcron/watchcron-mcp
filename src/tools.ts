import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  listChecks,
  getCheck,
  createCheck,
  updateCheck,
  deleteCheck,
  pauseCheck,
  listPings,
  listFlips,
  listChannels,
} from "./api.js";

export function registerTools(server: McpServer): void {
  // --- list_monitors ---
  server.tool(
    "list_monitors",
    "List all cron job monitors in your WatchCron project. Shows name, status, schedule, last ping time, and ping URL for each monitor.",
    {
      tag: z
        .string()
        .optional()
        .describe("Filter monitors by tag"),
    },
    async (params) => {
      try {
        const checks = await listChecks(params.tag);

        if (checks.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No monitors found. Create one with the create_monitor tool.",
              },
            ],
          };
        }

        const lines = checks.map((c) => {
          const schedule =
            c.schedule_type === "cron"
              ? `cron: ${c.cron_expression}`
              : `every ${c.period_seconds}s`;
          const status = c.is_paused ? "paused" : c.status;
          const lastPing = c.last_ping_at
            ? c.last_ping_at.split("T")[0]
            : "never";
          return `[${status}] ${c.name} — ${schedule} — last ping: ${lastPing} — ${c.ping_url}`;
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `${checks.length} monitor(s):\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // --- get_monitor ---
  server.tool(
    "get_monitor",
    "Get detailed information about a specific cron job monitor, including its status, schedule, ping URL, last ping time, and next expected ping.",
    {
      uuid: z.string().describe("Monitor UUID"),
    },
    async (params) => {
      try {
        const c = await getCheck(params.uuid);

        const schedule =
          c.schedule_type === "cron"
            ? `Cron: ${c.cron_expression}`
            : `Every ${c.period_seconds} seconds`;

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Monitor: ${c.name}`,
                `━━━━━━━━━━━━━━━━━━━━━━`,
                `UUID: ${c.uuid}`,
                `Status: ${c.is_paused ? "paused" : c.status}`,
                `Schedule: ${schedule}`,
                `Timezone: ${c.timezone}`,
                `Grace period: ${c.grace_seconds}s`,
                c.description ? `Description: ${c.description}` : null,
                c.tags?.length ? `Tags: ${c.tags.join(", ")}` : null,
                `Ping URL: ${c.ping_url}`,
                `Last ping: ${c.last_ping_at ?? "never"}`,
                `Next expected: ${c.next_expected_at ?? "n/a"}`,
                `Created: ${c.created_at.split("T")[0]}`,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // --- create_monitor ---
  server.tool(
    "create_monitor",
    "Create a new cron job monitor. Returns the ping URL that your cron job should call. Supports simple interval (every N seconds) or cron expression schedules.",
    {
      name: z.string().describe("Monitor name (e.g. 'Daily backup', 'DB cleanup')"),
      description: z.string().optional().describe("Optional description"),
      schedule_type: z
        .enum(["simple", "cron"])
        .describe("Schedule type: 'simple' for fixed interval, 'cron' for cron expression"),
      period_seconds: z
        .number()
        .int()
        .min(60)
        .optional()
        .describe("Interval in seconds (required for simple schedule, min 60)"),
      cron_expression: z
        .string()
        .optional()
        .describe("Cron expression (required for cron schedule, e.g. '*/5 * * * *')"),
      timezone: z
        .string()
        .optional()
        .describe("Timezone (e.g. 'UTC', 'America/New_York')"),
      grace_seconds: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Grace period in seconds before alerting (default: server default)"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Tags for organizing monitors"),
    },
    async (params) => {
      try {
        const check = await createCheck(params);

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Monitor created successfully!`,
                ``,
                `Name: ${check.name}`,
                `UUID: ${check.uuid}`,
                `Ping URL: ${check.ping_url}`,
                ``,
                `Add this to your cron job:`,
                `  curl -fsS --retry 3 ${check.ping_url} > /dev/null`,
                ``,
                `Or with wget:`,
                `  wget ${check.ping_url} -O /dev/null 2>&1`,
              ].join("\n"),
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // --- update_monitor ---
  server.tool(
    "update_monitor",
    "Update an existing cron job monitor's settings (name, schedule, grace period, tags).",
    {
      uuid: z.string().describe("Monitor UUID"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      schedule_type: z.enum(["simple", "cron"]).optional().describe("New schedule type"),
      period_seconds: z.number().int().min(60).optional().describe("New interval in seconds"),
      cron_expression: z.string().optional().describe("New cron expression"),
      timezone: z.string().optional().describe("New timezone"),
      grace_seconds: z.number().int().min(0).optional().describe("New grace period"),
      tags: z.array(z.string()).optional().describe("New tags"),
    },
    async (params) => {
      try {
        const { uuid, ...updates } = params;
        const check = await updateCheck(uuid, updates);

        return {
          content: [
            {
              type: "text" as const,
              text: `Monitor "${check.name}" updated successfully.`,
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // --- delete_monitor ---
  server.tool(
    "delete_monitor",
    "Permanently delete a cron job monitor. This cannot be undone.",
    {
      uuid: z.string().describe("Monitor UUID to delete"),
    },
    async (params) => {
      try {
        await deleteCheck(params.uuid);
        return {
          content: [
            { type: "text" as const, text: "Monitor deleted successfully." },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // --- pause_monitor ---
  server.tool(
    "pause_monitor",
    "Pause or resume a cron job monitor. Paused monitors won't trigger alerts when pings are missed.",
    {
      uuid: z.string().describe("Monitor UUID"),
      paused: z
        .boolean()
        .default(true)
        .describe("true to pause, false to resume"),
    },
    async (params) => {
      try {
        const check = await pauseCheck(params.uuid, params.paused);
        const action = params.paused ? "paused" : "resumed";
        return {
          content: [
            {
              type: "text" as const,
              text: `Monitor "${check.name}" ${action}.`,
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // --- get_pings ---
  server.tool(
    "get_pings",
    "Get recent ping history for a monitor. Shows when pings were received, their type (success/start/fail), source IP, and duration.",
    {
      uuid: z.string().describe("Monitor UUID"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe("Number of pings to return (default 10)"),
    },
    async (params) => {
      try {
        const pings = await listPings(params.uuid, params.limit);

        if (pings.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No pings recorded yet." },
            ],
          };
        }

        const lines = pings.map((p) => {
          const duration = p.duration_ms ? ` (${p.duration_ms}ms)` : "";
          return `${p.created_at} — ${p.type}${duration}`;
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Last ${pings.length} ping(s):\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // --- get_incidents ---
  server.tool(
    "get_incidents",
    "Get status change history (incidents) for a monitor. Shows when the monitor went down, recovered, or changed status.",
    {
      uuid: z.string().describe("Monitor UUID"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe("Number of incidents to return (default 10)"),
    },
    async (params) => {
      try {
        const flips = await listFlips(params.uuid, params.limit);

        if (flips.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No status changes recorded." },
            ],
          };
        }

        const lines = flips.map(
          (f) => `${f.created_at} — ${f.old_status} → ${f.new_status}`
        );

        return {
          content: [
            {
              type: "text" as const,
              text: `Last ${flips.length} status change(s):\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // --- list_channels ---
  server.tool(
    "list_channels",
    "List notification channels configured in your WatchCron project (email, Slack, webhook, etc.).",
    {},
    async () => {
      try {
        const channels = await listChannels();

        if (channels.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No notification channels configured.",
              },
            ],
          };
        }

        const lines = channels.map(
          (ch) =>
            `${ch.name} (${ch.type}) — ${ch.is_active ? "active" : "inactive"} — ${ch.checks_count} monitor(s)`
        );

        return {
          content: [
            {
              type: "text" as const,
              text: `${channels.length} channel(s):\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}

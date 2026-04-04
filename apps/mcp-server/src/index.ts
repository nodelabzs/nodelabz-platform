#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_KEY = process.env.NODELABZ_API_KEY ?? "";
const API_URL = (process.env.NODELABZ_API_URL ?? "https://app.nodelabz.com").replace(/\/$/, "");

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function api<T = unknown>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  if (!API_KEY) {
    throw new Error("NODELABZ_API_KEY environment variable is not set.");
  }

  const url = `${API_URL}/api/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`NodeLabz API ${method} ${path} returned ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "nodelabz",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

server.registerTool("list_contacts", {
  description:
    "List contacts from the NodeLabz CRM. Supports optional search query and pagination.",
  inputSchema: {
    search: z.string().optional().describe("Search term to filter contacts by name or email"),
    page: z.number().optional().describe("Page number (default 1)"),
    limit: z.number().optional().describe("Items per page (default 25)"),
  },
}, async ({ search, page, limit }) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  const data = await api("GET", `/contacts${qs ? `?${qs}` : ""}`);
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
});

server.registerTool("get_contact", {
  description: "Get detailed information about a specific contact by ID.",
  inputSchema: {
    id: z.string().describe("The contact ID"),
  },
}, async ({ id }) => {
  const data = await api("GET", `/contacts/${id}`);
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
});

server.registerTool("create_contact", {
  description:
    "Create a new contact in the NodeLabz CRM. Provide at least a name or email.",
  inputSchema: {
    name: z.string().optional().describe("Full name"),
    email: z.string().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number"),
    company: z.string().optional().describe("Company name"),
    notes: z.string().optional().describe("Additional notes"),
  },
}, async (params) => {
  const data = await api("POST", "/contacts", params as Record<string, unknown>);
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
});

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

server.registerTool("list_deals", {
  description: "List deals from the NodeLabz CRM with optional filters.",
  inputSchema: {
    status: z
      .enum(["open", "won", "lost"])
      .optional()
      .describe("Filter by deal status"),
    page: z.number().optional().describe("Page number (default 1)"),
    limit: z.number().optional().describe("Items per page (default 25)"),
  },
}, async ({ status, page, limit }) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  const data = await api("GET", `/deals${qs ? `?${qs}` : ""}`);
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
});

server.registerTool("create_deal", {
  description: "Create a new deal in the NodeLabz CRM.",
  inputSchema: {
    title: z.string().describe("Deal title"),
    value: z.number().optional().describe("Deal value in dollars"),
    contact_id: z.string().optional().describe("Associated contact ID"),
    stage: z.string().optional().describe("Pipeline stage name"),
    notes: z.string().optional().describe("Additional notes"),
  },
}, async (params) => {
  const data = await api("POST", "/deals", params as Record<string, unknown>);
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
});

server.registerTool("close_deal", {
  description:
    "Close a deal as won or lost. Provide the deal ID and the outcome.",
  inputSchema: {
    id: z.string().describe("The deal ID"),
    outcome: z.enum(["won", "lost"]).describe("Whether the deal was won or lost"),
    notes: z.string().optional().describe("Closing notes"),
  },
}, async ({ id, outcome, notes }) => {
  const data = await api("PATCH", `/deals/${id}/close`, { outcome, notes });
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
});

// ---------------------------------------------------------------------------
// AI Generation
// ---------------------------------------------------------------------------

server.registerTool("generate_image", {
  description:
    "Generate a marketing image using NodeLabz AI. Returns the image URL.",
  inputSchema: {
    prompt: z.string().describe("Description of the image to generate"),
    style: z
      .enum(["photorealistic", "illustration", "minimalist", "abstract"])
      .optional()
      .describe("Visual style (default: photorealistic)"),
    aspect_ratio: z
      .enum(["1:1", "16:9", "9:16", "4:3"])
      .optional()
      .describe("Aspect ratio (default: 1:1)"),
  },
}, async (params) => {
  const data = await api<{ url?: string }>("POST", "/ai/generate-image", params as Record<string, unknown>);
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(data, null, 2) },
    ],
  };
});

server.registerTool("generate_copy", {
  description:
    "Generate marketing copy using NodeLabz AI. Returns generated text for emails, ads, social posts, etc.",
  inputSchema: {
    prompt: z.string().describe("What kind of copy to generate and any context"),
    type: z
      .enum(["email", "ad", "social_post", "landing_page", "blog"])
      .optional()
      .describe("Type of copy to generate"),
    tone: z
      .enum(["professional", "casual", "friendly", "urgent", "bold"])
      .optional()
      .describe("Tone of voice"),
    max_length: z.number().optional().describe("Approximate max word count"),
  },
}, async (params) => {
  const data = await api("POST", "/ai/generate-copy", params as Record<string, unknown>);
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
});

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

server.registerTool("get_health_score", {
  description:
    "Get the marketing health score from NodeLabz. Returns an overall score and breakdown by category.",
  inputSchema: {},
}, async () => {
  const data = await api("GET", "/analytics/health-score");
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
});

server.registerTool("get_dashboard_summary", {
  description:
    "Get a summary of dashboard metrics from NodeLabz including contacts, deals, revenue, and activity.",
  inputSchema: {
    period: z
      .enum(["day", "week", "month", "quarter", "year"])
      .optional()
      .describe("Time period for metrics (default: month)"),
  },
}, async ({ period }) => {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  const qs = params.toString();
  const data = await api("GET", `/analytics/dashboard${qs ? `?${qs}` : ""}`);
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NodeLabz MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

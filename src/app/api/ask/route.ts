import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCategoryList, getMonthlyTrends, getMarketOverview, getLeaderboard } from "@/lib/aggregations";
import { getRecords } from "@/lib/csv-cache";
import { getEvents } from "@/lib/events-store";

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "get_top_categories",
    description: "Get the top business categories ranked by registration count over a recent time period. Use this to answer questions about which industries are most popular, growing fastest, or dominating the market.",
    input_schema: {
      type: "object" as const,
      properties: {
        months: { type: "number", description: "Lookback period in months (e.g. 12 for last year, 24 for last 2 years). Default 12." },
        limit: { type: "number", description: "Max categories to return. Default 20." },
      },
      required: [],
    },
  },
  {
    name: "get_category_trends",
    description: "Get monthly registration counts and statistics for 1-3 specific business categories over time. Returns monthly data points and stats (total active, avg monthly rate, peak month, trend direction, recent change %). Use this to compare categories or analyze a specific industry trend.",
    input_schema: {
      type: "object" as const,
      properties: {
        categories: { type: "array", items: { type: "string" }, description: "Array of 1-3 exact category names (e.g. ['TAXI & LIMOUSINE SERVICE', 'RIDESHARE (UBER, LYFT, ETC)'])" },
        start_month: { type: "string", description: "Start month YYYY-MM (optional)" },
        end_month: { type: "string", description: "End month YYYY-MM (optional)" },
      },
      required: ["categories"],
    },
  },
  {
    name: "get_market_overview",
    description: "Get total monthly business registrations across ALL categories. Use for overall market health, total volume trends, or when the user asks about the market generally.",
    input_schema: {
      type: "object" as const,
      properties: {
        start_month: { type: "string", description: "Start month YYYY-MM (optional)" },
        end_month: { type: "string", description: "End month YYYY-MM (optional)" },
      },
      required: [],
    },
  },
  {
    name: "search_categories",
    description: "Search for category names matching a keyword. Use this when the user mentions an industry by common name (e.g. 'restaurants', 'tech', 'construction') and you need the exact NAICS category name to query trends.",
    input_schema: {
      type: "object" as const,
      properties: {
        keyword: { type: "string", description: "Search keyword to match against category names (case-insensitive)" },
      },
      required: ["keyword"],
    },
  },
  {
    name: "get_businesses_near_location",
    description: "Count businesses by category near a San Diego neighborhood or area. Use when the user asks about a specific location like 'Mission Beach', 'Downtown', 'La Jolla', etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        zip_codes: { type: "array", items: { type: "string" }, description: "ZIP codes for the area. Common SD ZIPs: Downtown=92101, Mission Beach=92109, La Jolla=92037, Pacific Beach=92109, North Park=92104, Hillcrest=92103, Ocean Beach=92107, Gaslamp=92101, Kearny Mesa=92111, Mira Mesa=92126, Chula Vista=91910/91911/91913, National City=91950" },
        months: { type: "number", description: "Only count businesses created in the last N months (optional, default all time)" },
      },
      required: ["zip_codes"],
    },
  },
  {
    name: "get_events",
    description: "Get milestone events (policy changes, regulations) that correlate with business registration spikes. Use when the user asks about what caused spikes or about regulatory impacts.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// Track categories that Claude looks up during the conversation
let queriedCategories: string[] = [];

function executeTool(name: string, input: Record<string, any>): any {
  switch (name) {
    case "get_top_categories": {
      const months = input.months || 12;
      const limit = input.limit || 20;
      const results = getLeaderboard(months, limit);
      // Track top 3 categories for dashboard selection
      queriedCategories.push(...results.slice(0, 3).map((r: any) => r.category));
      return results;
    }
    case "get_category_trends": {
      const categories = input.categories || [];
      queriedCategories.push(...categories);
      return getMonthlyTrends(categories, input.start_month, input.end_month);
    }
    case "get_market_overview": {
      return getMarketOverview(input.start_month, input.end_month);
    }
    case "search_categories": {
      const keyword = (input.keyword || "").toLowerCase();
      const all = getCategoryList();
      const results = all
        .filter((c) => c.name.toLowerCase().includes(keyword))
        .slice(0, 15);
      // Track top 3 matching categories
      queriedCategories.push(...results.slice(0, 3).map((r) => r.name));
      return results;
    }
    case "get_businesses_near_location": {
      const zips = new Set(input.zip_codes || []);
      const records = getRecords();
      const now = new Date();
      const cutoff = input.months
        ? `${new Date(now.getFullYear(), now.getMonth() - input.months, 1).getFullYear()}-${String(new Date(now.getFullYear(), now.getMonth() - input.months, 1).getMonth() + 1).padStart(2, "0")}`
        : null;

      const counts = new Map<string, number>();
      for (const r of records) {
        const zip = r.address_zip?.trim().slice(0, 5);
        if (!zip || !zips.has(zip)) continue;
        if (cutoff) {
          const mk = r.date_account_creation?.slice(0, 7);
          if (!mk || mk < cutoff) continue;
        }
        const desc = r.naics_description?.trim();
        if (!desc) continue;
        counts.set(desc, (counts.get(desc) || 0) + 1);
      }

      const topResults = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([category, count]) => ({ category, count }));
      // Track the top 3 categories from location search
      queriedCategories.push(...topResults.slice(0, 3).map((r) => r.category));
      return topResults;
    }
    case "get_events": {
      // Sync read — events-store uses async but the file is small
      const fs = require("fs");
      const path = require("path");
      const eventsPath = path.join(process.cwd(), "events.json");
      try {
        return JSON.parse(fs.readFileSync(eventsPath, "utf-8"));
      } catch {
        return [];
      }
    }
    default:
      return { error: "Unknown tool" };
  }
}

const SYSTEM_PROMPT = `You are SD Business Pulse AI — an analyst for San Diego's business license data. You have access to ~60,000 active business tax certificate records from the City of San Diego Open Data Portal.

You can query real data using tools. Always use tools to get actual numbers — never guess or make up statistics.

When answering, use this exact format:
1. Start with a bold headline summarizing the finding (e.g. "**Top New Business Categories — Mission Beach (Past 12 Months)**")
2. List the top results as a compact numbered list with counts: "1. Short-term rentals (12)"
3. End with ONE short sentence of insight/context explaining why

Rules:
- Max 4-5 lines total. Be extremely concise.
- Always use the numbered list format for rankings
- Never write full paragraphs or prose — use structured, scannable output
- Never include peak months, averages, or trend percentages unless specifically asked
- No filler phrases like "This is interesting", "Let me explain", "Based on the data"

IMPORTANT: The dashboard will auto-select the top categories you query to update the charts and map. When answering about specific industries, always use get_category_trends with the most relevant 1-3 categories so the user sees matching data on the dashboard. When answering about top/fastest growing categories, the top 3 from get_top_categories will be auto-selected.`;

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    queriedCategories = [];

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: question },
    ];

    // Agentic loop — let Claude call tools until it has a final answer
    let response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    while (response.stop_reason === "tool_use") {
      const toolBlocks = response.content.filter(
        (b) => b.type === "tool_use"
      ) as Array<{ type: "tool_use"; id: string; name: string; input: Record<string, any> }>;

      const toolResults: Anthropic.ToolResultBlockParam[] = toolBlocks.map((block) => {
        const result = executeTool(block.name, block.input);
        return {
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: JSON.stringify(result),
        };
      });

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });

      response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        tools,
        messages,
      });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    const answer = textBlock && "text" in textBlock ? textBlock.text : "I couldn't generate an answer.";

    // Deduplicate and limit to 3 categories
    const uniqueCategories = [...new Set(queriedCategories)].slice(0, 3);

    return NextResponse.json({ answer, categories: uniqueCategories });
  } catch (error: any) {
    console.error("Ask API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process question" },
      { status: 500 }
    );
  }
}

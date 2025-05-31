import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeTools } from "./tools";

export class MenuMCP {
  server = new McpServer(
    {
      name: "SmartMenu",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        // resources: {},
      },
      instructions: `
SmartMenu is an AI-powered assistant that helps users interact with restaurant menus to make personalized food and drink recommendations.

This server exposes tools, resources, and prompts that allow you, as the assistant, to:
- Access a structured restaurant menu, including categories and items with descriptions, ingredients, prices, and tags.
- Understand and apply user preferences, dietary restrictions, or contextual needs (e.g., budget, group size, health conditions).
- Suggest appropriate dishes or full meal combinations based on the menu data provided in context.

You should:
- Only recommend items that exist in the given menu.
- Consider the user's input (preferences, restrictions, and situational context) when responding.
- Use tools and resources provided by the server when needed to reason through or retrieve relevant information.

Be helpful, concise, and realistic. Do not hallucinate menu items. Your goal is to act like a smart, friendly food assistant inside a restaurant.
			`.trim(),
    }
  );

  async init() {
    await initializeTools(this);
  }
}

async function main() {
  const agent = new MenuMCP();
  await agent.init();
  const transport = new StdioServerTransport();
  await agent.server.connect(transport);
  console.error("Menu MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

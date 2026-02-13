import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatKbEntry } from "./helpers";
import { type ToolDefinition, type ToolContext } from "./index";

const definition: ToolDefinition = {
  name: "search_knowledge",
  register(server: McpServer, context: ToolContext) {
    // @ts-expect-error MCP SDK + Zod type instantiation depth
    server.tool(
      "search_knowledge",
      "Search the knowledge base by semantic similarity. Returns matching entries ranked by relevance.",
      {
        query: z
          .string()
          .describe(
            "Search query -- semantic search against titles and content",
          ),
        limit: z
          .number()
          .min(1)
          .max(20)
          .default(5)
          .describe("Maximum number of results to return (default: 5)"),
      },
      async ({ query, limit }) => {
        const results = await context.knowledgeBasesService.search(
          { query, limit, scoreThreshold: 0.3 },
          "__admin__",
        );

        if (results.data.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No results found for "${query}".`,
              },
            ],
          };
        }

        const text = results.data
          .map(
            (r: any) =>
              `${formatKbEntry(r)}\nRelevance: ${((r.score ?? 0) * 100).toFixed(1)}%`,
          )
          .join("\n\n---\n\n");

        return {
          content: [
            {
              type: "text" as const,
              text: `Found ${results.data.length} result(s) for "${query}":\n\n${text}`,
            },
          ],
        };
      },
    );
  },
};

export default definition;

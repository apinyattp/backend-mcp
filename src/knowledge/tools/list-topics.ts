import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ToolDefinition, type ToolContext } from "./index";

const definition: ToolDefinition = {
  name: "list_topics",
  register(server: McpServer, context: ToolContext) {
    server.tool(
      "list_topics",
      "List all available knowledge base entries.",
      {
        groupId: z
          .string()
          .uuid()
          .optional()
          .describe("Optional group ID filter"),
      },
      async ({ groupId }) => {
        const results = await context.knowledgeBasesService.findAll(
          {
            page: 1,
            limit: 50,
            sortBy: "updatedAt",
            sortOrder: "DESC",
            groupId,
          },
          "__admin__",
        );

        const lines = results.data.map(
          (e: any) =>
            `- **${e.title}** (id: \`${e.id}\`, group: ${e.group?.emoji ? e.group.emoji + " " : ""}${e.group?.name ?? "N/A"})`,
        );

        const text = `Knowledge bases (${lines.length}):\n\n${lines.join("\n")}`;

        return {
          content: [{ type: "text" as const, text }],
        };
      },
    );
  },
};

export default definition;

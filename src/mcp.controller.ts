import { Controller, Post, Get, Delete, Inject, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerTools, type ToolContext } from "./knowledge/tools/index";
import { KnowledgeBasesService } from "./knowledge-bases/knowledge-bases.service";

async function createServer(
  allowedTools: string[],
  context: ToolContext,
): Promise<McpServer> {
  const server = new McpServer(
    { name: "knowledge-base-server", version: "1.0.0" },
    { capabilities: { logging: {} } },
  );

  await registerTools(server, allowedTools, context);

  return server;
}

@Controller("mcp")
export class McpController {
  constructor(
    @Inject(KnowledgeBasesService)
    private knowledgeBasesService: KnowledgeBasesService,
  ) {}

  @Post()
  async handleMcpRequest(@Req() req: Request, @Res() res: Response) {
    try {
      const apiKey = (req as any).apiKey;
      const tools: string[] = apiKey?.tools || [
        "search_knowledge",
        "get_topic",
        "list_topics",
      ];
      const context: ToolContext = {
        knowledgeBasesService: this.knowledgeBasesService,
      };
      const server = await createServer(tools, context);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on("close", () => {
        transport.close();
        server.close();
      });
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  }

  @Get()
  methodNotAllowedGet(@Res() res: Response) {
    res.status(405).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed in stateless mode.",
      },
      id: null,
    });
  }

  @Delete()
  methodNotAllowedDelete(@Res() res: Response) {
    res.status(405).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed in stateless mode.",
      },
      id: null,
    });
  }
}

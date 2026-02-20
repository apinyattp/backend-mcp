import * as path from "path";
import { type KnowledgeBasesService } from "../../knowledge-bases/knowledge-bases.service";
import {
  registerTools as baseRegisterTools,
  type ToolContext as BaseToolContext,
  type ToolDefinition,
} from "../mcp-tools/index";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Extend the base ToolContext with project-specific services
export interface ToolContext extends BaseToolContext {
  knowledgeBasesService: KnowledgeBasesService;
}

export type { ToolDefinition };

/**
 * Register tools from both:
 * 1. mcp-tools submodule (shared/reusable tools)
 * 2. This directory (custom project-specific tools)
 *
 * Custom tools with the same name override submodule tools.
 */
export async function registerTools(
  server: McpServer,
  allowedTools: string[],
  context: ToolContext,
): Promise<void> {
  const customToolsDir = path.dirname(__filename);
  await baseRegisterTools(server, allowedTools, context, customToolsDir);
}

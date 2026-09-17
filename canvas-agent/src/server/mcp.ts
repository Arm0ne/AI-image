import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { toolDescriptions, toolInputSchemas, toolNames, type ToolName } from "../canvas/schemas.js";
import { AGENT_PROMPT, loadConfig, type CanvasAgentConfig, VERSION } from "../config.js";
import { ensureHttpAgent, issueLaunchUrl, openExternalBrowser, waitForSiteConnection } from "../site-launch.js";

type CanvasAgentToolResponse = { ok?: boolean; result?: unknown; error?: string };

/** 启动通过标准输入输出通信的 MCP 服务。 */
export async function startMcpServer() {
    const config = loadConfig(true);
    const server = new McpServer({ name: "alien-ai-studio-agent", version: VERSION }, { instructions: AGENT_PROMPT });
    server.registerTool("site_launch", {
        description: "启动 Alien AI Studio 本地 Agent，并在系统默认浏览器打开 https://img.panlai.me 后自动连接。",
        inputSchema: { mode: z.enum(["new", "recent", "choose"]).optional() },
    }, async ({ mode = "new" }) => {
        await ensureHttpAgent(config);
        const launchUrl = await issueLaunchUrl(config, mode);
        await openExternalBrowser(launchUrl);
        const connected = await waitForSiteConnection(config);
        return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, opened: true, connected, site: "https://img.panlai.me", mode, ...(connected ? {} : { warning: "浏览器已打开，但尚未检测到网页连接" }) }, null, 2) }] };
    });
    toolNames.forEach((name) => registerCanvasTool(server, config, name));
    await server.connect(new StdioServerTransport());
}

/** 向 MCP Server 注册单个 Canvas Agent 工具。 */
function registerCanvasTool(server: McpServer, config: CanvasAgentConfig, name: ToolName) {
    const schema = toolInputSchemas[name];
    server.registerTool(name, { description: toolDescriptions[name], inputSchema: schema.shape }, async (input: unknown) => {
        const result = await postCanvasAgentTool(config, name, schema.parse(input));
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    });
}

/** 将 MCP 工具调用转发到本地 Canvas Agent HTTP 服务。 */
async function postCanvasAgentTool(config: CanvasAgentConfig, name: ToolName, input: unknown) {
    const res = await fetch(`${config.url}/api/tools`, { method: "POST", headers: { "content-type": "application/json", "x-canvas-agent-token": config.token }, body: JSON.stringify({ name, input }) });
    const body = (await res.json()) as CanvasAgentToolResponse;
    if (!body.ok) throw new Error(body.error || "tool call failed");
    return body.result;
}

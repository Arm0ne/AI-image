import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { SITE_URL, type CanvasAgentConfig } from "./config.js";

export type LaunchMode = "new" | "recent" | "choose";
type LaunchTicket = { mode: LaunchMode; expiresAt: number };

export const LAUNCH_TICKET_TTL_MS = 60_000;
const AGENT_START_TIMEOUT_MS = 10_000;
const SITE_CONNECT_TIMEOUT_MS = 20_000;

/** 保存只可消费一次、短期有效的站点启动票据。 */
export class LaunchTicketStore {
    private readonly tickets = new Map<string, LaunchTicket>();

    constructor(private readonly now = () => Date.now()) {}

    issue(mode: LaunchMode = "new") {
        this.prune();
        const ticket = crypto.randomBytes(24).toString("base64url");
        this.tickets.set(ticket, { mode, expiresAt: this.now() + LAUNCH_TICKET_TTL_MS });
        return ticket;
    }

    consume(ticket: string) {
        const launch = this.tickets.get(ticket);
        this.tickets.delete(ticket);
        if (!launch || launch.expiresAt <= this.now()) return null;
        return launch;
    }

    private prune() {
        const now = this.now();
        this.tickets.forEach((value, key) => {
            if (value.expiresAt <= now) this.tickets.delete(key);
        });
    }
}

/** 生成浏览器最终访问地址；token 只放在 fragment，不会发送给生产站点服务器。 */
export function buildSiteLaunchUrl(config: CanvasAgentConfig, mode: LaunchMode = "new") {
    const url = new URL("/canvas", SITE_URL);
    url.searchParams.set("mode", mode);
    url.hash = new URLSearchParams({ agentUrl: config.url, agentToken: config.token }).toString();
    return url.toString();
}

/** 确保独立 HTTP Agent 已启动，供网站和 MCP 进程共享。 */
export async function ensureHttpAgent(config: CanvasAgentConfig) {
    if (await readHealth(config.url)) return;
    const entry = agentEntry();
    const child = spawn(process.execPath, [entry], { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
    const deadline = Date.now() + AGENT_START_TIMEOUT_MS;
    while (Date.now() < deadline) {
        await delay(150);
        if (await readHealth(config.url)) return;
    }
    throw new Error(`Alien AI Studio Agent 启动超时，请确认 ${config.url} 端口未被占用`);
}

/** 请求 HTTP Agent 签发启动票据，避免把连接 token 放进系统命令行。 */
export async function issueLaunchUrl(config: CanvasAgentConfig, mode: LaunchMode) {
    const response = await fetch(`${config.url}/launch-tickets`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-canvas-agent-token": config.token },
        body: JSON.stringify({ mode }),
    });
    const body = await response.json() as { ok?: boolean; launchUrl?: string; error?: string };
    if (!response.ok || !body.ok || !body.launchUrl) throw new Error(body.error || "无法创建生图站启动票据");
    return body.launchUrl;
}

/** 使用操作系统默认浏览器打开本地启动票据。 */
export function openExternalBrowser(url: string) {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" || parsed.hostname !== "127.0.0.1") throw new Error("拒绝打开非本机启动地址");
    const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer.exe" : "xdg-open";
    return new Promise<void>((resolve, reject) => {
        const child = spawn(command, [parsed.toString()], { detached: true, stdio: "ignore", windowsHide: true });
        child.once("spawn", () => {
            child.unref();
            resolve();
        });
        child.once("error", reject);
    });
}

/** 等待网页建立 SSE 连接；超时只返回 false，浏览器仍保持打开。 */
export async function waitForSiteConnection(config: CanvasAgentConfig) {
    const deadline = Date.now() + SITE_CONNECT_TIMEOUT_MS;
    while (Date.now() < deadline) {
        const health = await readHealth(config.url);
        if (health && Number(health.clients) > 0) return true;
        await delay(250);
    }
    return false;
}

async function readHealth(url: string) {
    try {
        const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1_000) });
        if (!response.ok) return null;
        const body = await response.json() as Record<string, unknown>;
        return body.ok === true && body.service === "alien-ai-studio-agent" ? body : null;
    } catch {
        return null;
    }
}

function agentEntry() {
    const current = process.argv.find((arg) => /index\.(t|j)s$/.test(arg));
    const entry = current || fileURLToPath(new URL("./index.js", import.meta.url));
    if (entry.endsWith(".ts")) throw new Error("开发模式请先单独运行 npm run dev，再调用 site_launch");
    return entry;
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

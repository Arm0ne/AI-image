# Alien AI Studio Agent

Alien AI Studio 的本地 Codex 桥接服务。它连接 [img.panlai.me](https://img.panlai.me)、Codex `app-server` 与画布 MCP，让网站右侧对话面板和 Codex 插件都能操作当前画布。

本项目基于 [basketikun/infinite-canvas](https://github.com/basketikun/infinite-canvas) 的 Canvas Agent 修改，遵循 MIT License；它不是上游官方发行版。

## 功能

- 只监听 `127.0.0.1:17371`
- 通过本机 Codex 登录启动 `codex app-server --stdio`
- 向 Codex 提供画布 MCP 工具
- 使用一次性启动票据在默认浏览器打开 Alien AI Studio
- 自动把本地 Agent 地址和连接 token 交给网页
- 仅允许 `https://img.panlai.me` 和显式配置的开发 Origin

## 使用

直接启动本地 Agent：

```bash
npx -y @arm0ne/alien-ai-studio-agent@latest
```

调试模式：

```bash
npx -y @arm0ne/alien-ai-studio-agent@latest --debug
```

手动添加 MCP（安装 Alien AI Studio Plugin 时不需要执行）：

```bash
codex mcp add alien-ai-studio -- npx -y @arm0ne/alien-ai-studio-agent@latest mcp
```

## 本地开发

```bash
npm install
npm test
npm run build
npm run dev
```

本地网站需要连接 Agent 时，显式配置允许的 Origin：

```powershell
$env:ALIEN_AI_STUDIO_ALLOWED_ORIGINS = "http://localhost:5173"
npm run dev
```

多个开发 Origin 使用英文逗号分隔。生产 Origin `https://img.panlai.me` 始终允许。

## 启动流程

插件中的 `site_launch` 工具会：

1. 复用或启动本地 HTTP Agent。
2. 签发 60 秒内有效、仅可使用一次的启动票据。
3. 让系统默认浏览器打开本地票据地址。
4. 本地 Agent 重定向到 `https://img.panlai.me/canvas?mode=new`，连接信息只放在 URL fragment。
5. 网页读取连接信息后立即清除 fragment，并建立 SSE 连接。

连接 token 不会放入生产站点 HTTP 请求或系统启动命令；网页读取 fragment 后会立即清除它。

## 发布

npm 包名为 `@arm0ne/alien-ai-studio-agent`，源码位于主仓库的 `canvas-agent/`。GitHub Actions 使用 npm Trusted Publisher 发布；发布前需要在 npm 包设置中授权 `Arm0ne/AI-image` 及工作流 `publish-agent.yml`。

## License

MIT。上游版权及许可声明保留在仓库根目录的 `LICENSE`，派生说明见 [NOTICE](./NOTICE)。

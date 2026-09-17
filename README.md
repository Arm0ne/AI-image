# Alien AI Studio

Alien AI Studio 是一个面向 AI 图片、视频、音频与文本创作的多模态无限画布应用，线上站点为 [img.panlai.me](https://img.panlai.me)。项目内置本地 Codex 对话面板，并提供 Codex Plugin，让用户可以从 Codex 启动网站并操作当前画布。

本项目基于 [basketikun/infinite-canvas](https://github.com/basketikun/infinite-canvas) 二次开发，遵循 MIT License。

## 仓库结构

- `web/`：网站前端
- `canvas-agent/`：发布为 `@arm0ne/alien-ai-studio-agent` 的本地 Codex Agent
- `plugins/alien-ai-studio-plugin/`：Alien AI Studio Codex Plugin
- `plugins/canvas/`：画布节点插件与 SDK
- `docs/`：项目文档

## 本地开发

```bash
cd web
npm install
npm run dev
```

另开终端启动本地 Agent，并允许开发站点 Origin：

```powershell
cd canvas-agent
npm install
$env:ALIEN_AI_STUDIO_ALLOWED_ORIGINS = "http://localhost:5173"
npm run dev
```

## Codex Plugin

```bash
codex plugin marketplace add Arm0ne/AI-image
codex plugin add alien-ai-studio-plugin@alien-ai-studio
```

安装后新建 Codex 任务并输入“启动创作站”或“启动生图站”。插件会启动本地 Agent，在系统默认浏览器打开网站并自动连接右侧 Codex 面板。

## License

MIT。保留上游版权声明；Agent 派生说明见 `canvas-agent/NOTICE`。

# Alien AI Studio Plugin

在 Codex 中输入“启动创作站”或“启动生图站”，使用系统默认浏览器打开 [Alien AI Studio](https://img.panlai.me) 并自动连接本地 Agent。连接后，Codex 可以读取和操作当前画布。

Agent 由 `@arm0ne/alien-ai-studio-agent` 提供。网站右侧 Codex 面板与 Codex App 使用同一本机登录，但分别管理自己的对话线程。

## 安装

```bash
codex plugin marketplace add Arm0ne/AI-image
codex plugin add alien-ai-studio-plugin@alien-ai-studio
```

安装后新建 Codex 任务，输入：

```text
启动创作站
```

插件会使用系统默认浏览器打开网站，不会占用 Codex 右侧预览区。

## 本地开发安装

```powershell
codex plugin marketplace add "$PWD"
codex plugin add alien-ai-studio-plugin@alien-ai-studio
```

修改插件后需要重新安装，并在新的 Codex 任务中测试。

## License

MIT。上游版权和派生说明见仓库根目录的 `LICENSE` 与 `canvas-agent/NOTICE`。

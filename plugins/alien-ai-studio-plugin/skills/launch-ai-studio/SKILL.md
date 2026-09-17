---
name: launch-ai-studio
description: 启动、打开或进入 Alien AI Studio 创作站，并自动连接用户本机 Codex。用户说“启动创作站”“启动生图站”、要求打开 Alien AI Studio、进入创作站或连接本地 Agent 时使用。
---

# 启动创作站

使用 Alien AI Studio MCP 的 `site_launch` 工具启动网站。不要使用 Codex 右侧预览或内置浏览器打开网站，也不要让用户手动复制 Agent URL、token 或启动命令。

## 打开模式

- 用户没有明确指定时，调用 `site_launch` 并使用 `mode: new`。
- 用户明确要求打开最近画布时，使用 `mode: recent`。
- 用户明确要求自己选择画布时，使用 `mode: choose`。

工具会自动复用或启动本地 Agent，通过系统默认浏览器打开 `https://img.panlai.me`，并把网页连接到本机 Codex。

`connected: true` 表示网站已建立连接。若返回 `connected: false`，说明浏览器已经打开但尚未检测到连接，应提醒用户查看浏览器页面或浏览器的本地网络访问权限，不要再次暴露或拼接连接 token。

---
name: canvas
description: 读取和操作 Alien AI Studio 当前网页画布，创建节点、生成流程、连接节点或触发图片、视频、音频和文本生成。
---

# Alien AI Studio 画布

需要理解或修改画布时，优先使用 `alien-ai-studio` MCP 工具。不要模拟鼠标点击，也不要让用户手动复制 JSON、Agent URL 或连接 token。

## 工作流

- 如果网站尚未打开或没有连接，先使用 `launch-ai-studio` Skill。
- 操作前先调用 `canvas_get_state`；用户提到选中内容、当前节点或“这个”时，先调用 `canvas_get_selection`。
- 创建单个文本使用 `canvas_create_text_node`。
- 生成内容使用对应的 `canvas_generate_text`、`canvas_generate_image`、`canvas_generate_video` 或 `canvas_generate_audio`。
- 需要把提示词、配置和生成节点组成流程时，使用 `canvas_create_generation_flow`。
- 批量增删改、移动、连接节点或设置视口时，使用 `canvas_apply_ops`。
- 画布写操作由网页侧边栏二次确认，按工具返回结果继续即可。

页面文案和节点内容默认使用中文。批量创建节点时留出间距，图片、视频和音频节点默认保留原始比例。

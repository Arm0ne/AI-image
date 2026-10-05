# 源码清理说明

本次清理基于全仓库引用搜索、前端入口和测试的静态/动态导入关系、构建配置及部署脚本核对。已验收的生图工作台重试修复保留，并从待测试列表移入功能说明。

## 清理内容

从源码移除 19 个文件，共 4,082,307 字节（约 3.89 MiB）：

| 类别 | 文件 | 原因 |
| --- | --- | --- |
| 旧构建包 | 根目录与 `web/` 下的 `infinite-canvas-dist.tar.gz` | 都是历史 `dist` 产物；当前 Docker、Vercel 和 Pages 从源码构建，无脚本读取这些压缩包 |
| 历史补丁 | `0001-feat.patch`、`0002-feat.patch`、`0003-feat.patch` | 默认接口、默认张数和首页按钮修改已在当前源码中 |
| 编辑器临时文件 | `~$画布完整使用教程.md` | 文档编辑器锁文件，不是教程正文 |
| 旧宣传图片 | `assets/` 下的 5 张图片 | 当前 README、前端、文档站和构建流程均未引用 |
| 未接入应用的组件 | `canvas-size-picker.tsx`、`image-generation-pending.tsx`、`github-link.tsx`、`dia-text-reveal.tsx` | 无入口导入、动态导入或符号调用；现有界面使用其他实现 |
| 未使用的接口工具 | `services/api/request.ts`、`services/api/prompt-source-presets.ts` | 导出函数、类型和常量均无使用方 |
| 旧静态资源 | `web/public/icons/linuxdo.svg`、`web/public/version.json` | 图标无引用；静态版本文件仍写着 v0.16.0，正式构建已由 Vite 生成带构建标识的 `version.json` |

`.claude/settings.local.json` 从 Git 跟踪中移除，当前机器的文件仍保留。它是本地开发工具权限偏好，不需要分发给所有克隆仓库的人。

## 目录整理与忽略规则

- 根目录资料整理到 `docs/reference/` 后，按当前源码统一为一份[源码说明](reference/source-overview.md)，中英文文档索引同步指向该文件。
- `.gitignore` 去重，并忽略本地编辑器偏好、锁文件、构建压缩包和根目录导出的编号补丁。
- `.dockerignore` 排除各子项目的依赖、构建目录和本地工具文件，避免它们进入 Docker 构建上下文。

## 保留的内容

- `web/`、`canvas-agent/`、`canvas-proxy/`、插件源码和文档站均有实际用途。
- `.agents/skills/` 和 `skills-lock.json` 是开发辅助规则，`.agents/plugins/marketplace.json` 是插件安装入口。
- npm 与 Bun 锁文件分别服务于本地开发、Agent 发布和部署流程；没有合并或删除。
- 部署脚本、CI、环境配置、许可证、Agent 指令和协议资料继续保留。
- 已安装的 `node_modules` 和本地构建目录本就被 Git 忽略，不属于源码提交。当前运行的开发服务及浏览器本地数据不在本次清理范围内。

## 恢复与仓库体积

移除文件均可从清理前的 Git 历史恢复，本机还在 `.git/verification/cleanup-backup/` 保留了副本。没有重写提交历史，因此减少的是当前检出目录和今后的源码 ZIP；完整 Git 克隆仍会包含历史对象。

## 验证结果

- 清理前后使用同一个临时构建标识分别构建，两个 JavaScript 产物及入口 HTML 在归一化资源文件名中的哈希后内容完全一致；CSS 仅移除未使用组件生成的 12 条样式规则。
- 生产构建仍正常输出 `version.json`，其内容与清理前完全一致；运行时配置、正在使用的模型图标和本地插件清单也一致。
- 前端 24 项测试、TypeScript 检查和生产构建通过。
- Git 忽略规则已核对；依赖、构建包和本地偏好会被排除，正式源码及 npm/Bun 锁文件仍保留。
- 本机没有 Docker 可执行文件，Docker 部分仅核对构建配置和文件路径，未运行容器部署。

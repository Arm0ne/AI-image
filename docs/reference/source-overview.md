# Alien AI Studio 源码说明

本文说明当前源码的组成、运行方式、主要业务流程，以及从 Infinite Canvas v0.18.0 同步到 v0.19.0 后保留和调整的内容。文中的服务地址仅使用本地开发地址，外部服务统一按用途描述。

## 1. 项目来源与当前版本

Alien AI Studio 是基于 [Infinite Canvas](https://github.com/basketikun/infinite-canvas) 二次开发的 AI 创作应用，源码仓库为 [Arm0ne/AI-image](https://github.com/Arm0ne/AI-image)。项目包含无限画布、图片与视频工作台、素材管理、模型配置，以及连接本机 Agent 的创作助手。

当前源码在原有 v0.18.0 二次开发版本上整合了上游 v0.19.0，并保留本项目的账号接入、界面、下载、生成历史和本地 Agent 等定制功能。

| 项目 | 当前说明 |
| --- | --- |
| 原始共同基线 | 上游 v0.18.0，提交 `d213a74614e0e4bd8a26383d1e1e907249e9c61b` |
| 本次整合的上游源码 | 提交 `dab19adc0847e32e39b7fc8ff90cb392561fb826`，版本标识 v0.19.0 |
| 本地整合分支 | `update/upstream-v0.19.0` |
| 部署更新分支 | `custom`；服务器从 `origin/custom` 拉取已提交的更新 |
| 应用展示版本 | 由根目录 `VERSION` 提供，当前为 `v0.19.0` |
| 构建标识 | 每次生产构建生成独立 `buildId`，用于识别同版本下的不同部署 |

这里的版本表示本次已整合的上游基线，不表示此后上游的所有提交都会自动进入本项目。`web/package.json` 中的包版本与应用展示版本不是同一个用途；Agent 也有独立包版本。

## 2. 整体架构

主体是浏览器端应用：界面、画布状态和生成任务由前端管理，图片、素材与生成记录主要保存在当前浏览器中。AI 请求通常由浏览器发送到配置的模型接口，账号登录和渠道同步依赖外部账号服务。

| 模块 | 技术与职责 |
| --- | --- |
| Web 应用 | React 19、TypeScript、Vite 7、React Router 7；负责页面、画布和创作流程 |
| 界面与状态 | Ant Design 6、Tailwind CSS 4、Zustand、i18next |
| 网络与存储 | Axios、localforage / IndexedDB；负责请求、本地媒体与业务数据持久化 |
| 本地 Agent | Node.js、TypeScript、Express、MCP SDK；连接本地模型运行环境与画布工具 |
| 本地代理 | 可选 Node.js 转发服务，帮助浏览器访问已配置的接口 |
| 文档站 | Next.js 16、Fumadocs、MDX；独立安装依赖和运行 |

静态前端服务、本地 Agent、本地代理和外部账号服务各自承担不同职责。启动前端或部署 Nginx 容器，并不会同时启动账号后端或本机 Agent。

## 3. 目录结构

```text
AI-image/
├─ web/                         主应用
│  ├─ src/
│  │  ├─ pages/                 首页、画布、图片、视频、素材、设置页面
│  │  ├─ components/            画布、Agent 面板与公共组件
│  │  ├─ stores/                全局状态、生成任务与画布状态
│  │  ├─ services/              API、本地文件、图片和同步服务
│  │  ├─ lib/                   画布、Agent、主题等核心工具
│  │  ├─ hooks/                 多页面复用的交互逻辑
│  │  ├─ i18n/                  国际化配置和文案
│  │  ├─ main.tsx               应用入口
│  │  └─ router.tsx             路由定义
│  ├─ public/                  静态资源与画布插件
│  ├─ tests/                   前端回归测试
│  └─ vite.config.ts           开发代理、构建和版本信息配置
├─ canvas-agent/               本地 Agent 服务、会话与工具实现
├─ canvas-proxy/               可选本地请求代理
├─ plugins/
│  ├─ alien-ai-studio-plugin/  Codex / ZCode 插件、MCP 与技能配置
│  └─ canvas/                 画布节点插件、SDK、注册表和模板
├─ docs/                       文档站、进度、同步和源码说明
├─ .github/workflows/          构建、部署及包发布流程
├─ .agents/                    开发辅助技能与插件入口
├─ Dockerfile                  前端容器构建
├─ nginx.conf                  静态资源服务与 SPA 路由回退
├─ docker-compose*.yml         容器启动配置
├─ vercel.json / render.yaml   托管平台配置
├─ deploy.sh / update.sh       原有部署与更新脚本
├─ VERSION                     应用版本标识
├─ CHANGELOG.md                版本变更摘要
└─ LICENSE                     开源许可证
```

根目录不是统一的 npm workspace。`web/`、`canvas-agent/`、`docs/` 等子项目分别管理依赖，安装和运行命令需要在对应目录执行。各处 npm / Bun 锁文件服务于实际开发与构建流程，不能简单当作重复文件删除。

## 4. 页面与源码入口

| 页面或能力 | 路由 / 关键源码 |
| --- | --- |
| 首页 | `/`；`web/src/pages/home/` |
| 画布列表与编辑器 | `/canvas`、`/canvas/:id`；`web/src/pages/canvas/`、`project.tsx` |
| 生图工作台 | `/image`；`web/src/pages/image/index.tsx`、`generation.ts` |
| 视频工作台 | `/video`；`web/src/pages/video/` |
| 我的素材 | `/assets`；`web/src/pages/assets/` |
| 设置 | `/config`；`web/src/pages/config/` |
| 画布交互与状态 | `web/src/components/canvas/`、`web/src/lib/canvas/`、`web/src/stores/canvas/` |
| 模型调用 | `web/src/services/api/` |
| 账号与渠道同步 | `web/src/services/sub2api-sync.ts`、`web/src/stores/use-user-store.ts` |
| 全局生成任务 | `web/src/stores/use-generation-store.ts` |
| 本地媒体与同步 | `web/src/services/image-storage.ts`、`file-storage.ts`、`webdav-sync.ts`、`app-sync.ts` |
| 创作助手界面 | `web/src/components/agent/local-agent-panel.tsx`、`web/src/lib/agent/` |
| 主题与更新提示 | `web/src/lib/app-theme.ts`、`canvas-theme.ts`、`web/src/utils/version-check.ts` |

当前路由以 `router.tsx` 为准，没有独立的提示词中心页面入口。历史资料或待测试清单中的名称不能直接视为当前已开放的页面。

## 5. 核心业务流程

### 5.1 画布与素材

画布通过节点、连线和分组组织文本、图片、视频、音频与生成配置。节点之间的引用进入提示词或模型输入，生成结果写回对应节点；素材可以在画布与工作台之间复用。

画布节点扩展位于 `plugins/canvas/`，包含 HTML、Markdown、全景、便签、SVG 等插件及开发 SDK。插件有自己的构建和注册过程，源码目录与 `web/public/plugins/` 下用于运行的资源承担不同职责。

### 5.2 生图与失败重试

生图页面负责收集提示词、参考图、模型和尺寸等参数，`generation.ts` 负责共享的生成流程与历史记录处理，全局生成 store 使进行中的任务在站内页面切换时仍可被观察。

已经用户测试确认的重试行为如下：

- 点击「开始生成」会创建新的生成记录。
- 在失败结果上点击「重试」，沿用原来的记录 ID、卡片和列表位置，不额外新增历史卡片。
- 当前卡片立即重新显示进行中状态并重新计时，仅重置本次重试的失败位置。
- 同一记录中已成功的图片和其他失败位置保留，结果继续更新到原记录。
- 切换其他历史记录或站内页面后返回，仍能找到正在重试的任务；后台完成不会把结果写进当前查看的其他记录。
- 失败信息和结果顺序随历史记录保存，取消或退出登录导致的结束状态也归入原记录。

这里的任务连续性适用于站内切换。完整刷新或关闭浏览器会中断前端运行环境，不能据此认为正在进行的图片请求可以在刷新后自动续接；已保存的失败历史仍可再次重试。

### 5.3 账号、渠道与模型

本项目保留了与 Sub2API 兼容账号服务的连接：登录后同步可用渠道与 API Key，优先选择可用的 Image2 模型，并刷新余额。模型调用仍由前端按配置发起。

退出登录会清除敏感渠道、密钥与所选模型，并中止进行中的相关请求；画布、素材、生成历史和非敏感偏好继续保留。登录账号本身不等于把浏览器中的创作数据上传到账号服务。

### 5.4 本地 Agent

`canvas-agent/` 提供本地连接服务、会话管理、流式消息、审批交互、技能管理及画布工具。前端通过 Agent 面板连接本机服务；Agent 的配置、会话及附件保存在本地文件系统，与网页 IndexedDB 分开管理。

`plugins/alien-ai-studio-plugin/` 提供 Codex / ZCode 的插件入口，复用本项目的 Agent 和 MCP 配置。插件的站点启动能力使用其配置的站点；开发时应手动打开本地前端并连接本地 Agent，不能假定插件会自动切换到开发地址。

## 6. 本地数据与跨域

### 6.1 数据保存位置

| 数据 | 保存方式 |
| --- | --- |
| 画布、素材、图片及生成历史 | 主要使用浏览器 localforage / IndexedDB |
| 原图与预览图 | 独立保存；预览图使用 `image_previews` 存储 |
| 登录状态、API Key 与小型偏好 | 浏览器本地配置存储 |
| Agent 会话、配置与文件 | 本机 Agent 管理的文件系统目录 |
| 跨设备同步 | 用户自行配置 WebDAV 后，通过相应同步流程处理 |

浏览器数据按来源隔离：`localhost` 与 `127.0.0.1`、不同端口和不同协议都可能对应不同的存储空间。开发测试建议固定使用同一个地址；换地址后看不到原有记录，不等于原地址的数据已经丢失。清除站点数据会影响本地创作内容，备份应使用应用导出或已配置的同步功能。

### 6.2 请求路径

- 本地开发时，现有业务服务的指定请求路径经过 Vite 代理；相关配置在 `web/vite.config.ts` 及账号同步服务中。
- 自定义模型接口通常由浏览器直接请求，目标服务需要允许对应来源，或使用设置中提供的本地代理。
- `canvas-proxy/` 是可选转发服务，默认地址为 `http://127.0.0.1:23210`；启用前需要先启动它，并在设置中填写一致的地址。
- 本地 Agent 默认地址为 `http://127.0.0.1:17371`，使用连接令牌和来源白名单；当前前端地址应在允许列表中。
- 生产构建由 Nginx 等静态服务托管。Vite 开发代理不会随静态文件自动部署，生产接口仍需正确配置跨域或专门的反向代理。

排查请求失败时应区分 HTTP 错误、网络断开、请求取消、超时和浏览器跨域拦截。不能把所有接口失败都归为 CORS 问题，也不应通过关闭浏览器安全策略解决。

## 7. 本次上游同步与定制保留

### 7.1 v0.19.0 带来的更新

| 更新 | 当前处理 |
| --- | --- |
| 本地 WebP 预览图 | 最长边 768 像素，小图不放大；用于画布、侧栏、素材和工作台等展示 |
| 原图按需使用 | 放大预览、下载、导出、生成参考图和 WebDAV 继续使用原图 |
| 预览生命周期 | 同图并发请求复用任务，串行补生成；删除和取消时清理关联预览，失败时回退原图 |
| 拖拽与分组性能 | 按动画帧更新位置和分组判断，减少重复查找与数组复制 |
| 连线显示性能 | 裁剪视口外的无关连线，同时保留穿过视口的曲线 |
| 生图超时 | 内置 OpenAI 生图、编辑及 Gemini 生图请求使用 10 分钟超时；自定义脚本保留原行为 |
| 操作按钮 | 同步悬停显示，并照顾键盘聚焦和无悬停能力的触屏设备 |
| ZCode 接入 | 整合进现有 Alien 插件体系 |

原图、画布、素材和历史记录的既有存储键保留。生图历史继续按需加载元数据和预览，查看具体记录时才加载完整图片，避免进入页面就读取全部历史原图。

### 7.2 保留的二次开发内容

- Alien 品牌、默认深色主题、移动端导航和首页效果。
- 账号登录、渠道同步、Image2 默认选择、余额刷新和退出登录清理逻辑。
- 图片下载格式选择、批量导出与 Windows ZIP 文件名处理。
- 本项目的 Agent 源码、会话处理、技能和插件配置。
- 基于构建标识的更新检测：开发环境关闭提示，生产环境发现新版本后提供刷新或稍后操作，不强制刷新。
- 生图工作台历史性能优化，以及本次已验收的原卡片重试流程。

## 8. 本地开发

以下命令以 PowerShell 为例，各模块在独立终端中运行，并从仓库根目录进入相应子目录。环境可使用 Node.js 22.12+ 和 Bun 1.x；此前本机验证使用 Node.js 24.15 与 Bun 1.3.14。

### 8.1 启动前端

```powershell
cd web
npm ci --legacy-peer-deps
npm run dev -- --host 127.0.0.1 --port 3000 --strictPort
```

访问 `http://127.0.0.1:3000`。安装时的 `--legacy-peer-deps` 用于处理现有 Pro Components 测试版与 Ant Design 6 的 peer 声明冲突，沿用锁文件，不需要为启动项目临时升级依赖。已有服务运行时直接使用其地址；`--strictPort` 会在端口占用时明确报错，避免悄悄切换端口导致存储和跨域来源变化。

### 8.2 启动本地 Agent（按需）

```powershell
cd canvas-agent
npm ci
$env:ALIEN_AI_STUDIO_ALLOWED_ORIGINS = "http://127.0.0.1:3000,http://localhost:3000"
npm run dev
```

在前端 Agent 面板中连接本地服务，并按所使用的本地运行环境完成登录或配置。端口、令牌与来源校验由 Agent 配置管理；更换前端端口时需同步调整来源白名单。

### 8.3 启动本地代理（按需）

```powershell
cd canvas-proxy
node index.js
```

随后在应用设置中启用本地代理，并核对代理地址。它不是运行前端的必要条件，仅在相应请求需要代理时启用。

### 8.4 启动文档站（按需）

```powershell
cd docs
bun install --frozen-lockfile
bun run dev --port 3001
```

文档站使用单独的端口，避免与主应用冲突。

## 9. 首次安装、日常更新与构建

### 9.1 首次安装部署

以下部署命令适用于 Linux / Bash 环境，沿用本项目的 `custom` 分支和 `deploy.sh`。服务器需要已安装 Git、Bash 和 Docker，Docker 服务已启动，当前用户有运行 Docker 的权限。前端依赖安装和编译在 Docker 构建中完成，服务器无需单独安装 Node.js 或 Bun。

先进入自己希望存放源码的位置，再执行：

```bash
git clone --branch custom https://github.com/Arm0ne/AI-image.git AI-image
cd AI-image
chmod +x deploy.sh
./deploy.sh
```

`AI-image` 只是示例目录名，可以换成自己喜欢的名字，也可以把克隆目标写成其他完整路径；后面的 `cd` 跟着使用同一个目录即可。项目不要求放在 `~/infinite-canvas`，也不要求使用固定目录名。

脚本会从当前源码构建 `infinite-canvas:custom` 镜像，启动名为 `infinite-canvas` 的容器，并将服务器 3000 端口映射到容器 3000 端口。完成后可在服务器本机访问 `http://127.0.0.1:3000`，远程访问使用服务器地址和对应端口；如通过反向代理访问，按自己的部署环境配置转发和 HTTPS。

### 9.2 后续更新部署

先在终端进入实际的项目根目录，也就是包含 `deploy.sh`、`Dockerfile` 和 `.git` 的目录。如果已经在这个目录中，就不需要再执行 `cd`。

例如，原先安装在 `~/infinite-canvas` 时可以执行 `cd ~/infinite-canvas`；安装在其他位置时换成自己的路径。这一步只是切换工作目录，不是强制的安装位置。

进入项目根目录后，沿用以下更新命令，逐条执行，确认前一条成功后再继续：

```bash
git checkout custom
git pull --ff-only origin custom
./deploy.sh
```

这三步依次切换到 `custom` 分支、从自己的仓库拉取该分支的新提交、重新构建并部署。`--ff-only` 要求分支能够直接快进；如果切换或拉取报错，应先处理服务器上的本地修改或分支分歧，成功后再部署，不要直接强制覆盖。

服务器的更新来源是 `origin/custom`。开发改动先在工作分支完成并验证，再合入 `custom` 并推送到 GitHub；服务器通过上述命令拉取并部署。本次上游整合使用的工作分支为 `update/upstream-v0.19.0`。推送源码与服务器部署是两个步骤，推送后仍需在服务器执行更新命令。

`deploy.sh` 会先停止并删除旧容器，再构建镜像和启动新容器，因此更新期间会暂停服务，暂停时间包括镜像构建过程。它不会修改浏览器中的本地创作数据；更新后继续使用原来的访问来源，可读取该来源下已保存的数据。

### 9.3 查看运行状态与日志

```bash
docker ps --filter name=infinite-canvas
docker logs --tail 100 infinite-canvas
```

需要手动重启当前容器时执行 `docker restart infinite-canvas`。如果 `./deploy.sh` 提示没有执行权限，先执行一次 `chmod +x deploy.sh` 再重试。

### 9.4 开发检查与其他构建方式

前端检查与构建在 `web/` 中执行：

```powershell
npm run typecheck
npm run test
npm run build
```

`npm run test` 实际调用 `bun test`，因此需要 Bun。构建产物位于 `web/dist/`；Vite 会生成当前版本信息，不需要手工维护旧的静态 `version.json`。`npm run start` 用于预览构建产物。

Agent 的检查与构建在 `canvas-agent/` 中执行：

```powershell
npm test
npm run build
```

本地 Docker 构建在仓库根目录执行：

```powershell
docker compose -f docker-compose.local.yml up -d --build
```

该 Compose 配置是另一种本地构建方式，与前面的 `deploy.sh` 选择一种使用即可。它通过 Nginx 提供前端，映射到本机 3000 端口；使用前应避免与已有容器或开发服务端口冲突。容器不是浏览器本地数据的保存位置，备份容器不能替代导出画布、素材和生成记录。本机此前未运行 Docker 验收，生产静态资源、路由回退和接口跨域仍需按实际部署环境验证。

原有 `update.sh` 用于维护源码时同步上游，涉及 `main` / `custom` 分支切换、合并和推送。服务器日常更新使用第 9.2 节的命令即可；需要整合上游新变化时，再单独审查并执行对应的源码合并流程。

后续跟进上游时，应先比较变化，再保留本项目账号、存储、工作台和 Agent 的定制行为，避免直接覆盖整个目录。应用版本、Agent 包版本与构建标识应按各自用途维护。

## 10. 已做的源码清理

上一轮已移除确认无引用的旧构建压缩包、已落地的历史补丁、编辑器锁文件、旧宣传图片、未接入的组件与接口工具，以及过期静态版本文件，共 19 个文件、约 3.89 MiB。

本地工具偏好从 Git 跟踪中移除，忽略规则补充了依赖、构建产物和临时文件；Docker 构建上下文排除了这些本地目录。文档参考区现统一为本文件，原先多份零散教程与历史部署说明不再作为导航入口。

仍有实际用途的 Agent、代理、插件、开发技能、锁文件、部署流程和许可证继续保留。大量 `node_modules` 文件属于本机安装的依赖，已被 Git 忽略；它们的数量不等于源码仓库需要分发的文件数量。历史文件仍存在于 Git 历史中，因此当前目录精简不会自动缩小全部历史对象。

## 11. 验证状态与后续事项

以下是此前代码更新与清理阶段已完成的验证，本次说明文档整理没有重新执行这些检查：

- 前端 24 项测试、TypeScript 检查和生产构建通过。
- 上游整合阶段 Agent 测试 128 项通过，2 项 Unix 权限测试在 Windows 跳过。
- 浏览器隔离验证确认缩略图和原图切换，以及失败重试期间的历史记录状态；重试行为已由用户实际测试通过。
- 清理前后使用相同构建标识比对，归一化资源文件名哈希后，JavaScript 产物和入口 HTML 内容一致，CSS 仅减少未使用组件对应的规则。
- 构建仍有原有的大 chunk 与静态 / 动态 import 混用提示；没有将构建通过等同于所有真实环境验收完成。

真实账号、各模型接口、WebDAV 往返、复杂画布操作、客户端插件与生产部署仍按待测试清单继续验收。Agent SDK 适配、工具队列、技能搜索安装、资源文件管理及受控本地记忆等后续规划，以 TODO 文档为准。

相关资料：

- [文档索引](../index.zh-CN.md)
- [功能说明](../content/docs/overview/features.zh-CN.mdx)
- [上游 v0.19.0 同步记录](../upstream-sync-v0.19.0.md)
- [源码清理明细](../source-cleanup.md)
- [待测试清单](../content/docs/progress/pending-test.zh-CN.mdx)
- [后续 TODO](../content/docs/progress/todo.zh-CN.mdx)
- [更新日志](../../CHANGELOG.md)

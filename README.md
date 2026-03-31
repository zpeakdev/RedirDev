# `redirdev`

基于 `Chrome Manifest V3`、`React`、`TypeScript` 和 `declarativeNetRequest` 的请求重定向扩展原型，用于在开发调试场景下按规则拦截并重定向网络请求。

## 项目简介

这个项目当前聚焦一件事：

- 根据用户配置的规则匹配请求 URL
- 将命中的请求重定向到指定目标地址
- 通过浏览器侧边栏维护规则与启用状态

当前主界面是 `Side Panel`，点击扩展图标后打开侧边栏进行操作。

## 当前状态

### 已实现

- 扩展启用 / 禁用开关
- 重定向规则新增、编辑、删除
- 规则持久化到 `chrome.storage.local`
- 根据存储状态自动同步 `declarativeNetRequest` 动态规则
- 点击扩展图标自动打开侧边栏

### 当前代码中的实际限制

- 当前只处理两类资源请求：`XMLHTTPREQUEST`、`IMAGE`
- 重定向目标仅允许绝对 `http://` 或 `https://` URL
- 动态规则同步上限为 `100` 条
- `src/popup` 下已有源码，但当前 `manifest` 没有接入 `default_popup`，实际入口仍是侧边栏
- 当前没有真正的自动化测试，`test` 脚本仅输出文本

## 技术栈

### 运行时

- `Chrome Extension Manifest V3`
- `declarativeNetRequest`
- `chrome.storage.local`
- `sidePanel`

### 前端

- `React 19`
- `React DOM 19`
- `Ant Design 6`
- `Tailwind CSS 4`

### 工程化

- `TypeScript 6`
- `Vite 8`
- `@crxjs/vite-plugin`
- `@vitejs/plugin-react`
- `ESLint`
- `Prettier`

## 项目结构

```text
req/
├── src/
│   ├── background/
│   │   └── main.ts                 # Service Worker：同步动态规则、监听扩展事件
│   ├── sidepanel/
│   │   ├── App.tsx                 # 当前实际使用的主界面
│   │   ├── main.tsx                # Side Panel React 入口
│   │   └── index.html              # Side Panel HTML 模板
│   ├── popup/
│   │   ├── main.tsx                # Popup 入口源码（当前未接入 manifest）
│   │   ├── popup.tsx               # Popup UI
│   │   └── popup.html              # Popup HTML 模板
│   ├── shared/
│   │   ├── components/
│   │   │   ├── RuleForm.tsx        # 规则表单
│   │   │   └── RuleItem.tsx        # 规则列表项
│   │   ├── hooks/
│   │   │   └── useStorageState.ts  # 订阅 storage 状态
│   │   └── services/
│   │       ├── ruleService.ts      # 规则增删改
│   │       └── storageService.ts   # storage 读写封装
│   ├── types/
│   │   └── index.ts                # RuleConfig / StoredState 类型定义
│   ├── utils/
│   │   ├── index.ts                # 工具导出
│   │   ├── storage.ts              # 另一套 storage 工具（当前未见业务引用）
│   │   └── url.ts                  # URL 匹配与重定向地址归一化
│   └── assets/
│       └── styles/
│           └── tailwind.css        # Tailwind 样式入口
├── manifest.config.ts              # 扩展 manifest 源配置
├── vite.config.ts                  # Vite / React / CRX / Tailwind 配置
├── tsconfig.json                   # TypeScript 配置
├── eslint.config.js                # ESLint 配置
├── prettier.config.js              # Prettier 配置
├── package.json                    # 脚本与依赖
└── README.md
```

## 核心模块说明

### `src/background/main.ts`

扩展后台 `Service Worker`，负责：

- 从 `chrome.storage.local` 读取 `enabled` 与 `rules`
- 将规则转换为 `declarativeNetRequest` 动态规则
- 在安装、浏览器启动、存储变化时重新同步规则
- 点击扩展图标时打开侧边栏
- 通过串行队列避免多次快速变更造成规则更新竞态

### `src/sidepanel/App.tsx`

当前实际对外的主 UI，负责：

- 展示规则列表
- 切换启用状态
- 新增规则
- 编辑规则
- 删除规则

### `src/shared/services/storageService.ts`

对 `chrome.storage.local` 做轻量封装，统一读写：

- `enabled`
- `rules`

### `src/shared/services/ruleService.ts`

封装规则增删改逻辑，供 UI 调用。

### `src/utils/url.ts`

负责两类规范化：

- 将用户输入的匹配地址转为可用于 DNR 的 `urlFilter`
- 校验并规范化重定向目标地址

## 工作流程

### 1. 用户在侧边栏维护规则

侧边栏 UI 修改规则后，会把最新状态写入 `chrome.storage.local`。

### 2. Background 监听存储变化

`background` 监听 `chrome.storage.onChanged`，一旦状态变化就重新执行同步。

### 3. 重新生成动态规则

同步流程大致为：

1. 读取当前存储状态
2. 获取已存在的动态规则
3. 移除旧规则
4. 根据最新状态重建规则并写回浏览器

### 4. 浏览器按动态规则执行重定向

当请求命中规则时，由浏览器原生 `declarativeNetRequest` 机制完成重定向。

## URL 规则说明

### 匹配 URL 规范化

| 输入 | 转换结果 | 说明 |
| --- | --- | --- |
| `example.com` | `*://example.com*` | 匹配该域名的 http/https 请求 |
| `https://api.example.com` | `*https://api.example.com*` | 匹配该完整前缀 |
| `*.example.com/*` | 原样保留 | 用户已显式提供通配规则 |

规则说明：

- 输入为空时不会生成有效规则
- 输入中已包含 `*` 时按原样使用
- 输入以 `http://` 或 `https://` 开头时会包裹为 `*<url>*`
- 否则按主机名形式处理为 `*://<input>*`

### 重定向 URL 限制

仅接受：

- `http://...`
- `https://...`

会被拒绝的情况：

- 相对路径
- `javascript:` 等非安全协议
- 非法 URL

## 当前支持的资源类型

当前动态规则只对以下资源类型生效：

- `XMLHTTPREQUEST`
- `IMAGE`

也就是说，当前重点覆盖：

- `XHR / Fetch`
- 图片请求

如果后续需要扩展到更多类型，需要调整 `src/background/main.ts` 中的 `resourceTypes` 配置。

## 环境要求

- `Node.js` 18+
- `Chrome` 114+
- 包管理器：`pnpm`（推荐）或 `npm`

## 安装与运行

### 安装依赖

```bash
pnpm install
# 或
npm install
```

### 开发模式

```bash
pnpm dev
# 或
npm run dev
```

### 构建扩展

```bash
pnpm build
# 或
npm run build
```

构建完成后，产物输出到 `dist/`。

### 在 Chrome 中加载

1. 打开 `chrome://extensions/`
2. 开启右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择项目下的 `dist/` 目录

## 使用方式

1. 点击浏览器工具栏中的扩展图标
2. 打开右侧 `Side Panel`
3. 打开启用开关
4. 点击“新增规则”
5. 输入：
   - `匹配 URL`
   - `重定向 URL`
6. 保存规则并刷新目标页面验证效果

## 可用脚本

```bash
pnpm dev
pnpm build
pnpm build:watch
pnpm preview
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
pnpm test
```

对应 `npm` 用法：

```bash
npm run dev
npm run build
npm run build:watch
npm run preview
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm test
```

## 关键配置文件

### `manifest.config.ts`

定义扩展基础能力：

- `manifest_version: 3`
- `background.service_worker`
- `side_panel.default_path`
- `permissions`
- `host_permissions`
- `minimum_chrome_version: 114`

### `vite.config.ts`

定义构建与开发配置：

- `React` 插件
- `Tailwind CSS` 插件
- `CRX` 插件
- `@ -> src` 路径别名

### `tsconfig.json`

定义类型系统与编译约束：

- `strict: true`
- `moduleResolution: bundler`
- `jsx: react-jsx`
- `types: ["chrome", "vite/client"]`

## 调试建议

### 调试 Background

1. 打开 `chrome://extensions/`
2. 找到当前扩展
3. 点击 `Service Worker`
4. 在 DevTools 中查看日志与异常

### 调试 Side Panel

1. 打开侧边栏
2. 在面板内右键选择“检查”
3. 在 DevTools 中查看组件状态与报错

### 查看当前规则状态

可在扩展调试控制台执行：

```javascript
chrome.declarativeNetRequest.getDynamicRules(console.log)
chrome.storage.local.get(console.log)
```

## 已知现状与备注

- 当前项目版本仍是 `0.0.0`
- `homepage_url` 仍为示例值 `https://example.com`
- 当前 manifest 未配置图标资源
- `public/` 目录当前为空
- `src/popup` 已有实现，但不是当前实际入口
- `src/utils/storage.ts` 当前未见业务代码引用

## 后续可扩展方向

以下更适合视为后续规划，而非当前已完成能力：

- 代理模式
- 请求头 / 请求体修改
- 响应头 / 响应体修改
- 拦截日志与过滤能力
- 更完整的规则导入 / 导出体验
- 更多资源类型支持
- 自动化测试体系

## 许可证

本项目当前更适合作为学习与开发调试原型使用，请勿直接作为生产方案使用。
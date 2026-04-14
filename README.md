# RedirDev

`RedirDev` 是一个基于 `Chrome Manifest V3`、`React`、`TypeScript` 和 `declarativeNetRequest` 的浏览器扩展原型，面向前端联调和接口调试场景，提供基于规则的请求重定向能力。

当前项目已经具备可用的规则管理 UI、规则持久化和动态规则同步链路，并接入了基础 `proxy` 能力。整体仍处于原型阶段，当前代理实现仅覆盖最小可用链路，不是完整意义上的“可编程代理”。

## 项目定位

这个项目解决的是开发期常见需求：

- 按规则匹配线上或测试环境请求
- 将命中的请求重定向到本地或其他目标地址
- 在浏览器扩展内管理规则、启用状态和导入导出

项目当前的技术路线是：

- 使用 `chrome.storage.local` 保存配置
- 使用 `declarativeNetRequest` 动态规则执行浏览器侧重定向
- 使用 `options page` 和 `side panel` 提供管理界面
- 使用 `background service worker` 负责同步规则和响应扩展事件

## 当前实际能力

### 已实现

- 全局启用 / 禁用开关
- 规则新增、编辑、删除、启用 / 禁用
- 规则导入、导出
- 规则持久化到 `chrome.storage.local`
- 基于存储状态自动重建 DNR 动态规则
- 点击扩展图标自动打开 `Side Panel`
- 提供独立 `Options Page` 作为完整规则管理界面

### 当前真实边界

- 实际生效的只有 `redirect` 类型规则
- 已实现基础 `proxy` 链路：页面请求 API 劫持 -> bridge 内容脚本 -> `background fetch` 转发
- 当前 `proxy` 规则只支持修改转发时使用的请求方法，例如把原请求从 `GET` 改成 `POST`
- 代理能力暂不支持修改请求头、请求体、响应体
- 当前仅对 `XMLHTTPREQUEST` 和 `IMAGE` 两类资源生效
- 动态规则同步在代码中人为限制为最多 `100` 条
- `src/popup` 中已有弹窗源码，但 `manifest` 目前没有接入 `default_popup`
- `test` 脚本只是占位输出，项目当前没有真实自动化测试

## 页面入口

项目包含 3 套前端入口，其中 2 套已接入扩展：

| 入口            | 状态   | 作用                                               |
| --------------- | ------ | -------------------------------------------------- |
| `src/options`   | 已接入 | 完整规则管理后台，支持查看详情、编辑、导入导出     |
| `src/sidepanel` | 已接入 | 轻量侧边栏，用于快速开关和规则管理                 |
| `src/popup`     | 未接入 | 已有源码，但当前 `manifest` 未配置 `default_popup` |

实际使用体验是：

- 点击扩展图标，直接打开 `Side Panel`
- 在侧边栏中可快速新增或编辑规则
- 更完整的规则详情编辑在 `Options Page` 中完成

## 技术栈

### 运行时

- `Chrome Extension Manifest V3`
- `declarativeNetRequest`
- `chrome.storage.local`
- `chrome.sidePanel`

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

## 核心工作流

### 1. 规则由 UI 写入存储

用户在 `options` 或 `sidepanel` 中操作规则后，状态会写入 `chrome.storage.local`，结构包括：

- `enabled`：全局开关
- `rules`：规则数组

### 2. Background 监听变更并重建规则

`src/background/main.ts` 会在以下时机触发同步：

- 扩展安装或更新后
- 浏览器启动后
- `chrome.storage.local` 发生变更后

为了避免短时间多次操作引发并发竞态，代码使用了一个串行队列来顺序执行规则同步。

### 3. 重建 DNR 动态规则

同步时会执行以下流程：

1. 读取当前存储状态
2. 获取浏览器现有动态规则
3. 清空旧规则
4. 过滤出已启用的 `redirect` 规则
5. 将规则转换为 DNR `Rule[]`
6. 一次性写回浏览器

### 4. 浏览器原生执行重定向

真正的请求拦截与跳转由浏览器底层的 `declarativeNetRequest` 负责，因此即使 `service worker` 被挂起，已写入的动态规则仍然可以继续生效。

## 规则模型

项目中的规则类型定义如下：

```ts
type RuleType = "redirect" | "proxy";

type RuleConfig = {
  id: string;
  matchUrl: string;
  targetUrl: string;
  proxyMethod?: ProxyMethod;
  enabled: boolean;
  type: RuleType;
};
```

需要注意：

- `redirect` 规则会被转换成 DNR 动态规则
- `proxy` 规则不会进入 DNR，而是走“页面 API 劫持 + background 转发”链路
- `proxyMethod` 仅在 `proxy` 规则下生效

## URL 规则说明

### 匹配规则如何转换

`src/utils/url.ts` 会把用户输入的 `matchUrl` 规范化为 DNR 可识别的 `urlFilter`：

| 输入                      | 输出                        | 说明                   |
| ------------------------- | --------------------------- | ---------------------- |
| `example.com`             | `*://example.com*`          | 按域名匹配             |
| `https://api.example.com` | `*https://api.example.com*` | 按完整前缀匹配         |
| `*://example.com/*`       | 原样保留                    | 已包含通配符时不再处理 |

规则要点：

- 空字符串不会生成有效规则
- 输入中包含 `*` 时按原样使用
- 以 `http://` 或 `https://` 开头时会包裹成 `*<url>*`
- 其他输入会被视作主机名，转换为 `*://<input>*`

### 重定向地址限制

`targetUrl` 当前只接受绝对地址：

- `http://...`
- `https://...`

以下内容会被视为无效：

- 相对路径
- `javascript:` 等危险协议
- 其他非 `http/https` 协议

## 当前支持的请求类型

当前 `background` 中只为以下资源类型创建动态规则：

- `XMLHTTPREQUEST`
- `IMAGE`

这意味着当前主要覆盖：

- `fetch / XHR`
- 图片请求

如果要支持脚本、页面导航、样式、字体等更多资源，需要扩展 `src/background/main.ts` 中的 `resourceTypes` 配置。

## 目录结构

```text
RedirDev/
├── doc/
│   └── 📊 方案对比速览.md
├── plugins/
│   └── vitePackageInfoPlugin.ts
├── src/
│   ├── assets/
│   │   └── styles/
│   │       └── tailwind.css
│   ├── background/
│   │   └── main.ts
│   ├── options/
│   │   ├── components/
│   │   │   ├── BasicConfigTab.tsx
│   │   │   ├── HeaderBar.tsx
│   │   │   ├── OptionRuleItem.tsx
│   │   │   ├── RuleDetailPanel.tsx
│   │   │   └── RuleSidebar.tsx
│   │   ├── App.tsx
│   │   ├── index.html
│   │   └── main.tsx
│   ├── popup/
│   │   ├── main.tsx
│   │   ├── popup.html
│   │   └── popup.tsx
│   ├── shared/
│   │   ├── components/
│   │   │   ├── AddRuleModal.tsx
│   │   │   ├── RuleForm.tsx
│   │   │   └── RuleItem.tsx
│   │   ├── hooks/
│   │   │   └── useStorageState.ts
│   │   └── services/
│   │       ├── ruleService.ts
│   │       └── storageService.ts
│   ├── sidepanel/
│   │   ├── App.tsx
│   │   ├── index.html
│   │   └── main.tsx
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── index.ts
│       ├── storage.ts
│       └── url.ts
├── manifest.config.ts
├── vite.config.ts
├── eslint.config.js
├── prettier.config.js
├── tsconfig.json
├── package.json
└── README.md
```

## 关键模块

### `src/background/main.ts`

后台 `service worker`，负责：

- 读取存储状态
- 生成和更新 DNR 动态规则
- 在安装、启动、存储变化时触发规则同步
- 点击扩展图标时打开侧边栏
- 使用串行队列避免规则更新冲突

### `src/options`

完整管理后台，特点包括：

- 左侧规则列表
- 右侧规则详情面板
- 规则导入导出
- 编辑基础配置
- 为“请求处理 / 响应处理”预留了标签页占位

这里更接近长期主控制台，而不只是一个简单设置页。

### `src/sidepanel`

轻量化操作面板，负责：

- 查看规则列表
- 快速开关全局状态
- 新增、编辑、删除规则
- 跳转到 `Options Page`

### `src/shared/services/ruleService.ts`

封装规则数据操作：

- `addRule`
- `updateRule`
- `deleteRule`
- `toggleRuleEnabled`
- `importRulesFromFile`
- `exportRulesToFile`

### `src/shared/services/storageService.ts`

对 `chrome.storage.local` 做了轻量封装，并提供默认状态：

```ts
{
  enabled: false,
  rules: []
}
```

### `plugins/vitePackageInfoPlugin.ts`

自定义 Vite 插件，会把 `package.json` 中的 `name`、`version`、`description` 注入为虚拟模块，供前端 UI 直接读取版本和描述信息。

## 环境要求

- `Node.js` 18 及以上
- `Chrome` 114 及以上
- 包管理器推荐使用 `pnpm`

## 安装与运行

### 安装依赖

```bash
pnpm install
```

如果你不使用 `pnpm`，也可以：

```bash
npm install
```

### 本地开发

```bash
pnpm dev
```

### 构建扩展

```bash
pnpm build
```

构建完成后，产物位于 `dist/` 目录。

### 在 Chrome 中加载

1. 打开 `chrome://extensions/`
2. 打开右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择项目的 `dist/` 目录

## 使用说明

### 快速使用

1. 安装并加载扩展
2. 点击浏览器工具栏中的扩展图标
3. 自动打开右侧 `Side Panel`
4. 打开全局启用开关
5. 新建一条 `redirect` 规则
6. 填写匹配地址和目标地址
7. 保存后刷新目标页面进行验证

### 推荐管理方式

- 日常快速开关和增删规则：使用 `Side Panel`
- 详细查看与编辑规则：使用 `Options Page`

### 导入导出

项目支持把规则导出为 JSON，并从 JSON 文件导入。

导入时的处理特点：

- 仅接受数组格式 JSON
- 每条规则会被重新分配本地 `id`
- `type` 非 `proxy` 时会自动归一化为 `redirect`
- `proxyMethod` 只有在 `type = "proxy"` 时会被保留
- `enabled` 默认按开启处理，除非显式传入 `false`

## 脚本命令

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

其中：

- `pnpm test` 当前只是占位命令
- `pnpm preview` 主要用于 Vite 产物预览，不等同于 Chrome 扩展实际运行环境

## 关键配置

### `manifest.config.ts`

当前启用了这些关键能力：

- `manifest_version: 3`
- `background.service_worker`
- `options_page`
- `side_panel.default_path`
- `declarativeNetRequest`
- `declarativeNetRequestWithHostAccess`
- `storage`
- `sidePanel`
- `host_permissions: ["<all_urls>"]`

### `vite.config.ts`

当前 Vite 配置包括：

- `React` 插件
- `Tailwind CSS` 插件
- `CRX` 插件
- `@ -> src` 路径别名
- 为扩展页面放开的开发期 CORS 配置

## 调试建议

### 调试 Background

1. 打开 `chrome://extensions/`
2. 找到当前扩展
3. 点击 `Service Worker`
4. 查看日志、规则同步异常和 `runtime.lastError`

### 调试 Side Panel / Options Page

1. 打开对应页面
2. 在页面内右键选择“检查”
3. 查看 React 组件、控制台报错和存储状态

### 查看当前规则

可以在扩展调试控制台执行：

```js
chrome.storage.local.get(console.log);
chrome.declarativeNetRequest.getDynamicRules(console.log);
```

## 已知问题与现状说明

- `proxy` 当前只实现了“代理时改请求方法”，还没有请求头、请求体、响应体改写
- `Options Page` 中“请求处理 / 响应处理”标签页仍是占位内容
- `popup` 页面源码存在，但没有接入 `manifest`
- `homepage_url` 仍是示例地址 `https://example.com`
- 当前没有图标资源配置
- `src/utils/storage.ts` 暂未看到业务侧使用
- 版本号仍为 `0.0.0`

## 后续可扩展方向

如果要把项目从“重定向原型”继续推进到“更完整的开发调试工具”，下一步通常会落在这些方向：

- 扩展 `proxy` 能力到请求头、请求体、请求参数修改
- 支持响应头、响应体改写
- 增加规则命中日志与调试面板
- 扩展更多 `resourceTypes`
- 增加规则校验、冲突检测和优先级管理
- 补充自动化测试和构建校验

## 许可证

当前仓库更适合作为学习、验证方案和开发期调试原型使用，不建议直接作为生产级解决方案投入使用。

---
name: mv3-dnr原型
overview: 实现一个基于 Manifest V3 + TypeScript 的 Chrome 扩展原型：用 `declarativeNetRequest` 动态规则完成 URL 匹配与重定向，并提供原生 Popup 用于保存多条规则与一键启用/禁用。
todos:
  - id: scaffold-mv3-files
    content: 创建根目录 MV3 扩展所需文件：`manifest.json`、`popup.html`、`popup.css`、`popup.js`、`src/background.ts`、`tsconfig.json`、`package.json`，并确保 manifest 正确引用 service_worker。
    status: completed
  - id: implement-background-dnr
    content: 实现 `src/background.ts`：读取/写入 storage 配置、`getDynamicRules` 清除旧规则、按当前 rules 与 enabled 通过 `updateDynamicRules` 添加 redirect 动态规则；监听 `onInstalled/onStartup/storage.onChanged` 并加入详细注释解释 MV3 动态规则机制。
    status: completed
  - id: implement-popup-ui
    content: 实现 `popup.js`：加载 storage 初始化 UI、保存按钮追加规则、删除规则更新规则列表、开关启用/禁用写回 storage；所有改动确保立即触发 background 重新应用动态规则。
    status: completed
  - id: add-build-dist
    content: 加入 TypeScript 构建脚本，把 `src/background.ts` 编译到 `dist/background.js` 以满足 manifest；确认输出可被 Chrome 扩展加载。
    status: completed
isProject: false
---

## 目标

构建一个可加载到 Chrome 的 MV3 扩展原型，仅覆盖：

- 网络请求拦截（通过 `chrome.declarativeNetRequest` 动态规则）
- 重定向（`redirect` 动作）
- Popup：输入“匹配规则(URL)”与“目标地址(Redirect URL)”，保存后生效
- Popup：开关一键启用/禁用（禁用时清除动态规则，启用时重新添加）

## 目录与文件

在工作区根目录创建以下文件：

- `[manifest.json](manifest.json)`
- `[tsconfig.json](tsconfig.json)`
- `[package.json](package.json)`
- `[src/background.ts](src/background.ts)`（MV3 service worker 核心逻辑，包含动态规则添加/清除）
- `[dist/background.js](dist/background.js)`（由 TypeScript 编译生成，用于 manifest 引用；代码逻辑与 `src/background.ts` 保持一致）
- `[popup.html](popup.html)`
- `[popup.css](popup.css)`
- `[popup.js](popup.js)`

## 实现要点

### 1) `manifest.json`

- `manifest_version: 3`
- `background.service_worker: "dist/background.js"`
- `permissions`: 至少包含 `declarativeNetRequest` 和 `storage`
- `host_permissions`: 配置 `"<all_urls>"`（原型阶段最简单）
- `action.default_popup: "popup.html"`

### 2) `src/background.ts`

核心能力：根据 `chrome.storage.local` 中的配置，调用 `chrome.declarativeNetRequest.updateDynamicRules()` 动态维护规则。

- 存储结构（`chrome.storage.local`）：
  - `enabled: boolean`：全局开关
  - `rules: Array<{ matchUrl: string; redirectUrl: string }>`：多条规则
- 动态规则机制（MV3 解释要写在注释中）：
  - MV3 service worker 可能会被挂起，但 `declarativeNetRequest` 的“动态规则”由浏览器侧持久维护；因此我们需要在扩展启动/安装/配置变化时重建规则。
  - 每次应用配置时：先 `getDynamicRules()` 拿到当前动态规则 ID -> 再用 `updateDynamicRules({ removeRuleIds })` 清除 -> 根据 `enabled && rules.length` 再 `addRules`。
- 规则映射（第一版保持简单、易改）：
  - condition：`{ urlFilter: matchUrl }`
  - action：`{ type: 'redirect', redirect: { url: redirectUrl } }`
  - resourceTypes：为覆盖“网络请求”优先选择 `['main_frame','sub_frame','xmlhttprequest','fetch']`，后续再扩展为可配置。
  - priority：为让数组前面的规则更“优先”，按数组顺序设置更高优先级。
- 触发时机：
  - `chrome.runtime.onInstalled`：初始化一次
  - `chrome.runtime.onStartup`：浏览器重启后初始化一次
  - `chrome.storage.onChanged`：当 `enabled` 或 `rules` 变化时调用 `applyDynamicRules()`，确保 Popup 点击“保存/启用/禁用”后立刻生效。

（在 `src/background.ts` 内实现并注释的关键函数建议包含：`readState()`、`applyDynamicRules()`、`normalizeAndValidateRule()`。）

### 3) Popup（原生 HTML/CSS/JS）

- `popup.html`：
  - 输入框：`matchUrl`（匹配规则 URL）与 `redirectUrl`（目标地址）
  - 开关：`enabled`（一键启用/禁用）
  - 按钮：`保存`（把当前输入追加为一条新规则）
  - 简单列表：展示已保存的规则条数与每条规则（包含“删除”按钮，便于多条规则管理）
- `popup.js`：
  - 页面加载时读取 `chrome.storage.local.get(['enabled','rules'])` 并渲染 UI
  - 保存时：追加到 `rules` 并写回 storage；写回后通过 `storage.onChanged` 驱动 background 重新应用动态规则
  - 删除时：从 `rules` 移除对应项并写回 storage
  - 启用/禁用：修改 `enabled` 写回 storage
- `popup.css`：极简布局，便于后续改动。

### 4) 构建（TypeScript -> dist/background.js）

为保证 manifest 可运行：

- `package.json`：提供 `devDependencies`（`typescript` 与 `@types/chrome`）及 `scripts`（`build`）
- `tsconfig.json`：输出到 `dist/`，`src/background.ts` 编译到 `dist/background.js`

### 5) 数据流（帮助理解与后续扩展）

```mermaid
flowchart LR
  Popup[Popup UI] -->|set/get chrome.storage.local| Storage[(chrome.storage.local)]
  Storage -->|onChanged| Background[service_worker: src/background.ts]
  Background -->|updateDynamicRules add/remove| DNR[DNR Dynamic Rules]
  DNR -->|redirect action| Network[网络请求重定向]
```

## 验收标准（手动）

- 加载扩展（开发者模式：Load unpacked）
- 在 Popup 输入 `matchUrl` 与 `redirectUrl`，点 `保存`，访问匹配页面/请求后发生重定向
- 切换开关到 `禁用`：重定向立刻停止
- 切换回 `启用`：重定向恢复
- 多次 `保存`：多条规则生效（priority 按数组顺序优先）

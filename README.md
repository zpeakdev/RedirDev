# DNR Redirect MV3 Prototype

基于 Manifest V3 + TypeScript 的 Chrome 扩展原型，用于通过 `declarativeNetRequest` 动态规则实现 URL 匹配与重定向。

## 目录约定

- `src/`: TypeScript 源码（`background`、`popup`）
- `dist/`: 构建产物（加载扩展时使用）
- `scripts/`: 构建辅助脚本

## 环境要求

- Node.js 18+
- Chrome 114+

## 开发与构建

```bash
npm install
npm run build
```

常用命令：

- `npm run build`: 清理并构建 TS + 复制静态资源与 `manifest` 到 `dist/`
- `npm run dev`: 监听 TS 变更（会先复制一次静态资源）
- `npm run lint`: ESLint 检查
- `npm run format:check`: Prettier 格式检查

## 在 Chrome 中加载

1. 打开 `chrome://extensions/`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择项目中的 `dist/` 目录

## 权限说明

- 当前原型阶段保留 `host_permissions: ["<all_urls>"]` 以便快速验证。
- 正式版本建议按业务域名收敛到最小权限范围。

## 调试建议

- `background`: 在扩展详情页打开 Service Worker 调试
- `popup`: 在弹出页右键“检查”
- 规则状态：通过 `chrome.storage.local` 与 `chrome.declarativeNetRequest` 联动验证

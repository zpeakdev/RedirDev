import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

/**
 * Manifest v3 配置
 * @see https://developer.chrome.com/docs/extensions/mv3/manifest/
 * @see https://developer.chrome.google.cn/docs/extensions/reference/manifest?hl=zh-cn
 */
export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  author: {
    email: "zpeak.dev@outlook.com",
  },
  homepage_url: "https://example.com",
  minimum_chrome_version: "114",
  permissions: [
    "declarativeNetRequest",
    "storage",
    "declarativeNetRequestWithHostAccess",
    "sidePanel",
  ],
  host_permissions: ["<all_urls>"],
  background: {
    service_worker: "src/background/main.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/bridge.ts"],
      run_at: "document_start",
    },
    {
      matches: ["<all_urls>"],
      js: ["src/content/pageProxy.ts"],
      run_at: "document_start",
      world: "MAIN",
    },
  ],
  options_page: "src/options/index.html",
  action: {
    // 不设置default_popup，通过onClicked事件处理点击操作打开侧边栏
  },
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'",
  },
});

/**
 *  world: "ISOLATED"
 * 'ISOLATED'（默认）：内容脚本在隔离环境中运行。
 * 隔离世界的桥接脚本 bridge.js
 *  - 负责中转 MAIN 世界和 background 的消息
 */

import { ProxyMessageType } from "@/types/proxy";
import { StorageService } from "@/shared/services/storageService";

/**
 * 页面 -> content script 的消息结构。
 * 其中 requestId 用于在页面侧 Promise 与异步回包做精确匹配。
 */
type PageProxyMessage = {
  type: string;
  msg: string;
  requestId: string;
  payload: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string | null;
  };
};

/**
 * 监听MAIN世界发过来的消息
 * 
 * MAIN世界的劫持脚本（改页面API） → window.postMessage → 隔离世界的桥脚本（中转） → chrome.runtime.sendMessage → background转发请求
 * background返回响应 → 桥脚本 → window.postMessage → MAIN世界的劫持脚本（把修改后的响应返回给页面）
 */
window.addEventListener("message", (event: MessageEvent<PageProxyMessage>) => {
  // 只处理当前页面自身发出的消息，忽略 iframe/其他窗口来源。
  if (event.source !== window) return;

  const data = event.data;

  if (data?.type === ProxyMessageType.STORAGE_STATE_REQUEST) {
    StorageService.getStoredState().then((state) => {
      window.postMessage({
        type: ProxyMessageType.STORAGE_STATE_RESPONSE,
        state,
        msg: "隔离脚本响应本地存储数据到页面脚本"
      }, "*");
    });
  }



  // 接收 MAIN世界发过来的消息
  if (data?.type === ProxyMessageType.XHR_REQUEST) {
    // 把消息转发给background
    chrome.runtime.sendMessage(
      {
        type: "proxy", // 统一把消息标记为 proxy ，让 background.onMessage 快速分流。
        ...data.payload
      },
      (response) => {
        // 按 requestId 回传，页面侧可以从并发请求中找到对应 Promise 并 resolve。
        const pageResponse = {
          type: ProxyMessageType.XHR_RESPONSE,
          requestId: data.requestId,
          response,
          msg: "隔离脚本转发响应给页面脚本"
        };

        // 发回同一页面上下文。页面侧会再按事件类型 + requestId 过滤。
        // 把background的返回结果，通过postMessage发给MAIN世界的劫持脚本
        window.postMessage(pageResponse, "*");
      }
    );
  }
});

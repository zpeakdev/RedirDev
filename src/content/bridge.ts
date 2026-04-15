import type { ProxyRequestPayload, ProxyRuntimeResponse, PageProxyResponseMessage } from "@/types/proxy";
import { PAGE_TO_EXTENSION_EVENT, EXTENSION_TO_PAGE_EVENT } from "@/types/proxy";

/**
 * 页面 -> content script 的消息结构。
 * 其中 requestId 用于在页面侧 Promise 与异步回包做精确匹配。
 */
type PageProxyMessage = {
  type: typeof PAGE_TO_EXTENSION_EVENT;
  requestId: string;
  payload: ProxyRequestPayload;
};

/**
 * 这一层是“消息桥”：
 * - 入站：接收页面 postMessage；
 * - 转发：用 chrome.runtime.sendMessage 发到 background；
 * - 回程：把 background 回包再 postMessage 回页面。
 *
 * 设计动机：页面脚本不能直接访问 chrome.runtime，只能借 content script 中转。
 */
window.addEventListener("message", (event: MessageEvent<PageProxyMessage>) => {
  console.log("🚀 ~ event1111111111111111111111:", event)
  // 只处理当前页面自身发出的消息，忽略 iframe/其他窗口来源。
  if (event.source !== window) return;

  const data = event.data;
  // 只消费约定的代理事件，避免误处理页面其他 postMessage 流量。
  if (!data || data?.type !== PAGE_TO_EXTENSION_EVENT) return;

  chrome.runtime.sendMessage(
    {
      // 统一把消息标记为 proxy，让 background.onMessage 快速分流。
      type: "proxy",
      ...data.payload
    },
    (response: ProxyRuntimeResponse | undefined) => {
      // runtime messaging 使用回调模型：
      // - 如果 background 报错/超时，错误挂在 chrome.runtime.lastError；
      // - 如果没报错但无响应，兜底为 handled=false，交给页面降级处理。
      const safeResponse: ProxyRuntimeResponse = chrome.runtime.lastError
        ? {
          handled: false,
          error: chrome.runtime.lastError.message
        }
        :
        (response ?? {
          handled: false,
          error: "empty proxy response"
        });

      // 按 requestId 回传，页面侧可以从并发请求中找到对应 Promise 并 resolve。
      const pageResponse: PageProxyResponseMessage = {
        type: EXTENSION_TO_PAGE_EVENT,
        requestId: data.requestId,
        response: safeResponse
      };

      // 发回同一页面上下文。页面侧会再按事件类型 + requestId 过滤。
      window.postMessage(pageResponse, "*");
    }
  );
});

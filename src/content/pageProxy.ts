import type { ProxyRequestPayload, ProxyRuntimeResponse, PageProxyResponseMessage } from "@/types/proxy";
import { PAGE_TO_EXTENSION_EVENT, EXTENSION_TO_PAGE_EVENT } from "@/types/proxy";

/**
 * 给 XHR 实例挂一份“请求元数据”，用于在 send() 时拼装代理请求。
 * 不直接改原有 XHR 字段，避免与浏览器实现冲突。
 */
declare global {
  interface Window {
    __REDIRDEV_PROXY_INSTALLED__?: boolean;
  }
  interface XMLHttpRequest {
    __redirdevProxyMeta?: {
      method: string;
      url: string;
      headers: Record<string, string>;
    };
  }
}

/**
 * 防重复安装补丁。
 * content script 在某些场景可能被重复注入，这个标记可避免二次覆写原生 API。
 */
if (!window.__REDIRDEV_PROXY_INSTALLED__) {
  window.__REDIRDEV_PROXY_INSTALLED__ = true;

  // 保存原始实现，便于“未命中代理时”无损回退。
  const rawFetch = window.fetch.bind(window);
  const rawOpen = XMLHttpRequest.prototype.open;
  const rawSend = XMLHttpRequest.prototype.send;
  const rawSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  // Headers 不是可直接跨 postMessage/runtime 传输的纯对象，这里先扁平化。
  const toHeadersObject = (headers: Headers): Record<string, string> => {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  };

  /**
   * 页面侧统一“发请求到桥接层”的函数。
   *
   * 执行路径：
   * 1) 生成 requestId；
   * 2) 监听来自 bridge 的响应消息；
   * 3) postMessage 发起请求；
   * 4) 命中 requestId 后 resolve；
   * 5) 超时兜底为 handled=false。
   */
  const sendToBridge = (payload: ProxyRequestPayload): Promise<ProxyRuntimeResponse> => {
    const requestId = `redirdev_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve) => {
      const onMessage = (event: MessageEvent<PageProxyResponseMessage>) => {
        console.log("🚀 ~ onMessage ~ event:", event)
        // TODO
        if (event.source !== window) return;
        const data = event.data;
        // 并发请求场景下，必须同时校验事件类型和 requestId，避免串响应。
        if (!data || data.type !== EXTENSION_TO_PAGE_EVENT || data.requestId !== requestId) return;
        window.removeEventListener("message", onMessage);
        window.clearTimeout(timer);
        resolve(data.response || { handled: false });
      };

      // 如果 bridge/background 链路异常，定时器负责解除监听并触发降级。
      const timer = window.setTimeout(() => {
        window.removeEventListener("message", onMessage);
        resolve({ handled: false, error: "proxy timeout" });
      }, 15000);

      window.addEventListener("message", onMessage);
      // 发给 bridge.ts；后续会转成 chrome.runtime.sendMessage 到 background。
      window.postMessage({ type: PAGE_TO_EXTENSION_EVENT, requestId, payload }, "*");
    });
  };

  /**
   * fetch 代理链路：
   * - 先把入参标准化成 Request，便于统一读取 method/url/headers/body；
   * - 只拦截 http/https；
   * - 尝试走代理，失败或未命中则回退原生 fetch。
   */
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    console.log("🚀 ~ init:", init)
    console.log("🚀 ~ input:", input)
    const request = new Request(input, init);

    // data:, blob:, chrome-extension: 等非 http(s) 协议不参与代理。
    if (!/^https?:/i.test(request.url)) {
      return rawFetch(input, init);
    }

    // 注意 clone()：Request body 只能读一次，先 clone 再 text() 避免影响后续原生回退。
    const proxy = await sendToBridge({
      url: request.url,
      method: String(request.method || "GET").toUpperCase(),
      headers: toHeadersObject(request.headers),
      body: await request.clone().text().catch(() => null)
    });

    // 未处理/失败 => 交回浏览器原生网络栈。
    if (!proxy.handled || !proxy.response) {
      return rawFetch(input, init);
    }

    // 代理命中 => 在页面侧构造一个 Response，让调用方透明消费。
    return new Response(proxy.response.body || "", {
      status: proxy.response.status,
      headers: proxy.response.headers
    });
  };

  /**
   * XHR open: 只记录元信息，不改变原生连接行为。
   */
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ): void {
    console.log("🚀 ~ url:111", url)
    console.log("🚀 ~ method:", method)
    this.__redirdevProxyMeta = {
      method: String(method || "GET").toUpperCase(),
      url: new URL(String(url), window.location.href).href,
      headers: {}
    };

    rawOpen.call(this, method, url, async ?? true, username, password);
  };

  /**
   * XHR setRequestHeader: 同步记录 header，便于 send() 时转发给代理。
   */
  XMLHttpRequest.prototype.setRequestHeader = function (
    name: string,
    value: string
  ): void {
    if (this.__redirdevProxyMeta) {
      this.__redirdevProxyMeta.headers[String(name)] = String(value);
    }

    rawSetRequestHeader.call(this, name, value);
  };

  /**
   * XHR send 代理链路：
   * - 有 meta 且是 http(s) 时尝试代理；
   * - 代理命中则手动填充状态并派发关键事件；
   * - 其余情况回退原生 send。
   *
   * 说明：这里做的是“尽量兼容”的模拟响应，覆盖常用的 readyState/status/responseText。
   */
  XMLHttpRequest.prototype.send = function (
    body
  ): void {
    console.log("🚀 ~ body:", body)
    const meta = this.__redirdevProxyMeta;
    console.log("🚀 ~ meta:", meta)
    if (!meta || !/^https?:/i.test(meta.url)) {
      rawSend.call(this, body);
      return;
    }

    sendToBridge({
      url: meta.url,
      method: meta.method,
      headers: meta.headers,
      body: body == null ? null : String(body)
    })
      .then((proxy) => {
        if (!proxy.handled || !proxy.response) {
          rawSend.call(this, body);
          return;
        }

        const responseBody = proxy.response.body || "";

        // 将代理结果映射到 XHR 常见只读字段，供业务代码读取。
        Object.defineProperties(this, {
          readyState: { configurable: true, value: 4 },
          status: { configurable: true, value: proxy.response.status },
          responseText: { configurable: true, value: responseBody },
          response: { configurable: true, value: responseBody }
        });

        // 触发标准生命周期事件，尽量对齐原生 XHR 行为。
        this.dispatchEvent(new Event("readystatechange"));
        this.dispatchEvent(new ProgressEvent("load"));
        this.dispatchEvent(new ProgressEvent("loadend"));

        // 同时兼容 onxxx 属性式回调。
        this.onreadystatechange?.call(this, new Event("readystatechange"));
        this.onload?.call(this, new ProgressEvent("load"));
        this.onloadend?.call(this, new ProgressEvent("loadend"));
      })
      .catch(() => {
        rawSend.call(this, body);
      });
  };
}


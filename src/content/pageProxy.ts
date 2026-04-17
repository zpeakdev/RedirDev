/**
 *  world: "MAIN"
 * 'MAIN'：内容脚本在页面环境中运行。
 * 页面世界的劫持脚本 pageProxy.js
 *  - 负责劫持页面的 XHR 请求，发送到 bridge.js 中转。
 */

import { ProxyMessageType } from "@/types/proxy";
import type { RuleConfig, StoredState } from "@/types/index";



/**
 * 给 XHR 实例挂一份“请求元数据”，用于在 send() 时拼装代理请求。
 */
declare global {
  interface Window {
    __REDIRDEV_PROXY_INSTALLED__?: boolean;
  }
  interface XMLHttpRequest {
    __redirdevProxyMeta?: {
      isProxy: boolean; // 是否命中代理规则
      headers: Record<string, string>;
      proxyRule: RuleConfig | undefined;
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
  // const rawFetch = window.fetch.bind(window);
  const rawOpen = XMLHttpRequest.prototype.open;
  const rawSend = XMLHttpRequest.prototype.send;
  const rawSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;


  let state: StoredState | null = null // 插件的本地配置数据
  let isExtEnabled = false; // 插件是否已启用
  let proxyRules: RuleConfig[] = []; // 启用的要代理规则列表

  // 匹配请求的规则
  function matchRequestRule(url: string) {
    // 插件没开，直接不拦截
    if (!isExtEnabled) return undefined;

    // 遍历你的规则，匹配URL
    const rule = proxyRules.find((rule) => rule.matchUrl === url);
    return rule;
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type === ProxyMessageType.STORAGE_STATE_RESPONSE) {
      state = event.data?.state
      isExtEnabled = !!state?.enabled;
      proxyRules = state?.rules?.filter((rule: RuleConfig) => (rule.type === "proxy" && rule.enabled)) || [];
      console.log("🚀 ~ event:6666", event, state)
    }
  });

  // 发送请求在 隔离环境中 获取插件的本地配置
  window.postMessage({ type: ProxyMessageType.STORAGE_STATE_REQUEST, msg: "通知隔离脚本响应本地存储数据" }, "*");


  // Headers 不是可直接跨 postMessage/runtime 传输的纯对象，这里先扁平化。
  // const toHeadersObject = (headers: Headers): Record<string, string> => {
  //   const out: Record<string, string> = {};
  //   headers.forEach((value, key) => {
  //     out[key] = value;
  //   });
  //   return out;
  // };

  /**
   * 页面侧统一“发请求到桥接层”的函数。
   * - MAIN世界的劫持脚本（改页面API） → window.postMessage → 隔离世界的桥脚本（中转）
   */
  // const sendToBridge = (payload: ProxyRequestPayload): Promise<ProxyRuntimeResponse> => {
  //   const requestId = `redirdev_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  //   return new Promise((resolve) => {
  //     const onMessage = (event: MessageEvent<PageProxyResponseMessage>) => {
  //       console.log("🚀 ~ onMessage ~ event:", event)
  //       // TODO
  //       if (event.source !== window) return;
  //       const data = event.data;
  //       // 并发请求场景下，必须同时校验事件类型和 requestId，避免串响应。
  //       if (!data || data.type !==  ProxyMessageType.XHR_RESPONSE || data.requestId !== requestId) return;
  //       window.removeEventListener("message", onMessage);
  //       resolve(data.response || { handled: false });
  //     };
  //     // 监听 bridge.ts 回传响应
  //     window.addEventListener("message", onMessage);

  //     // 发给 bridge.ts；后续会转成 chrome.runtime.sendMessage 到 background。
  //     window.postMessage({ type: ProxyMessageType.XHR_REQUEST, requestId, payload }, "*");
  //   });
  // };

  /**
   * fetch 代理链路：
   * - 先把入参标准化成 Request，便于统一读取 method/url/headers/body；
   * - 只拦截 http/https；
   * - 尝试走代理，失败或未命中则回退原生 fetch。
   */
  // window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  //   console.log("🚀 ~ init:", init)
  //   console.log("🚀 ~ input:", input)
  //   const request = new Request(input, init);

  //   // data:, blob:, chrome-extension: 等非 http(s) 协议不参与代理。
  //   if (!/^https?:/i.test(request.url)) {
  //     return rawFetch(input, init);
  //   }

  //   // 注意 clone()：Request body 只能读一次，先 clone 再 text() 避免影响后续原生回退。
  //   const proxy = await sendToBridge({
  //     url: request.url,
  //     method: String(request.method || "GET").toUpperCase(),
  //     headers: toHeadersObject(request.headers),
  //     body: await request.clone().text().catch(() => null)
  //   });

  //   // 未处理/失败 => 交回浏览器原生网络栈。
  //   if (!proxy.handled || !proxy.response) {
  //     return rawFetch(input, init);
  //   }

  //   // 代理命中 => 在页面侧构造一个 Response，让调用方透明消费。
  //   return new Response(proxy.response.body || "", {
  //     status: proxy.response.status,
  //     headers: proxy.response.headers
  //   });
  // };


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
    const matchUrl = new URL(url, window.location.href).href
    const rule = matchRequestRule(matchUrl);
    // 检查是否命中代理规则
    // OPTIMIZE : 后续优化 matchUrl 也要唯一，避免多个规则命中
    this.__redirdevProxyMeta = {
      headers: {},
      isProxy: !!rule,
      proxyRule: rule
    };

    if (!rule) {
      // 未命中代理规则，直接调用原生 open
      rawOpen.call(this, method, url, !!async, username, password);
      return;
    }

    /**
     * 
     * // XXX :
     * - 当命中代理规则时， 改写 XHR 的 method 和 url ，用规则里配置的 proxyMethod 和 matchUrl 去调用原生 open 。
- 但结合你后面的 send() 实现（命中代理时并不会真的 rawSend 发出去，而是 postMessage 走 background 转发），这行的主要意义其实是：
- 让 XHR 实例的内部状态/字段更接近“已 open 过”的样子（有些代码会读取 xhr.responseURL 、 xhr.readyState 的变化）
- 保持调用序列符合 XHR 的期望（先 open 再 send）
     */
    rawOpen.call(this, rule!.proxyMethod!, rule.matchUrl, async ?? true, username, password);
  };

  /**
   * XHR setRequestHeader: 同步记录 header，便于 send() 时转发给代理。
   */
  XMLHttpRequest.prototype.setRequestHeader = function (
    name: string,
    value: string
  ): void {
    if (this.__redirdevProxyMeta) {
      this.__redirdevProxyMeta.headers[name] = value
    }
    rawSetRequestHeader.call(this, name, value);
  };

  /**
   * XHR send 代理链路：
   */
  XMLHttpRequest.prototype.send = function (
    body
  ): void {
    const meta = this.__redirdevProxyMeta;

    // 未命中代理规则，直接调用原生 send
    if (!meta?.isProxy) {
      rawSend.call(this, body);
      return
    };

    const payload = {
      headers: meta.headers,
      body,
      rule: meta.proxyRule
    }
    console.log(`拦截到XHR请求:${meta.proxyRule?.matchUrl}准备转发到本地:${meta.proxyRule?.targetUrl}`);

    const requestId = `redirdev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;

      const data: {
        type: ProxyMessageType,
        requestId: string,
        response:
        {
          handled: boolean, error?: string,
          status: number,
          headers: Record<string, string>,
          body: string
        }
      } = event.data;
      // 并发请求场景下，必须同时校验事件类型和 requestId，避免串响应。
      if (data.type !== ProxyMessageType.XHR_RESPONSE || data.requestId !== requestId) return;

      window.removeEventListener("message", onMessage);
      const proxy = data.response || {};

      // 未处理/失败 => 交回浏览器原生网络栈。
      if (!proxy.handled) {
        rawSend.call(this, body);
        return;
      }

      const responseBody = proxy?.body || "";

      // 将代理结果映射到 XHR 常见只读字段，供业务代码读取。
      Object.defineProperties(this, {
        readyState: { configurable: true, value: 4 },
        status: { configurable: true, value: proxy?.status },
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
    };
    // 监听 bridge.ts 回传响应
    window.addEventListener("message", onMessage);

    // 发给 bridge.ts；后续会转成 chrome.runtime.sendMessage 到 background。
    window.postMessage({ type: ProxyMessageType.XHR_REQUEST, requestId, payload, msg: "页面脚本通知隔离脚本发送XHR请求" }, "*");


  };
}


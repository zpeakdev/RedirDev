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
}


/**
 * 防重复安装补丁。
 * content script 在某些场景可能被重复注入，这个标记可避免二次覆写原生 API。
 */
if (!window.__REDIRDEV_PROXY_INSTALLED__) {
  window.__REDIRDEV_PROXY_INSTALLED__ = true;

  // 保存原始实现，便于“未命中代理时”无损回退。
  const rawFetch = window.fetch
  const rawOpen = XMLHttpRequest.prototype.open;


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
    }
  });

  // 发送请求在 隔离环境中 获取插件的本地配置
  window.postMessage({ type: ProxyMessageType.STORAGE_STATE_REQUEST, msg: "通知隔离脚本响应本地存储数据" }, "*");



  /**
   * fetch 代理链路：
   */
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === "string" ? new URL(input, window.location.href).href : input;
    const rule = proxyRules.find(r => r.matchUrl === url);
    if (!rule) return rawFetch(input, init);

    const reqInit = { ...init };
    if (rule.proxyMethod) reqInit.method = rule.proxyMethod;
    const target = rule.targetUrl ? rule.targetUrl : url;

    let res = await rawFetch(target, reqInit);
    return res;
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
    const matchUrl = new URL(url, window.location.href).href
    const rule = matchRequestRule(matchUrl);

    console.log("🚀window.__READIRDEV_STATE__:", window.__READIRDEV_STATE__)
    if (!rule) {
      // 未命中代理规则，直接调用原生 open
      rawOpen.call(this, method, url, !!async, username, password);
      return;
    }

    rawOpen.call(this, rule!.proxyMethod!, rule.targetUrl, async ?? true, username, password);
  };
}


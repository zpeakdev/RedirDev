/**
 * world: "MAIN"
 *  - 'MAIN'：内容脚本在页面环境中运行。
 *  - 页面世界的劫持脚本
 */

import { ProxyMessageType } from "@/types/proxy";
import type { RuleConfig, StoredState } from "@/types/index";

/**
 * 防重复安装补丁。
 * content script 在某些场景可能被重复注入，这个标记可避免二次覆写原生 API。
 */
if (!window.__REDIRDEV_PROXY_INSTALLED__) {
  window.__REDIRDEV_PROXY_INSTALLED__ = true;

  // 保存原始实现，便于“未命中代理时”无损回退。
  const rawFetch = window.fetch.bind(window);
  const rawOpen = XMLHttpRequest.prototype.open;

  let isExtEnabled = false; // 插件是否已启用
  let proxyRuleMap = new Map<string, RuleConfig>(); // 启用的要代理规则列表（按 matchUrl 索引）

  /**
   * 更新代理规则状态
   */
  function updateState(nextState: StoredState | null) {
    isExtEnabled = !!nextState?.enabled;
    const nextRules =
      nextState?.rules?.filter((rule) => rule.type === "proxy" && rule.enabled) ?? [];
    proxyRuleMap = new Map(nextRules.map((rule) => [rule.matchUrl, rule]));
  }

  /**
   * 匹配请求的规则
   */
  function matchRequestRule(url: string) {
    // 插件没开，直接不拦截
    if (!isExtEnabled) return undefined;

    return proxyRuleMap.get(url);
  }

  /**
   * 归一化 fetch 请求 URL
   */
  function normalizeFetchUrl(input: RequestInfo | URL) {
    if (typeof input === "string") return new URL(input, window.location.href).href;
    if (input instanceof URL) return input.href;
    return new URL(input.url, window.location.href).href;
  }

  /**
   * 监听消息事件，更新代理规则状态
   */
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    if (event.data?.type === ProxyMessageType.STORAGE_STATE_RESPONSE) {
      updateState((event.data as { state?: StoredState }).state ?? null);
    }
  });

  /**
   * 发送请求在 隔离环境中 获取插件的本地配置
   */
  window.postMessage(
    { type: ProxyMessageType.STORAGE_STATE_REQUEST, msg: "通知隔离脚本响应本地存储数据" },
    "*",
  );

  /**
   * fetch 代理链路：
   */
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url = normalizeFetchUrl(input);
    const rule = matchRequestRule(url);
    if (!rule) return rawFetch(input, init);

    const target = rule.targetUrl || url;

    if (input instanceof Request) {
      const mergedInit: RequestInit = { ...init };
      if (rule.proxyMethod) mergedInit.method = rule.proxyMethod;

      const proxied = new Request(target, input);
      const finalRequest = Object.keys(mergedInit).length
        ? new Request(proxied, mergedInit)
        : proxied;

      return rawFetch(finalRequest);
    }

    const mergedInit: RequestInit = { ...init };
    if (rule.proxyMethod) mergedInit.method = rule.proxyMethod;
    return rawFetch(target, mergedInit);
  };

  /**
   * XHR open: 只记录元信息，不改变原生连接行为。
   */
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ): void {
    const matchUrl = normalizeFetchUrl(url);
    const rule = matchRequestRule(matchUrl);

    if (!rule) {
      // 未命中代理规则，直接调用原生 open
      rawOpen.call(this, method, url, !!async, username, password);
      return;
    }

    rawOpen.call(this, rule.proxyMethod!, rule.targetUrl, !!async, username, password);
  };
}

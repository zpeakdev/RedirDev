/**
 * MV3 background service worker 核心逻辑（TypeScript）
 *
 * 实现三个能力：
 * 1) 网络请求拦截（通过 declarativeNetRequest 动态规则匹配 URL）
 * 2) 重定向（通过 RuleAction.type = 'redirect'）
 * 3) 代理（通过页面 API 劫持 + runtime 消息 + background fetch 转发）
 *
 * 动态规则处理机制（MV3 关键点，代码里会解释清楚）：
 * - MV3 的 service worker 可能会被浏览器“挂起/销毁”，但 declarativeNetRequest 的“动态规则”
 *   是由浏览器侧维护与持久化的。
 * - 因此我们不能依赖 service worker 常驻运行来维护规则；而要在“扩展启动/安装/配置变化”时，
 *   主动从 storage 读出当前配置，并调用 updateDynamicRules()：
 *   - 先 getDynamicRules() 拿到当前动态规则 ID
 *   - removeRuleIds 清空旧动态规则
 *   - addRules 根据当前 rules(enabled && rules) 重建新的重定向规则
 */
import {
  normalizeMatchUrlToUrlFilter,
  normalizeRedirectUrl
} from "@/utils/url.js";
import { StorageService } from "@/shared/services/storageService";
import type { ProxyMethod, RuleConfig } from "@/types/index.ts";

console.log("service_worker -> main.ts");

// HACK: 原型阶段给一个上限：避免用户一次保存太多导致更新失败。
const MAX_DYNAMIC_RULES = 100;
const PAGE_TO_EXTENSION_EVENT = "REDIRDEV_PAGE_PROXY_REQUEST";

type SerializableProxyRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  transport: "fetch" | "xhr";
};

type SerializableProxyResponse = {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
};

type ProxyRuntimeResponse = {
  handled: boolean;
  response?: SerializableProxyResponse;
  error?: string;
};

const ALLOWED_PROXY_METHODS = new Set<ProxyMethod>([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS"
]);

function normalizeProxyMethod(method: string | undefined): ProxyMethod {
  const normalized = String(method || "").toUpperCase() as ProxyMethod;
  return ALLOWED_PROXY_METHODS.has(normalized) ? normalized : "GET";
}

function isBodyAllowed(method: string): boolean {
  return method !== "GET" && method !== "HEAD";
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isUrlMatched(matchUrl: string, requestUrl: string): boolean {
  const raw = matchUrl.trim();
  if (!raw) return false;

  if (raw.includes("*")) {
    const pattern = `^${escapeRegex(raw).replace(/\\\*/g, ".*")}$`;
    return new RegExp(pattern, "i").test(requestUrl);
  }

  if (/^https?:\/\//i.test(raw)) {
    return requestUrl.startsWith(raw);
  }

  return requestUrl.includes(raw);
}

function findMatchedProxyRule(
  rules: RuleConfig[],
  requestUrl: string
): RuleConfig | undefined {
  return rules.find(
    (rule) =>
      rule.type === "proxy" &&
      rule.enabled &&
      isUrlMatched(rule.matchUrl, requestUrl)
  );
}

function sanitizeForwardHeaders(
  headers: Record<string, string>,
  method: ProxyMethod
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  Object.entries(headers).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey === "content-length" ||
      lowerKey === "host" ||
      lowerKey === "origin" ||
      lowerKey === "referer"
    ) {
      return;
    }

    if (!isBodyAllowed(method) && lowerKey === "content-type") {
      return;
    }

    sanitized[key] = value;
  });

  return sanitized;
}

function buildProxyErrorResponse(
  requestUrl: string,
  errorMessage: string
): ProxyRuntimeResponse {
  return {
    handled: true,
    error: errorMessage,
    response: {
      url: requestUrl,
      status: 502,
      statusText: "Proxy Error",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        error: errorMessage
      })
    }
  };
}

async function handleProxyForward(
  request: SerializableProxyRequest
): Promise<ProxyRuntimeResponse> {
  const state = await StorageService.getStoredState();
  if (!state.enabled) {
    return { handled: false };
  }

  const matchedRule = findMatchedProxyRule(state.rules, request.url);
  if (!matchedRule) {
    return { handled: false };
  }

  const targetUrl = normalizeRedirectUrl(matchedRule.targetUrl);
  if (!targetUrl) {
    return buildProxyErrorResponse(request.url, "代理目标地址无效");
  }

  const proxyMethod = normalizeProxyMethod(matchedRule.proxyMethod);
  const headers = sanitizeForwardHeaders(request.headers, proxyMethod);

  const init: RequestInit = {
    method: proxyMethod,
    headers
  };

  if (isBodyAllowed(proxyMethod) && request.body != null) {
    init.body = request.body;
  }

  try {
    const response = await fetch(targetUrl, init);
    const body = await response.text();
    const responseHeaders: Record<string, string> = {};

    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      handled: true,
      response: {
        url: response.url || targetUrl,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body
      }
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "代理转发失败，请检查目标服务";
    return buildProxyErrorResponse(targetUrl, message);
  }
}

/**
 * 获取当前动态规则
 */
function getDynamicRules(): Promise<chrome.declarativeNetRequest.Rule[]> {
  return new Promise((resolve, reject) => {
    chrome.declarativeNetRequest.getDynamicRules((rules) => {
      const err = chrome.runtime.lastError;
      if (err) reject(err);
      else resolve(rules);
    });
  });
}

/**
 * 更新动态规则
 */
function updateDynamicRulesAsync(params: {
  removeRuleIds: number[];
  addRules: chrome.declarativeNetRequest.Rule[];
}): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.declarativeNetRequest.updateDynamicRules(params, () => {
      const err = chrome.runtime.lastError;
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * 应用当前配置到 declarativeNetRequest 动态规则
 */
async function applyDynamicRules(): Promise<void> {
  const state = await StorageService.getStoredState();

  // 1) 先拿到当前动态规则，准备清空
  const existing = await getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  // 2) 再生成新的 addRules（enabled=false 时为空数组）
  const addRules: chrome.declarativeNetRequest.Rule[] = [];
  if (state.enabled && state.rules?.length > 0) {
    // 过滤掉禁用的规则，只应用启用的规则
    const redirectRules = state.rules.filter((rule) => (rule.type === "redirect" && !!rule.enabled));
    const limitedRules = redirectRules.slice(0, MAX_DYNAMIC_RULES);

    limitedRules.forEach((rule, index) => {
      const urlFilter = normalizeMatchUrlToUrlFilter(rule.matchUrl);
      const redirectUrl = normalizeRedirectUrl(rule.targetUrl);
      if (!urlFilter || !redirectUrl) return; // 丢弃无效配置，避免 update 失败

      // 规则 ID 必须是 number。为了简单可维护：每次重建都用 1..n。
      const id = index + 1;

      // priority：让数组靠前的规则更“优先”
      const priority = limitedRules.length - index;

      addRules.push({
        id,
        priority,
        // redirect 动作
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
          redirect: {
            url: redirectUrl
          }
        },
        // condition：urlFilter 匹配
        condition: {
          urlFilter,
          // 限定规则作用的网络资源类型（比如图片、脚本、网页框架等）
          resourceTypes: [
            // 由 XMLHttpRequest 对象发送的请求，或通过 Fetch API 发送的请求。
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,

            // <img>等标签加载的常规图片
            chrome.declarativeNetRequest.ResourceType.IMAGE
          ]
        }
      });
    });
  }

  // 3) 单次 updateDynamicRules 完成：先 remove 再 add
  await updateDynamicRulesAsync({
    removeRuleIds,
    addRules
  });
}

/**
 * 为避免并发 applyDynamicRules 导致的竞态：用一个“串行队列”保证顺序执行。
```plaintext
初始状态：applyQueue = Promise.resolve() (已完成)

第 1 次调用 scheduleApply():
┌─────────────────────────────────┐
│ applyQueue = Promise.resolve()  │ ← 立即完成
│   .catch(...)                   │
│   .then(() => applyDynamicRules()) │ → 任务 1 开始执行
└─────────────────────────────────┘

第 2 次调用 scheduleApply() (任务 1 还在执行):
┌─────────────────────────────────┐
│ applyQueue = 任务 1 的 Promise    │
│   .catch(...)                   │
│   .then(() => applyDynamicRules()) │ → 任务 2 排队等待
└─────────────────────────────────┘

第 3 次调用 scheduleApply() (任务 1、2 都在等待/执行):
┌─────────────────────────────────┐
│ applyQueue = 任务 2 的 Promise    │
│   .catch(...)                   │
│   .then(() => applyDynamicRules()) │ → 任务 3 继续排队
└─────────────────────────────────┘

最终执行顺序：任务 1 → 任务 2 → 任务 3（严格按顺序）
```
 */
let applyQueue: Promise<void> = Promise.resolve();
function scheduleApply(): void {
  applyQueue = applyQueue
    .catch(() => {
      // 忽略队列中前一次失败，保证后续变更还能继续应用
    })
    .then(() => applyDynamicRules());
}

chrome.runtime.onInstalled.addListener(() => {
  // 扩展安装/更新完成后立刻初始化一次动态规则
  scheduleApply();
});

chrome.runtime.onStartup.addListener(() => {
  // 浏览器重启后重新同步 storage -> 动态规则
  scheduleApply();
});

chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName !== "local") return;

  // 任何 enabled/rules 变更都触发重建动态规则
  //（简化实现：不做精确 diff，直接 scheduleApply()）
  scheduleApply();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== PAGE_TO_EXTENSION_EVENT) {
    return undefined;
  }

  handleProxyForward(message.payload as SerializableProxyRequest)
    .then(sendResponse)
    .catch((error) => {
      const response = buildProxyErrorResponse(
        String(message?.payload?.url || ""),
        error instanceof Error ? error.message : "代理转发失败"
      );
      sendResponse(response);
    });

  return true;
});

// 点击扩展图标打开侧边面板
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({
      tabId: tab.id
    });
  }
});

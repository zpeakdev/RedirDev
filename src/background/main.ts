/**
 * MV3 background service worker 核心逻辑（TypeScript）
 *
 * 实现两个能力：
 * 1) 网络请求重定向（通过 declarativeNetRequest 动态规则匹配 URL）
 * 2) 代理（通过页面 API 劫持 + runtime 消息 + background fetch 转发）
 */
import {
  normalizeMatchUrlToUrlFilter,
  normalizeRedirectUrl
} from "@/utils/url.js";
import { StorageService } from "@/shared/services/storageService";
import type { RuleConfig } from "@/types/index.ts";
import type { ProxyRequestPayload, ProxyRuntimeResponse } from "@/types/proxy";

console.log("service_worker -> main.ts");

// HACK: 原型阶段给一个上限：避免用户一次保存太多导致更新失败。
const MAX_DYNAMIC_RULES = 100;

function buildProxyErrorResponse(errorMessage: string): ProxyRuntimeResponse {
  return {
    handled: true,
    error: errorMessage,
    response: {
      status: 502,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: errorMessage })
    }
  };
}

/**
 * 真正执行“后台代理转发”。
 *
 * 输入来自 content bridge 的 ProxyRequestPayload，输出统一为 ProxyRuntimeResponse。
 *
 * 流程：
 * 1) 读取当前扩展配置（是否总开关开启、规则列表）；
 * 2) 查找第一个命中的 proxy 规则；
 * 3) 用规则 targetUrl + method 组装后台 fetch；
 * 4) 把 fetch 响应标准化后回传页面；
 * 5) 出错时返回 handled=true + 502，告知页面“已处理但失败”。
 */
async function handleProxyForward(request: ProxyRequestPayload): Promise<ProxyRuntimeResponse> {
  // 全局关闭时直接放行，页面侧会回退到原生网络请求。
  const state = await StorageService.getStoredState();
  if (!state.enabled) return { handled: false };

  // 当前实现按数组顺序取第一个命中规则。
  const matchedRule = state.rules.find((rule: RuleConfig) => {
    return rule.type === "proxy" && rule.enabled && rule.matchUrl === request.url;
  });

  if (!matchedRule) {
    return { handled: false };
  }

  try {
    // 在 service worker 中发起请求，规避页面同源限制与页面环境污染。
    const res = await globalThis.fetch(matchedRule.targetUrl, {
      method: matchedRule.proxyMethod,
      headers: request.headers,
      body: request.body,
      credentials: "include"
    });

    const body = await res.text();
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });
    // payload
    // handled=true 表示“此请求确实由代理规则消费并产出结果”。
    return {
      handled: true,
      response: {
        status: res.status,
        headers,
        body
      }
    };
  } catch (error) {
    return buildProxyErrorResponse(error instanceof Error ? error.message : "代理转发失败");
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

/**
 * 接收 content bridge 发来的 runtime 消息。
 *
 * 这里只处理 type=proxy 的消息，其余消息直接忽略。
 * 返回 true 的原因：告诉 Chrome 这是异步响应，稍后会调用 sendResponse。
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("🚀 ~ message, _sender, sendResponse:", message, _sender, sendResponse)
  if (message?.type !== "proxy") {
    return undefined;
  }

  // 注意：message 实际字段来自 bridge 里 `{ type: "proxy", ...payload }` 的展开结果。
  handleProxyForward(message as ProxyRequestPayload)
    .then(sendResponse)
    .catch((error) => {
      sendResponse(buildProxyErrorResponse(error instanceof Error ? error.message : "代理转发失败"));
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

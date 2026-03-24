/**
 * MV3 background service worker 核心逻辑（TypeScript）
 *
 * 只实现两个能力：
 * 1) 网络请求拦截（通过 declarativeNetRequest 动态规则匹配 URL）
 * 2) 重定向（通过 RuleAction.type = 'redirect'）
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

import type { RuleConfig } from "./rule-normalizer.js";
import {
  normalizeMatchUrlToUrlFilter,
  normalizeRedirectUrl
} from "./rule-normalizer.js";

console.log("service_worker -> main.ts");

type StoredState = {
  enabled: boolean;
  rules: RuleConfig[];
};

const DEFAULT_STATE: StoredState = {
  enabled: false,
  rules: []
};

// 原型阶段给一个上限：避免用户一次保存太多导致更新失败。
const MAX_DYNAMIC_RULES = 100;

/**
 * storage -> 读取当前配置
 */
function getStoredState(): Promise<StoredState> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(DEFAULT_STATE, (result) => {
      const err = chrome.runtime.lastError;
      if (err) reject(err);
      else resolve(result as StoredState);
    });
  });
}

function getDynamicRules(): Promise<chrome.declarativeNetRequest.Rule[]> {
  return new Promise((resolve, reject) => {
    chrome.declarativeNetRequest.getDynamicRules((rules) => {
      const err = chrome.runtime.lastError;
      if (err) reject(err);
      else resolve(rules);
    });
  });
}

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
  const state = await getStoredState();

  // 1) 先拿到当前动态规则，准备清空
  const existing = await getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  // 2) 再生成新的 addRules（enabled=false 时为空数组）
  const addRules: chrome.declarativeNetRequest.Rule[] = [];

  if (state.enabled && Array.isArray(state.rules) && state.rules.length > 0) {
    const limitedRules = state.rules.slice(0, MAX_DYNAMIC_RULES);

    limitedRules.forEach((rule, index) => {
      const urlFilter = normalizeMatchUrlToUrlFilter(rule.matchUrl);
      const redirectUrl = normalizeRedirectUrl(rule.redirectUrl);
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
          // 原型阶段：指定常见资源类型，减少“匹配不到”的概率。
          // 注意：这里使用 chrome.declarativeNetRequest.ResourceType 枚举成员，
          // 以满足 @types/chrome 的类型约束。
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
            chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
            chrome.declarativeNetRequest.ResourceType.SCRIPT,
            chrome.declarativeNetRequest.ResourceType.STYLESHEET,
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

// 为避免并发 applyDynamicRules 导致的竞态：用一个“串行队列”保证顺序执行。
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

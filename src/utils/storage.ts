

export type RuleConfig = {
  /**
   * “匹配规则(URL)”
   * 用户输入可以是：
   * - 域名/主机名：example.com
   * - 完整 URL：https://example.com/path
   * - 带通配符：*://example.com/*
   *
   * 这里我们会把它转换为 declarativeNetRequest 的 urlFilter 。
   */
  matchUrl: string;
  /**
   * “目标地址(Redirect URL)”：要求为 http/https 的绝对 URL
   */
  redirectUrl: string;
};

type StoredState = {
  enabled: boolean;
  rules: RuleConfig[];
};

const STORAGE_DEFAULTS: StoredState = {
  enabled: false,
  rules: []
};

/**
 * 从 `chrome.storage.local` 读取并规范化当前页面状态。
 *
 * 规范化的目的：
 * - `chrome.storage.local.get` 返回值可能缺字段或类型不符合预期。
 * - 这里用最小兜底逻辑保证返回值始终是 `StoredState` 的形状。
 *
 * @returns 规范化后的存储状态
 */
export async function getStoredState(): Promise<StoredState> {
  const state = await chrome.storage.local.get(STORAGE_DEFAULTS);
  return {
    enabled: Boolean(state.enabled),
    rules: Array.isArray(state.rules) ? (state.rules as RuleConfig[]) : []
  };
}

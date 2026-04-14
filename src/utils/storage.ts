import type { StoredState } from "@/types";

/**
 * 存储的默认值
 */
const STORAGE_DEFAULTS = {
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
  const state: StoredState = await chrome.storage.local.get(STORAGE_DEFAULTS);
  return {
    enabled: Boolean(state.enabled),
    rules: Array.isArray(state.rules) ? state.rules : []
  };
}

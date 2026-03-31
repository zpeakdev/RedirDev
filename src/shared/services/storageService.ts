import type { RuleConfig, StoredState } from "@/types/index.ts";


/**
 * chrome.storage 服务类
 */
export class StorageService {
  /**
 * 存储的默认值
 */
  private static readonly STORAGE_DEFAULTS = {
    enabled: false,
    rules: []
  };

  /**
   * 从 `chrome.storage.local` 读取并规范化当前页面状态
   */
  static async getStoredState(): Promise<StoredState> {
    const state = await chrome.storage.local.get(this.STORAGE_DEFAULTS);
    return {
      enabled: Boolean(state.enabled),
      rules: Array.isArray(state.rules) ? (state.rules as RuleConfig[]) : []
    };
  }

  /**
   * 设置存储的状态
   */
  static async setStoredState(state: Partial<StoredState>): Promise<void> {
    return chrome.storage.local.set(state);
  }
}

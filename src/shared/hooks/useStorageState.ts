import { useCallback, useEffect, useState } from "react";
import { message } from "antd";
import { getErrorMessage } from "@/utils/index.ts";
import type { RuleConfig, StoredState } from "@/types/index.ts";
import { StorageService } from "@/shared/services/storageService.ts";

interface UseStorageStateReturn extends StoredState {
  reloadState: () => Promise<void>;
}

/**
 * 存储状态钩子
 */
export function useStorageState(): UseStorageStateReturn {
  const [enabled, setEnabled] = useState(false);
  const [rules, setRules] = useState<RuleConfig[]>([]);

  const loadStorageState = useCallback(async () => {
    try {
      const state: StoredState = await StorageService.getStoredState();
      setEnabled(state.enabled);
      setRules(state.rules);
    } catch (error) {
      message.error(`加载失败：${getErrorMessage(error)}`);
    }
  }, []);

  useEffect(() => {
    loadStorageState();

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local") return;
      if (changes.enabled || changes.rules) {
        loadStorageState();
      }
    };

    // 监听存储变化
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [loadStorageState]);

  return {
    enabled,
    rules,
    reloadState: loadStorageState
  };
}

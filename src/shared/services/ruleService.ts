import type { RuleConfig } from "@/types/index.ts";
import { StorageService } from "./storageService";

/**
 * 规则服务类
 */
export class RuleService {

  /**
   * 添加规则
   */
  static async addRule(rule: Omit<RuleConfig, "id">): Promise<RuleConfig> {
    const state = await StorageService.getStoredState();
    const newRule: RuleConfig = {
      id: new Date().getTime().toString(26),
      ...rule
    };
    const updatedRules = [...state.rules, newRule];
    await StorageService.setStoredState({ rules: updatedRules });
    return newRule;
  }

  /**
   * 更新规则
   */
  static async updateRule(rule: RuleConfig): Promise<void> {
    const state = await StorageService.getStoredState();
    const updatedRules = state.rules.map((r) => (r.id === rule.id ? rule : r));
    await StorageService.setStoredState({ rules: updatedRules });
  }

  /**
   * 删除规则
   */
  static async deleteRule(id: string): Promise<void> {
    const state = await StorageService.getStoredState();
    const updatedRules = state.rules.filter((rule) => rule.id !== id);
    await StorageService.setStoredState({ rules: updatedRules });
  }

  /**
   * 切换规则启用状态
   */
  static async toggleRuleEnabled(id: string, enabled: boolean): Promise<void> {
    const state = await StorageService.getStoredState();
    const updatedRules = state.rules.map((r) =>
      r.id === id ? { ...r, enabled } : r
    );
    await StorageService.setStoredState({ rules: updatedRules });
  }
}

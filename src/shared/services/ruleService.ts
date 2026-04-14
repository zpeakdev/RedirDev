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
      matchUrl: rule.matchUrl,
      targetUrl: rule.targetUrl,
      type: rule.type || "redirect",
      enabled: rule.enabled ?? true
    };
    const updatedRules = [...state.rules, newRule];
    await StorageService.setStoredState({ rules: updatedRules });
    return newRule;
  }

  /**
   * 更新单个规则
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

  /**
   * 获取所有规则
   */
  static async getAllRules(): Promise<RuleConfig[]> {
    const state = await StorageService.getStoredState();
    return state.rules;
  }

  /**
   * 根据ID获取规则
   */
  static async getRuleById(id: string): Promise<RuleConfig | undefined> {
    const state = await StorageService.getStoredState();
    return state.rules.find(rule => rule.id === id);
  }

  /**
   * 从文件导入规则
   * @returns 成功导入的规则数量，失败返回 null
   */
  static async importRulesFromFile(): Promise<RuleConfig[] | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async (e) => {
        const target = e.target as HTMLInputElement;
        if (!target.files || !target.files[0]) {
          resolve(null);
          return;
        }

        const file = target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const content = event.target?.result as string;
            const importedRules = JSON.parse(content);
            if (!Array.isArray(importedRules)) {
              resolve(null);
              return;
            }
            const result: RuleConfig[] = [];
            for (const raw of importedRules) {
              const normalizedType = raw.type === "proxy" ? "proxy" : "redirect";
              const normalizedRule = {
                matchUrl: String(raw.matchUrl || ""),
                targetUrl: String(raw.targetUrl || ""),
                type: normalizedType as RuleConfig["type"],
                enabled: raw.enabled !== false,
              };
              result.push(await RuleService.addRule(normalizedRule));
            }
            resolve(result);
          } catch {
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      };
      input.click();
    });
  }

  /**
   * 导出规则为 JSON 文件下载
   */
  static exportRulesToFile(rules: RuleConfig[]): void {
    const dataStr = JSON.stringify(rules, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `redirect-rules-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

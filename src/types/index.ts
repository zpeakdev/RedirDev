export type RuleType = "redirect" | "proxy";

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
   * “目标地址(Redirect / Proxy URL)”：要求为 http/https 的绝对 URL
   */
  targetUrl: string;

  id: string;

  enabled: boolean;
  type: RuleType;
};

export interface StoredState {
  enabled: boolean;
  rules: RuleConfig[];
}

export type RuleType = "redirect" | "proxy";

export const PROXY_METHOD_OPTIONS = [
  { label: "GET", value: "GET" },
  { label: "POST", value: "POST" },
  { label: "PUT", value: "PUT" },
  { label: "PATCH", value: "PATCH" },
  { label: "DELETE", value: "DELETE" },
  { label: "HEAD", value: "HEAD" },
  { label: "OPTIONS", value: "OPTIONS" }
];

export type ProxyMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

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

  /**
   * 代理模式下转发时实际使用的请求方法。
   * redirect 规则不使用该字段。
   */
  proxyMethod?: ProxyMethod;

  id: string;

  enabled: boolean;
  type: RuleType;
};

export interface StoredState {
  enabled: boolean;
  rules: RuleConfig[];
}

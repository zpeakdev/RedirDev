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

/**
 * 将用户输入转换为 urlFilter
 *
 * urlFilter 语义更像“子串匹配 + 支持通配符”，所以我们做了一个温和的扩展：
 * - 如果用户自己提供了 '*'，就当作最终 urlFilter 使用
 * - 否则：
 *   - 如果输入是 http(s)://...，则生成 *<输入>*（子串匹配）
 *   - 如果输入不是完整 URL，则认为是主机/路径片段，生成 *://<输入>*（匹配所有协议）
 */
export function normalizeMatchUrlToUrlFilter(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;

  // 用户已经明确了通配符模式
  if (s.includes("*")) return s;

  // 完整 URL（无通配符）：做子串匹配
  if (/^https?:\/\//i.test(s)) return `*${s}*`;

  // 简写（域名/路径片段）：假设需要匹配所有 http/https
  return `*://${s}*`;
}

/**
 * 基本校验重定向 URL（原型阶段只支持 http/https）
 * - declarativeNetRequest 不允许 javascript: 这类 scheme
 * - 也不支持相对 URL（所以要求绝对 URL）
 */
export function normalizeRedirectUrl(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;
  if (/^javascript:/i.test(s)) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

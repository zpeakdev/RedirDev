/**
 * 将用户输入的匹配 URL 字符串规范化为 Chrome 声明式网络请求（Declarative Net Request）
 * API 所需的 URL 过滤器格式（即支持通配符 `*` 的字符串）。
 *
 * 规则如下：
 * - 如果输入为空或仅包含空白字符，返回 `null`。
 * - 如果输入中已包含通配符 `*`，则原样返回（假定用户已手动指定完整模式）。
 * - 如果输入以 `http://` 或 `https://` 开头，则在开头和结尾各添加一个 `*`，
 *   例如：`https://example.com` → `*https://example.com*`。
 * - 否则，将其视为主机名，并转换为 `*://<input>*` 格式，
 *   例如：`example.com` → `*://example.com*`。
 *
 * @param input - 用户提供的原始匹配 URL 字符串。
 * @returns 规范化后的 URL 过滤器字符串，若输入无效则返回 `null`。
 *
 * @example
 * normalizeMatchUrlToUrlFilter("example.com")        // "*://example.com*"
 * normalizeMatchUrlToUrlFilter("https://api.example.com") // "*https://api.example.com*"
 * normalizeMatchUrlToUrlFilter("*.example.com/*")    // "*.example.com/*" (unchanged)
 * normalizeMatchUrlToUrlFilter("")                   // null
 */
export function normalizeMatchUrlToUrlFilter(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;

  if (s.includes("*")) return s;

  if (/^https?:\/\//i.test(s)) return `*${s}*`;
  return `*://${s}*`;
}


/**
 * 对用户输入的重定向目标 URL 进行规范化和安全校验。
 *
 * 该函数用于确保重定向 URL 符合扩展的安全要求，仅允许以 `http://` 或 `https://`
 * 开头的有效 URL。以下情况将被视为无效并返回 `null`：
 * - 输入为空、仅包含空白字符；
 * - URL 使用了不安全的协议（如 `javascript:`）；
 * - URL 协议不是 `http` 或 `https`（例如 `ftp://`、`data:`、相对路径等）。
 *
 * @param input - 用户提供的原始重定向 URL 字符串。
 * @returns 经过校验和修剪后的有效 URL 字符串，若不符合安全规范则返回 `null`。
 *
 * @example
 * normalizeRedirectUrl("https://example.com/page") // "https://example.com/page"
 * normalizeRedirectUrl("  https://example.com  ")  // "https://example.com"
 * normalizeRedirectUrl("javascript:alert(1)")      // null
 * normalizeRedirectUrl("ftp://files.example.com")  // null
 * normalizeRedirectUrl("")                         // null
 * normalizeRedirectUrl("/relative/path")           // null
 */
export function normalizeRedirectUrl(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;
  if (/^javascript:/i.test(s)) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

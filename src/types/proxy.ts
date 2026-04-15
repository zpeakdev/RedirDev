/**
 * 页面代理链路中的消息协议定义。
 *
 * 这套类型会同时被三个上下文复用：
 * 1) pageProxy.ts（页面上下文）：拦截 fetch/xhr 后发起请求；
 * 2) bridge.ts（content script 上下文）：转发页面消息到 extension runtime；
 * 3) background/main.ts（service worker 上下文）：真正执行代理转发并返回结果。
 *
 * 目标是让三层对“请求/响应格式”保持一致，避免字段漂移导致的运行时错误。
 */
export const PAGE_TO_EXTENSION_EVENT = "REDIRDEV_PAGE_PROXY_REQUEST";
export const EXTENSION_TO_PAGE_EVENT = "REDIRDEV_PAGE_PROXY_RESPONSE";

/**
 * 页面发给扩展的代理请求载荷。
 *
 * 注意：
 * - 这里是“已经序列化后的平面数据”，避免传递不可克隆对象（如 Headers 实例）；
 * - body 使用 string|null，保证可通过 postMessage/runtime message 传输。
 */
export type ProxyRequestPayload = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
};

/**
 * background 成功拿到上游响应后，回传给页面的标准化结果。
 */
type ProxySuccessResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

/**
 * runtime 层统一响应模型。
 *
 * handled 语义：
 * - true: 已命中代理规则并处理过（即使处理失败，也会附带 error/502 body）；
 * - false: 未命中代理或发生链路异常，页面侧应回退到原生请求路径。
 */
export type ProxyRuntimeResponse = {
  handled: boolean;
  response?: ProxySuccessResponse;
  error?: string;
};


/**
 * content script 回给页面的“响应消息外壳”。
 * requestId 用来一一对应请求，避免并发请求串包。
 */
export type PageProxyResponseMessage = {
  type: typeof EXTENSION_TO_PAGE_EVENT;
  requestId: string;
  response: ProxyRuntimeResponse;
};

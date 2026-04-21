/**
 *  world: "ISOLATED"
 *  - 'ISOLATED'（默认）：内容脚本在隔离环境中运行
 *  - 隔离世界的桥接脚本
 *  - 负责中转 MAIN 世界和 background 的消息
 */

import { ProxyMessageType } from "@/types/proxy";
import { StorageService } from "@/shared/services/storageService";



/**
 * 监听MAIN世界发过来的消息
 */
window.addEventListener("message", (event: MessageEvent<{
  type: ProxyMessageType.STORAGE_STATE_REQUEST;
}>) => {
  // 只处理当前页面自身发出的消息，忽略 iframe/其他窗口来源。
  if (event.source !== window) return;
  const data = event.data;

  // 处理本地存储状态请求
  if (data?.type === ProxyMessageType.STORAGE_STATE_REQUEST) {
    StorageService.getStoredState().then((state) => {
      window.postMessage({
        type: ProxyMessageType.STORAGE_STATE_RESPONSE,
        state,
        msg: "隔离脚本响应本地存储数据到页面脚本"
      }, "*");
    });
  }
});

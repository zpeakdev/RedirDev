const PAGE_TO_EXTENSION_EVENT = "REDIRDEV_PAGE_PROXY_REQUEST";
const EXTENSION_TO_PAGE_EVENT = "REDIRDEV_PAGE_PROXY_RESPONSE";

type ProxyBridgeRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  transport: "fetch" | "xhr";
};

type ProxyBridgeResponse = {
  handled: boolean;
  response?: {
    url: string;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
  };
  error?: string;
};

type PageProxyMessage = {
  type: typeof PAGE_TO_EXTENSION_EVENT;
  requestId: string;
  payload: ProxyBridgeRequest;
};

type PageProxyResponseMessage = {
  type: typeof EXTENSION_TO_PAGE_EVENT;
  requestId: string;
  response: ProxyBridgeResponse;
};

window.addEventListener("message", (event: MessageEvent<PageProxyMessage>) => {
  if (event.source !== window) return;

  const data = event.data;
  if (!data || data.type !== PAGE_TO_EXTENSION_EVENT) return;

  chrome.runtime.sendMessage(
    {
      type: PAGE_TO_EXTENSION_EVENT,
      payload: data.payload
    },
    (response: ProxyBridgeResponse | undefined) => {
      const safeResponse: ProxyBridgeResponse = chrome.runtime.lastError
        ? {
          handled: false,
          error: chrome.runtime.lastError.message
        }
        : (response ?? { handled: false });

      const pageResponse: PageProxyResponseMessage = {
        type: EXTENSION_TO_PAGE_EVENT,
        requestId: data.requestId,
        response: safeResponse
      };

      window.postMessage(pageResponse, "*");
    }
  );
});

export { };

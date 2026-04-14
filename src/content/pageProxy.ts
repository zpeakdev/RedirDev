const PAGE_TO_EXTENSION_EVENT = "REDIRDEV_PAGE_PROXY_REQUEST";
const EXTENSION_TO_PAGE_EVENT = "REDIRDEV_PAGE_PROXY_RESPONSE";

type ProxyRuntimeResponse = {
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

type ProxyRequestPayload = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  transport: "fetch" | "xhr";
};

type PageProxyResponseMessage = {
  type: typeof EXTENSION_TO_PAGE_EVENT;
  requestId: string;
  response: ProxyRuntimeResponse;
};

type ProxyXhrMeta = {
  method: string;
  url: string;
  body: string | null;
  headers: Record<string, string>;
};

type ProxyAwareXhr = XMLHttpRequest & {
  __redirdevProxyMeta?: ProxyXhrMeta;
};

declare global {
  interface Window {
    __REDIRDEV_PROXY_INSTALLED__?: boolean;
  }
}

if (!window.__REDIRDEV_PROXY_INSTALLED__) {
  window.__REDIRDEV_PROXY_INSTALLED__ = true;

  const originalFetch = window.fetch.bind(window);
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  function isBodyAllowed(method: string): boolean {
    return method !== "GET" && method !== "HEAD";
  }

  function buildRequestId(): string {
    return `redirdev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> {
    const result: Record<string, string> = {};
    if (!headers) return result;

    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }

    if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        result[String(key)] = String(value);
      });
      return result;
    }

    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined) {
        result[key] = String(value);
      }
    });

    return result;
  }

  function bodyToText(body: XMLHttpRequestBodyInit | Document | null): string | null {
    if (body == null) return null;
    if (typeof body === "string") return body;
    if (body instanceof URLSearchParams) return body.toString();

    if (body instanceof FormData) {
      const data: Record<string, string | string[]> = {};
      body.forEach((value, key) => {
        const normalizedValue = typeof value === "string" ? value : value.name;
        const existing = data[key];
        if (existing === undefined) {
          data[key] = normalizedValue;
        } else if (Array.isArray(existing)) {
          existing.push(normalizedValue);
        } else {
          data[key] = [existing, normalizedValue];
        }
      });
      return JSON.stringify(data);
    }

    return String(body);
  }

  function toResponseHeaders(headers: Record<string, string>): Headers {
    const responseHeaders = new Headers();
    Object.entries(headers).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });
    return responseHeaders;
  }

  function parseXhrResponseBody(
    xhr: XMLHttpRequest,
    bodyText: string,
    headers: Record<string, string>
  ): unknown {
    if (xhr.responseType === "json") {
      try {
        return bodyText ? JSON.parse(bodyText) : null;
      } catch {
        return null;
      }
    }

    const contentType = headers["content-type"] ?? headers["Content-Type"] ?? "";
    if (contentType.includes("application/json")) {
      try {
        return bodyText ? JSON.parse(bodyText) : null;
      } catch {
        return bodyText;
      }
    }

    return bodyText;
  }

  function sendProxyRequest(payload: ProxyRequestPayload): Promise<ProxyRuntimeResponse> {
    const requestId = buildRequestId();

    return new Promise((resolve) => {
      let settled = false;

      const cleanup = () => {
        window.removeEventListener("message", handleMessage);
        window.clearTimeout(timeoutId);
      };

      const finish = (result: ProxyRuntimeResponse) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      const handleMessage = (event: MessageEvent<PageProxyResponseMessage>) => {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.type !== EXTENSION_TO_PAGE_EVENT || data.requestId !== requestId) {
          return;
        }
        finish(data.response ?? { handled: false });
      };

      const timeoutId = window.setTimeout(() => {
        finish({ handled: false, error: "proxy timeout" });
      }, 15000);

      window.addEventListener("message", handleMessage);
      window.postMessage(
        {
          type: PAGE_TO_EXTENSION_EVENT,
          requestId,
          payload
        },
        "*"
      );
    });
  }

  async function buildFetchPayload(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<ProxyRequestPayload> {
    const request = new Request(input, init);
    const method = (request.method || "GET").toUpperCase();

    return {
      transport: "fetch",
      url: request.url,
      method,
      headers: normalizeHeaders(request.headers),
      body: isBodyAllowed(method)
        ? await request.clone().text().catch(() => null)
        : null
    };
  }

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const proxyResult = await sendProxyRequest(await buildFetchPayload(input, init));
    if (!proxyResult.handled || !proxyResult.response) {
      return originalFetch(input, init);
    }

    return new Response(proxyResult.response.body || "", {
      status: proxyResult.response.status,
      statusText: proxyResult.response.statusText,
      headers: toResponseHeaders(proxyResult.response.headers || {})
    });
  };

  XMLHttpRequest.prototype.open = function (
    this: ProxyAwareXhr,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ): void {
    this.__redirdevProxyMeta = {
      method: String(method || "GET").toUpperCase(),
      url: new URL(String(url), window.location.href).href,
      body: null,
      headers: {}
    };

    originalOpen.call(this, method, url, async ?? true, username, password);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (
    this: ProxyAwareXhr,
    header: string,
    value: string
  ): void {
    if (this.__redirdevProxyMeta) {
      this.__redirdevProxyMeta.headers[String(header)] = String(value);
    }

    originalSetRequestHeader.call(this, header, value);
  };

  XMLHttpRequest.prototype.send = function (
    this: ProxyAwareXhr,
    body?: XMLHttpRequestBodyInit | Document | null
  ): void {
    const meta = this.__redirdevProxyMeta;
    if (!meta) {
      originalSend.call(this, body);
      return;
    }

    meta.body = bodyToText(body ?? null);

    sendProxyRequest({
      transport: "xhr",
      url: meta.url,
      method: meta.method,
      headers: meta.headers,
      body: isBodyAllowed(meta.method) ? meta.body : null
    })
      .then((proxyResult) => {
        if (!proxyResult.handled || !proxyResult.response) {
          originalSend.call(this, body);
          return;
        }

        const response = proxyResult.response;
        const bodyText = response.body || "";
        const headers = response.headers || {};
        const responseValue = parseXhrResponseBody(this, bodyText, headers);

        Object.defineProperty(this, "readyState", {
          configurable: true,
          value: 4
        });
        Object.defineProperty(this, "status", {
          configurable: true,
          value: response.status
        });
        Object.defineProperty(this, "statusText", {
          configurable: true,
          value: response.statusText
        });
        Object.defineProperty(this, "responseURL", {
          configurable: true,
          value: response.url
        });
        Object.defineProperty(this, "responseText", {
          configurable: true,
          get() {
            return bodyText;
          }
        });
        Object.defineProperty(this, "response", {
          configurable: true,
          get() {
            return responseValue;
          }
        });

        this.getResponseHeader = (name: string): string | null => {
          const lowerName = String(name).toLowerCase();
          const matchedKey = Object.keys(headers).find(
            (key) => key.toLowerCase() === lowerName
          );
          return matchedKey ? headers[matchedKey] : null;
        };

        this.getAllResponseHeaders = (): string =>
          Object.entries(headers)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\r\n");

        this.dispatchEvent(new Event("readystatechange"));
        this.dispatchEvent(new ProgressEvent("load"));
        this.dispatchEvent(new ProgressEvent("loadend"));

        this.onreadystatechange?.(new Event("readystatechange"));
        this.onload?.(new ProgressEvent("load"));
        this.onloadend?.(new ProgressEvent("loadend"));
      })
      .catch(() => {
        originalSend.call(this, body);
      });
  };
}

export { };

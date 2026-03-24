import { describe, expect, it } from "vitest";
import {
  normalizeMatchUrlToUrlFilter,
  normalizeRedirectUrl
} from "../src/background/rule-normalizer.js";

describe("normalizeMatchUrlToUrlFilter", () => {
  it("保留用户提供的通配符模式", () => {
    expect(normalizeMatchUrlToUrlFilter("*://example.com/*")).toBe(
      "*://example.com/*"
    );
  });

  it("完整 URL 会转为子串匹配", () => {
    expect(normalizeMatchUrlToUrlFilter("https://a.com/path")).toBe(
      "*https://a.com/path*"
    );
  });

  it("域名片段会补齐协议通配", () => {
    expect(normalizeMatchUrlToUrlFilter("example.com")).toBe(
      "*://example.com*"
    );
  });
});

describe("normalizeRedirectUrl", () => {
  it("允许 http/https 绝对 URL", () => {
    expect(normalizeRedirectUrl("https://target.com")).toBe(
      "https://target.com"
    );
    expect(normalizeRedirectUrl("http://target.com")).toBe("http://target.com");
  });

  it("拒绝 javascript: 与相对路径", () => {
    expect(normalizeRedirectUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeRedirectUrl("/local/path")).toBeNull();
  });
});

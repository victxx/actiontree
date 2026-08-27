import { describe, expect, it } from "vitest";
import { DEMO_MANIFEST, isSafeActionUrl, parseManifest } from "../src";

describe("action manifest", () => {
  it("accepts the demo manifest", () => {
    expect(parseManifest(DEMO_MANIFEST).actions).toHaveLength(3);
  });

  it("rejects non-https and credentialed action urls", () => {
    expect(isSafeActionUrl("https://example.com/action")).toBe(true);
    expect(isSafeActionUrl("http://example.com/action")).toBe(false);
    expect(isSafeActionUrl("https://user:pass@example.com")).toBe(false);
    expect(isSafeActionUrl("https://localhost/action")).toBe(false);
    expect(isSafeActionUrl("https://192.168.1.2/action")).toBe(false);
  });
});

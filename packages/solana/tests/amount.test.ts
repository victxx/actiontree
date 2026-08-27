import { describe, expect, it } from "vitest";
import { parseSolAmount, USDC_MINTS } from "../src";

describe("Solana action primitives", () => {
  it("parses bounded SOL amounts", () => {
    expect(parseSolAmount("0.05")).toBe(0.05);
    expect(() => parseSolAmount("101")).toThrow();
  });

  it("keeps official USDC mints network-specific", () => {
    expect(USDC_MINTS.devnet).not.toBe(USDC_MINTS.mainnet);
  });
});

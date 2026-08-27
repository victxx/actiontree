import { describe, expect, it } from "vitest";
import { isEthereumAddress } from "../src";

describe("ENS lookup input", () => {
  it("accepts Ethereum addresses and rejects Solana-style addresses", () => {
    expect(
      isEthereumAddress("0x0000000000000000000000000000000000000000"),
    ).toBe(true);
    expect(
      isEthereumAddress("5ezhtDbeSNxr3dpMWLXkfGWkHVXgpuMA7b6XnUKdJuUu"),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { parseTransactionError } from "../app/lib/errors";

describe("transaction errors", () => {
  it("explains an unfunded account error in plain language", () => {
    expect(
      parseTransactionError(new Error("Solana error #7050003"), "mainnet")
    ).toBe(
      "This wallet has no SOL on mainnet. Add SOL for the transfer and network fee, or switch networks."
    );
  });

  it("explains a blocked RPC response in plain language", () => {
    expect(
      parseTransactionError(
        new Error("Solana error #8100002; statusCode=403"),
        "mainnet"
      )
    ).toBe(
      "The Solana RPC rejected the request. Actiontree now routes mainnet payments through its server; refresh the page and try again."
    );
  });
});

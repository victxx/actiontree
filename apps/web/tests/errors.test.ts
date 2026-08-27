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

  it("explains a blocked websocket confirmation in plain language", () => {
    expect(
      parseTransactionError(
        new Error(
          "Solana error #8190004; Decode this error by running `npx @solana/errors decode -- 8190004 'X19jb2RlPTgxOTAwMDQmZXJyb3JFdmVudD0lNUJvYmplY3QlMjBFdmVudCU1RA=='`"
        ),
        "mainnet"
      )
    ).toBe(
      "The transaction could not be confirmed because Solana's live connection was blocked. Refresh and check the explorer before sending again."
    );
  });

  it("explains a custom program insufficient-funds error in plain language", () => {
    expect(
      parseTransactionError(
        new Error(
          "Solana error #4615026; Decode this error by running `npx @solana/errors decode -- 4615026 'X19jb2RlPTQ2MTUwMjYmY29kZT0xJmluZGV4PTI='`"
        ),
        "mainnet"
      )
    ).toBe(
      "This wallet does not have enough SOL or tokens on mainnet for this action. Lower the amount, add funds, or switch networks."
    );
  });
});

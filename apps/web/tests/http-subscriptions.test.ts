import { address, lamports } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { createHttpPollingSubscriptions } from "../app/lib/http-subscriptions";

const SIGNATURE = "1".repeat(88) as never;
const ACCOUNT = address("11111111111111111111111111111111");

describe("http polling subscriptions", () => {
  it("exposes signature, slot, and account pollers", () => {
    const rpc = {
      getSignatureStatuses: () => ({
        send: async () => ({ value: [null] }),
      }),
      getSlot: () => ({
        send: async () => 1n,
      }),
      getAccountInfo: () => ({
        send: async () => ({
          context: { slot: 1n },
          value: { lamports: lamports(0n) },
        }),
      }),
    };

    const subscriptions = createHttpPollingSubscriptions(rpc);

    expect(
      typeof subscriptions.signatureNotifications(SIGNATURE).subscribe
    ).toBe("function");
    expect(typeof subscriptions.slotNotifications().subscribe).toBe("function");
    expect(typeof subscriptions.accountNotifications(ACCOUNT).subscribe).toBe(
      "function"
    );
  });

  it("confirms a signature over HTTP instead of a websocket", async () => {
    const rpc = {
      getSignatureStatuses: () => ({
        send: async () => ({
          value: [{ confirmationStatus: "confirmed" as const, err: null }],
        }),
      }),
      getSlot: () => ({
        send: async () => 1n,
      }),
      getAccountInfo: () => ({
        send: async () => ({
          context: { slot: 1n },
          value: { lamports: lamports(0n) },
        }),
      }),
    };

    const abort = new AbortController();
    const notifications = createHttpPollingSubscriptions(
      rpc
    ).signatureNotifications(SIGNATURE, { commitment: "confirmed" });

    const updates = [];
    for await (const update of notifications.subscribe({
      abortSignal: abort.signal,
    })) {
      updates.push(update);
    }

    expect(updates).toEqual([{ value: { err: null } }]);
  });
});

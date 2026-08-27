import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppClient } from "../app/lib/solana-client";

describe("createAppClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not open a websocket when creating a mainnet client", () => {
    const WebSocketSpy = vi.fn();
    vi.stubGlobal("WebSocket", WebSocketSpy);

    const client = createAppClient("mainnet", {
      rpcUrl: "http://127.0.0.1:9/api/solana-rpc",
    });

    expect(client.rpcSubscriptions.signatureNotifications).toBeTypeOf(
      "function"
    );
    expect(client.rpcSubscriptions.accountNotifications).toBeTypeOf("function");
    expect(
      client.rpcSubscriptions.signatureNotifications("1".repeat(88) as never)
    ).not.toHaveProperty("reactiveStore");
    expect(client.sendTransaction).toBeTypeOf("function");
    expect(WebSocketSpy).not.toHaveBeenCalled();
  });
});

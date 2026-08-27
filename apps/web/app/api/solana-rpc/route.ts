import { SOLANA_RPC_URLS } from "@actiontree/solana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_METHODS = new Set([
  "getAccountInfo",
  "getBalance",
  "getEpochInfo",
  "getFeeForMessage",
  "getLatestBlockhash",
  "getMinimumBalanceForRentExemption",
  "getMultipleAccounts",
  "getRecentPrioritizationFees",
  "getSignatureStatuses",
  "getSlot",
  "getTokenAccountBalance",
  "sendTransaction",
  "simulateTransaction",
]);

type JsonRpcRequest = {
  method?: unknown;
};

function hasAllowedMethod(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const { method } = value as JsonRpcRequest;
  return typeof method === "string" && ALLOWED_METHODS.has(method);
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 1_000_000) {
      return Response.json(
        { message: "RPC request is too large." },
        { status: 413 }
      );
    }

    const payload = JSON.parse(body) as unknown;
    const calls = Array.isArray(payload) ? payload : [payload];
    if (calls.length === 0 || !calls.every(hasAllowedMethod)) {
      return Response.json(
        { message: "RPC method is not allowed." },
        { status: 403 }
      );
    }

    const upstream = await fetch(
      process.env.SOLANA_RPC_URL ||
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
        SOLANA_RPC_URLS.mainnet,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      }
    );

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "cache-control": "no-store",
        "content-type":
          upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to reach the Solana RPC.",
      },
      { status: 502 }
    );
  }
}

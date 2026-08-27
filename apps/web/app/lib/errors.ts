export function parseTransactionError(err: unknown, cluster?: string): string {
  if (err instanceof Error && err.message.includes("User rejected")) {
    return "Transaction was rejected by the wallet.";
  }

  const message = getDeepestMessage(err);
  if (
    message.includes("7050003") ||
    message.includes(
      "Attempt to debit an account but found no record of a prior credit"
    )
  ) {
    return `This wallet has no SOL on ${cluster ?? "the selected network"}. Add SOL for the transfer and network fee, or switch networks.`;
  }
  if (
    message.includes("8100002") ||
    message.includes("statusCode=403") ||
    message.includes("statusCode%3D403")
  ) {
    return "The Solana RPC rejected the request. Actiontree now routes mainnet payments through its server; refresh the page and try again.";
  }
  return message.length > 200 ? `${message.slice(0, 200)}...` : message;
}

function getDeepestMessage(err: unknown): string {
  let deepest = err instanceof Error ? err.message : String(err);
  let current: unknown = err;

  while (current instanceof Error && current.cause) {
    current = current.cause;
    if (current instanceof Error) {
      deepest = current.message;
    }
  }

  return deepest;
}

export function parseTransactionError(err: unknown, cluster?: string): string {
  if (err instanceof Error && err.message.includes("User rejected")) {
    return "Transaction was rejected by the wallet.";
  }

  const messages = collectErrorMessages(err);
  const combined = messages.join("\n");
  const network = cluster ?? "the selected network";

  if (
    combined.includes("7050003") ||
    combined.includes(
      "Attempt to debit an account but found no record of a prior credit"
    )
  ) {
    return `This wallet has no SOL on ${network}. Add SOL for the transfer and network fee, or switch networks.`;
  }
  if (
    combined.includes("8100002") ||
    combined.includes("statusCode=403") ||
    combined.includes("statusCode%3D403")
  ) {
    return "The Solana RPC rejected the request. Actiontree now routes mainnet payments through its server; refresh the page and try again.";
  }
  if (isInsufficientFundsError(combined)) {
    return `This wallet does not have enough SOL or tokens on ${network} for this action. Lower the amount, add funds, or switch networks.`;
  }
  if (
    combined.includes("8190004") ||
    combined.includes("8190003") ||
    combined.includes("WebSocket failed to connect")
  ) {
    return "The transaction could not be confirmed because Solana's live connection was blocked. Refresh and check the explorer before sending again.";
  }

  const message = messages[messages.length - 1] ?? String(err);
  return message.length > 200 ? `${message.slice(0, 200)}...` : message;
}

function isInsufficientFundsError(message: string) {
  return (
    message.includes("4615026") ||
    message.includes("custom program error: 0x1") ||
    message.includes("custom program error: #1") ||
    /insufficient funds/i.test(message)
  );
}

function collectErrorMessages(err: unknown): string[] {
  const messages: string[] = [];
  let current: unknown = err;

  while (current instanceof Error) {
    messages.push(current.message);
    current = current.cause;
  }

  if (messages.length === 0) {
    messages.push(String(err));
  }

  return messages;
}

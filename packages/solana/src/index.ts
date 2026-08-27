import {
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  sol,
  solToLamports,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";

export type ActiontreeCluster = "devnet" | "mainnet";

export const SOLANA_RPC_URLS: Record<ActiontreeCluster, string> = {
  devnet: "https://api.devnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
};

export const USDC_MINTS: Record<ActiontreeCluster, string> = {
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

export type BuildSolTransferActionInput = {
  account: string;
  destination: string;
  amount: number;
  rpcUrl?: string;
};

export async function buildSolTransferAction({
  account,
  destination,
  amount,
  rpcUrl = SOLANA_RPC_URLS.mainnet,
}: BuildSolTransferActionInput) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100) {
    throw new Error("Amount must be between 0 and 100 SOL");
  }

  const feePayer = address(account);
  const recipient = address(destination);
  const rpc = createSolanaRpc(rpcUrl);
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const transferInstruction = getTransferSolInstruction({
    source: createNoopSigner(feePayer),
    destination: recipient,
    amount: solToLamports(sol(String(amount))),
  });

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (current) => setTransactionMessageFeePayer(feePayer, current),
    (current) =>
      setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, current),
    (current) =>
      appendTransactionMessageInstruction(transferInstruction, current),
  );

  return getBase64EncodedWireTransaction(compileTransaction(message));
}

export function parseSolAmount(value: string | null, fallback = 0.05) {
  if (value === null || value.trim() === "") return fallback;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100) {
    throw new Error("Choose an amount between 0 and 100 SOL");
  }
  return amount;
}

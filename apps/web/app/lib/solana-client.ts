import { createClient, extendClient, MicroLamports } from "@solana/kit";
import { walletSigner } from "@solana/kit-plugin-wallet";
import {
  solanaRpc,
  rpcAirdrop,
  rpcTransactionPlanExecutor,
} from "@solana/kit-plugin-rpc";
import { tokenProgram } from "@solana-program/token";
import { memoProgram } from "@solana-program/memo";
import { systemProgram } from "@solana-program/system";
import { createHttpPollingSubscriptions } from "./http-subscriptions";

export type ClusterMoniker = "devnet" | "testnet" | "mainnet" | "localnet";

export const CLUSTERS: ClusterMoniker[] = [
  "devnet",
  "testnet",
  "mainnet",
  "localnet",
];

const CLUSTER_URLS: Record<ClusterMoniker, string> = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
  localnet: "http://localhost:8899",
};

const WS_URLS: Record<ClusterMoniker, string> = {
  devnet: "wss://api.devnet.solana.com",
  testnet: "wss://api.testnet.solana.com",
  mainnet: "wss://api.mainnet-beta.solana.com",
  localnet: "ws://localhost:8900",
};

const WALLET_CHAINS: Record<ClusterMoniker, `solana:${string}`> = {
  devnet: "solana:devnet",
  testnet: "solana:testnet",
  mainnet: "solana:mainnet",
  // Wallets do not advertise a localnet chain. Sign against devnet so wallets
  // stay discoverable while the RPC below targets the local validator.
  localnet: "solana:devnet",
};

export function getClusterUrl(cluster: ClusterMoniker) {
  return CLUSTER_URLS[cluster];
}

export function getWalletChain(cluster: ClusterMoniker) {
  return WALLET_CHAINS[cluster];
}

export type RpcUrlOverrides = {
  rpcUrl: string;
  rpcSubscriptionsUrl?: string;
};

function overlayHttpSubscriptions<T extends object>(
  original: T,
  pollers: ReturnType<typeof createHttpPollingSubscriptions>
): T {
  return new Proxy(original, {
    get(target, prop, receiver) {
      if (prop === "signatureNotifications") {
        return pollers.signatureNotifications;
      }
      if (prop === "slotNotifications") {
        return pollers.slotNotifications;
      }
      if (prop === "accountNotifications") {
        return pollers.accountNotifications;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

/**
 * Builds the app-wide kit client. `urls` overrides the cluster's default RPC
 * endpoints — used by tests to point the client at an ephemeral Surfpool
 * instance on dynamic ports.
 *
 * Live websockets stay on localnet (and an explicit `rpcSubscriptionsUrl`).
 * Everywhere else Kit's frozen subscriptions proxy is wrapped — not spread —
 * with HTTP pollers, then the transaction executor is rebuilt so confirmations
 * use those pollers. Spreading the proxy is a no-op (it has no own keys) and
 * assigning onto it throws.
 */
export function createAppClient(
  cluster: ClusterMoniker,
  urls?: RpcUrlOverrides
) {
  const rpcUrl = urls?.rpcUrl ?? CLUSTER_URLS[cluster];
  const liveWsUrl =
    cluster === "localnet"
      ? (urls?.rpcSubscriptionsUrl ?? WS_URLS[cluster])
      : urls?.rpcSubscriptionsUrl;

  return createClient()
    .use(walletSigner({ chain: WALLET_CHAINS[cluster] }))
    .use(
      solanaRpc({
        rpcUrl,
        rpcSubscriptionsUrl: liveWsUrl ?? rpcUrl.replace(/^http/, "ws"),
        transactionConfig: {
          microLamportsPerComputeUnit: 1000n as MicroLamports,
        },
      })
    )
    .use((current) => {
      if (liveWsUrl) return current;
      return extendClient(current, {
        rpcSubscriptions: overlayHttpSubscriptions(
          current.rpcSubscriptions,
          createHttpPollingSubscriptions(current.rpc)
        ),
      });
    })
    .use((current) =>
      liveWsUrl ? current : rpcTransactionPlanExecutor()(current)
    )
    .use(rpcAirdrop())
    .use(systemProgram())
    .use(tokenProgram())
    .use(memoProgram());
}

export type AppClient = ReturnType<typeof createAppClient>;

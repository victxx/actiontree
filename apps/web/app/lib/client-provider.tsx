"use client";

import { type ReactNode } from "react";
import { ClientProvider, useClient } from "@solana/react";
import {
  createAppClient,
  type AppClient,
  type ClusterMoniker,
} from "./solana-client";
import { useCluster } from "../components/cluster-context";

const browserOrigin =
  typeof window === "undefined"
    ? "http://localhost:3000"
    : window.location.origin;
const clients = new Map<ClusterMoniker, AppClient>();

function getConfiguredClient(cluster: ClusterMoniker) {
  const cached = clients.get(cluster);
  if (cached) return cached;

  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  const rpcSubscriptionsUrl = process.env.NEXT_PUBLIC_SOLANA_WS_URL;
  const configuredOverrides =
    rpcUrl && rpcSubscriptionsUrl ? { rpcUrl, rpcSubscriptionsUrl } : null;

  const client =
    cluster === "mainnet"
      ? createAppClient(cluster, {
          rpcUrl: `${browserOrigin}/api/solana-rpc`,
          rpcSubscriptionsUrl:
            rpcSubscriptionsUrl || "wss://api.mainnet-beta.solana.com",
        })
      : createAppClient(cluster, configuredOverrides ?? undefined);

  clients.set(cluster, client);
  return client;
}

export function AppClientProvider({ children }: { children: ReactNode }) {
  const { cluster } = useCluster();
  const client = getConfiguredClient(cluster);

  return <ClientProvider client={client}>{children}</ClientProvider>;
}

export function useAppClient() {
  return useClient<AppClient>();
}

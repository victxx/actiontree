"use client";

import { useMemo, type ReactNode } from "react";
import { ClientProvider, useClient } from "@solana/react";
import { createAppClient, type AppClient } from "./solana-client";
import { useCluster } from "../components/cluster-context";

export function AppClientProvider({ children }: { children: ReactNode }) {
  const { cluster } = useCluster();
  const client = useMemo(() => {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    const rpcSubscriptionsUrl = process.env.NEXT_PUBLIC_SOLANA_WS_URL;
    const devnetOverrides =
      cluster === "devnet" && rpcUrl && rpcSubscriptionsUrl
        ? { rpcUrl, rpcSubscriptionsUrl }
        : undefined;
    return createAppClient(cluster, devnetOverrides);
  }, [cluster]);

  return <ClientProvider client={client}>{children}</ClientProvider>;
}

export function useAppClient() {
  return useClient<AppClient>();
}

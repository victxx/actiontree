import { address, createSolanaRpc } from "@solana/kit";
import { ClientProvider } from "@solana/react";
import { Surfnet } from "@solana/surfpool";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useMemo } from "react";
import { Toaster } from "sonner";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { DEMO_PROFILE } from "@actiontree/profile";
import { ActiontreeShell } from "../app/components/actiontree-shell";
import { ClusterProvider } from "../app/components/cluster-context";
import { WalletButton } from "../app/components/wallet-button";
import { ellipsify } from "../app/lib/explorer";
import { createAppClient } from "../app/lib/solana-client";
import { mockWalletAddress, registerMockWallet } from "./mock-wallet";

const LAMPORTS_PER_SOL = 1_000_000_000;

let surfnet: Surfnet;
let rpc: ReturnType<typeof createSolanaRpc>;

beforeAll(() => {
  surfnet = Surfnet.start();
  rpc = createSolanaRpc(surfnet.rpcUrl);
  surfnet.fundSol(mockWalletAddress, 5 * LAMPORTS_PER_SOL);
  registerMockWallet();
}, 60_000);

afterAll(() => {
  surfnet?.stop();
});

afterEach(cleanup);

function TestApp() {
  const client = useMemo(
    () =>
      createAppClient("localnet", {
        rpcUrl: surfnet.rpcUrl,
        rpcSubscriptionsUrl: surfnet.wsUrl,
      }),
    []
  );
  return (
    <ClusterProvider>
      <ClientProvider client={client}>
        <WalletButton />
        <ActiontreeShell />
        <Toaster />
      </ClientProvider>
    </ClusterProvider>
  );
}

async function connectWallet() {
  fireEvent.click(screen.getByRole("button", { name: "Connect Wallet" }));
  fireEvent.click(await screen.findByRole("button", { name: "Mock Wallet" }));
  return await screen.findByRole("button", {
    name: ellipsify(mockWalletAddress),
  });
}

test("connects a Wallet Standard wallet", async () => {
  render(<TestApp />);
  const walletButton = await connectWallet();
  expect(walletButton).toBeTruthy();
});

test("executes the profile SOL action against the resolved destination", async () => {
  const destination = address(DEMO_PROFILE.solanaAddress!);
  surfnet.fundSol(mockWalletAddress, 5 * LAMPORTS_PER_SOL);
  render(<TestApp />);
  await connectWallet();

  const before = await rpc.getBalance(destination).send();
  fireEvent.click(screen.getByRole("button", { name: "Send 0.05 SOL" }));

  await screen.findByText(
    "Sent 0.05 SOL to nightshift.eth",
    {},
    { timeout: 15_000 }
  );
  const after = await rpc.getBalance(destination).send();
  expect(after.value - before.value).toBe(50_000_000n);
});

test("copies a portable Blink URL", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(<TestApp />);

  fireEvent.click(screen.getByRole("button", { name: "Book 30 minutes" }));

  await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
  expect(writeText.mock.calls[0]?.[0]).toMatch(
    /^https:\/\/dial\.to\/\?action=solana-action%3Ahttps?%3A/
  );
  expect(writeText.mock.calls[0]?.[0]).toContain(
    "%2Fapi%2Factions%2Ftip%2Fnightshift.eth"
  );
  expect(screen.getByText("Blink link copied ✓")).toBeTruthy();
});

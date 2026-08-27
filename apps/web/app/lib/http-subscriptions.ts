import {
  commitmentComparator,
  type Address,
  type Commitment,
  type Lamports,
  type Signature,
} from "@solana/kit";

type SignatureStatusRpc = {
  getSignatureStatuses: (signatures: Signature[]) => {
    send: (config?: { abortSignal?: AbortSignal }) => Promise<{
      value: ReadonlyArray<{
        confirmationStatus?: Commitment | null;
        err: unknown;
      } | null>;
    }>;
  };
  getSlot: () => {
    send: (config?: { abortSignal?: AbortSignal }) => Promise<bigint>;
  };
  getAccountInfo: (
    address: Address,
    config?: { commitment?: Commitment; encoding?: "base64" }
  ) => {
    send: (config?: { abortSignal?: AbortSignal }) => Promise<{
      context: { slot: bigint };
      value: { lamports: Lamports } | null;
    }>;
  };
};

function sleep(ms: number, abortSignal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortSignal.reason ?? new DOMException("Aborted", "AbortError"));
    };
    if (abortSignal.aborted) {
      onAbort();
      return;
    }
    abortSignal.addEventListener("abort", onAbort, { once: true });
  });
}

async function* pollSignatureStatus(
  rpc: SignatureStatusRpc,
  signature: Signature,
  commitment: Commitment,
  abortSignal: AbortSignal
) {
  while (!abortSignal.aborted) {
    const { value } = await rpc
      .getSignatureStatuses([signature])
      .send({ abortSignal });
    const status = value[0];
    if (status?.err) {
      yield { value: { err: status.err } };
      return;
    }
    if (
      status?.confirmationStatus &&
      commitmentComparator(status.confirmationStatus, commitment) >= 0
    ) {
      yield { value: { err: null } };
      return;
    }
    await sleep(400, abortSignal);
  }
}

async function* pollSlots(rpc: SignatureStatusRpc, abortSignal: AbortSignal) {
  let lastSlot = -1n;
  while (!abortSignal.aborted) {
    const slot = await rpc.getSlot().send({ abortSignal });
    if (slot !== lastSlot) {
      lastSlot = slot;
      yield { parent: slot, root: slot, slot };
    }
    await sleep(400, abortSignal);
  }
}

async function* pollAccount(
  rpc: SignatureStatusRpc,
  address: Address,
  commitment: Commitment,
  abortSignal: AbortSignal
) {
  while (!abortSignal.aborted) {
    const { context, value } = await rpc
      .getAccountInfo(address, { commitment, encoding: "base64" })
      .send({ abortSignal });
    yield {
      context,
      value: { lamports: value?.lamports ?? (0n as Lamports) },
    };
    await sleep(1_500, abortSignal);
  }
}

/**
 * Kit confirms transactions over WebSockets. Public Solana WS endpoints are
 * blocked in the browser, and spreading the live subscriptions proxy can open
 * every channel at once and crash desktop Chrome. These HTTP pollers reuse the
 * existing RPC proxy instead.
 */
export function createHttpPollingSubscriptions(rpc: SignatureStatusRpc) {
  return {
    signatureNotifications(
      signature: Signature,
      config?: { commitment?: Commitment }
    ) {
      const commitment = config?.commitment ?? "confirmed";
      return {
        subscribe({ abortSignal }: { abortSignal: AbortSignal }) {
          return pollSignatureStatus(rpc, signature, commitment, abortSignal);
        },
      };
    },
    slotNotifications() {
      return {
        subscribe({ abortSignal }: { abortSignal: AbortSignal }) {
          return pollSlots(rpc, abortSignal);
        },
      };
    },
    accountNotifications(
      address: Address,
      config?: { commitment?: Commitment }
    ) {
      const commitment = config?.commitment ?? "confirmed";
      return {
        subscribe({ abortSignal }: { abortSignal: AbortSignal }) {
          return pollAccount(rpc, address, commitment, abortSignal);
        },
      };
    },
  };
}

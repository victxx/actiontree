import {
  commitmentComparator,
  type Commitment,
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

/**
 * Kit confirms transactions over WebSockets. Public Solana WS endpoints are
 * blocked in the browser, so mainnet payments fail after wallet approval.
 * These HTTP pollers reuse the existing RPC proxy instead.
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
  };
}

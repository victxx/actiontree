import { z } from "zod";

export const actionKindSchema = z.enum([
  "sol-transfer",
  "usdc-transfer",
  "blink",
  "link",
]);

export const actionSchema = z.object({
  id: z.string().min(1).max(48),
  kind: actionKindSchema,
  label: z.string().min(1).max(32),
  description: z.string().max(140).optional(),
  amount: z.number().positive().optional(),
  href: z.string().url().optional(),
  featured: z.boolean().optional(),
});

export const manifestSchema = z.object({
  version: z.literal(1),
  title: z.string().max(64).optional(),
  actions: z.array(actionSchema).min(1).max(8),
});

export type ActiontreeAction = z.infer<typeof actionSchema>;
export type ActiontreeManifest = z.infer<typeof manifestSchema>;

export const DEMO_MANIFEST: ActiontreeManifest = {
  version: 1,
  title: "Available actions",
  actions: [
    {
      id: "tip-sol",
      kind: "sol-transfer",
      label: "Send 0.05 SOL",
      description: "Send a direct signal to this builder.",
      amount: 0.05,
      featured: true,
    },
    {
      id: "pay-usdc",
      kind: "usdc-transfer",
      label: "Pay 5 USDC",
      description: "Settle a tiny invoice on Solana.",
      amount: 5,
    },
    {
      id: "book-session",
      kind: "blink",
      label: "Book 30 minutes",
      description: "Reserve a focused build session using a Solana Blink.",
    },
  ],
};

export function createDefaultManifest(
  name: string,
  hasSolanaAddress: boolean,
): ActiontreeManifest {
  if (!hasSolanaAddress) {
    return {
      version: 1,
      title: "Setup required",
      actions: [
        {
          id: "add-solana-record",
          kind: "link",
          label: "Add Solana record",
          description: "Publish coin type 501 to make this ENS executable.",
          href: `https://app.ens.domains/${encodeURIComponent(name)}`,
          featured: true,
        },
      ],
    };
  }

  return {
    version: 1,
    title: "Available actions",
    actions: [
      {
        id: "tip-sol",
        kind: "sol-transfer",
        label: "Send 0.05 SOL",
        description: `Pay ${name} using its ENS Solana record.`,
        amount: 0.05,
        featured: true,
      },
      {
        id: "pay-usdc",
        kind: "usdc-transfer",
        label: "Pay 5 USDC",
        description: "Settle a stablecoin payment on Solana.",
        amount: 5,
      },
      {
        id: "share-blink",
        kind: "blink",
        label: "Copy payment Blink",
        description: "Copy this profile as a transaction-ready Solana link.",
      },
    ],
  };
}

export function parseManifest(input: unknown): ActiontreeManifest {
  return manifestSchema.parse(input);
}

export function isSafeActionUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const isPrivateHost =
      host === "localhost" ||
      host.endsWith(".local") ||
      host === "0.0.0.0" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !isPrivateHost
    );
  } catch {
    return false;
  }
}

import {
  ACTIONS_CORS_HEADERS,
  type ActionGetResponse,
  type ActionPostRequest,
  type ActionPostResponse,
} from "@solana/actions";
import { resolveEnsProfile } from "@actiontree/ens";
import { buildSolTransferAction, parseSolAmount } from "@actiontree/solana";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ name: string }>;
};

function json(payload: unknown, status = 200) {
  return Response.json(payload, { status, headers: ACTIONS_CORS_HEADERS });
}

export async function GET(request: Request, context: Context) {
  const { name: encodedName } = await context.params;
  const name = decodeURIComponent(encodedName).trim().toLowerCase();
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  const response: ActionGetResponse = {
    type: "action",
    icon: `${origin}/og.png`,
    title: `Send a signal to ${name}`,
    description:
      "Resolve this ENS name to its Solana address and send SOL without copying a wallet address.",
    label: "Send 0.05 SOL",
    links: {
      actions: [
        {
          type: "transaction",
          label: "0.01 SOL",
          href: `/api/actions/tip/${encodeURIComponent(name)}?amount=0.01`,
        },
        {
          type: "transaction",
          label: "0.05 SOL",
          href: `/api/actions/tip/${encodeURIComponent(name)}?amount=0.05`,
        },
        {
          type: "transaction",
          label: "Send SOL",
          href: `/api/actions/tip/${encodeURIComponent(name)}?amount={amount}`,
          parameters: [
            {
              name: "amount",
              label: "Custom SOL amount",
              type: "number",
              required: true,
              min: 0.000001,
              max: 100,
            },
          ],
        },
      ],
    },
  };

  return json(response);
}

export async function POST(request: Request, context: Context) {
  try {
    const { name: encodedName } = await context.params;
    const name = decodeURIComponent(encodedName).trim().toLowerCase();
    const { account } = (await request.json()) as ActionPostRequest;
    const amount = parseSolAmount(
      new URL(request.url).searchParams.get("amount")
    );
    const profile = await resolveEnsProfile(name, {
      rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || undefined,
    });

    if (!profile.solanaAddress) {
      return json(
        {
          message: `${name} has no Solana address in its ENS coin type 501 record.`,
        },
        422
      );
    }

    const transaction = await buildSolTransferAction({
      account,
      destination: profile.solanaAddress,
      amount,
      rpcUrl:
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
        "https://api.devnet.solana.com",
    });
    const response: ActionPostResponse = {
      type: "transaction",
      transaction,
      message: `Send ${amount} SOL to ${name}`,
    };
    return json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to build transaction";
    return json({ message }, 400);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: ACTIONS_CORS_HEADERS });
}

import { isEnsName } from "@actiontree/profile";
import {
  isEthereumAddress,
  resolveEnsProfile,
  reverseResolveEnsAddress,
} from "@actiontree/ens";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ name: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { name: encodedName } = await context.params;
  const input = decodeURIComponent(encodedName).trim();
  const normalizedInput = input.toLowerCase();

  if (!isEnsName(normalizedInput) && !isEthereumAddress(input)) {
    return Response.json(
      { message: "Enter a valid .eth name or Ethereum address." },
      { status: 400 }
    );
  }

  try {
    const rpcUrl = process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || undefined;
    const name = isEthereumAddress(input)
      ? await reverseResolveEnsAddress(input, { rpcUrl })
      : normalizedInput;
    if (!name) {
      return Response.json(
        { message: "This address has no primary ENS name." },
        { status: 404 }
      );
    }
    const profile = await resolveEnsProfile(name, {
      rpcUrl,
    });
    return Response.json(profile, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("ENS profile resolution failed", error);
    return Response.json(
      { message: "This ENS profile could not be resolved right now." },
      { status: 502 }
    );
  }
}

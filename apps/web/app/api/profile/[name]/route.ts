import { isEnsName } from "@actiontree/profile";
import { resolveEnsProfile } from "@actiontree/ens";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ name: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { name: encodedName } = await context.params;
  const name = decodeURIComponent(encodedName).trim().toLowerCase();

  if (!isEnsName(name)) {
    return Response.json(
      { message: "Enter a valid .eth name." },
      { status: 400 }
    );
  }

  try {
    const profile = await resolveEnsProfile(name, {
      rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || undefined,
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

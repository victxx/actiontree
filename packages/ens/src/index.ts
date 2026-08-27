import { createPublicClient, getAddress, http, isAddress } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { getCoderByCoinName } from "@ensdomains/address-encoder";
import { hexToBytes } from "@ensdomains/address-encoder/utils";
import {
  SOLANA_COIN_TYPE,
  type ActiontreeProfile,
  type ProfileLink,
} from "@actiontree/profile";

export const ACTIONTREE_MANIFEST_KEY = "com.actiontree.manifest";

const TEXT_KEYS = [
  "avatar",
  "header",
  "description",
  "display",
  "url",
  "com.twitter",
  "com.github",
  "com.discord",
  ACTIONTREE_MANIFEST_KEY,
] as const;

export type EnsProfileResolverOptions = {
  rpcUrl?: string;
};

function createEnsClient(options: EnsProfileResolverOptions) {
  return createPublicClient({
    chain: mainnet,
    transport: http(options.rpcUrl),
  });
}

export function isEthereumAddress(value: string) {
  return isAddress(value.trim());
}

export async function reverseResolveEnsAddress(
  rawAddress: string,
  options: EnsProfileResolverOptions = {},
) {
  if (!isAddress(rawAddress.trim())) return null;
  return createEnsClient(options).getEnsName({
    address: getAddress(rawAddress.trim()),
  });
}

function socialLink(label: string, handle: string | null, base: string) {
  if (!handle) return null;
  const clean = handle.replace(/^@/, "");
  return { label, href: `${base}${clean}` } satisfies ProfileLink;
}

export async function resolveEnsProfile(
  rawName: string,
  options: EnsProfileResolverOptions = {},
): Promise<ActiontreeProfile> {
  const name = normalize(rawName.trim());
  const client = createEnsClient(options);

  const [texts, solanaAddressBytes, resolvedAvatar] = await Promise.all([
    Promise.all(
      TEXT_KEYS.map(
        async (key) => [key, await client.getEnsText({ name, key })] as const,
      ),
    ),
    client.getEnsAddress({ name, coinType: SOLANA_COIN_TYPE }),
    client.getEnsAvatar({ name }),
  ]);

  const records = Object.fromEntries(texts) as Record<
    (typeof TEXT_KEYS)[number],
    string | null
  >;
  const solanaAddress = solanaAddressBytes
    ? getCoderByCoinName("sol").encode(hexToBytes(solanaAddressBytes))
    : null;
  const socials = [
    socialLink("X", records["com.twitter"], "https://x.com/"),
    socialLink("Github", records["com.github"], "https://github.com/"),
    socialLink("Discord", records["com.discord"], "https://discord.com/users/"),
  ].filter((link): link is ProfileLink => link !== null);

  return {
    name,
    displayName: records.display || name,
    description:
      records.description || "This ENS profile has not published a bio yet.",
    avatar: resolvedAvatar || records.avatar,
    header: records.header,
    website: records.url,
    socials,
    solanaAddress,
    manifestUrl: records[ACTIONTREE_MANIFEST_KEY],
    source: "ens",
  };
}

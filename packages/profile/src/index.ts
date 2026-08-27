export const SOLANA_COIN_TYPE = 501n;

export type ProfileLink = {
  label: string;
  href: string;
};

export type ActiontreeProfile = {
  name: string;
  displayName: string;
  description: string;
  avatar: string | null;
  header: string | null;
  website: string | null;
  socials: ProfileLink[];
  solanaAddress: string | null;
  manifestUrl: string | null;
  source: "ens" | "demo";
};

export const DEMO_PROFILE: ActiontreeProfile = {
  name: "nightshift.eth",
  displayName: "Night Shift",
  description:
    "Independent builder. Tiny software, strange interfaces, useful signals.",
  avatar: null,
  header: null,
  website: "https://ethbelgrade.rs",
  solanaAddress: "GvHe6J4bW1v8jMP9B5g6hP2w3tFz8dXk4Yq7aLm9NcRs",
  manifestUrl: null,
  source: "demo",
  socials: [
    { label: "Github", href: "https://github.com" },
    { label: "X", href: "https://x.com" },
  ],
};

export function shortAddress(value: string, edge = 4) {
  if (value.length <= edge * 2 + 1) return value;
  return `${value.slice(0, edge)}…${value.slice(-edge)}`;
}

export function isEnsName(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.endsWith(".eth") && normalized.length > 4;
}

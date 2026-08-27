import type { Metadata } from "next";
import { ActiontreeShell } from "../../components/actiontree-shell";

type PageProps = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { name: encodedName } = await params;
  const name = decodeURIComponent(encodedName);
  return {
    title: `${name} — Actiontree`,
    description: `Executable Solana actions resolved from ${name}.`,
    openGraph: {
      title: `${name} — Actiontree`,
      description: `Executable Solana actions resolved from ${name}.`,
      images: [],
    },
    twitter: {
      card: "summary",
      title: `${name} — Actiontree`,
      description: `Executable Solana actions resolved from ${name}.`,
      images: [],
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { name: encodedName } = await params;
  const name = decodeURIComponent(encodedName);
  return <ActiontreeShell initialName={name} autoResolve />;
}

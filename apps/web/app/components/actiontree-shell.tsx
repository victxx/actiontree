"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createDefaultManifest,
  DEMO_MANIFEST,
  isSafeActionUrl,
  parseManifest,
  type ActiontreeAction,
  type ActiontreeManifest,
} from "@actiontree/actions";
import {
  DEMO_PROFILE,
  isEnsName,
  shortAddress,
  type ActiontreeProfile,
} from "@actiontree/profile";
import { USDC_MINTS } from "@actiontree/solana";
import { address, sol, solToLamports, type Lamports } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { toast } from "sonner";
import { useAppClient } from "../lib/client-provider";
import { useSend } from "../lib/hooks/use-send";
import { useCluster } from "./cluster-context";

const actionGlyphs: Record<ActiontreeAction["kind"], string> = {
  "sol-transfer": "↗",
  "usdc-transfer": "$",
  blink: "◎",
  link: "↘",
};

const configuredDemoProfile: ActiontreeProfile = {
  ...DEMO_PROFILE,
  manifestUrl: process.env.NEXT_PUBLIC_DEMO_MANIFEST_URL || null,
};

type ResolverStatus = "idle" | "loading" | "success" | "error";

type ActiontreeShellProps = {
  initialName?: string;
  autoResolve?: boolean;
};

function ActionCard({
  action,
  index,
  isRunning,
  onRun,
}: {
  action: ActiontreeAction;
  index: number;
  isRunning: boolean;
  onRun: (action: ActiontreeAction) => void;
}) {
  return (
    <button
      type="button"
      className={`action-card group ${action.featured ? "action-card-featured" : ""}`}
      aria-label={action.label}
      disabled={isRunning}
      onClick={() => onRun(action)}
    >
      <span className="action-index">0{index + 1}</span>
      <span className="action-glyph" aria-hidden="true">
        {actionGlyphs[action.kind]}
      </span>
      <span className="action-copy">
        <strong>{isRunning ? "Waiting for wallet…" : action.label}</strong>
        <small>{action.description}</small>
      </span>
      <span className="action-arrow" aria-hidden="true">
        ↗
      </span>
    </button>
  );
}

async function fetchManifest(
  profile: ActiontreeProfile
): Promise<ActiontreeManifest> {
  if (!profile.manifestUrl) {
    return profile.source === "demo"
      ? DEMO_MANIFEST
      : createDefaultManifest(profile.name, Boolean(profile.solanaAddress));
  }

  if (!isSafeActionUrl(profile.manifestUrl)) {
    throw new Error(
      "The Actiontree manifest URL is not a safe HTTPS endpoint."
    );
  }

  const response = await fetch(profile.manifestUrl, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("The action manifest did not respond.");
  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > 65_536) {
    throw new Error("The action manifest is larger than 64 KB.");
  }
  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > 65_536) {
    throw new Error("The action manifest is larger than 64 KB.");
  }
  return parseManifest(JSON.parse(body));
}

export function ActiontreeShell({
  initialName = DEMO_PROFILE.name,
  autoResolve = false,
}: ActiontreeShellProps) {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const { cluster } = useCluster();
  const { run, isSending } = useSend();
  const [query, setQuery] = useState(initialName);
  const [profile, setProfile] = useState<ActiontreeProfile>(
    configuredDemoProfile
  );
  const [manifest, setManifest] = useState<ActiontreeManifest>(DEMO_MANIFEST);
  const [resolverStatus, setResolverStatus] = useState<ResolverStatus>("idle");
  const [resolverError, setResolverError] = useState<string | null>(null);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);

  const resolveName = useCallback(async (rawName: string) => {
    const name = rawName.trim().toLowerCase();
    if (!isEnsName(name)) {
      setResolverStatus("error");
      setResolverError("Enter a valid .eth name.");
      return;
    }

    setResolverStatus("loading");
    setResolverError(null);
    try {
      const response = await fetch(`/api/profile/${encodeURIComponent(name)}`);
      const payload = (await response.json()) as
        ActiontreeProfile | { message?: string };
      if (!response.ok) {
        throw new Error(
          "message" in payload && payload.message
            ? payload.message
            : "Unable to resolve this ENS profile."
        );
      }

      const nextProfile = payload as ActiontreeProfile;
      setProfile(nextProfile);
      try {
        setManifest(await fetchManifest(nextProfile));
      } catch (error) {
        setManifest(
          createDefaultManifest(
            nextProfile.name,
            Boolean(nextProfile.solanaAddress)
          )
        );
        toast.warning("Custom actions were unavailable", {
          description:
            error instanceof Error
              ? error.message
              : "Using safe defaults instead.",
        });
      }
      setResolverStatus("success");
    } catch (error) {
      setResolverStatus("error");
      setResolverError(
        error instanceof Error
          ? error.message
          : "Unable to resolve this ENS profile."
      );
    }
  }, []);

  useEffect(() => {
    if (!autoResolve) return;
    const timer = window.setTimeout(() => void resolveName(initialName), 0);
    return () => window.clearTimeout(timer);
  }, [autoResolve, initialName, resolveName]);

  const lookupLabel = useMemo(() => {
    if (resolverStatus === "loading") return "Resolving…";
    if (
      resolverStatus === "success" &&
      query.trim().toLowerCase() === profile.name
    ) {
      return "Resolved";
    }
    return "Resolve name";
  }, [profile.name, query, resolverStatus]);

  const requirePaymentContext = () => {
    if (!profile.solanaAddress) {
      toast.error(`${profile.name} has no Solana coin type 501 record.`);
      return null;
    }
    if (!connected?.signer) {
      toast.info("Connect a Solana wallet first.");
      return null;
    }
    try {
      return {
        signer: connected.signer,
        destination: address(profile.solanaAddress),
      };
    } catch {
      toast.error("The ENS Solana address is malformed.");
      return null;
    }
  };

  const runAction = async (action: ActiontreeAction) => {
    setRunningActionId(action.id);
    try {
      if (action.kind === "link") {
        if (!action.href || !isSafeActionUrl(action.href)) {
          toast.error("This external link is not safe to open.");
          return;
        }
        window.open(action.href, "_blank", "noopener,noreferrer");
        return;
      }

      if (action.kind === "blink") {
        const actionUrl =
          action.href && isSafeActionUrl(action.href)
            ? action.href
            : `${window.location.origin}/api/actions/tip/${encodeURIComponent(profile.name)}`;
        const blinkUrl = `https://dial.to/?action=${encodeURIComponent(`solana-action:${actionUrl}`)}`;
        window.open(blinkUrl, "_blank", "noopener,noreferrer");
        return;
      }

      const payment = requirePaymentContext();
      if (!payment) return;

      if (action.kind === "sol-transfer") {
        const amount = action.amount ?? 0.05;
        let transferAmount: Lamports;
        try {
          transferAmount = solToLamports(sol(String(amount)));
        } catch {
          toast.error("Invalid SOL amount in this action.");
          return;
        }
        await run(
          () =>
            client.system.instructions
              .transferSol({
                source: payment.signer,
                destination: payment.destination,
                amount: transferAmount,
              })
              .sendTransaction(),
          `Sent ${amount} SOL to ${profile.name}`
        );
        return;
      }

      if (action.kind === "usdc-transfer") {
        if (cluster !== "devnet" && cluster !== "mainnet") {
          toast.error("USDC actions are available on devnet or mainnet.");
          return;
        }
        const amount = action.amount ?? 5;
        await run(
          () =>
            client.token.instructions
              .transferToATA({
                mint: address(USDC_MINTS[cluster]),
                authority: payment.signer,
                recipient: payment.destination,
                amount: BigInt(Math.round(amount * 1_000_000)),
                decimals: 6,
              })
              .sendTransaction(),
          `Sent ${amount} USDC to ${profile.name}`
        );
      }
    } finally {
      setRunningActionId(null);
    }
  };

  const initials = profile.displayName
    .split(/[\s.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <main className="actiontree-main">
      <section className="intro-panel">
        <div className="eyebrow">
          <span className="live-dot" /> ETH Belgrade × Solana Summit
        </div>
        <h1>
          Your ENS
          <br />
          is an <em>app.</em>
        </h1>
        <p className="intro-copy">
          Resolve a name. Discover its Solana actions. Pay, book, mint or join
          without leaving the profile.
        </p>

        <form
          className="resolver-form"
          onSubmit={(event) => {
            event.preventDefault();
            void resolveName(query);
          }}
        >
          <label htmlFor="ens-name">ENS identity</label>
          <div className="resolver-control">
            <span aria-hidden="true">⌁</span>
            <input
              id="ens-name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="name.eth"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" disabled={resolverStatus === "loading"}>
              {lookupLabel}
            </button>
          </div>
          {resolverError && <p className="resolver-error">{resolverError}</p>}
        </form>

        <div className="protocol-note">
          <span>01</span>
          <p>
            Profile and ownership resolve from Ethereum. Payments and actions
            execute on Solana.
          </p>
        </div>
      </section>

      <section
        className="profile-stage"
        aria-label="Resolved Actiontree profile"
      >
        <div className="stage-coordinate stage-coordinate-top">50.4501° N</div>
        <article
          className="profile-card"
          aria-busy={resolverStatus === "loading"}
        >
          <div className="profile-signal">
            <span>
              {profile.source === "ens" ? "LIVE PROFILE" : "DEMO PROFILE"}
            </span>
            <span>ENS → SOL</span>
          </div>

          <header className="profile-header">
            <div className="avatar-shell" aria-hidden="true">
              <div className="avatar-orbit" />
              {profile.avatar?.startsWith("https://") ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary ENS avatar hosts cannot be preconfigured
                <img src={profile.avatar} alt="" />
              ) : (
                <span>{initials || "AT"}</span>
              )}
            </div>
            <div>
              <div className="verified-name">
                <h2>{profile.name}</h2>
                <span title="Resolved from ENS">✓</span>
              </div>
              <p>{profile.description}</p>
            </div>
          </header>

          <div className="address-rail">
            <span className="chain-chip">SOL</span>
            <code>
              {profile.solanaAddress
                ? shortAddress(profile.solanaAddress, 7)
                : "No Solana record published"}
            </code>
            <span className="address-status">
              {profile.solanaAddress ? "record 501" : "setup needed"}
            </span>
          </div>

          <div className="actions-heading">
            <span>{manifest.title ?? "Executable actions"}</span>
            <span>{manifest.actions.length} available</span>
          </div>

          <div className="action-list">
            {manifest.actions.map((action, index) => (
              <ActionCard
                key={action.id}
                action={action}
                index={index}
                isRunning={isSending && runningActionId === action.id}
                onRun={(selected) => void runAction(selected)}
              />
            ))}
          </div>

          <footer className="profile-footer">
            <div className="social-links">
              {profile.socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {social.label}
                </a>
              ))}
              {profile.website && isSafeActionUrl(profile.website) && (
                <a href={profile.website} target="_blank" rel="noreferrer">
                  Website
                </a>
              )}
            </div>
            <span>Powered by ENS records + Solana Actions</span>
          </footer>
        </article>
        <div className="stage-coordinate stage-coordinate-bottom">
          20.4612° E
        </div>
      </section>
    </main>
  );
}

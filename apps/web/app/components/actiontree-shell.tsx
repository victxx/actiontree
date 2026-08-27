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
import { AnimatePresence, motion } from "motion/react";
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
  showDemoShortcut?: boolean;
};

function ActionCard({
  action,
  index,
  isRunning,
  isCopied,
  amount,
  onAmountChange,
  onRun,
}: {
  action: ActiontreeAction;
  index: number;
  isRunning: boolean;
  isCopied: boolean;
  amount?: string;
  onAmountChange: (value: string) => void;
  onRun: (action: ActiontreeAction) => void;
}) {
  const currency =
    action.kind === "sol-transfer"
      ? "SOL"
      : action.kind === "usdc-transfer"
        ? "USDC"
        : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 30 }}
      className={`action-card group ${action.featured ? "action-card-featured" : ""}`}
    >
      <span className="action-index">0{index + 1}</span>
      <span className="action-glyph" aria-hidden="true">
        {actionGlyphs[action.kind]}
      </span>
      <span className="action-copy">
        <strong>
          {isCopied
            ? "Blink link copied ✓"
            : isRunning
              ? "Waiting for wallet…"
              : currency
                ? `Send ${currency}`
                : action.label}
        </strong>
        <small>{action.description}</small>
      </span>
      {currency ? (
        <div className="amount-action">
          <label className="amount-field">
            <span className="sr-only">{currency} amount</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step={currency === "SOL" ? "0.001" : "0.1"}
              value={amount ?? ""}
              onChange={(event) => onAmountChange(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              aria-label={`${currency} amount`}
            />
            <span>{currency}</span>
          </label>
          <button
            type="button"
            className="action-trigger"
            aria-label={`Send ${amount || "0"} ${currency}`}
            disabled={isRunning}
            onClick={() => onRun(action)}
          >
            Send <span aria-hidden="true">↗</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="action-trigger action-trigger-icon"
          aria-label={action.label}
          disabled={isRunning}
          onClick={() => onRun(action)}
        >
          <span aria-hidden="true">↗</span>
        </button>
      )}
    </motion.div>
  );
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall through for browsers that expose Clipboard API but block writes.
    }
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Clipboard access was blocked.");
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

function getInitialActionAmounts(manifest: ActiontreeManifest) {
  return Object.fromEntries(
    manifest.actions
      .filter(
        (action) =>
          action.kind === "sol-transfer" || action.kind === "usdc-transfer"
      )
      .map((action) => [
        action.id,
        String(action.amount ?? (action.kind === "sol-transfer" ? 0.05 : 5)),
      ])
  );
}

export function ActiontreeShell({
  initialName = DEMO_PROFILE.name,
  autoResolve = false,
  showDemoShortcut = false,
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
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);
  const [actionAmounts, setActionAmounts] = useState<Record<string, string>>(
    () => getInitialActionAmounts(DEMO_MANIFEST)
  );

  const resolveName = useCallback(async (rawInput: string) => {
    const input = rawInput.trim();
    const isAddressInput = /^0x[a-fA-F0-9]{40}$/.test(input);
    if (!isEnsName(input) && !isAddressInput) {
      setResolverStatus("error");
      setResolverError("Enter a valid .eth name or Ethereum address.");
      return;
    }

    setResolverStatus("loading");
    setResolverError(null);
    try {
      const response = await fetch(`/api/profile/${encodeURIComponent(input)}`);
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
      setQuery(nextProfile.name);
      try {
        const nextManifest = await fetchManifest(nextProfile);
        setManifest(nextManifest);
        setActionAmounts(getInitialActionAmounts(nextManifest));
      } catch (error) {
        const fallbackManifest = createDefaultManifest(
          nextProfile.name,
          Boolean(nextProfile.solanaAddress)
        );
        setManifest(fallbackManifest);
        setActionAmounts(getInitialActionAmounts(fallbackManifest));
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
        const blinkUrl = `${window.location.origin}/p/${encodeURIComponent(profile.name)}`;
        try {
          await copyText(blinkUrl);
          setCopiedActionId(action.id);
          toast.success("Blink link copied", {
            description:
              "Paste it anywhere. Blink clients detect its payment action automatically.",
          });
        } catch {
          window.prompt("Copy your Blink link:", blinkUrl);
        }
        return;
      }

      const payment = requirePaymentContext();
      if (!payment) return;

      if (action.kind === "sol-transfer") {
        const amount = Number(
          actionAmounts[action.id] ?? action.amount ?? 0.05
        );
        if (!Number.isFinite(amount) || amount <= 0 || amount > 100) {
          toast.error("Choose a SOL amount between 0 and 100.");
          return;
        }
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
        const amount = Number(actionAmounts[action.id] ?? action.amount ?? 5);
        if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
          toast.error("Choose a valid USDC amount.");
          return;
        }
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

  const hasResolvedProfile =
    profile.source === "ens" || (!autoResolve && initialName !== "");

  return (
    <motion.main className="actiontree-main" layout>
      <motion.section
        layout
        className={`resolver-shell ${hasResolvedProfile ? "resolver-shell-compact" : ""}`}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {!hasResolvedProfile && (
            <motion.div
              key="search-intro"
              className="search-intro"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
              transition={{ duration: 0.28 }}
            >
              <div className="eyebrow">
                <span className="live-dot" /> ENS identity, Solana execution
              </div>
              <h1>
                Find the name.
                <br />
                <em>Run the action.</em>
              </h1>
              <p className="intro-copy">
                Search an ENS name or paste an Ethereum address. Actiontree
                resolves the identity and turns it into a live payment profile.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.form
          layout
          className="resolver-form"
          onSubmit={(event) => {
            event.preventDefault();
            void resolveName(query);
          }}
        >
          <label htmlFor="ens-name">
            {hasResolvedProfile ? "Resolve another identity" : "ENS lookup"}
          </label>
          <div className="resolver-control">
            <span aria-hidden="true">⌁</span>
            <input
              id="ens-name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="name.eth or 0x address"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" disabled={resolverStatus === "loading"}>
              {lookupLabel}
            </button>
          </div>
          <AnimatePresence initial={false}>
            {resolverError && (
              <motion.p
                className="resolver-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {resolverError}
              </motion.p>
            )}
          </AnimatePresence>
          {!hasResolvedProfile && showDemoShortcut && (
            <button
              className="demo-shortcut"
              type="button"
              onClick={() => {
                setQuery("victorxva.eth");
                void resolveName("victorxva.eth");
              }}
              disabled={resolverStatus === "loading"}
            >
              <span>Try the live demo</span>
              <strong>victorxva.eth</strong>
              <span aria-hidden="true">↗</span>
            </button>
          )}
        </motion.form>
      </motion.section>

      <AnimatePresence mode="wait">
        {hasResolvedProfile && (
          <motion.section
            key={profile.name}
            className="profile-stage"
            aria-label="Resolved Actiontree profile"
            initial={{ opacity: 0, y: 42, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <article
              className="profile-card"
              aria-busy={resolverStatus === "loading"}
            >
              <div className="profile-signal">
                <span>LIVE ENS PROFILE</span>
                <span>{cluster.toUpperCase()} · ENS → SOL</span>
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
                  {profile.solanaAddress ? "ENS record 501" : "setup needed"}
                </span>
              </div>

              <div className="actions-heading">
                <span>{manifest.title ?? "Executable actions"}</span>
                <span>{manifest.actions.length} available</span>
              </div>

              <motion.div className="action-list" layout>
                {manifest.actions.map((action, index) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    index={index}
                    amount={actionAmounts[action.id]}
                    isRunning={isSending && runningActionId === action.id}
                    isCopied={copiedActionId === action.id}
                    onAmountChange={(value) =>
                      setActionAmounts((current) => ({
                        ...current,
                        [action.id]: value,
                      }))
                    }
                    onRun={(selected) => void runAction(selected)}
                  />
                ))}
              </motion.div>

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
                <span>Identity on Ethereum · actions on Solana</span>
              </footer>
            </article>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

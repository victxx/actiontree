"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import actiontreeLogo from "../assets/actiontree.png";
import actiontreeMark from "../assets/actiontree-solo.png";
import { ClientErrorBoundary } from "./client-error-boundary";
import { ClusterSelect } from "./cluster-select";

const WalletButton = dynamic(
  () => import("./wallet-button").then((module) => module.WalletButton),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-xs"
      >
        Connect Wallet
      </button>
    ),
  }
);

export function AppHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Actiontree home">
        <Image
          className="brand-logo brand-logo-full"
          src={actiontreeLogo}
          alt=""
          priority
        />
        <Image
          className="brand-logo brand-logo-mark"
          src={actiontreeMark}
          alt=""
          priority
        />
      </Link>
      <div className="flex items-center gap-3">
        <ClusterSelect />
        <ClientErrorBoundary
          fallback={
            <button
              type="button"
              className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-xs"
            >
              Connect Wallet
            </button>
          }
        >
          <WalletButton />
        </ClientErrorBoundary>
      </div>
    </header>
  );
}

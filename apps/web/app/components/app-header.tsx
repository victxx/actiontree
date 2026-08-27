"use client";

import Link from "next/link";
import { ClusterSelect } from "./cluster-select";
import { WalletButton } from "./wallet-button";

export function AppHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Actiontree home">
        <span className="brand-mark">A/T</span>
        <span>ACTIONTREE</span>
      </Link>
      <div className="header-protocol">
        <span>PROTOCOL</span>
        <strong>0.1</strong>
      </div>
      <div className="flex items-center gap-3">
        <ClusterSelect />
        <WalletButton />
      </div>
    </header>
  );
}

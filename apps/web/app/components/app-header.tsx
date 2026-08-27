"use client";

import Image from "next/image";
import Link from "next/link";
import actiontreeLogo from "../assets/actiontree.png";
import actiontreeMark from "../assets/actiontree-solo.png";
import { ClusterSelect } from "./cluster-select";
import { WalletButton } from "./wallet-button";

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
        <WalletButton />
      </div>
    </header>
  );
}

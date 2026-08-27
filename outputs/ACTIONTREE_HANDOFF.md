# ACTIONTREE — hackathon handoff

The monorepo MVP is implemented in this workspace. It joins ENS and Solana in one clear sentence: **a Linktree whose profile and receiving address are controlled by ENS, but whose buttons execute Solana payments and Blinks.**

## Already built

- real ENS profile + Solana `coinType 501` resolution;
- SOL and official USDC transfers through a connected Solana wallet;
- standard Solana Action/Blink endpoint and `actions.json` discovery;
- optional action manifest from the ENS text record `com.actiontree.manifest`;
- safe fallback actions when the manifest is missing or invalid;
- shareable `/p/[name]` profiles;
- responsive cyberpunk interface and 1200×630 social card;
- pnpm/Turborepo separation into web, actions, ENS, profile and Solana packages;
- unit and click-to-chain integration tests.

## Fastest path to the stage

1. Run `pnpm check`.
2. Deploy `apps/web` from the monorepo and set `NEXT_PUBLIC_APP_URL`.
3. Set an owned ENS name's Solana record to the demo recipient wallet.
4. Fund the presenting wallet on Solana mainnet and test one tiny payment.
5. Use the judging script in `docs/CURSOR_HANDOFF.md`.

## The difficult parts, intentionally simplified

- ENS multicoin bytes are converted with the official ENS address encoder.
- The destination is resolved again on the server when a Blink transaction is built.
- Solana Kit + Wallet Standard replaces legacy wallet adapters.
- USDC uses `transferToATA`; there is no manual recipient-token-account flow.
- Manifests are HTTPS-only, size/time limited and schema validated.
- There is no database, auth, custody, custom contract or custom Solana program.

If there is extra time, add only a client-side Manifest Composer that exports JSON. Do not turn it into a backend before judging.

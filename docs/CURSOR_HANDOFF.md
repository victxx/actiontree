# Cursor handoff: finish Actiontree without widening the scope

## Product sentence

Actiontree is a Linktree whose links can execute Solana actions, with the page identity and receiving address controlled by ENS.

## Non-negotiable architecture

```text
ENS name
  ├─ profile text records ────────────────┐
  ├─ Solana address, coinType 501 ────────┼─> Actiontree profile
  └─ com.actiontree.manifest URL ─────────┘        │
                                                   ├─ SOL / USDC via wallet
                                                   └─ portable Blink endpoint
```

Keep this as a pnpm/Turborepo monorepo. Protocol logic belongs in `packages/*`; routes and interface belong in `apps/web`.

## Current state

The complete MVP path is implemented:

- branded responsive landing/profile UI;
- real ENS mainnet profile resolution;
- correct conversion of ENS `coinType 501` bytes into a Solana base58 address;
- Wallet Standard connection using the current Solana Kit stack;
- direct SOL and USDC transfers;
- Solana Action GET/POST API plus `actions.json` discovery;
- shareable `/p/[name]` routes;
- safe action-manifest parsing with fallback defaults;
- package unit tests and a Surfpool wallet/payment integration test;
- social preview image and metadata.

## Hard parts and the shortest reliable answer

| Hard part                                   | Minimal solution already chosen                                          | Why it survives a hackathon                                         |
| ------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| ENS stores non-EVM addresses as bytes       | Read `coinType 501` with Viem, encode with `@ensdomains/address-encoder` | Uses the standard record instead of inventing a mapping             |
| Ethereum identity controls a Solana payment | Resolve ENS server-side again when constructing the unsigned transaction | Avoids stale or browser-tampered destinations                       |
| Solana wallet compatibility                 | Solana Kit + Wallet Standard                                             | No legacy adapter matrix to maintain                                |
| USDC recipient token accounts               | `transferToATA` creates/uses the associated token account                | No manual ATA branching                                             |
| Arbitrary manifest URLs                     | HTTPS only, no private hosts, 5 s timeout, 64 KB cap, Zod validation     | Failure becomes a safe default profile, not a broken demo           |
| Portable actions                            | Standard `/actions.json` plus `/api/actions/tip/[name]`                  | Works as a normal API and can be opened through a Blink client      |
| Reliable local transaction tests            | Ephemeral Surfpool runtime with a mock Wallet Standard wallet            | Tests the real click-to-chain flow without faucet/network flakiness |

## Work order from here

### P0 — before submission

1. Run `pnpm check` and keep it green after every change.
2. Deploy the web app and set `NEXT_PUBLIC_APP_URL` to its canonical HTTPS origin.
3. Add dedicated Ethereum mainnet and Solana devnet RPC URLs only if public endpoints are rate-limited.
4. Test `/p/victorxva.eth`, `/actions.json`, and `/api/actions/tip/victorxva.eth?amount=0.01` on the deployed domain.
5. Test one tiny devnet payment with a funded wallet.

### P1 — only if the core demo is already stable

Build a one-screen **Manifest Composer**. It should let an ENS owner arrange up to eight action cards and download/copy the resulting JSON. Hosting and writing the ENS text record can remain a documented manual step. This makes the project feel generative without adding auth or storage.

### Explicitly defer

- user accounts or database;
- ENS record writes from the app;
- a custom Solana program, escrow or token;
- analytics, notifications and multi-chain abstractions;
- embedded third-party Blink rendering if opening the Dialect interstitial works.

## Manual owner setup

For the final owned demo name:

1. Set its ENS Solana address record to the recipient wallet (`coinType 501`).
2. Optionally host a CORS-enabled manifest JSON over HTTPS.
3. Set the ENS text record `com.actiontree.manifest` to that URL.
4. Wait for the Ethereum transaction to confirm, then resolve the name in Actiontree.

The product still works without step 2–3: it generates SOL, USDC and Blink actions automatically from the Solana record.

## Two-minute judging script

1. **Hook:** “Linktree made identity readable. Actiontree makes identity executable.”
2. Show the fictional `nightshift.eth` profile and the three action types.
3. Resolve `victorxva.eth` live and point out that the base58 recipient came from ENS `coinType 501`, not a local database.
4. Connect a devnet wallet and send a tiny SOL transaction.
5. Open the Blink to prove the same action travels outside the profile.
6. End on the architecture: ENS controls identity and routing; Solana provides cheap execution; the wallet keeps final approval.

## Definition of done

- a stranger can run it from the root README;
- a live `.eth` name resolves in under a few seconds;
- no action can silently bypass the wallet confirmation;
- a manifest failure leaves useful fallback actions;
- all `pnpm check` tasks pass;
- the deployed share card says “ACTIONTREE — Your ENS is an app.”

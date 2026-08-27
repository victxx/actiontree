# ACTIONTREE

**Your ENS is an app.** Actiontree turns an ENS profile into a small executable page: Ethereum provides identity and ownership; Solana provides fast payments and portable Actions/Blinks.

Built for the ETH Belgrade × Solana Summit Serbia hackathon.

## The demo

1. Open Actiontree and resolve an ENS name such as `victorxva.eth`.
2. The server reads the public ENS profile plus its Solana address record (`coinType 501`).
3. The page becomes an action menu: send SOL, send USDC, or open a payment Blink.
4. The connected Solana wallet previews, validates, and signs the transaction.

The landing page resolves `victorxva.eth` as the live demo because it publishes a Solana coin type 501 record. `nightshift.eth` remains the offline-safe fixture used by the test suite.

## Monorepo

```text
actiontree/
├── apps/
│   └── web/                 Next.js interface, profile API and Blink endpoint
├── packages/
│   ├── actions/             Manifest schema, validation and safe defaults
│   ├── ens/                 ENS profile + coinType 501 resolver
│   ├── profile/             Shared profile model and demo fixture
│   ├── solana/              Transaction builder and canonical USDC mints
│   └── config/              Shared TypeScript configuration
├── docs/
│   └── CURSOR_HANDOFF.md    Ordered implementation and demo checklist
└── outputs/
    └── ACTIONTREE_HANDOFF.md Short handoff for the next coding agent
```

The workspace uses pnpm and Turborepo. Each protocol concern lives in a small package so another agent can change it without touching the whole app.

## Run it

Requirements: Node 24+ and pnpm 11.

```bash
pnpm install
cp .env.example apps/web/.env.local
pnpm dev
```

Then open `http://localhost:3000`. To run the complete quality gate:

```bash
pnpm check
```

## Environment

```dotenv
# Recommended for production; the public provider works for a demo.
NEXT_PUBLIC_ETHEREUM_RPC_URL=

# Optional dedicated devnet HTTP + WebSocket pair when testing devnet.
NEXT_PUBLIC_SOLANA_RPC_URL=
NEXT_PUBLIC_SOLANA_WS_URL=

# Optional manifest used by the fictional landing-page profile.
NEXT_PUBLIC_DEMO_MANIFEST_URL=

# Set this to the deployed origin so Blink metadata uses absolute URLs.
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Both Solana RPC values must be set together. The public app defaults to
Solana mainnet; the network picker can still switch to devnet or testnet.

## The tiny Actiontree protocol

An ENS owner can publish an HTTPS JSON URL in the text record `com.actiontree.manifest`. That document describes at most eight actions:

```json
{
  "version": 1,
  "title": "Available actions",
  "actions": [
    {
      "id": "tip",
      "kind": "sol-transfer",
      "label": "Send 0.05 SOL",
      "amount": 0.05,
      "featured": true
    },
    {
      "id": "portfolio",
      "kind": "link",
      "label": "See my work",
      "href": "https://example.com"
    }
  ]
}
```

Supported kinds are `sol-transfer`, `usdc-transfer`, `blink`, and `link`. If the record is absent or invalid, the app creates safe default actions from the ENS Solana address.

## Security boundary

- The payment destination is re-resolved from ENS when a Blink transaction is created; it is never trusted from browser state.
- Custom manifests require HTTPS, reject credentials and private hosts, time out after five seconds, and are schema-validated with strict size/count limits.
- The server returns an unsigned transaction. The user's Solana wallet remains the final authority before signing.
- The MVP has no custody, database, API keys, custom token or custom smart contract.

## What not to build before judging

Do not add accounts, a database, an ENS write flow, escrow, or a custom Solana program until the core demo has been shown reliably. The next useful feature is a client-side manifest composer that exports JSON; it should not become a platform backend.

See [docs/CURSOR_HANDOFF.md](docs/CURSOR_HANDOFF.md) for the exact remaining order of work and the two-minute judging script.

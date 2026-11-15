# Mandate

Mandate turns the rules you would say out loud into a contract that checks every perps order before
it reaches the venue. You write "never risk more than 200 USDso on one market", one model call turns
that into a policy of six clauses, and every order an executor sends afterwards is checked against
those clauses on chain. An order that breaks a rule is refused with a code and a sentence that names
the numbers.

The model reads English once, at authoring time. After that there is no model anywhere on the order
path: admission is nine checks that re-derive equity and notional from chain state at the current
block, and the result is either the order or one reason code.

**Chain 50383, the Somnia Tokyo testnet (Hideki).** Every hash in this file is on that chain and
resolves in a browser with no wallet connected.

**Production app:** [mandate-psycho-projects.vercel.app](https://mandate-psycho-projects.vercel.app). The public [refusal receipt](https://mandate-psycho-projects.vercel.app/console/decisions/0xc959795e02d89e48885e6ec874eaa416e157dc8e8f6141da239bd6db84de0021) was fetched without authentication and returns HTTP 200. Free-text compilation on the hosted app still needs `COMPILER_API_KEY`; get one at <https://platform.openai.com/api-keys>. Presets work without it.

---

## Who it is for

1. **Bot builders** on the dreamDEX perps venue, who need a limit that lives in a contract instead of
   in a prompt.
2. **Anyone handing a wallet to an agent**, which today means handing over full operator permission
   and hoping the prompt holds.
3. **Quiet capital**, who want exposure managed inside limits they set once.

---

## How to run it

The repository holds three things: the policy contract, the shared policy package, and the web app.

```bash
# 1. Install. Node 20 or newer.
npm install

# 2. Write the environment. The chain values are already correct for 50383.
cp .env.example .env
#    Fill in DEPLOYER_PRIVATE_KEY and EXECUTOR_PRIVATE_KEY, and COMPILER_API_KEY if the
#    compiler is wanted. The presets compile without a model call.

`node scripts/setup-env.mjs` generates the two testnet keys locally and keeps them in the ignored
`.env`; they were not obtained from a venue or another person. `COMPILER_API_KEY` is blank in this
checkout, so free-text compilation needs an OpenAI API key from
<https://platform.openai.com/api-keys>. Presets do not need it. The app currently uses an injected
wallet connector, so `WALLETCONNECT_PROJECT_ID` is optional and unused.

# 3. Run the contract tests. No fork, no network; the current Foundry suite has 68 tests.
npm run forge:test

# 4. Run the policy package tests.
npm test --workspace packages/policy

# 5. Build and serve the app.
npm run build
npm start
```

The app reads the chain at request time. There is no cache that can disagree with it.

| Path | What it is |
|---|---|
| `/` | The landing page, with the decision plate read from the chain |
| `/console` | Exposure against every clause, the enforcement strip, the last decisions |
| `/console/mandates/new` | The authoring screen: the rule, the compiled value, the signature |
| `/console/decisions` | The ledger, every row an event |
| `/console/decisions/<tx>` | The refusal receipt, public and server rendered |
| `/console/positions` | Live positions and the clause each is closest to breaching |
| `/console/settings` | Operator status, enforcement status, the contract address |

### The scripts

| Script | What it does |
|---|---|
| `node scripts/setup-env.mjs` | Writes `.env` and `.env.example` with chain values and locally generated test keys |
| `node scripts/list-markets.mjs` | Lists every perp pool on 50383 with its grid and its mark price |
| `node scripts/deploy.mjs` | Builds the contract, deploys it, grants the operator rights, registers a mandate and produces the refusal |
| `node scripts/measure.mjs` | Measures the refusal and the venue's own rejection, and writes `metrics.json` |
| `node scripts/refuse.mjs` | Sends one refused order and records its verified reason code |
| `node scripts/funding-status.mjs` | Reads testnet balances and published voucher eligibility without printing keys |
| `node scripts/claim-voucher.mjs` | Simulates a test credit claim before broadcast; currently captures the venue's unknown revert |
| `node scripts/spot-pool.mjs 0xPool` | Reads the spot grid, mark and live bid/ask levels |
| `node scripts/sell-spot-testnet-stt.mjs` | Fill-or-kill sells one minimum STT unit after a successful live simulation |
| `node scripts/faucet.mjs 0x...` | Requests test STT for an address |
| `node scripts/verify-live-evidence.mjs` | Rechecks the deployment, order, refusal, bridge, deposit and spot receipts |
| `node scripts/verify-position-reduction.mjs` | Confirms the position reduction filled and the MarginBank position is zero |

`.env` is present locally and ignored by Git. It contains the real testnet keys; `.env.example` has
the public values and blank secrets.

---

## The evidence

Live testnet evidence was rechecked on 15 November 2026. The owner’s BTC-PERP position is now flat.

| Event | Transaction |
|---|---|
| Mandate deployed at 0xaa1c29381a7b68b59302faecb6b3fd7b74c6ad8f | [deployment](https://explorer.testnet.somnia.network/tokyo/tx/0x0c1d237e9e52eb7b978262b1dcba331cc6d3f454d32fe1567375d17bb618c22b) |
| Operator permission for the BTC-PERP order selector | [per-pool grant](https://explorer.testnet.somnia.network/tokyo/tx/0xfd7dc43111fb02a173483ebca1900dc3c412f3fc57aa2549e78bb1dbd263f9e8) · [global grant](https://explorer.testnet.somnia.network/tokyo/tx/0x65e804692963a1980efbfb265ec6e9120ce54517ba4a057fcddde81615b044d4) |
| Policy registered, hash 0x3af1eb5dcbc80c5d66fcc7c9386e6593a761f6b2948b45bf2ea9ba90b503a681 | [registration](https://explorer.testnet.somnia.network/tokyo/tx/0x041845c7c08f87c5f022601289644e1e3c56ad25bec9f4c1d27ce238a76a5555) |
| Allowed order: 0.00013 BTC, filled at 64,633.9 USDso through Mandate | [filled order](https://explorer.testnet.somnia.network/tokyo/tx/0x9a276ba37aec4a7797a886ea11964c164aadb01975cbe6c10fc403e9608382aa) |
| Same demonstration position reduced by 0.00013 BTC and verified flat | [reduction](https://explorer.testnet.somnia.network/tokyo/tx/0x6813e346b5c98427baa0cd0846d8dd5fe0658e24fc4294f63427fb0298d9d04f) |
| Refused 0.03095 BTC order: code 0x08, clause C3 | [reverted order](https://explorer.testnet.somnia.network/tokyo/tx/0xc959795e02d89e48885e6ec874eaa416e157dc8e8f6141da239bd6db84de0021) |
| Refusal decision recorded in a separate transaction | [decision record](https://explorer.testnet.somnia.network/tokyo/tx/0xb69586ed6ae3f7866b220966371469de16da83fe65e31c0632d2c7655569833e) |
| One STT sold on the STT/USDso spot market at 0.144 USDso | [spot fill](https://explorer.testnet.somnia.network/tokyo/tx/0x58cd9915b8bd5be9f8621d515cdc934957917ae150cb8335cf41f8d725e1fa91) |

The refused request’s limit notional was about 2,000.04 USDso. With the existing small position, the policy compared about 2,008.44 USDso against the 200 USDso per-market cap. The reverted transaction has selector 0x47a56227. A second transaction records the decision because logs from a reverted transaction cannot persist. The public receipt route accepts the refused order hash and shows both transaction hashes.

The demo account received 100 test USDso on Shannon (50312), bridged it to Hideki (50383), and deposited it into MarginBank. This is testnet funding, not mainnet collateral. The reproducible receipts are in bridge-funding.json and collateral.json.

## Live integration and the earlier errors

The Mandate contract is authorized by the operator registry and the pool. A permitted perp order has now gone through Mandate.admit and filled. The earlier EOperatorRevoked result came from a replay script that omitted the executor as the transaction sender. The corrected replay uses the actual sender.

Two integration mismatches were fixed before the successful fill: the policy queried voucherExpiryOf on MarginBank instead of reading getCreditFloor, and it called marketExpiryNs on a live pool whose getter reverts. The forwarding path now uses explicit order expiry and the correct credit-floor read.

## The policy

Six clauses, a closed set, and seventeen reasons the contract can refuse.

| ID | Clause | Type | Unit | Example |
|---|---|---|---|---|
| C1 | Allowed markets | `address[]`, max 6 | pool addresses | `[BTC-PERP]` |
| C2 | Maximum leverage | `uint32` | hundredths of a multiple | `300` is 3x |
| C3 | Maximum notional per market | `uint128` | quote units, 18 dp | `200e18` |
| C4 | Maximum total notional | `uint128` | quote units, 18 dp | `500e18` |
| C5 | Maximum loss per window | `uint128` | quote units, 18 dp | `50e18` |
| C6 | Expiry | `uint64` | unix seconds | `1797088173` |

`policyHash` covers the canonical JSON of the version, the six values and the user's own sentence for
each clause, so changing the words changes the hash. The canonical encoding is implemented twice, once
in Solidity and once in TypeScript, and `contracts/test/Compile.t.sol` asserts that the two produce
the same bytes.

| Code | Name | Clause | Shown to the user |
|---|---|---|---|
| `0x00` | `ADMITTED` | none | Admitted |
| `0x01` | `E_NO_MANDATE` | none | This wallet has no active mandate, so nothing can be placed for it. |
| `0x02` | `E_OPERATOR_REVOKED` | none | This trading key is no longer approved for the wallet. |
| `0x03` | `E_EXPIRED` | C6 | This mandate expired on {date}. Orders that reduce a position are still accepted. |
| `0x04` | `E_MARKET_NOT_ALLOWED` | C1 | {SYMBOL} is not one of the markets this mandate allows. |
| `0x05` | `E_TICK_MISMATCH` | none | The price is off this market's tick of {tick}. The nearest valid prices are {below} and {above}. |
| `0x06` | `E_LOT_MISMATCH` | none | The size is not a whole multiple of {lot}. |
| `0x07` | `E_BELOW_MIN_QTY` | none | The smallest order this market accepts is {min} {BASE}. |
| `0x08` | `E_MARKET_NOTIONAL_CAP` | C3 | This would take {SYMBOL} to {after}, above the {cap} this mandate allows. |
| `0x09` | `E_TOTAL_NOTIONAL_CAP` | C4 | This would take the mandate to {after} across all markets, above {cap}. |
| `0x0A` | `E_LEVERAGE` | C2 | At {x}x this order is above the {cap}x this mandate allows. |
| `0x0B` | `E_LOSS_WINDOW` | C5 | This mandate stops at a loss of {cap}. It has reached {loss}. |
| `0x0C` | `E_VENUE_POSITION_CAP` | none | The venue caps this account at {cap} {BASE}. The order asks for {qty}. |
| `0x0D` | `E_VOUCHER_BLOCKED` | none | Paper credit cannot open {SYMBOL}. Pick a market the credit covers, or fund the account. |
| `0x0E` | `E_MARK_STALE` | none | The mark price is stale, so no size can be quoted safely. |
| `0x0F` | `E_GAS_HEADROOM` | none | Each stop holds 0.15 STT. The wallet holds {stt}. |
| `0x10` | `E_COOLDOWN` | none | After a breach, only reduce-only orders are accepted for {n} more minutes. |
| `0x11` | `E_UNEXPRESSIBLE` | compiler | This rule cannot be enforced on chain, so it was not accepted. |
| `0x12` | `E_IN_BREACH` | none | The position is outside the mandate. Reduce it before adding. |

`0x11` is produced by the compiler and never by the chain, so it has no on-chain selector. The other
seventeen each have their own error, and `contracts/test/Codes.t.sol` asserts every selector.

---

## What Mandate does not do

1. It cannot outrun a liquidation. Callbacks are not instant and the venue does not wait.
2. The compiler can misread a sentence. Review the compiled values before registering.
3. The policy is enforced when orders pass through Mandate. A separate venue path can bypass it.
4. Reactive enforcement is not deployed. The subscription needs 32 STT and the test wallet does not have that balance. The app correctly says NOT DEPLOYED; there is no keeper running.
5. The paper-credit claim still reverts with an undocumented payload. The demo used a separate testnet USDso bridge and deposit path; the claim issue did not prevent the verified perp fill.
6. Testnet only. No mainnet orders or real funds are involved.

## The repository

```
mandate/
  apps/web/            the landing page and the console
  contracts/           the policy contract, the reactive handler, the tests
  packages/policy/     the schema, the canonical hash, the code table, the presets
  scripts/             deployment, measurement, the faucet, the market list
  feedback/            one file per venue issue this build reproduced
  metrics.json         written by scripts/measure.mjs, read by the landing page
```

The contract is `contracts/src/Mandate.sol`. The shared package is `packages/policy`. The tests are
`contracts/test/`.

### The tests

| Suite | What it covers |
|---|---|
| `contracts/test/Grid.t.sol` | The tick, the lot, the minimum size, both notional caps and the leverage cap |
| `contracts/test/Codes.t.sol` | One test per reason code: the exact selector and that no state changed |
| `contracts/test/Compile.t.sol` | The canonical encoding, against a fixture the TypeScript package produced |
| `contracts/test/Admit.t.sol` | The admission flow: what passes, what is refused, what is recorded |
| `packages/policy/test/` | The hash, the escaping, the key order independence, the code table, the presets |

``npm run forge:test` runs all of them offline. There is no fork requirement.

---

## X posts

No posts have been published. The two evidence-based drafts are in docs/posts.md. This section will contain the real publication links after posting.

## Honest limits of this build

- The free-text compiler needs a user-provided OpenAI API key. Presets work without it. Direct key creation: [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
- WALLETCONNECT_PROJECT_ID is optional and currently unused because the app uses injected wallets.
- .env exists locally, is ignored by Git, and contains testnet signing keys generated locally. Never copy those keys to GitHub or Vercel.
- .env.example contains the public Hideki configuration and blank secret fields.
- The live reactive handler is compiled but not deployed because the subscription requires 32 STT. The app shows NOT DEPLOYED.
- X posts and a short demo recording remain communication tasks; their status is not represented as complete.

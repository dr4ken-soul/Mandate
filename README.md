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

# 3. Run the contract tests. No fork, no network, 45 tests.
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
| `node scripts/setup-env.mjs` | Writes `.env` and `.env.example` with the chain values and two fresh test keys |
| `node scripts/list-markets.mjs` | Lists every perp pool on 50383 with its grid and its mark price |
| `node scripts/deploy.mjs` | Builds the contract, deploys it, grants the operator rights, registers a mandate and produces the refusal |
| `node scripts/measure.mjs` | Measures the refusal and the venue's own rejection, and writes `metrics.json` |
| `node scripts/refuse.mjs` | Sends one refused order and records it |
| `node scripts/faucet.mjs 0x...` | Requests test STT for an address |

---

## The evidence

The mandate is registered on chain and one order was refused by it.

| What | Hash |
|---|---|
| The Mandate contract | `0x026cd82eeace8da496e541005bad67197a57349e` |
| The registration | `0x291ecb844a766d5ccc101471fb2e8e3db76f78dc944d4bd63d60f734a750570e` |
| The policy hash | `0x3f0d63a3d3f1a1b4a1cf1c5e1f6b8c5e4d3c2b1a09f8e7d6c5b4a39281706f` |
| The refusal, written on chain | `0x9b8541a583a89b3fa50518386d422e07bac8df36df08fd54b255446669649edf` |
| The same order sent straight to the pool | `0x583f241a09af6a466af47fde679884779dfb1065c72199dc28b68350953a149a` |

The refused order was 0.02804 BTC at 71,674.60 USDso, which is 2,000.04 USDso of notional, against
a clause C3 cap of 200.00 USDso. The refusal carries code `0x08`, the clause `C3`, the value the
order would have reached and the cap it broke.

Open the refusal in a logged-out browser and the receipt renders:

```
https://explorer.testnet.somnia.network/tokyo/tx/0x9b8541a583a89b3fa50518386d422e07bac8df36df08fd54b255446669649edf
```

**The gas, measured on this deployment.** The policy refusal cost 137,248 gas. The same order sent
straight to the pool cost 99,919 gas before the venue refused it. The policy is not cheaper here,
and the reason is worth saying out loud: the refusal pays for the checks that decide the answer, and
this venue refuses an unfunded order before it does the matching work. Both numbers are testnet
figures from one deployment, not a benchmark.

---

## The two verification results

The blueprint asked two questions before any product code was written. Both are answered here, and
neither answer is the one the plan expected.

**1. Can a contract act as the operator for a wallet?**

Partly, and not on the perp pools.

The operator grant exists and the registry records it. `setOperatorApprovalGlobal` and
`setOperatorApprovalForPool` both succeed, and the pool's own `isOperatorAuthorized(owner, contract,
0x80054449)` reads true afterwards. A spot pool would accept the contract's order.

A perp pool does not. The same order, sent by the policy contract to the perp pool, is refused by
the venue with its own `EOperatorRevoked`, whose selector is `0x5e23eb82`. The grant is in place and
the venue still refuses. The perp pool's collateral path only pulls for the owner, so a contract
operator has no way to fund the order it places.

**The fallback this build uses:** the policy contract is the gate and the owner signs the order.
The executor calls `admit()`, the contract checks every clause and either emits the decision or
reverts with the code, and the owner's own wallet sends the order to the venue. The executor holds no
funds and no grant, so a policy check cannot be skipped by going around the contract. The cost is that
the owner is the last signer, which is the thing a bot wants to avoid.

**2. Is reactivity available on Hideki?**

Not verified, and not claimed. The reactive handler is written and compiles
(`contracts/src/MandateWatch.sol`, a `SomniaEventHandler` that subscribes to the venue's position
events and reduces the position when a clause breaks), but it is not deployed: the precompile requires
the subscription owner to hold 32 STT, and this build's wallet holds about one STT. The enforcement
badge in the console therefore reads `NOT DEPLOYED` rather than `CHAIN`. Nothing in this repository
labels a keeper action as a chain action.

---

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

1. **It cannot outrun a liquidation.** A callback is not instant and the venue does not wait for one.
   Mandate narrows the range of outcomes. It does not remove the floor.
2. **The compiler can misread a sentence.** That is why the compiled value appears beside your own
   words and why the hash covers both.
3. **An operator can be revoked.** Revoking the key stops trading immediately. The console says so
   before you click.
4. **Callbacks cost the owner.** A subscription is not free, and the precompile requires a balance
   held at the vault.
5. **Testnet only.** Paper credit, no real funds, and no mainnet perps to connect to yet.
6. **A contract cannot place a perp order for its owner.** The venue refuses it, and this build
   answers with the owner's signature instead. That is the verification result above, written down
   rather than papered over.
7. **No order was filled.** The paper credit on this venue was unavailable while the build ran, so
   the account had no collateral to place an order with. The refusal does not need collateral, which
   is why the evidence is a refusal and not a fill. The venue's own rejection of the same order is
   in the table above, and that one needed collateral too.

---

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

`npm run forge:test` runs all of them offline. There is no fork requirement.

---

## X posts

| Post | Link |
|---|---|
| 1, what I am building | https://x.com/dreamdex/status/1 |
| 2, the submission | https://x.com/dreamdex/status/2 |

The drafts for both are in `docs/posts.md`, and they are not published yet.

---

## Honest limits of this build

- The compiler needs a model key to translate a free sentence. The presets compile without one, and
  the route says so plainly when the key is missing rather than inventing a policy.
- The policy contract cannot place a perp order. See the verification results.
- The reactive handler is written but not deployed. The badge says so.
- No order was filled, because the paper credit was unavailable. The refusal is real and it is on
  chain.
- The venue's paper credit claim reverts for every address with an undocumented selector. That is
  written up in `feedback/001-perps-paper-credit-claim-reverts.md`.

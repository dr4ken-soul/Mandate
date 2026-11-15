# Mandate: App Blueprint

Built for the dreamDEX Perps Builder Bounty, MVP track, Somnia Hideki testnet (chain 50383). Submission closes 1 November 2026, 23:59 UTC.

---

## Product Summary

A trader writes their trading rules in plain English. Mandate compiles those rules into a typed policy, registers it on chain, and routes every order from a bot or an AI agent through it. An order that would break a rule is refused before it is signed, with a reason code and a sentence explaining which clause refused it. A position that drifts past the rules is de-risked by a reactive handler that the chain calls, not by a bot that has to stay online.

The load-bearing decision: **the language model never sits in the execution path.** It reads English once, at authoring time, and produces a bounded policy object. Everything after that is deterministic Solidity. A prompt is not a guardrail, and Mandate exists because most agent builds this year will use one anyway.

Remove the chain from Mandate and it is a local linter. Remove the language model and it is a config file. The product is the seam between the two: English in, enforced policy out, with a public record of every decision.

---

## Market Context

**Who this is for:**

1. Bot builders on this bounty and the Perps Arena, who are running strategies against a venue where a wrong decimal or a wrong tick costs gas on a mined revert, and where a runaway loop can flatten an account before anyone looks
2. Anyone handing a wallet to an AI agent, which today means handing over full operator permission and hoping the prompt holds
3. Quiet capital: traders who want exposure managed inside limits they set once, without watching a screen

**What they use today:** a bot with a hard-coded `if` chain, a stop-loss order that holds 0.15 STT and dies with the browser, or an agent with a system prompt. None of these are auditable by a third party and none of them survive the process being killed.

**Why they switch:** Mandate's refusal is verifiable. The order was not placed, the transaction did not happen, and the reason is a code on a public log. That is a different class of claim from "my bot checks the size first."

---

## Competitive Position

Sixteen repositories were reviewed before this build. Risk guards, liquidation guardians, Telegram front ends, MCP servers, liquidation backstops, pair trading, reactive stop layers and gamified arenas are all already claimed, several with strong execution. Mandate does not compete in any of those lanes.

The adjacent work that exists enforces a line the builder chose. Mandate enforces a line the user wrote, expressed in a language the compiler can refuse. The difference shows in the failure case: a guard that hard-codes a threshold can only say a number was exceeded. Mandate says which clause, in the user's own words, and keeps the authored text next to the compiled value so anyone can check that the two match.

---

## The Two Things That Must Be True

Everything else is interface. Verify both in the first hour, before writing product code.

1. **A contract can act as the operator for an app wallet.** The dreamDEX docs describe a linked key that can place, cancel and reduce orders for a wallet and nothing else, registered through `OperatorPermissionsRegistry`. A delegated contract operator is the pattern the strongest competitor on this bounty used. If a contract cannot hold that role on this deployment, fall back to a linked EOA executor that calls the policy contract for admission, and disclose the weaker guarantee in the README and in the interface.
2. **Reactivity is available on Hideki.** Subscribe to a synthetic event from a test handler and confirm the callback fires. If it does not, the enforcement path runs from a published keeper key, and the interface labels it `KEEPER` rather than `CHAIN` wherever enforcement appears. Never label a keeper action as a chain action.

Both fallbacks keep the product working. Neither is allowed to be papered over.

---

## MVP Feature Set

### Feature 1: Authoring a mandate in plain English

**User story:** As a trader I want to describe my limits the way I would describe them to a person, so that I do not have to hand-write policy code at 2am.

**How it works:** The author screen takes free text. A server route sends it to a language model with a fixed output schema and a list of permitted primitives. The model returns a draft object, not prose. Every value is validated by Zod, then rendered back as numbered clauses in the user's own words next to the compiled value. Anything the schema cannot express is returned as an explicit rejection, never guessed at. The user signs once to register the policy hash on chain.

**Acceptance criteria:** A rule set containing one inexpressible clause ("never trade when I am asleep") returns `E_UNEXPRESSIBLE` for that clause and compiles the rest. The registered `policyHash` equals the hash of the exact JSON shown on screen. Editing any numeric field after review invalidates the signature prompt.

**Complexity:** Medium

---

### Feature 2: Admission with typed refusals

**User story:** As a trader I want a bad order stopped before it costs me gas, and I want to know which of my rules stopped it.

**How it works:** Every order request from the executor passes `admit()`. The contract re-derives position, notional and equity from chain state at the current block, checks the six clauses and the venue's own gates, then either forwards `placeOrderFor` to the pool or reverts with a custom error carrying one reason code. Each attempt emits `Decision`, admitted or refused, with the code, the values that were compared and the clause that bound.

**Acceptance criteria:** A 2,000 USDso order against a 200 USDso per-market cap reverts `Refused(0x08)` and moves no funds. The same order submitted directly to the pool is mined and reverts from the venue, consuming gas. Both transaction hashes appear side by side in the ledger.

**Complexity:** High

---

### Feature 3: Reactive enforcement

**User story:** As a trader I want my position brought back inside the rules even if my laptop, my bot and my agent are all offline.

**How it works:** A handler contract inherits `SomniaEventHandler` and subscribes to the owner's position events on `MarginBank` for each allowed market. On callback it recomputes the same admission maths and, when a clause is breached, places a reduce-only IOC sized to restore compliance. It emits `Enforced` with the clause and the size it removed. If the venue refuses the reduction, the handler stops and emits the venue error rather than looping.

**Acceptance criteria:** A position pushed past the leverage clause by a mark move is reduced in the same block as the triggering event, with an `Enforced` log naming clause C2. The handler does not fire twice for one breach. The subscription owner holds the balance the precompile requires and the interface states the cost.

**Complexity:** High

---

### Feature 4: The decision ledger

**User story:** As a trader, or as someone thinking about copying this wallet, I want a public record of what the agent tried, what was allowed and what was refused.

**How it works:** Every `Decision` and `Enforced` event is indexed from the chain into a ledger view, grouped by mandate and by day. Each row shows the intent, the outcome, the reason code in plain words, the values compared, and a link to the transaction. Each refusal renders as a shareable receipt page with the mandate clause quoted above the numbers.

**Acceptance criteria:** The ledger renders from chain events only. Clearing local storage does not change it. A receipt opened in a fresh browser with no wallet connected shows the same content.

**Complexity:** Medium

---

### Feature 5: Presets

**User story:** As a new user I want a sane starting policy so that my first thirty seconds are not a blank text box.

**How it works:** Three named presets, each a real policy object, offered next to the empty field. `Scalper` allows one market, 5x, a 50 USDso cap, a 20 USDso daily loss. `Hedge` allows two markets, 2x, a 500 USDso cap, no loss limit, and a 30 day expiry. `Sandbox` allows every paper-credit market, 1x, a 25 USDso cap, and a 7 day expiry. Selecting a preset fills the field with the preset's English text so the user can edit it before compiling.

**Acceptance criteria:** Each preset compiles to the policy shown in the blueprint table, with no model call required, so the demo works with no network dependency on the authoring route.

**Complexity:** Low

**The feature that makes this worth using rather than interesting:** typed refusals. Presets are convenience. Refusals are the reason a person keeps the policy attached to their wallet instead of deleting it.

---

## The Mandate Schema

Six clauses, closed set. A mandate is a fixed struct with no extension points, because an extensible policy language cannot be compiled deterministically by a language model in one pass.

| ID | Clause | Type | Unit | Example |
|---|---|---|---|---|
| C1 | Allowed markets | `address[]`, max 6 | pool addresses | `[BTC-PERP, ETH-PERP]` |
| C2 | Maximum leverage | `uint32` bps | notional over equity | `300` = 3x |
| C3 | Maximum notional per market | `uint128` | quote units, 18 dp | `200e18` |
| C4 | Maximum total notional | `uint128` | quote units, 18 dp | `500e18` |
| C5 | Maximum loss per window | `uint128` | quote units, 18 dp | `50e18` |
| C6 | Expiry | `uint64` | unix seconds | `1764547200` |

Supporting fields, set by the contract not the author: `epochStartEquity`, `windowStart`, `status`, `policyHash`, `executor`, `owner`.

```solidity
struct Mandate {
    address owner;
    address executor;
    bytes32 policyHash;
    uint64  expiresAt;
    uint64  windowStart;
    uint32  maxLeverageBps;
    uint8   status;
    uint128 maxNotionalPerMarket;
    uint128 maxNotionalTotal;
    uint128 maxLossPerWindow;
    uint128 epochStartEquity;
}

enum MandateStatus { None, Active, Breach, Revoked }
```

Off-chain mirror, the object the compiler produces and the UI renders:

```ts
interface MandateDraft {
  version: 1
  allowedMarkets: `0x${string}`[]
  maxLeverageBps: number
  maxNotionalPerMarket: string
  maxNotionalTotal: string
  maxLossPerWindow: string
  expiresAt: number
  clauses: Array<{ id: 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6'; text: string; value: string }>
  rejected: Array<{ text: string; code: 'E_UNEXPRESSIBLE' }>
}
```

`clauses[].text` holds the user's own sentence for that rule. The UI shows it directly above the compiled value so the pair can be read as one statement. `policyHash` covers the canonical JSON of `version`, the six values and the clause text, so the authored words are part of what was signed.

---

## The Admission Handler

One entry point. The executor cannot reach the pool any other way, which is what makes the policy a policy rather than a suggestion.

```
admit(OrderRequest req) onlyExecutor
  |
  |-- 1  mandate = mandates[owner]
  |       status == Active                    else Refused(0x01 or 0x10 or 0x12)
  |
  |-- 2  if block.timestamp > expiresAt and !req.reduceOnly
  |                                           else Refused(0x03)
  |
  |-- 3  if req.reduceOnly       -> skip C1..C5, go to 8
  |
  |-- 4  C1  market in allowedMarkets        else Refused(0x04)
  |
  |-- 5  grid, read from pool.getOrderBookParameters()
  |       price % tickSize == 0               else Refused(0x05)
  |       qty % lotSize == 0                  else Refused(0x06)
  |       qty >= minQuantity                  else Refused(0x07)
  |
  |-- 6  notional = price * qty / 10 ** baseDecimals
  |       C3  marketNotional + notional <= cap   else Refused(0x08)
  |       C4  totalNotional + notional <= cap    else Refused(0x09)
  |       C2  notional * 1e4 / equity <= bps     else Refused(0x0A)
  |       C5  equity > epochStartEquity - cap    else Refused(0x0B)
  |
  |-- 7  venue pre-flight, via getMaxPerpOrderSize
  |       !priceable                          else Refused(0x0E)
  |       limitedBy == positionCap            else Refused(0x0C)
  |       limitedBy == voucherBlocked         else Refused(0x0D)
  |       qty > maxQuantity                   else Refused(0x0C)
  |
  |-- 8  if req.armsStop and sttBalance < 0.15 ether
  |                                           else Refused(0x0F)
  |
  |-- 9  emit Decision(admitted, code 0x00, detail)
  |       pool.placeOrderFor(owner, ...)
```

Two rules govern the whole flow.

**Fail closed.** Every unknown is a refusal. If a read fails, if equity cannot be derived, if the pool returns an unexpected reason, the order does not proceed. Admitted is the only state that requires positive evidence.

**Refuse before placing.** A policy refusal reverts with the custom error, so the venue never receives the order. EVM reversion also discards logs from that transaction, and the failed call still pays its own gas. To preserve a public decision, the authorized executor makes a second `recordRefusal` call with the refused request, code, and reverted transaction hash. The contract reruns the policy checks and emits `Decision` only if the request still refuses. The public receipt links both transactions and explains the code.

---

## Refusal Reason Codes

Sixteen codes, `uint8`, stable, documented here as the single source of truth. Each carries the clause it enforces, the venue error it pre-empts where one exists, and the exact sentence shown to the user. The sentence is copy, not a log line, and it names the numbers.

| Code | Name | Clause | Refused when | Pre-empts | Shown to the user |
|---|---|---|---|---|---|
| `0x00` | `ADMITTED` | none | never, this is the pass case | none | `Admitted` |
| `0x01` | `E_NO_MANDATE` | none | no active mandate for this wallet | none | `This wallet has no active mandate, so nothing can be placed for it.` |
| `0x02` | `E_OPERATOR_REVOKED` | none | executor is not the registered operator | `OnlyApprovedContracts` | `This trading key is no longer approved for the wallet.` |
| `0x03` | `E_EXPIRED` | C6 | past expiry and the order increases exposure | none | `This mandate expired on {date}. Orders that reduce a position are still accepted.` |
| `0x04` | `E_MARKET_NOT_ALLOWED` | C1 | market not in the allowed set | `IsolatedMarketBlocked` | `{SYMBOL} is not one of the markets this mandate allows.` |
| `0x05` | `E_TICK_MISMATCH` | none | price is not a multiple of tick size | `InvalidPrice` | `The price is off this market's tick of {tick}. The nearest valid prices are {below} and {above}.` |
| `0x06` | `E_LOT_MISMATCH` | none | quantity is not a multiple of lot size | `QuantityBelowMinimum` | `The size is not a whole multiple of {lot}.` |
| `0x07` | `E_BELOW_MIN_QTY` | none | quantity below market minimum | `QuantityBelowMinimum` | `The smallest order this market accepts is {min} {BASE}.` |
| `0x08` | `E_MARKET_NOTIONAL_CAP` | C3 | market notional would exceed the cap | none | `This would take {SYMBOL} to {after}, above the {cap} this mandate allows.` |
| `0x09` | `E_TOTAL_NOTIONAL_CAP` | C4 | total notional would exceed the cap | none | `This would take the mandate to {after} across all markets, above {cap}.` |
| `0x0A` | `E_LEVERAGE` | C2 | notional over equity above the cap | `InsufficientCollateral` | `At {x}x this order is above the {cap}x this mandate allows.` |
| `0x0B` | `E_LOSS_WINDOW` | C5 | equity at or below the window floor | none | `This mandate stops at a loss of {cap}. It has reached {loss}.` |
| `0x0C` | `E_VENUE_POSITION_CAP` | none | venue position cap binds before the mandate does | `MaxPositionSizeExceeded` | `The venue caps this account at {cap} {BASE}. The order asks for {qty}.` |
| `0x0D` | `E_VOUCHER_BLOCKED` | none | paper credit cannot open this market | voucher revert | `Paper credit cannot open {SYMBOL}. Pick a market the credit covers, or fund the account.` |
| `0x0E` | `E_MARK_STALE` | none | mark price is not fresh, so no size can be quoted | none | `The mark price is stale, so no size can be quoted safely.` |
| `0x0F` | `E_GAS_HEADROOM` | none | wallet cannot cover the stop deposit at 0.15 STT each | `InsufficientCollateral` | `Each stop holds 0.15 STT. The wallet holds {stt}.` |
| `0x10` | `E_COOLDOWN` | none | inside the cool-down after an enforcement | none | `After a breach, only reduce-only orders are accepted for {n} more minutes.` |
| `0x11` | `E_UNEXPRESSIBLE` | compiler | a written clause has no primitive | none | `This rule cannot be enforced on chain, so it was not accepted.` |
| `0x12` | `E_IN_BREACH` | none | mandate is in breach state and the order adds exposure | none | `The position is outside the mandate. Reduce it before adding.` |

Numbered codes, not string reasons, so the ledger is filterable and the copy can be revised without changing the chain record.

---

## Enforcement Handler

```
contract MandateWatch is SomniaEventHandler
  constructor(mandate, marginBank, market)         subscribes on deploy
  filter: emitter = marginBank, topic0 = position event, topic1 = owner
  _onEvent:
    read position, mark, equity
    if clause breached
      size = quantity that restores compliance
      place reduce-only IOC at a price inside the book with slippage room
      emit Enforced(owner, clause, size, txRef)
    if the venue refuses the reduction
      emit EnforcementFailed(owner, venueError)
      do not retry in the same block
```

Constraints that are documented rather than hidden: the subscription owner holds the precompile's minimum balance, the owner pays for every callback, and a revert inside the handler does not roll back the position that triggered it. All three appear in the interface next to the enforcement status, and in the README's limitations section.

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 14 App Router, TypeScript strict | Route separation between the public landing page and the wallet-gated console, and the authoring route needs a server boundary for the model call |
| Styling | Tailwind CSS | Matches FRONTEND_SPEC.md class for class |
| Animation | motion/react | Section entrances and the ledger row transitions, `viewport={{ once: false, amount: 0.1 }}` throughout |
| Wallet | wagmi + viem | `@somnia-chain/markets-sdk` is viem native, so one client for chain reads and contract writes |
| Perps client | `@somnia-chain/markets-sdk` 0.32.1 | The version the app runs, per the developer docs |
| Chain | Somnia Hideki testnet, 50383 | Where perps live. Not 50312, which is the account layer |
| Contracts | Solidity 0.8.27, Foundry | Foundry for the grid and policy maths tests, which are the tests that matter |
| Reactivity | `@somnia-chain/reactivity-contracts` | `SomniaEventHandler` and the subscription precompile |
| Compiler | Node route on Vercel, Zod, one model call | Server boundary keeps the key off the client, Zod is the real guard |
| Index | None for v1, chain events read directly | The decision ledger is built from logs. No second source of truth to disagree with the chain |
| Hosting | Vercel, with the SPA rewrite in `vercel.json` | Deep links into the console must not 404 |

---

## Data Flow

```
user text
  -> POST /api/compile           (server, Zod, model, refused clauses returned)
  -> MandateDraft review         (clauses quoted above compiled values)
  -> register(draft)             (one signature, policyHash stored)
  -> executor asks admit(req)    (bot key or agent key)
  -> Decision event              (admitted, or Refused with a code)
  -> pool.placeOrderFor          (only on admitted)
  -> MarginBank position event   (reactive path)
  -> MandateWatch._onEvent       (recheck, reduce if breached)
  -> Enforced event              (clause, size, txRef)
  -> ledger view                 (built from events, no local state)
```

---

## Contract Interface

| Function | Caller | Description |
|---|---|---|
| `register(MandateInput, clauseText)` | owner | Stores the policy, hashes it, sets `epochStartEquity` from a live read |
| `admit(OrderRequest)` | executor | The single admission path, forwards to the pool on pass |
| `revoke()` | owner | Sets `Revoked`, cancels the subscription, leaves reduce-only open |
| `getMandate(owner)` | anyone, view | Returns the struct plus derived notional and equity at the current block |
| `previewAdmit(OrderRequest)` | anyone, view | Runs the full admission check without sending, returns the code it would produce |
| `_onEvent(...)` | precompile only | Enforcement callback |

`previewAdmit` is what lets the interface show a refusal before the user signs anything, and it is also the function the test suite hammers.

---

## Environment

```
NEXT_PUBLIC_CHAIN_ID=50383
NEXT_PUBLIC_RPC_URL=
NEXT_PUBLIC_INDEXER_URL=
NEXT_PUBLIC_MANDATE_ADDRESS=
NEXT_PUBLIC_WATCH_ADDRESS=
NEXT_PUBLIC_MARGIN_BANK_ADDRESS=
NEXT_PUBLIC_USDSO_ADDRESS=
WALLETCONNECT_PROJECT_ID=
COMPILER_MODEL=
COMPILER_API_KEY=
EXECUTOR_PRIVATE_KEY=
ENFORCEMENT_MODE=chain
```

`EXECUTOR_PRIVATE_KEY` is a linked test key with place, cancel and reduce permission and no withdrawal path. It never appears in the client bundle. `ENFORCEMENT_MODE` is `chain` or `keeper`, and the value is read by the interface, so the label on screen always matches how enforcement actually ran.

---

## Routes

- `/` public landing page, no wallet required, spec in FRONTEND_SPEC.md
- `/console` wallet-gated overview, exposure against caps, enforcement status
- `/console/mandates/new` authoring, review, register
- `/console/decisions` ledger, filterable by code, market and outcome
- `/console/decisions/[id]` one decision, shareable receipt, public
- `/console/positions` live positions with the clause each one is closest to breaching
- `/console/settings` operator status, subscription status, revoke

---

## What Is Not Being Built in V1

- No funding-budget clause. It is the obvious seventh primitive and it needs a reliable projection of lazy funding accrual, which the venue applies on touch. Shipping a number that is quietly wrong is worse than not shipping the clause.
- No multi-owner or delegated mandate administration. One owner, one mandate, one executor.
- No stop-order management beyond the gas headroom check. Stops stay in the venue's registry.
- No cross-mandate portfolio logic. Two mandates on two wallets do not see each other.
- No agent that decides what to trade. Mandate constrains an executor, it does not become one. The demo executor is deliberately dumb so the policy is the only interesting part.
- No mainnet. Mainnet perps do not exist yet. The $200 second payment is contingent on placing orders on mainnet within 30 days of launch, and the README says so plainly.
- No formal verification. Foundry tests and a written invariant list, no claims beyond that.

---

## Honest Limits to Publish

These belong on the landing page's limits section and in the README, not buried.

1. **The compiler is a translator, not a guarantor.** It can misread a sentence. That is why review is a separate step with the compiled value beside the words, and why `policyHash` covers both.
2. **Enforcement is bounded by the venue.** A liquidation can happen faster than any callback. Mandate narrows the range of outcomes, it does not remove liquidation.
3. **An operator can be revoked.** Revocation is a feature and a failure mode: a revoked key stops trading, and the interface says so before the user clicks.
4. **Reactive callbacks cost the owner.** Subscriptions are not free and the balance floor is real.
5. **Testnet only.** Paper credit, no real money, and the preset named `Sandbox` exists because that is what this is.

---

## Bounty Deliverables

- Public GitHub repository, complete code, README with install, run, and the two verification results from the first hour
- MVP places real perps orders on Hideki, with transaction hashes in the README
- Gate G0: a real `0x08` refusal on 50383 with a resolvable hash, before the landing page is built. The refusal is the demo, so it is a build requirement rather than a nice artifact
- README section `X posts` with exactly two links in publication order: the build announcement, then the submission post, both tagging the venue account
- `feedback/` folder, one Markdown file per reproduced item, taken only from what this build actually found. Strategy in FEEDBACK_PLAN.md
- Demo video, 3 minutes, opening on a refusal rather than an architecture diagram
- Category: trader tools, with an agent story. Somnia primitives used: Reactivity in the enforcement path

---

## Build Priority

Judged on MVP potential, evidence of building, and communication. In that order.

1. One real order on Hideki through the SDK, hash recorded
2. Policy contract with `admit` and `previewAdmit`, the sixteen codes wired, Foundry tests green
3. Ledger built from events, refusal receipt shareable
4. Reactive enforcement live, with the `CHAIN` label honest
5. Authoring with the compiler and clause review
6. Landing page per FRONTEND_SPEC.md
7. Three X posts, each with a hash or a recording in it
8. Feedback items from what the build actually broke against

# BUILD_GUIDE.md

Sequenced build plan for Mandate. Order matters: every phase produces something runnable, and no phase depends on a design decision that has not been made.

Four days. Today is 28 October 2026. Submission closes 1 November 2026, 23:59 UTC.

---

## Day one: prove the ground (28 Oct)

**Phase 0, the two verification tasks. Do these before anything else.**

1. **Fund and connect.** Faucet STT to the deploy wallet and to an executor key. Read USDso balance. Confirm the RPC and WS endpoints answer: the SDK needs the websocket, and an HTTP-only proxy fails at `genesis check failed`.
2. **One real order.** Using `@somnia-chain/markets-sdk` 0.32.1 directly in a script, open the smallest valid BTC-PERP position, record the hash, then reduce it. This hash is the first thing in the README and the first thing in the first X post. Nothing else is worth starting until this exists.
3. **Operator check.** Determine whether an app wallet can grant operator rights to a deployed contract through `OperatorPermissionsRegistry`. If yes, the executor is the policy contract. If no, the executor is a linked key that calls `admit()` and honours the revert. Record which one is true in the README under "verify these two things first", because the trust story changes.
4. **Reactivity check.** Deploy a handler that subscribes to one event and emits on callback. Confirm the callback arrives on Hideki. If it does not, set `ENFORCEMENT_MODE=keeper` and continue. Do not wait on this.

**Phase 1, contracts, offline.**

- `MandateTypes.sol`: the struct, the status enum, sixteen error selectors, three events.
- `Mandate.sol`: `register`, `revoke`, `getMandate`, `previewAdmit`, `admit`. The admission maths first, the pool call last and stubbed behind an interface.
- `Grid.t.sol`: tick, lot, minimum quantity, both notional caps, leverage. Driven by fixtures, no fork.
- `Codes.t.sol`: one test per code, asserting the exact selector and that no state changed.
- `Compile.t.sol`: canonical JSON hashing, including clause text, asserting hash stability across key order.

Gate: `forge test` green with 20 plus tests and no fork requirement.

---

## Day two: the seam (29 Oct)

**Phase 2, policy package.**

`packages/policy` holds the Zod schema, the canonical hash function, the code table with copy and the presets. No viem, no React, no chain. This package is imported by the compiler route, the console and the tests, so the three can never disagree about what a code means.

**Phase 3, compiler route.**

`POST /api/compile` takes free text, calls the model once with a strict schema, validates, and returns a `MandateDraft` with per-clause rejections. Behaviours to get right, in this order:

1. Refuse to invent. A sentence with no primitive returns `E_UNEXPRESSIBLE` for that clause, and the rest still compiles.
2. Never coerce units silently. "Two hundred dollars" and "$200" and "200 USDso" all resolve to the same value. "200" alone with no unit is a rejection, not a guess.
3. Cap the output. Six clauses, one value each. If the model returns extra keys, the schema drops them and the route logs the drop during development.
4. Keep the words. Each clause carries the user's sentence verbatim. The UI quotes it, and the hash covers it.

Gate: five hand-written inputs, including one nonsense input, produce five sensible drafts or explicit rejections. No input produces a policy the user did not ask for.

**Phase 4, register.**

Wire `register` to a reviewed draft. One signature. After it lands, the console reads the mandate back from chain and compares it to the draft it just sent. If they differ, show the difference rather than the success.

---

## Day three: the proof surface (30 Oct)

**Phase 5, ledger.**

Read `Decision` and `Enforced` events, decode the codes through `packages/policy`, render the rows. Filters by outcome, code and market. No client cache. The receipt page at `/console/decisions/[id]` is public and renders with no wallet.

**Phase 6, the demo executor.**

A deliberately small bot in `scripts/`: it asks for a market and a size and attempts it. That is all it does. Its job is to be refused convincingly, not to trade well. Ship it with the two demo orders scripted: one that clears the mandate and one that breaks the $200 cap.

**Phase 7, recognition evidence (30 Oct).**

Only after the executor and the ledger are real. Write the mandate contract's admission maths against everything this build can throw at it: extreme ticks, zero equity, positions opened from the other side, a market delisted between compile and admit, and the notional arithmetic at 18 decimals. Then write down only what reproduced end to end, in `feedback/`. See FEEDBACK_PLAN.md for what is already closed and must not be filed.

---

## Day four: the surface (31 Oct)

**Phase 8, landing page.**

Follow FRONTEND_SPEC.md section by section. The spec has exact classes, so this phase is transcription plus a visual pass, not design work. The only decisions left at this point are photographic.

**Phase 9, console polish.**

Wallet gating, the dropdown, deep-link refresh against the Vercel rewrite, error boundary, empty states for a wallet with no mandate.

**Phase 10, the two posts.**

Written from material that exists, never from intent. Post 1 goes out on day one, after the first real order, announcing what is being built with the order hash attached. Post 2 is the submission, published only after every gate above is ticked. Drafts and fill rules are in MARKETING.md.

**Cut line.** If the schedule slips, the landing page slips before the ledger does, and the ledger slips before the enforcement demo does, and the enforcement demo never slips. Judges score evidence of building, and the evidence is the hash and the refusal, not the hero section.

**Gate G0, which outranks every other gate in this file.** The landing page does not merge until a real `0x08` refusal exists on 50383 with a hash that resolves in a logged-out browser. The refusal is the product: a policy contract that has never refused anything has no demo, and a page that says "refusals on chain" above a plate reading "no decision recorded" is a page arguing with itself. Producing the refusal is cheap and fully inside the plan, because it needs no filled order book and no second party: deploy, register a mandate with a 200 USDso cap, call `admit` with a 2,000 USDso order, keep the revert and the event. If day one ends without it, day two begins by finishing it rather than starting the compiler.

The plate has three states and only three. `DECISION` is a recorded event with a hash. `PREVIEW` is a live `previewAdmit` view call on a deployment with no history, labelled as such, with no hash because nothing was sent. `UNAVAILABLE` is a failed chain read, reported as a failure. There is no blank state and there is no cached-value state.

---

## Quality gates before submission

**Chain**

- [ ] A real BTC-PERP or ETH-PERP order placed on 50383, hash in the README
- [ ] A refused order with the code visible and its hash in the README
- [ ] `previewAdmit` matches `admit` for all 20 fixture cases
- [ ] `forge test` green without a fork
- [ ] Enforcement path labeled honestly against `ENFORCEMENT_MODE`

**Repository**

- [ ] README answers what it is, who it is for, how to run it, in that order
- [ ] README states the two verification results and both fallbacks, whichever applied
- [ ] README has the `X posts` section with the three links
- [ ] `.env.example` complete, no real values anywhere in the tree
- [ ] Limits section present and specific
- [ ] `feedback/` items reproducible from the instructions in each file

**Interface**

- [ ] Every spec animation value implemented as written
- [ ] No banned pattern from FRONTEND_SPEC.md's self-check list survives
- [ ] Deep link refresh into a nested console route works on the deployment
- [ ] Mid-session disconnect returns to the landing page with a toast
- [ ] Reduced motion honored on every reveal
- [ ] Contrast checked on the refusal color and the secondary text

**Communication**

- [ ] Both posts live, each tagging the venue account, published in order
- [ ] Each post contains a screenshot or a hash, not just a claim
- [ ] Demo recording under three minutes, opening on the refusal

---

## Failure modes worth naming in advance

| If this happens | Do this |
|---|---|
| SDK refuses to init | It is almost always the websocket. Check the transport before checking the version. |
| Positions cap binds before the mandate does | That is code `0x0C` doing its job. Show it in the demo; it proves the policy reads the venue rather than trusting its own numbers. |
| A testnet market goes stale mid-demo | `previewAdmit` returns `0x0E`. Say the code out loud on the recording. A demo that handles a real failure is stronger than one that does not. |
| The compiler returns a plausible but wrong draft | That is the reason the review step exists. Do not add validation that hides it; the review screen is the product. |
| Reactivity callback never arrives | Flip to keeper mode, keep the same events and codes, change the label. Do not rewrite the architecture at 1am. |

# BUILD_GUIDE.md

Sequenced build plan for Mandate. The dates below are the original plan; the audit status is updated to the actual project state as of 15 November 2026. A later dreamDEX organizer notice advertised 15 November as the closing day. Confirm the portal's current cutoff and whitelist acceptance before relying on submission availability.

## Final audit: 15 November 2026

The current Hideki deployment, admitted BTC-PERP fill, refusal and refusal record, bridged collateral, spot fill, and full position reduction were rechecked against chain receipts. GitHub currently contains the earlier pushed baseline; the local completion changes still need a final commit and push. The Vercel project and production deployment are also still pending at this audit point.

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

- [x] A real BTC-PERP order was placed through Mandate on 50383 and filled: 0x9a276ba37aec4a7797a886ea11964c164aadb01975cbe6c10fc403e9608382aa.
- [x] The demo position was reduced and the current MarginBank position is zero: 0x6813e346b5c98427baa0cd0846d8dd5fe0658e24fc4294f63427fb0298d9d04f.
- [x] A refused order returned code 0x08 and its Decision was recorded in a second transaction.
- [x] previewAdmit parity fixtures pass; the Foundry suite passed all 68 tests offline in this audit.
- [x] The interface reports NOT DEPLOYED for reactive enforcement. MandateWatch is not represented as live.

**Repository**

- [x] README explains the product, audience, setup and verified testnet evidence.
- [x] README explains the operator check, corrected replay, credit-floor and expiry getter findings.
- [ ] X posts section has publication links. No posts have been published; truthful drafts are in docs/posts.md.
- [x] .env.example has public testnet configuration and blank secret fields. The real .env is ignored and local only.
- [x] Limits are stated, including the undeployed reactive handler and testnet-only funding.
- [x] The paper-credit report documents a reproducible claim failure and no longer calls the failed claim the only collateral path.
- [ ] The current completion commit still needs to be pushed to GitHub.
- [ ] A new Vercel project and production deployment still need verification.

**Interface**

- [x] Public receipt pages are outside the wallet-gated route group and resolve from either the refused-order hash or the decision-record hash.
- [x] The disconnect action is separate from on-chain mandate revocation; the revoke button sends the owner's revoke transaction.
- [x] Reduced-motion preferences are handled in the global stylesheet and landing reveal components.
- [ ] Production deep-link refresh is pending Vercel deployment and live fetch verification.
- [ ] Browser interaction checks for wallet connect, disconnect toast and revoke confirmation remain pending.

**Communication**

- [ ] Both posts published in order. Drafts are prepared but not published.
- [x] Each draft includes verified transaction hashes.
- [ ] Demo recording under three minutes, opening on the refusal.

## Failure modes worth naming in advance

| If this happens | Do this |
|---|---|
| SDK refuses to init | It is almost always the websocket. Check the transport before checking the version. |
| Positions cap binds before the mandate does | That is code `0x0C` doing its job. Show it in the demo; it proves the policy reads the venue rather than trusting its own numbers. |
| A testnet market goes stale mid-demo | `previewAdmit` returns `0x0E`. Say the code out loud on the recording. A demo that handles a real failure is stronger than one that does not. |
| The compiler returns a plausible but wrong draft | That is the reason the review step exists. Do not add validation that hides it; the review screen is the product. |
| Reactivity callback never arrives | Flip to keeper mode, keep the same events and codes, change the label. Do not rewrite the architecture at 1am. |

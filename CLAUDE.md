# CLAUDE.md

Agent context for the Mandate repository. Read this before touching a file. It is shorter than the product and it wins every argument about style.

---

## What this repository is

Mandate compiles plain-English trading rules into a deterministic on-chain policy. Every order from an executor passes admission and is either placed or refused with a typed reason code. Enforcement runs through Somnia reactivity, not through a process that has to stay awake.

The product claim is narrow on purpose: **the language model never sits in the execution path.** If a change you are about to make puts a model call, a network read or a heuristic inside `admit()`, the change is wrong, regardless of how well it tests.

Chain: Somnia Hideki testnet, 50383. Not 50312. That is a different product with different contracts.

---

## Repository shape

```
mandate/
  apps/
    web/                    Next.js 14 App Router, TypeScript strict
      app/
        (public)/           landing page, no wallet
        console/            wallet-gated interior
        api/compile/        the only server route that calls a model
      components/
        landing/            one file per section, named after the section
        console/            ledger, clause cards, receipt
        primitives/         Double-Bezel card, icon button, status pill
      lib/
        chain/              viem clients, contract ABIs, read helpers
        policy/             draft schema, canonical hash, code table
      styles/
        globals.css         tokens, fonts, keyframes. Tokens only.
    contracts/              Foundry project
      src/
        Mandate.sol         register, admit, previewAdmit, revoke
        MandateWatch.sol    reactivity handler
        MandateTypes.sol    structs, enums, errors, events
      test/
        Admit.t.sol
        Grid.t.sol
        Codes.t.sol
        Compile.t.sol       fixture JSON through the canonical hash
  packages/
    policy/                 shared between web and tests, no chain imports
  feedback/                 one file per reproduced venue issue
  docs/
    APP_BLUEPRINT.md
    BUILD_GUIDE.md
    FEEDBACK_PLAN.md
    MARKETING.md
  FRONTEND_SPEC.md
  .env.example
  vercel.json
```

One owner per directory. `packages/policy` holds no viem import, so the compiler tests run without a fork.

---

## Code rules

1. **TypeScript in strict mode, no `any`.** A chain read returns a typed struct or it throws. `unknown` is fine at the boundary, `any` is not.
2. **No `localStorage`, `sessionStorage` or cookies for product state.** The chain is the record. A cache that can disagree with the chain will eventually disagree with the chain. If something must survive a refresh, it is in the URL or it is an event. One exception, and it is not product state: `lib/session.ts` writes the single key `mandate:wallet-disconnected` so a refresh cannot silently re-enter a wallet the user deliberately left. That file is the only one permitted to touch storage.
3. **US English spelling.** `behavior`, `labeled`, `color` inside prose. Identifiers follow the protocol's spelling, not ours.
4. **No em dashes anywhere.** Not in UI copy, not in comments, not in the README. Rewrite the sentence instead of reaching for the dash. En dashes only inside numeric ranges.
5. **Colors from CSS variables only.** No hex literal in a component file. A new color is a new token in `globals.css`, named for its job (`--surface-raised`, `--signal-refused`), never for its hue.
6. **Class-based hover only.** `group-hover:` and `hover:` variants. No JS mouse handlers for visual feedback except the two documented motion interactions in FRONTEND_SPEC.md, which use `useMotionValue`.
7. **Animation values live in one place.** Every section's `initial`, `animate`, `duration`, `ease` and `delay` come from the spec table. Inventing a duration during implementation is how a page stops feeling like one page.
8. **Fixed-point in the contract, decimal strings at the edges.** Balances move as `bigint`. `Number` appears only for display formatting and never for a comparison that decides admission.
9. **One reason code per refusal.** If two clauses would both fail, the lower code wins, deterministic by construction. Do not concatenate reasons.
10. **Fail closed.** Unknown means refused. A missing read is not a pass, a caught exception is not a pass, a zero is not a pass.
11. **Every contract write is decoded before it is sent.** `previewAdmit` runs first and the UI shows its result. If the preview and the send disagree, that is a bug worth a test, not a race to paper over.
12. **Tests use fixtures, not a live RPC.** `Compile.t.sol` and `Codes.t.sol` run offline. Fork tests are a separate suite and are allowed to be flaky in CI, never on main.

---

## Copy rules

- **Sentence case for headings.** Every heading, every button, every label.
- **No exclamation marks.** A refusal is not exciting.
- **Numbers are specific and meshed.** `$47.20`, `3.1x`, `0.15 STT`, `14:02 UTC`. Never `99.9%`, never `1,234`, never a round number that reads as a filled-in example.
- **No placeholder names.** No John Doe, no Acme, no "your strategy here". If a line needs an example, use a real market from the venue and a real hash from the testnet.
- **Verb plus object on buttons.** `Register mandate`, `Revoke operator`, `Copy hash`. Never `Submit`, `OK`, `Continue`.
- **The refusal sentence names the numbers.** "This would take ETH-PERP to 2,140 USDso, above the 200 this mandate allows." Not "Order rejected due to limit violation."
- **Do not write "not just X, it's Y", "X theater", or any punchy-negation cadence.** If a paragraph lands on the rhythm of a serious statement followed by a short dismissal, delete the second half and add a fact.
- **Technical terms stay technical.** `reduce-only`, `tick size`, `lot size`, `operator`, `epoch`. Do not soften them into "your safety settings" or similar.

---

## Never do these

- **Never call a model from a route that is on the order path.** `/api/compile` is authoring only. It cannot be imported by anything under `lib/chain`.
- **Never label a keeper action as a chain action.** If `ENFORCEMENT_MODE=keeper`, the badge reads `KEEPER`. The word `CHAIN` is reserved for a callback the precompile actually made.
- **Never store an executor private key anywhere the client can read it.** Not in a `NEXT_PUBLIC_` variable, not in an API response, not in a log line.
- **Never retry a refused order automatically.** A refusal is information. Retrying it turns the ledger into noise and burns the user's gas.
- **Never soften a refusal into a success toast.** If the mandate refused, the interface says refused and shows the code.
- **Never write a percentage or a metric into the UI that is not derived at render time.** No hard-coded "12% safer", no invented uptime.
- **Never add a seventh clause without also adding a code, a test and a line in the README's clause table.** The closed set is the reason the compiler is reliable.
- **Never remove a limitation from the README because a judge might read it.** The limits section is a feature of the submission.
- **Never ship pure black or pure white.** `#0a0b0d` and `#f4f3ef` at the extremes.
- **Never put `viewport={{ once: true }}` on a section reveal.** Motion replays on re-entry by design here.
- **Never introduce a second font family for emphasis.** The hierarchy comes from weight and size in the families already loaded.

---

## When something breaks

1. Reproduce it against chain state, not against a screenshot.
2. Decide whether it is a policy bug, a venue bug or a UI bug. The three have different fixes and different owners.
3. If it is a venue bug and no one has reported it, write it into `feedback/` with the reproduction and the version. Do not file it anywhere else until it is reproducible end to end.
4. If it is a policy bug, the test comes before the fix, and the test is named after the clause it protects.
5. If it is a UI bug, check it against the spec table before styling it. Most UI bugs in this repository will be a missing animation value or a wrong z-index, and the spec already has the answer.

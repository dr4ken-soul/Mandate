# FEEDBACK_PLAN.md

The feedback track pays for the first valid report of a given issue and closes duplicates. The MVP track pays for a working product. Time goes to the MVP track first, always. This file exists so that the few minutes spent on feedback are spent on the right thing.

---

## Budget

$1,500 total, at $40 for critical or major and $15 for anything else. That ceiling is reached in roughly 20 to 38 accepted items. Nobody has that many novel findings in four days. The practical reading: the budget is not the constraint, uniqueness is.

**Stop rule.** When the MVP is not finished, feedback work stops. The MVP track is 3 by $500 and this track is shared with every other builder on the board.

---

## Do not file these

Each of these is already reported and unpaid as a duplicate. Filing again spends a slot and returns nothing.

- The liquidation backstop `bidderCount` mismatch
- The `getMaxPerpOrderSize` per-account cap arithmetic
- The funding sign inconsistency between the documentation and observed settlements
- The `placeOrderFor` gas understatement in the docs

If one of these turns up again during the build, note it inside the repo's own limitations section, not in a report.

---

## What is left worth looking at

The lane nobody else is in is this build's own surface: a contract that computes notional, equity and caps from venue reads, at 18 decimals, across markets with base decimals from 6 to 24, and then places orders on someone else's behalf. That combination is unusual, so the failure modes it walks into are unusual too.

Four areas, in order of expected yield.

1. **Arithmetic at mixed decimals.** Notional is price (18 dp) times quantity (6 to 24 dp) over a scaling constant. Take every tradeable market, compute the same notional through the SDK's own helper and through the contract, and diff. A market where the two disagree by more than one unit is a finding, and it is a finding only because the contract did it, not because the docs were read.
2. **State that changes between compile and admit.** The mandate is registered at time T and admits at time T+n. Between the two: funding accrues lazily, mark moves, equity moves, a market can flip to unpriceable. The interesting question is whether any sequence makes `previewAdmit` and `admit` disagree for reasons that are not the user's fault. That is a real bug class and it belongs to nobody else's repo.
3. **Operator semantics under reduce-only.** Reduce-only is enforced client-side, per the docs. What happens when a reduce-only order is larger than the position, or when it crosses zero, or when the operator's permission is narrowed to reduce-only and the order would flip the side. A precise statement of the observed behavior, with hashes, is worth writing even if it lands as documentation-grade rather than critical.
4. **Reactive callback ordering.** If a callback lands in the same block as the trade that triggered it, can the handler read a stale position. Measure it, do not reason about it.

---

## Format

One file per item in `feedback/`, named for the symptom not the cause. Each file has: a one-line summary, the environment (chain 50383, SDK version, block range), the exact reproduction with commands, observed against expected, the contract or function implicated, and why it matters to someone building on the venue. Screenshots and hashes inline.

Rules: only items reproduced end to end, no speculation, no severity inflation. A small finding stated precisely gets paid. A large claim without a reproduction does not.

---

## Do not

- Do not file against the docs for a typo. It is not a critical or major issue and it spends a slot.
- Do not bundle five findings into one report. Bundles get read as one item.
- Do not file during the last six hours of the window. Reports need to be readable by a human, and a rushed one is not.
- Do not let this file grow. If an area above yields nothing after one attempt, drop it and go back to the MVP.

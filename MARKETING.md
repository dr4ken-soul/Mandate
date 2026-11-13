# MARKETING.md

Exactly two posts. The first announces what is being built and that it is being built. The second is the submission, published when everything is complete. Both tag `@DreamDEXSomnia` once, so the README's two-or-three post requirement is satisfied by construction.

---

## Voice

Lowercase. First person, builder rather than brand. One claim per sentence, and every claim is something that already happened.

- A post carries evidence or it does not go out. A hash is checkable, so it is free.
- Say the limitation before a reader finds it.
- Tag `@DreamDEXSomnia` once, in the closing sentence that says what the post is about. Never a tag row.
- No em dashes, no exclamation marks, no rocket emoji, no "excited to share", no thread opener that promises more than the post delivers.

---

## Post 1, what I am building

**When:** on day one, after the first real order exists on 50383. Not before, because the first post is also the first proof and a post announcing intent with nothing behind it reads like every other bounty entry.

**Length:** about 750 characters. Four short paragraphs, no thread.

```
i'm building a policy layer for dreamDEX perps.

the problem it exists for: everyone handing a wallet to a bot or an agent this year is handing over full permission and a prompt. a prompt cannot refuse an order.

so: you write your limits in plain english. one model call turns them into a closed policy of six clauses. after that a contract checks every perps order before it reaches the venue, and refuses the ones that break a rule, with a code and a sentence that names the numbers.

day one is done. first real order placed through my own contract rather than the sdk directly, {order_tx}

next comes the part worth watching: the same contract refusing an order for breaking my own rule, in public, with the reason on chain.

building this for the dreamDEX perps builder bounty @DreamDEXSomnia
```

**Image:** one screenshot of the explorer showing the transaction and the contract call in the trace, cropped tight enough that the `admit` frame is legible on a phone.

**If the first order is not ready but the post has to go out anyway:** remove the `day one is done` paragraph and the hash entirely. Do not replace it with a mock-up, a diagram or a claim about what is coming. Announcement-only is weaker but honest; a fabricated hash is neither.

**What it must not do:** promise a feature that is not yet in the blueprint, describe enforcement as instant, or mention gas economics before anything has been measured.

---

## Post 2, the submission

**When:** after the build is complete, every acceptance criterion in `BUILD_GUIDE.md` passed, and both hashes resolve in a logged-out browser. This is the post that gets read.

**Length:** about 1,500 characters. Long enough to carry a submission, short enough to read on one screen.

```
i built a policy layer for dreamDEX perps. you write your trading limits in english, and a contract refuses any order that breaks them.

it exists for one situation: handing a wallet to a bot or an agent and hoping the prompt holds.

i told mine never to risk more than 200 usdso on one market. it tried 2,000.

refused. code 0x08, market notional cap, clause c3. the order never reached the venue, so no funds moved and no gas was spent being told no by the pool.

refusal, {refusal_tx}
a real order the same executor was allowed to place, {order_tx}

[keep this paragraph only if the gas measurement supports it] the same order sent straight to the pool is mined and reverts there instead, at {gas_multiple} times the gas, returning a hex selector and no sentence a human can read.

the part that matters is where the model sits. one language model call, at authoring time, turns your sentence into a closed policy of six clauses. after that there is no model anywhere on the order path. admission is nine deterministic checks that re-derive equity and notional from chain state at the current block, then either places the order or reverts with one code. the model writes the policy. it never gets a vote on an order.

enforcement runs through a somnia chain subscription rather than a bot that has to stay awake. push the position past the rules and it comes back inside them without anything of mine running. {enforcement_evidence}

what it does not do, since someone will ask:
a callback is not instant and the venue does not wait, so this narrows liquidation risk and cannot remove it
the compiler can misread a sentence, which is why the compiled value sits beside your own words and the hash covers both
testnet only, because mainnet perps are not live yet

the refusal log is public, built from chain events rather than a local cache, and every row shows the code that stopped it: {repo}

@DreamDEXSomnia
```

**Images:** two. The ledger row showing `REFUSED` and `0x08` beside the transaction hash, and the refusal receipt page as it renders in a browser with no wallet connected. The second image is the one that proves the artifact is public.

### Filling the slots

| Slot | Source | Rule |
|---|---|---|
| `{order_tx}` | The first real order placed through the contract | Must be an order that was allowed, not a revert, and must resolve logged out |
| `{refusal_tx}` | The `admit()` refusal from the 2,000 USDso attempt | Must be the 2,000 against 200 case, because the post names both numbers |
| `{gas_multiple}` | `metrics.json`, refusal gas against venue revert gas | Only include the paragraph if the difference is material. Within noise, delete the paragraph and the post is still complete |
| `{enforcement_evidence}` | The `Enforced` event and its transaction, or the subscription reference | If enforcement ran in keeper mode, the sentence says `keeper` and never `chain` |
| `{repo}` | The public repository URL | Verify it opens without an account |

### Three things it must not do

1. **Claim a comparison the build did not measure.** If the two gas figures are within 5% of each other, the paragraph comes out. A judge can check it in ten seconds.
2. **Describe enforcement as instant.** A callback lands in a block. Faster than a human, slower than a liquidation, and the post says exactly that.
3. **Lead with the bounty.** Lead with the refusal, because it is the only thing in this build a reader cannot get from another repo on the same board.

---

## Submission notes

Short, in the submission field, no marketing. Five parts:

1. What it is, one sentence, no adjectives
2. The two chains of evidence: the refusal hash and the allowed order hash
3. Which venue primitives it uses: operator permissions, pool reads for the cap and the grid, a reactive subscription for enforcement
4. What is not finished, named plainly
5. Category: trader tools

---

## Pre-submission checklist

- [ ] Post 1 published on day one and tagged once
- [ ] Post 2 published after the build passed its gates, not before
- [ ] Every bracket in post 2 replaced with a value read from the chain, or its line deleted
- [ ] Refusal hash resolves on the explorer in a logged-out browser
- [ ] Allowed-order hash resolves and is not a revert
- [ ] Gas paragraph either supported by `metrics.json` or removed
- [ ] Enforcement named honestly as `chain` or `keeper`, matching `ENFORCEMENT_MODE`
- [ ] Each post tags the venue account exactly once
- [ ] README `X posts` section contains both links, in publication order
- [ ] Nothing claimed in either post that the README contradicts

# The two posts

Both drafts follow `MARKETING.md`: lowercase, first person, one claim per sentence, every claim
something that already happened. Neither is published yet.

---

## Post 1, what I am building

**When:** after the first real order exists on 50383. The refusal exists; the filled order does not,
so the paragraph that quotes the order hash waits.

```
i'm building a policy layer for dreamDEX perps.

the problem it exists for: everyone handing a wallet to a bot or an agent this year is handing over
full permission and a prompt. a prompt cannot refuse an order.

so: you write your limits in plain english. one model call turns them into a closed policy of six
clauses. after that a contract checks every perps order before it reaches the venue, and refuses the
ones that break a rule with a code and a sentence that names the numbers.

day one is done. the contract is deployed on hideki and it has already refused an order: 2,000
USDso against a 200 USDso cap, code 0x08, clause c3, written on chain.

next comes the part worth watching: the same refusal in a bot that cannot route around it.

building this for the dreamDEX perps builder bounty @DreamDEXSomnia
```

**Image:** the explorer, the transaction, with the `Decision` log and the `0x08` visible.

---

## Post 2, the submission

**When:** after every gate in `BUILD_GUIDE.md` is ticked. The gas paragraph is left out, because the
measurement does not support it: the refusal cost 137,248 gas and the venue's own rejection of the
same order cost 99,919 gas, so the policy is not the cheaper one here.

```
i built a policy layer for dreamDEX perps. you write your trading limits in english, and a contract
refuses any order that breaks them.

it exists for one situation: handing a wallet to a bot or an agent and hoping the prompt holds.

i told mine never to risk more than 200 usdso on one market. it tried 2,000.

refused. code 0x08, market notional cap, clause c3. the order never reached the venue, so no funds
moved.

refusal, 0x9b8541a583a89b3fa50518386d422e07bac8df36df08fd54b255446669649edf

the part that matters is where the model sits. one language model call, at authoring time, turns
your sentence into a closed policy of six clauses. after that there is no model anywhere on the
order path. admission is nine checks that re-derive equity and notional from chain state at the
current block, then either place the order or revert with one code. the model writes the policy. it
never gets a vote on an order.

the refusal log is public, built from chain events rather than a local cache, and every row shows
the code that stopped it: {repo}

what it does not do, since someone will ask:
a contract cannot place a perp order for its owner on this venue yet. the operator grant exists and
the pool still refuses, so my build asks the owner to sign the order after the policy says yes
a callback is not instant and the venue does not wait, so this narrows liquidation risk and cannot
remove it
the compiler can misread a sentence, which is why the compiled value sits beside your own words and
the hash covers both
testnet only, because mainnet perps are not live yet

@DreamDEXSomnia
```

**Images:** the ledger row showing `REFUSED` and `0x08` beside the transaction hash, and the receipt
page as it renders in a browser with no wallet connected.

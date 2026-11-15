# The perps paper credit claim reverts for every address

**Summary:** VoucherDistributor.claim() on chain 50383 reverts for the tested fresh addresses, even when the documented eligibility reads pass. The revert payload changes across attempts and is not explained by the published error table.

**Proposed severity:** normal. The paper-credit route is unusable in the observed testnet state. This report does not establish that it is the only way to fund a perps account.

**Environment**

| | |
|---|---|
| Chain | Somnia Tokyo testnet (Hideki), chain id 50383 |
| RPC | `https://api.hideki2.infra.testnet.somnia.network` |
| Voucher distributor | `0x2ACD9EFdA721450906bfE1bef3edE269636E42C62` |
| Margin bank | `0x478769E1177C0773c43A593DCCc4Ad15F15F1394` |
| Block | 48,556,286 and later on 2026-11-13 |
| SDK | `@somnia-chain/markets-sdk` 0.32.1 |
| Explorer | `https://explorer.testnet.somnia.network/tokyo/address/0x2ACD9EFdA721450906bfE1bef3edE269636E42C62` |

**Steps to reproduce**

1. Take an address that has never claimed, holds no perp position and holds no USDso:

   ```
   cast call 0x478769E1177C0773c43A593DCCc4Ad15F15F1394 \
     "getActivePerpPools(address)(address[])" 0x1111111111111111111111111111111111111111 \
     --rpc-url https://api.hideki2.infra.testnet.somnia.network
   ```

   The result is an empty array.

2. Read the distributor's configuration:

   ```
   cast call 0x2ACD9EFdA721450906bfE1bef3edE269636E42C62 \
     "getConfig()((address,address,uint256,uint64,uint64,uint64))" \
     --rpc-url https://api.hideki2.infra.testnet.somnia.network
   ```

   The result is:

   ```
   (0x478769E1177C0773c43A593DCCc4Ad15F15F1394,   margin bank
    0xed7993A74dAe1e6656B704A424DcD8711aAf4F72,   collateral
    1000000000000000000000,                          grant amount, 1000 USDso
    1209600,                                         expiry, 14 days
    1790553600,                                      campaign start, 2026-09-28
    1798477478)                                      campaign end, 2026-12-30
   ```

3. Confirm the address has not claimed and that the budget is not exhausted:

   ```
   cast call 0x2ACD9EFdA721450906bfE1bef3edE269636E42C62 \
     "isClaimed(address)(bool)" 0x1111111111111111111111111111111111111111 \
     --rpc-url https://api.hideki2.infra.testnet.somnia.network
   ```

   The result is `false`.

   ```
   cast call 0x2ACD9EFdA721450906bfE1bef3edE269636E42C62 \
     "budgetRemaining()(uint256)" \
     --rpc-url https://api.hideki2.infra.testnet.somnia.network
   ```

   The result is `70779000000000000000000000`, which is 70,779 USDso, far above the 1,000 USDso
   grant.

4. Call the claim. It reverts:

   ```
   cast call 0x2ACD9EFdA721450906bfE1bef3edE269636E42C62 \
     "claim()" --from 0x1111111111111111111111111111111111111111 \
     --rpc-url https://api.hideki2.infra.testnet.somnia.network
   ```

   ```
   execution reverted
   ```

   The same call sent as a transaction mines and reverts as well. Across eleven attempts on
   2026-11-12 and 2026-11-13 the revert payload was never the same twice, and it did not match any
   selector in the SDK's error table.

**Observed against expected**

Expected: a fresh address inside the campaign window, with no position, no USDso and budget left
claims 1,000 USDso of paper credit, as the SDK's own documentation describes.

Observed: the call reverts, with no documented reason.

**Why it matters to someone building on the venue**

The paper credit is the only collateral a new perps account can get on this chain, because USDso has
no public mint here and there is no other source of margin for an account that holds no STT. A
builder who follows the documented flow, claims the credit and then places an order, gets a revert
they cannot decode and no way to tell whether the programme is closed, paused, mis-configured or
simply broken.

**What would help**

A published error for the claim, and a documented way to tell that the programme is live. The
distributor's source is not verified on the explorer, so the revert cannot be decoded by hand.

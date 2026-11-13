# The deployment report

Chain 50383, the Somnia Tokyo testnet. Everything here was measured on 2026-11-12 and 2026-11-13.

## What is deployed

| | |
|---|---|
| Mandate contract | `0x026cd82eeace8da496e541005bad67197a57349e` |
| Margin bank | `0x478769E1177C0773c43A593DCCc4Ad15F15F1394` |
| Perp pool factory | `0xE631fAEE547baeE07353E290f0562ea67d856560` |
| Operator permissions registry | `0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a` |
| BTC-PERP pool | `0x4181dd08E73BbCdd1Ba3E615A18f6abD941b94C0` |
| USDso collateral | `0xed7993A74dAe1e6656B704A424DcD8711aAf4F72` |
| Owner wallet | `0x0B55a453B3F95a43E0327439E8932ae82Bc7aF0e` |
| Executor wallet | `0xa9526B5B70946AdA0a97781008524Cb1F9E11f3D` |

## The transactions

| What | Hash | Note |
|---|---|---|
| Deployment | see `deployment.json` | 54,622,071 gas. Somnia charges about 4,900 gas per deployed byte, so a contract of this size is expensive to put on chain |
| Operator grant, global | see `deployment.json` | `setOperatorApprovalGlobal(mandate, [0x80054449], true)` |
| Operator grant, per pool | see `deployment.json` | `setOperatorApprovalForPool(btcPool, mandate, [0x80054449], true)` |
| Registration | `0x291ecb844a766d5ccc101471fb2e8e3db76f78dc944d4bd63d60f734a750570e` | 443,097 gas |
| The refusal | `0x37a2b40c41873608ee8777aa07888c17a08c17515e3217379a5784f86925ea47` | reverted, 137,248 gas |
| The refusal, written on chain | `0x9b8541a583a89b3fa50518386d422e07bac8df36df08fd54b255446669649edf` | 156,000 gas, carries the `Decision` log |
| The same order sent to the pool | `0x583f241a09af6a466af47fde679884779dfb1065c72199dc28b68350953a149a` | reverted, 99,919 gas |

## The mandate

| | |
|---|---|
| Markets | BTC-PERP only |
| Leverage | 3x, which is 300 in the stored scale of hundredths |
| Notional per market | 200.00 USDso |
| Notional in total | 500.00 USDso |
| Loss per window | no limit |
| Expiry | 30 days from the registration |

## The refusal

The order was 0.02804 BTC at 71,674.60 USDso, which is 2,000.04 USDso of notional. The cap is
200.00 USDso. The refusal carries code `0x08`, clause `C3`, the value the order would have reached
and the cap it broke.

`previewAdmit` on the same request returns the same answer without sending anything, which is how the
landing page reads the plate.

## The gas

| | Gas |
|---|---|
| The policy refusal | 137,248 |
| The venue's own rejection of the same order | 99,919 |

The policy is not the cheaper one on this venue. The refusal pays for the checks that decide the
answer, and this venue refuses an unfunded order before it does any matching work, so its rejection
is short. Both figures are testnet numbers from one deployment.

## The two things that did not work

**The contract could not place a perp order for its owner.** The grant exists in the registry and the
pool's own `isOperatorAuthorized` reads true, but a perp pool refuses the contract's order with the
venue's own `EOperatorRevoked`. The perp pool's collateral path only pulls for the owner, so a
contract operator cannot fund the order it places. The build answers with the owner's signature
after the policy says yes.

**The paper credit could not be claimed.** `VoucherDistributor.claim()` reverts for every address,
including a fresh one, with a payload that is not in the published error table. That is written up
in `feedback/001-perps-paper-credit-claim-reverts.md`, and it is why no order was filled: without
paper credit or USDso there is no margin behind the account.

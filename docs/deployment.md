# Live deployment report

Last rechecked: 15 November 2026. Chain 50383 is Somnia Hideki; the funding source chain is Shannon 50312. These are testnet transactions.

## Active Mandate

| Field | Value |
|---|---|
| Contract | 0xaa1c29381a7b68b59302faecb6b3fd7b74c6ad8f |
| Deployment transaction | 0x0c1d237e9e52eb7b978262b1dcba331cc6d3f454d32fe1567375d17bb618c22b |
| Owner | 0x0B55a453B3F95a43E0327439E8932ae82Bc7aF0e |
| Executor | 0xa9526B5B70946AdA0a97781008524Cb1F9E11f3D |
| Policy hash | 0x3af1eb5dcbc80c5d66fcc7c9386e6593a761f6b2948b45bf2ea9ba90b503a681 |
| Registered | 0x041845c7c08f87c5f022601289644e1e3c56ad25bec9f4c1d27ce238a76a5555 |
| BTC-PERP pool | 0x4181dd08E73BbCdd1Ba3E615A18f6abD941b94C0 |
| Per-pool operator grant | 0xfd7dc43111fb02a173483ebca1900dc3c412f3fc57aa2549e78bb1dbd263f9e8 |
| Global operator grant | 0x65e804692963a1980efbfb265ec6e9120ce54517ba4a057fcddde81615b044d4 |

## Verified outcomes

| Outcome | Transaction and evidence |
|---|---|
| Allowed BTC-PERP order | 0x9a276ba37aec4a7797a886ea11964c164aadb01975cbe6c10fc403e9608382aa; 0.00013 BTC filled at 64,633.9 USDso through Mandate.admit. |
| Position reduction | 0x6813e346b5c98427baa0cd0846d8dd5fe0658e24fc4294f63427fb0298d9d04f; 0.00013 BTC filled at 64,669.4 USDso. Current MarginBank position is zero. |
| Refusal | 0xc959795e02d89e48885e6ec874eaa416e157dc8e8f6141da239bd6db84de0021 reverted with selector 0x47a56227, code 0x08, clause C3. |
| Refusal record | 0xb69586ed6ae3f7866b220966371469de16da83fe65e31c0632d2c7655569833e emitted the Decision event and references the reverted order hash. |
| Spot order | 0x58cd9915b8bd5be9f8621d515cdc934957917ae150cb8335cf41f8d725e1fa91 filled 1 STT at 0.144 USDso. |
| Funding | 100 test USDso minted on Shannon, bridged to Hideki, and deposited to MarginBank. Receipts are in bridge-funding.json and collateral.json. |

The refused order was 0.03095 BTC at a 64,621.7 USDso limit, about 2,000.04 USDso of requested notional. With the existing position, the comparison was about 2,008.44 USDso against a 200 USDso per-market cap. The policy refused it before calling the pool. The separate record transaction is required because a revert cannot retain its own event logs.

## Integration investigation

The earlier EOperatorRevoked report was caused by a diagnostic replay that omitted the executor as caller. Replaying the same calldata with the actual executor sender reproduces the policy refusal code 0x08. The registry grant and pool authorization both read true, and the small allowed order subsequently filled through the contract.

Two actual forwarding blockers were found and fixed: the contract used voucherExpiryOf on MarginBank, although getCreditFloor is the supported MarginBank read, and it queried marketExpiryNs on the live pool, where that getter reverts. The forwarding path now uses an explicit future expiry for IOC orders.

The direct VoucherDistributor paper-credit claim still reverts with changing undocumented payloads. It is documented in feedback/001-perps-paper-credit-claim-reverts.md. The demonstrated order used test USDso bridged from Shannon and deposited to MarginBank instead.

## Remaining deployment limit

MandateWatch compiles but is not deployed. The subscription requires 32 STT and the owner/executor test wallets do not have enough. NEXT_PUBLIC_WATCH_ADDRESS remains blank, so the interface says NOT DEPLOYED. No keeper service is running. Do not describe reactive enforcement as live.

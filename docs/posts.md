# Evidence-based post drafts

No posts have been published. These two drafts use verified testnet evidence and contain no placeholders. Publish only if the owner chooses to do so.

## Post 1: the build

i built a policy contract for dreamDEX perps.

one small BTC-PERP order passed through Mandate and filled 0.00013 BTC. the same demo position was reduced back to zero.

order: https://explorer.testnet.somnia.network/tokyo/tx/0x9a276ba37aec4a7797a886ea11964c164aadb01975cbe6c10fc403e9608382aa

reduction: https://explorer.testnet.somnia.network/tokyo/tx/0x6813e346b5c98427baa0cd0846d8dd5fe0658e24fc4294f63427fb0298d9d04f

the mandate also refused an order above its 200 usdso per-market cap. the refusal carried code 0x08 and clause c3. @DreamDEXSomnia

## Post 2: submission draft

mandate turns plain-language trading rules into a deterministic on-chain check before a dreamDEX perp order is forwarded.

the allowed BTC-PERP order filled 0.00013 BTC through the mandate, then the position was reduced to zero.

the oversized order reverted with code 0x08. a separate transaction recorded the decision because a reverted transaction cannot keep its own event log.

refusal: https://explorer.testnet.somnia.network/tokyo/tx/0xc959795e02d89e48885e6ec874eaa416e157dc8e8f6141da239bd6db84de0021

decision record: https://explorer.testnet.somnia.network/tokyo/tx/0xb69586ed6ae3f7866b220966371469de16da83fe65e31c0632d2c7655569833e

allowed order: https://explorer.testnet.somnia.network/tokyo/tx/0x9a276ba37aec4a7797a886ea11964c164aadb01975cbe6c10fc403e9608382aa

the reactive handler is compiled but not deployed because its subscription requires 32 stt. this is testnet only. @DreamDEXSomnia

import { defineChain } from "viem";

/**
 * Somnia Tokyo, the Hideki testnet. Chain 50383.
 *
 * The chain id is the same on both generations of the network, so the
 * endpoint is the thing that identifies it. These are the Hideki 2 endpoints,
 * which are the live ones.
 */
export const hidekiTestnet = defineChain({
  id: 50383,
  name: "Somnia Tokyo Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.hideki2.infra.testnet.somnia.network"],
      webSocket: [
        process.env.NEXT_PUBLIC_WS_URL ?? "wss://api.hideki2.infra.testnet.somnia.network/ws",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Somnia Explorer",
      url: process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://explorer.testnet.somnia.network/tokyo",
    },
  },
  testnet: true,
});

/** The explorer link for a transaction. */
export function explorerTx(hash: string): string {
  const base = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://explorer.testnet.somnia.network/tokyo";
  return `${base}/tx/${hash}`;
}

/** The explorer link for an address. */
export function explorerAddress(address: string): string {
  const base = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://explorer.testnet.somnia.network/tokyo";
  return `${base}/address/${address}`;
}

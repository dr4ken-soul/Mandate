"use client";

import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { hidekiTestnet } from "./chain";

/**
 * The wallet configuration.
 *
 * One chain, one connector. The wallet the console talks to is the one the
 * explorer and the venue already know: a browser wallet on Hideki.
 */
export const wagmiConfig = createConfig({
  chains: [hidekiTestnet],
  connectors: [injected()],
  transports: {
    [hidekiTestnet.id]: http(hidekiTestnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});

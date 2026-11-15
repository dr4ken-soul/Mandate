/** Read-only probe for the documented Shannon USDso bridge route. */

import { readFileSync } from "node:fs";
import { createPublicClient, getAddress, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

function readEnv(path) {
  const values = new Map();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) values.set(match[1], match[2].trim());
  }
  return values;
}

const env = readEnv(new URL("../.env", import.meta.url));
const account = privateKeyToAccount(env.get("DEPLOYER_PRIVATE_KEY"));
const client = createPublicClient({ transport: http("https://api.infra.testnet.somnia.network") });
const usdsO = getAddress("0x9c32F3827A1A99F0CF9B213DE8B53EC3D57BB171");
const router = getAddress("0x94E2E7F4B2B0A8E3032C7D3FF3C86790BB5979E6");
const tokenAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function mint(address to, uint256 amount)",
]);
const routerAbi = parseAbi([
  "function quoteGasPayment(uint32 destination) view returns (uint256)",
  "function transferRemote(uint32 destination, bytes32 recipient, uint256 amount) payable returns (bytes32 messageId)",
]);
const [chainId, nativeBalance, tokenBalance, quote, tokenCode, routerCode] = await Promise.all([
  client.getChainId(),
  client.getBalance({ address: account.address }),
  client.readContract({ address: usdsO, abi: tokenAbi, functionName: "balanceOf", args: [account.address] }),
  client.readContract({ address: router, abi: routerAbi, functionName: "quoteGasPayment", args: [50383] }),
  client.getCode({ address: usdsO }),
  client.getCode({ address: router }),
]);

let mintSimulation = "failed";
try {
  await client.simulateContract({
    address: usdsO,
    abi: tokenAbi,
    functionName: "mint",
    args: [account.address, 100n * 10n ** 18n],
    account,
  });
  mintSimulation = "succeeds for 100 USDso";
} catch (error) {
  mintSimulation = `reverts: ${error.shortMessage ?? error.message}`;
}

console.log(JSON.stringify({
  chainId,
  account: account.address,
  nativeSTT: nativeBalance.toString(),
  shannonUSDso: tokenBalance.toString(),
  mintSimulation,
  bridgeRouter: router,
  quoteGasPaymentTo50383: quote.toString(),
  tokenCodePresent: Boolean(tokenCode && tokenCode !== "0x"),
  routerCodePresent: Boolean(routerCode && routerCode !== "0x"),
}, null, 2));

import { publicClient } from "@/lib/chain/reads";
import { decisionEvent, mandateAbi } from "@/lib/chain/abi";
import { HeroPlate, type PlateState } from "./HeroPlate";
import { HeroStatement } from "./HeroStatement";
import type { Address } from "viem";

/**
 * Read the plate from the chain.
 *
 * A recorded decision if there is one, a live preview if there is not, and a
 * reported failure if the read fails.
 */
async function readPlate(): Promise<PlateState> {
  const blockNumber = await publicClient.getBlockNumber();
  const market = (process.env.NEXT_PUBLIC_BTC_POOL_ADDRESS ?? "") as Address;
  const owner = (process.env.NEXT_PUBLIC_OWNER_ADDRESS ?? ("0x" + "0".repeat(40))) as Address;

  const demoId = process.env.NEXT_PUBLIC_DEMO_DECISION_ID;
  if (demoId) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: demoId as `0x${string}` });
      const logs = await publicClient.getLogs({
        address: process.env.NEXT_PUBLIC_MANDATE_ADDRESS as Address,
        event: decisionEvent,
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      });
      const match = logs.find((log) => log.transactionHash === demoId);
      if (match) {
        const args = match.args as {
          code: number;
          compared: bigint;
          limit: bigint;
          clause: number;
          market: Address;
          txRef: string;
        };
        return {
          kind: "decision",
          code: args.code,
          compared: args.compared.toString(),
          limit: args.limit.toString(),
          clause: args.clause,
          txHash: /^0x0{64}$/i.test(args.txRef) ? match.transactionHash ?? demoId : args.txRef,
          blockNumber: match.blockNumber.toString(),
          market: args.market,
        };
      }
    } catch {
      return { kind: "unavailable", blockNumber: blockNumber.toString() };
    }
  }

  try {
    const preview = (await publicClient.readContract({
      address: process.env.NEXT_PUBLIC_MANDATE_ADDRESS as Address,
      abi: mandateAbi,
      functionName: "previewAdmit",
      args: [
        {
          owner,
          market,
          isBid: true,
          price: 0n,
          quantity: 0n,
          reduceOnly: false,
          armsStop: false,
          expireTimestampNs: 0n,
          orderType: 2,
        },
      ],
    })) as readonly [number, bigint, bigint, number];
    return {
      kind: "preview",
      code: preview[0],
      compared: preview[1].toString(),
      limit: preview[2].toString(),
      clause: preview[3],
      blockNumber: blockNumber.toString(),
    };
  } catch {
    return { kind: "unavailable", blockNumber: blockNumber.toString() };
  }
}

/**
 * The hero.
 *
 * The headline is a statement, and the plate under it is the proof: a real
 * decision read from the chain at request time.
 */
export async function Hero() {
  const plate = await readPlate();

  return (
    <section className="relative min-h-[100dvh] bg-paper pt-14 lg:pt-20">
      <HeroStatement />
      <HeroPlate plate={plate} />
    </section>
  );
}

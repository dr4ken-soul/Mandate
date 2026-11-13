/**
 * Request test STT for several addresses at once.
 *
 * The faucets run in parallel because each one drives a browser.
 *
 *   node scripts/faucet-many.mjs 6
 */

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const count = Number(process.argv[2] ?? 4);
const root = join(import.meta.dirname, "..");

const keys = [];
for (let i = 0; i < count; i += 1) {
  const key = generatePrivateKey();
  keys.push({ key, address: privateKeyToAccount(key).address });
}

writeFileSync(
  join(root, "faucet-keys.json"),
  `${JSON.stringify(keys, null, 2)}\n`,
  "utf8",
);
console.log(keys.map((entry) => entry.address).join("\n"));

const script = join(root, "scripts", "faucet.mjs");
const running = keys.map((entry, index) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [script, entry.address], {
      env: { ...process.env, CDP_PORT: String(9400 + index) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", () => {});
    child.on("close", () => {
      console.log(`${entry.address} ${out.includes("sent 1 STT") ? "sent" : "failed"}`);
      resolve();
    });
  }),
);

await Promise.all(running);
console.log("keys written to faucet-keys.json");

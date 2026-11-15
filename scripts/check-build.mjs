/**
 * Check that the compiled artifact still matches the source on disk.
 *
 * A stale artifact is how a deployment ends up running code that is not the
 * code under review, so this check runs before every deployment. The artifact
 * records the keccak256 of every source file it compiled, and that is what is
 * compared here.
 *
 *   node scripts/check-build.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { keccak256Hex } from "@mandate/policy";

const root = join(import.meta.dirname, "..");
const contracts = join(root, "contracts");

function walk(dir, matches, out = []) {
  for (const entry of readdirSync(dir)) {
    if (["out", "cache", "lib"].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, matches, out);
    else if (matches(full)) out.push(full);
  }
  return out;
}

const recorded = new Map();
for (const artifactPath of walk(join(contracts, "out"), (file) => file.endsWith(".json"))) {
  try {
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
    const metadata = typeof artifact.metadata === "string" ? JSON.parse(artifact.metadata) : artifact.metadata;
    for (const [name, info] of Object.entries(metadata?.sources ?? {})) {
      if (info?.keccak256) recorded.set(name, info.keccak256);
    }
  } catch {
    // Some files under out/ are build reports, not contract artifacts.
  }
}

if (recorded.size === 0) {
  console.log("no contract artifact has source metadata, so the sources cannot be checked");
  process.exit(1);
}

let stale = 0;
for (const file of walk(join(contracts, "src"), (path) => path.endsWith(".sol"))) {
  const relative = file.slice(contracts.length + 1).replace(/\\/g, "/");
  const expected = recorded.get(relative);
  if (!expected) {
    console.log(`not in the artifact: ${relative}`);
    stale += 1;
    continue;
  }
  // Solidity metadata hashes use LF line endings regardless of the host OS.
  const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const actual = keccak256Hex(source);
  if (actual !== expected) {
    console.log(`STALE: ${relative}`);
    stale += 1;
  }
}

if (stale === 0) {
  console.log(`the artifact matches the source (${recorded.size} files)`);
} else {
  console.log(`${stale} source files differ from the artifact`);
  process.exit(1);
}

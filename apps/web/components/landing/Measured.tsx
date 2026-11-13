import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MeasuredGrid, type Metrics } from "./MeasuredGrid";

/**
 * Read the measurements.
 *
 * The file is written by a script that runs against the chain. There is no
 * fallback and no guess: without the file the section says so.
 */
function readMetrics(): Metrics | null {
  const candidates = [
    join(process.cwd(), "metrics.json"),
    join(process.cwd(), "..", "..", "metrics.json"),
  ];
  for (const path of candidates) {
    try {
      return JSON.parse(readFileSync(path, "utf8")) as Metrics;
    } catch {
      continue;
    }
  }
  return null;
}

export function Measured() {
  return <MeasuredGrid metrics={readMetrics()} />;
}

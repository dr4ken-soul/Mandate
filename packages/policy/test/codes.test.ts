import { describe, expect, it } from "vitest";
import {
  CHAIN_REASON_CODES,
  REASON_CODES,
  copyFor,
  formatCopy,
  reasonCode,
  reasonCodeByHex,
  reasonCodeByName,
} from "../src/codes.ts";

/**
 * The selectors, computed with cast keccak and written down. A change to any
 * error signature in the contract breaks this test, and the contract test
 * `Codes.t.sol` names the same selector on the other side.
 */
const SELECTORS: Record<string, string> = {
  E_NO_MANDATE: "0x13d914bb",
  E_OPERATOR_REVOKED: "0x5e23eb82",
  E_EXPIRED: "0x5dffa6ef",
  E_MARKET_NOT_ALLOWED: "0x5a2d716e",
  E_TICK_MISMATCH: "0x04edcb32",
  E_LOT_MISMATCH: "0x2e95a233",
  E_BELOW_MIN_QTY: "0xd5c73ade",
  E_MARKET_NOTIONAL_CAP: "0x47a56227",
  E_TOTAL_NOTIONAL_CAP: "0x3334936d",
  E_LEVERAGE: "0x2b808b49",
  E_LOSS_WINDOW: "0xab41e695",
  E_VENUE_POSITION_CAP: "0x035bb5c8",
  E_VOUCHER_BLOCKED: "0x93abd6ec",
  E_MARK_STALE: "0x7fc665b6",
  E_GAS_HEADROOM: "0xfe627acc",
  E_COOLDOWN: "0x4029495f",
  E_IN_BREACH: "0x1fbd6281",
};

describe("the reason code table", () => {
  it("is closed", () => {
    expect(REASON_CODES.length).toBe(19);
    expect(REASON_CODES[0]?.code).toBe(0x00);
    expect(REASON_CODES[REASON_CODES.length - 1]?.code).toBe(0x12);
  });

  it("carries one selector for every code the chain can emit", () => {
    expect(CHAIN_REASON_CODES.length).toBe(17);
    for (const code of CHAIN_REASON_CODES) {
      expect(code.selector, code.name).not.toBeNull();
    }
  });

  it("leaves the compiler code without a selector", () => {
    const compiler = reasonCodeByName("E_UNEXPRESSIBLE");
    expect(compiler?.code).toBe(0x11);
    expect(compiler?.selector).toBeNull();
  });

  it("matches the selectors the contract uses", () => {
    for (const [name, selector] of Object.entries(SELECTORS)) {
      const code = reasonCodeByName(name);
      expect(code, name).toBeDefined();
      expect(code?.selector, name).toBe(selector);
    }
  });

  it("looks a code up by number, hex and name", () => {
    expect(reasonCode(0x08)?.name).toBe("E_MARKET_NOTIONAL_CAP");
    expect(reasonCodeByHex("0x08")?.code).toBe(0x08);
    expect(reasonCodeByHex("0X0C")?.code).toBe(0x0c);
    expect(reasonCode(0x99)).toBeUndefined();
  });

  it("names the numbers in the sentence", () => {
    const sentence = formatCopy(0x08, {
      SYMBOL: "BTC-PERP",
      after: "2,000.00 USDso",
      cap: "200.00 USDso",
    });
    expect(sentence).toBe(
      "This would take BTC-PERP to 2,000.00 USDso, above the 200.00 USDso this mandate allows.",
    );
  });

  it("fails closed on an unknown code", () => {
    expect(copyFor(0x99)).toContain("refusal");
  });
});

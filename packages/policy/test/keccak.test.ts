import { describe, expect, it } from "vitest";
import { keccak256Hex } from "../src/keccak.ts";

describe("keccak256", () => {
  it("hashes the empty string", () => {
    expect(keccak256Hex("")).toBe(
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
    );
  });

  it("hashes abc", () => {
    expect(keccak256Hex("abc")).toBe(
      "0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45",
    );
  });

  it("hashes a long string", () => {
    expect(keccak256Hex("a".repeat(200))).toBe(
      "0x96ea54061def936c4be90b518992fdc6f12f535068a256229aca54267b4d084d",
    );
  });
});


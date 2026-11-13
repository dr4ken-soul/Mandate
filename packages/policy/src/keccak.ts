/**
 * Keccak-256, implemented in plain TypeScript.
 *
 * The policy package must not depend on viem or any chain library, and the
 * canonical policy hash has to be computable in a browser, in a Node script and
 * in a Foundry test. Node's crypto module does not expose keccak256 (it exposes
 * SHA3-256, which is a different padding rule), so the permutation is here.
 *
 * Vectors asserted in test/keccak.test.ts:
 *   keccak256("")    = c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
 *   keccak256("abc") = 4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45
 */

const MASK64 = (1n << 64n) - 1n;

const ROUND_CONSTANTS: readonly bigint[] = [
  0x0000000000000001n,
  0x0000000000008082n,
  0x800000000000808an,
  0x8000000080008000n,
  0x000000000000808bn,
  0x0000000080000001n,
  0x8000000080008081n,
  0x8000000000008009n,
  0x000000000000008an,
  0x0000000000000088n,
  0x0000000080008009n,
  0x000000008000000an,
  0x000000008000808bn,
  0x800000000000008bn,
  0x8000000000008089n,
  0x8000000000008003n,
  0x8000000000008002n,
  0x8000000000000080n,
  0x000000000000800an,
  0x800000008000000an,
  0x8000000080008081n,
  0x8000000000008080n,
  0x0000000080000001n,
  0x8000000080008008n,
];

/** Rotation offsets, indexed [x][y] exactly as published in the Keccak reference. */
const ROTATION: readonly (readonly number[])[] = [
  [0, 36, 3, 41, 18],
  [1, 44, 10, 45, 2],
  [62, 6, 43, 15, 61],
  [28, 55, 25, 21, 56],
  [27, 20, 39, 8, 14],
];

function rotl64(value: bigint, shift: number): bigint {
  if (shift === 0) return value;
  const n = BigInt(shift);
  return ((value << n) | (value >> (64n - n))) & MASK64;
}

function keccakF1600(state: bigint[]): void {
  const lane = (index: number): bigint => state[index] as bigint;
  const set = (index: number, value: bigint): void => {
    state[index] = value;
  };

  const c: bigint[] = [0n, 0n, 0n, 0n, 0n];
  const d: bigint[] = [0n, 0n, 0n, 0n, 0n];
  const b: bigint[] = new Array<bigint>(25).fill(0n);

  for (let round = 0; round < 24; round += 1) {
    // Theta
    for (let x = 0; x < 5; x += 1) {
      c[x] = lane(x) ^ lane(x + 5) ^ lane(x + 10) ^ lane(x + 15) ^ lane(x + 20);
    }
    for (let x = 0; x < 5; x += 1) {
      d[x] = (c[(x + 4) % 5] as bigint) ^ rotl64(c[(x + 1) % 5] as bigint, 1);
    }
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        set(x + 5 * y, lane(x + 5 * y) ^ (d[x] as bigint));
      }
    }

    // Rho and Pi
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        const target = y + 5 * ((2 * x + 3 * y) % 5);
        b[target] = rotl64(lane(x + 5 * y), ROTATION[x]?.[y] ?? 0);
      }
    }

    // Chi
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        set(
          x + 5 * y,
          ((b[x + 5 * y] as bigint) ^
            (~(b[((x + 1) % 5) + 5 * y] as bigint) & (b[((x + 2) % 5) + 5 * y] as bigint))) &
            MASK64,
        );
      }
    }

    // Iota
    set(0, lane(0) ^ (ROUND_CONSTANTS[round] as bigint));
  }
}

/**
 * Keccak-256 digest of a byte array.
 * @returns 32 bytes.
 */
export function keccak256Bytes(input: Uint8Array): Uint8Array {
  const rate = 136; // 1088 bits, the rate for Keccak-256
  const state: bigint[] = new Array<bigint>(25).fill(0n);

  const padded = new Uint8Array(Math.ceil((input.length + 1) / rate) * rate);
  padded.set(input);
  padded[input.length] = 0x01;
  padded[padded.length - 1] = (padded[padded.length - 1] as number) | 0x80;

  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let i = 0; i < rate / 8; i += 1) {
      let word = 0n;
      for (let byte = 0; byte < 8; byte += 1) {
        word |= BigInt(padded[offset + i * 8 + byte] as number) << BigInt(8 * byte);
      }
      state[i] = (state[i] as bigint) ^ word;
    }
    keccakF1600(state);
  }

  const out = new Uint8Array(32);
  for (let i = 0; i < 4; i += 1) {
    let word = state[i] as bigint;
    for (let byte = 0; byte < 8; byte += 1) {
      out[i * 8 + byte] = Number(word & 0xffn);
      word >>= 8n;
    }
  }
  return out;
}

/**
 * Keccak-256 digest of a UTF-8 string.
 * @returns 32 bytes.
 */
export function keccak256(input: string): Uint8Array {
  return keccak256Bytes(new TextEncoder().encode(input));
}

/**
 * Keccak-256 digest of a UTF-8 string, hex encoded with a 0x prefix.
 */
export function keccak256Hex(input: string): `0x${string}` {
  const digest = keccak256(input);
  let hex = "0x";
  for (const byte of digest) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex as `0x${string}`;
}


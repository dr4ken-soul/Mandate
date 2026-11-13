/**
 * The single persisted key.
 *
 * This file is the only file in the repository allowed to touch storage, and
 * it stores one boolean intent: that the user deliberately left the wallet.
 * It holds no product state, no token and no chain data. A refresh must not
 * silently re-enter a wallet the user walked away from.
 */

const DISCONNECTED_KEY = "mandate:wallet-disconnected";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Record that the user deliberately disconnected. */
export function markWalletDisconnected(): void {
  try {
    storage()?.setItem(DISCONNECTED_KEY, "1");
  } catch {
    // A blocked storage is not an error the interface needs to surface.
  }
}

/** Forget the disconnect intent, called after a successful connect. */
export function clearWalletDisconnected(): void {
  try {
    storage()?.removeItem(DISCONNECTED_KEY);
  } catch {
    // A blocked storage is not an error the interface needs to surface.
  }
}

/** Whether the user deliberately disconnected and has not connected since. */
export function wasWalletDisconnected(): boolean {
  try {
    return storage()?.getItem(DISCONNECTED_KEY) === "1";
  } catch {
    return false;
  }
}

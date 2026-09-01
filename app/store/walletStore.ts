import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * The wallet provider used to establish the current connection, or null when
 * no wallet is connected. "manual" and "demo" represent address-only modes
 * that have no browser-extension backing (and therefore nothing to re-validate
 * on restore).
 */
export type WalletProvider =
  | "freighter"
  | "albedo"
  | "xbull"
  | "walletconnect"
  | "manual"
  | "demo";

export type WalletDisconnectReason =
  | "user"
  | "wallet-unavailable"
  | "network-mismatch";

interface WalletStoreState {
  /** Connected Stellar public key. */
  address: string | null;
  /** Which wallet provider established the connection. */
  provider: WalletProvider | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  /** Human-readable wallet network used at connect time (mainnet/testnet). */
  networkLabel: string | null;
  /** Timestamp (ms) of the last successful connect, for diagnostics. */
  connectedAt: number | null;
  /**
   * Marks the connection as unusable (e.g. the extension was removed or the
   * network changed) without wiping the remembered address. The UI shows the
   * address as a one-tap reconnect instead of a live session.
   */
  needsReconnect: boolean;

  connect: (address: string, provider: WalletProvider, networkLabel?: string) => void;
  setConnecting: (isConnecting: boolean) => void;
  setError: (error: string | null) => void;
  /** Fully clears the connection (user-initiated). */
  disconnect: () => void;
  /** Flags the session as stale without discarding the remembered address. */
  markNeedsReconnect: (reason: WalletDisconnectReason) => void;
  /** Clears the needs-reconnect flag after a successful re-validation. */
  clearNeedsReconnect: () => void;
  reset: () => void;
}

const initialConnectionState = {
  address: null,
  provider: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  networkLabel: null,
  connectedAt: null,
  needsReconnect: false,
};

export const useWalletStore = create<WalletStoreState>()(
  persist(
    (set) => ({
      ...initialConnectionState,
      connect: (address, provider, networkLabel = null) =>
        set({
          address,
          provider,
          isConnected: true,
          isConnecting: false,
          error: null,
          networkLabel,
          connectedAt: Date.now(),
          needsReconnect: false,
        }),
      setConnecting: (isConnecting) =>
        set({ isConnecting, error: isConnecting ? null : undefined }),
      setError: (error) => set({ error, isConnecting: false }),
      disconnect: () =>
        set({
          ...initialConnectionState,
          needsReconnect: false,
        }),
      markNeedsReconnect: () => set({ isConnected: false, needsReconnect: true }),
      clearNeedsReconnect: () => set({ needsReconnect: false }),
      reset: () => set(initialConnectionState),
    }),
    {
      name: "stellar-wrap-wallet",
      partialize: (state) => ({
        address: state.address,
        provider: state.provider,
        isConnected: state.isConnected,
        networkLabel: state.networkLabel,
        connectedAt: state.connectedAt,
        needsReconnect: state.needsReconnect,
      }),
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
    },
  ),
);

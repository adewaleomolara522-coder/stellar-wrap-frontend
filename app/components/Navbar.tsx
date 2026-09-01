"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { ColorToggle } from "./ColorToggle";
import { DarkLightToggle } from "./DarkLightToggle";
import { motion } from "framer-motion";
import { useWrapStore, resetCache } from "@/app/store/wrapStore";
import { useWalletStore } from "@/app/store/walletStore";
import { useHydrateWallet } from "@/app/hooks/useHydrateWallet";
import { useTheme } from "@/app/context/ThemeContext";

function truncate(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function Navbar() {
  const router = useRouter();
  const { address, reset } = useWrapStore();
  const network = useWrapStore((s) => s.network);
  const disconnectWallet = useWalletStore((s) => s.disconnect);
  const { mode } = useTheme();

  // Re-validate the persisted wallet session on load so a page refresh doesn't
  // silently drop the user's connection.
  useHydrateWallet(network);

  const handleDisconnect = () => {
    reset();
    resetCache();
    disconnectWallet();
    // Clear the remembered last-used address so a stale session isn't offered
    // as a one-tap reconnect on the next visit.
    try {
      localStorage.removeItem("lastUsedStellarAddress");
    } catch {
      // Non-fatal.
    }
    toast.success("Wallet disconnected");
    router.push("/");
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md border-b transition-colors duration-200"
      style={{
        backgroundColor:
          mode === "dark" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.8)",
        borderColor:
          mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[var(--color-theme-primary)] flex items-center justify-center font-bold text-black shadow-[0_0_10px_rgba(var(--color-theme-primary-rgb),0.5)]">
          Z
        </div>
        <span
          className="font-bold text-lg tracking-tight"
          style={{ color: mode === "dark" ? "#fff" : "#000" }}
        >
          Zimma
        </span>
      </div>

      <div className="flex items-center gap-3">
        {address && (
          <Link
            href="/history"
            className="text-sm font-semibold transition-colors"
            style={{
              color:
                mode === "dark" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-theme-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color =
                mode === "dark" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)";
            }}
          >
            History
          </Link>
        )}
        <DarkLightToggle />
        <ColorToggle />

        {address && (
          <>
            <span
              className="text-xs font-mono px-2 py-1 rounded-full"
              style={{
                backgroundColor:
                  mode === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.05)",
                color:
                  mode === "dark" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
              }}
            >
              {truncate(address)}
            </span>
            <button
              onClick={handleDisconnect}
              aria-label="Disconnect wallet"
              className="flex items-center gap-1.5 text-xs border rounded-full px-3 py-1 transition-all duration-200"
              style={{
                backgroundColor: "transparent",
                borderColor:
                  mode === "dark"
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.08)",
                color:
                  mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  mode === "dark"
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)";
                e.currentTarget.style.color = mode === "dark" ? "#fff" : "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color =
                  mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
              }}
            >
              <LogOut size={12} />
              Disconnect
            </button>
          </>
        )}
      </div>
    </motion.nav>
  );
}

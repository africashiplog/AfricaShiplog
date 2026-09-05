"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="w-full rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-sidebar-text transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
    >
      {loading ? "..." : "تسجيل الخروج"}
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  /** Path to send the user to after logging out. Defaults to /. */
  redirectTo?: string;
  className?: string;
  label?: string;
}

export function LogoutButton({
  redirectTo = "/",
  className,
  label = "Cerrar sesión",
}: LogoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // We still want to send the user out even if the network call fails.
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleLogout}
      disabled={pending}
      className={className}
      aria-busy={pending}
    >
      <SignOut size={16} weight="regular" aria-hidden="true" />
      <span className="ml-2">{pending ? "Cerrando…" : label}</span>
    </Button>
  );
}

"use client";
import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";
export function ClerkSignOut() {
  const clerk = useClerk();
  useEffect(() => { void clerk.signOut({ redirectUrl: "/" }); }, [clerk]);
  return <main className="studio-main">Đang đăng xuất…</main>;
}

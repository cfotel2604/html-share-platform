import { ClerkProvider } from "@clerk/nextjs";
import { ClerkSignOut } from "@/components/clerk-sign-out";
import { clerkAvailable } from "@/lib/auth-config";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default function SignOutPage() {
  if (!clerkAvailable()) redirect("/");
  return <ClerkProvider publishableKey={process.env.CLERK_PUBLISHABLE_KEY}><ClerkSignOut /></ClerkProvider>;
}

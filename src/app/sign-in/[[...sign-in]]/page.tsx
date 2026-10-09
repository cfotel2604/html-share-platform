import { ClerkProvider, SignIn } from "@clerk/nextjs";
import { clerkAvailable } from "@/lib/auth-config";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default function SignInPage() {
  if (!clerkAvailable()) notFound();
  return <ClerkProvider publishableKey={process.env.CLERK_PUBLISHABLE_KEY} signInUrl="/sign-in" signInFallbackRedirectUrl="/">
    <main className="studio-main flex min-h-dvh items-center justify-center"><SignIn routing="path" path="/sign-in" fallbackRedirectUrl="/" /></main>
  </ClerkProvider>;
}

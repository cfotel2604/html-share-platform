import Workbench from "@/components/workbench";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAvailable } from "@/lib/auth-config";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return clerkAvailable()
    ? <ClerkProvider publishableKey={process.env.CLERK_PUBLISHABLE_KEY} signInUrl="/sign-in"><Workbench /></ClerkProvider>
    : <Workbench />;
}

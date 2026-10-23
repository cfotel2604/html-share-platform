import Workbench from "@/components/workbench";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAvailable } from "@/lib/auth-config";
import { metadataBackend } from "@/lib/metadata-backend";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const pathBased=metadataBackend()==='cloudflare';
  return clerkAvailable()
    ? <ClerkProvider publishableKey={process.env.CLERK_PUBLISHABLE_KEY} signInUrl="/sign-in"><Workbench pathBased={pathBased} /></ClerkProvider>
    : <Workbench pathBased={pathBased} />;
}

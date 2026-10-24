import { currentActor, AuthError } from "./auth";
import { listSites } from "./site-ops";
import { authMode, clerkAvailable } from "./auth-config";
import { demoEnabled } from "./demo-auth";
import type { StudioWorkspace } from "@/features/studio/types";

export async function readStudioWorkspace(request: Request): Promise<StudioWorkspace> {
  try {
    const actor = await currentActor(request);
    return { auth: { signedIn: Boolean(actor), role: actor?.role ?? null,
      provider: authMode(), demoAvailable: demoEnabled(), available: clerkAvailable() || demoEnabled() },
    sites: actor ? await listSites(actor) : [] };
  } catch (error) {
    if (!(error instanceof AuthError) || error.status !== 403) throw error;
    return { auth: { signedIn: false, role: null, denied: true, provider: authMode(),
      demoAvailable: false, available: clerkAvailable() }, sites: [] };
  }
}

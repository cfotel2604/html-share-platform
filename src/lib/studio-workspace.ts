import { currentStudioContext } from "./auth";
import { listSites } from "./platform-ops";
import { authMode, clerkAvailable } from "./auth-config";
import { demoEnabled } from "./demo-auth";
import type { AuthStatus, StudioWorkspace } from "@/features/studio/types";

export function workspaceAuth(signedIn = false, role: AuthStatus["role"] = null): AuthStatus {
  return {signedIn,role,provider:authMode(),demoAvailable:demoEnabled(),available:clerkAvailable()||demoEnabled()};
}

export async function readStudioWorkspace(request: Request): Promise<StudioWorkspace> {
  const {actor,sites}=await currentStudioContext(request,true);
  return {
    auth:workspaceAuth(Boolean(actor),actor?.role??null),
    sites:actor ? (sites ?? await listSites(actor)) : [],
  };
}

import { StudioApiError } from "./api";
import type { SiteSummary, StudioApi } from "./types";

export function watchProjection(
  client: Pick<StudioApi, "listSites">,
  callbacks: { sites: (items: SiteSummary[]) => void; unavailable: () => void; unauthorized: () => void },
  runtime = {
    visible: () => document.visibilityState !== "hidden",
    schedule: (run: () => void) => setTimeout(run, 15000),
    cancel: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
  },
) {
  let active = true, timer: ReturnType<typeof setTimeout>;
  async function tick() {
    try {
      if (runtime.visible()) {
        const items = await client.listSites(); // Fresh Node authorization, never Worker or permission cache.
        if (!active) return;
        callbacks.sites(items);
        if (!items.some(site => site.projection?.pending)) return;
      }
    } catch (error) {
      if (!active) return;
      if (error instanceof StudioApiError && [401, 403].includes(error.status)) {
        callbacks.unauthorized(); return;
      }
      callbacks.unavailable();
    }
    if (active) timer = runtime.schedule(() => { void tick(); });
  }
  timer = runtime.schedule(() => { void tick(); });
  return () => { active = false; runtime.cancel(timer); };
}

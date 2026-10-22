// Bounds lookup cost without trusting client-supplied forwarding headers.
// This is a per-process budget; multi-replica/per-IP policy belongs at the edge.
export function createViewerLimiter(limit: number, windowMs = 60_000, now = Date.now) {
  let count = 0, expires = 0;
  return () => {
    const time = now();
    if (time >= expires) { count = 0; expires = time + windowMs; }
    if (count >= limit) return Math.max(1, Math.ceil((expires - time) / 1000));
    count++;
    return 0;
  };
}
const configured = Number(process.env.VIEWER_REQUESTS_PER_MINUTE ?? 600);
export const viewerLimit = createViewerLimiter(
  Number.isInteger(configured) && configured >= 1 && configured <= 100_000 ? configured : 600,
);

import { publicOriginConfig } from "../../scripts/origin-config.mjs";
import { SHARE_CODE } from "./share-link-format";
import { getDomain } from "tldts";
import { trustedOrigins } from "./auth-config";
export function previewSiteUrl(id: string, grant: string) {
  if (!/^[a-f0-9]{32}$/.test(id) || !/^[a-z2-7]{26}$/.test(grant ?? "")) throw new Error("Invalid preview identifier");
  if (process.env.GATEWAY_MODE === "hostname") {
    const {domain,scheme,port} = publicOriginConfig();
    return `${scheme}://${id}--${grant}.${domain}${port ? ":" + port : ""}/`;
  }
  throw new Error("Private preview requires hostname mode");
}

export function publicContentOrigin() {
  const configured = process.env.PUBLIC_CONTENT_ORIGIN;
  if (!configured) throw new Error("PUBLIC_CONTENT_ORIGIN is required");
  const origin = new URL(configured), domain = getDomain(origin.hostname, { allowPrivateDomains: true });
  if (origin.origin !== configured || origin.protocol !== "https:" || origin.username || origin.password || !domain
    || trustedOrigins().some(value => {
      const studio = new URL(value);
      return studio.hostname === origin.hostname || getDomain(studio.hostname, { allowPrivateDomains: true }) === domain;
    })) throw new Error("Unsafe public content origin");
  return origin.origin;
}

export function shareUrl(code: string | null) {
  if (code === null) return null;
  if (!SHARE_CODE.test(code)) throw new Error("Invalid share code");
  return `${publicContentOrigin()}/${code}/`;
}

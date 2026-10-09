import { publicOriginConfig } from "../../scripts/origin-config.mjs";
import { SHARE_CODE } from "./share-link-format";
export function publicSiteUrl(id: string, grant?: string) {
  if (!/^[a-f0-9]{32}$/.test(id) || (grant && !/^[a-z2-7]{26}$/.test(grant))) throw new Error("Invalid public identifier");
  if (process.env.GATEWAY_MODE === "hostname") {
    const {domain,scheme,port} = publicOriginConfig();
    return `${scheme}://${id}${grant ? "--" + grant : ""}.${domain}${port ? ":" + port : ""}/`;
  }
  if (grant) throw new Error("Private preview requires hostname mode");
  return `${process.env.GATEWAY_PUBLIC_ORIGIN ?? "http://127.0.0.1:4100"}/s/${id}/`;
}

export function shareUrl(code: string | null) {
  if (code === null) return null;
  if (!SHARE_CODE.test(code)) throw new Error("Invalid viewer code");
  if(process.env.VIEWER_PUBLIC_ORIGIN && new URL(process.env.VIEWER_PUBLIC_ORIGIN).origin!==process.env.VIEWER_PUBLIC_ORIGIN) throw new Error("Invalid viewer origin");
  return process.env.VIEWER_PUBLIC_ORIGIN ? `${process.env.VIEWER_PUBLIC_ORIGIN}/${code}` : `/view/${code}`;
}

import {getDomain} from "tldts";

export function publicOriginConfig(env=process.env) {
  const domain=env.PUBLIC_SITE_DOMAIN??"matbao.one",scheme=env.PUBLIC_SITE_SCHEME??"https";
  let port=env.PUBLIC_SITE_PORT??"";
  if(!domain.includes(".") || domain.split(".").some(label=>!label || label.length>63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) throw new Error("Invalid publish domain");
  if(!["https","http"].includes(scheme) || (scheme==="http" && !domain.endsWith(".localhost"))) throw new Error("HTTP publish hostnames are loopback lab only");
  if(port && (!/^\d{1,5}$/.test(port) || Number(port)<1 || Number(port)>65535)) throw new Error("Invalid publish port");
  if((scheme==="https" && port==="443") || (scheme==="http" && port==="80")) port="";
  const publicDomain=getDomain(domain,{allowPrivateDomains:true});
  if(!publicDomain) throw new Error("Publish domain must be registrable");
  const studio=(env.AUTH_TRUSTED_ORIGINS??"http://127.0.0.1:3100,http://localhost:3100").split(",").map(value=>value.trim()).filter(Boolean);
  const origins=[...studio,env.VIEWER_PUBLIC_ORIGIN,env.GATEWAY_VIEWER_ORIGIN,env.GATEWAY_PREVIEW_ORIGIN].filter(Boolean);
  for(const origin of origins) {
    const url=new URL(origin);
    if(url.origin!==origin || !["http:","https:"].includes(url.protocol)) throw new Error("Invalid trusted origin");
    if(getDomain(url.hostname,{allowPrivateDomains:true})===publicDomain) throw new Error("Upload and trusted UI must have different registrable domains");
  }
  return {domain,scheme,port};
}

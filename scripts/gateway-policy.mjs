export const TYPES = new Map([
  [".html","text/html; charset=utf-8"],[".htm","text/html; charset=utf-8"],
  [".css","text/css; charset=utf-8"],[".js","text/javascript; charset=utf-8"],
  [".mjs","text/javascript; charset=utf-8"],[".json","application/json; charset=utf-8"],
  [".txt","text/plain; charset=utf-8"],[".png","image/png"],[".jpg","image/jpeg"],
  [".jpeg","image/jpeg"],[".gif","image/gif"],[".webp","image/webp"],[".ico","image/x-icon"],
  [".woff","font/woff"],[".woff2","font/woff2"],[".ttf","font/ttf"],[".otf","font/otf"],
]);
export const SITE_ID = /^[a-f0-9]{32}$/;
export function validAsset(path) {
  const parts=path.split("/");
  return path.length>0 && path.length<=255 && !/[\\\x00-\x1f\x7f?#%]/.test(path) &&
    !path.startsWith("/") && !/^[a-z]:/i.test(path) && parts.length<=12 &&
    parts.every(part=>part && part!=="." && part!=="..");
}
export function assetInfo(raw) {
  if (/%(?:2f|5c|00|25)/i.test(raw)) return null;
  let asset; try {asset=decodeURIComponent(raw)||"index.html";} catch{return null;}
  if(!validAsset(asset)) return null;
  const type=TYPES.get(/\.[^.\/]+$/.exec(asset)?.[0]?.toLowerCase());
  return type ? {asset,type} : null;
}
export function mapRequest(rawUrl) {
  const match=/^\/s\/([a-f0-9]{32})\/(.*)$/.exec(rawUrl.split("?")[0]);
  const info=match && assetInfo(match[2]);
  return info ? {id:match[1],...info} : null;
}
export function mapHostRequest(host,rawUrl,config) {
  if(typeof host!=="string" || !/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)) return null;
  const [hostname,port=""]=host.toLowerCase().split(":");
  if(port!==String(config.port??"")) return null;
  const suffix="."+config.domain;
  if(!hostname.endsWith(suffix)) return null;
  const label=hostname.slice(0,-suffix.length);
  if(config.reserved?.includes(label) || label.includes(".")) return null;
  const match=/^([a-f0-9]{32})(?:--([a-z2-7]{26}))?$/.exec(label);
  const raw=rawUrl.split("?")[0];
  if(!match || !raw.startsWith("/")) return null;
  const info=assetInfo(raw.slice(1));
  return info ? {id:match[1],...info,grant:match[2]??null} : null;
}
export function manifestEntry(manifest,path,type) {
  if(!Array.isArray(manifest) || manifest.length>500) return null;
  const matches=manifest.filter(entry=>entry?.path===path);
  const entry=matches[0];
  return matches.length===1 && validAsset(entry.path) && entry.type===type &&
    Number.isInteger(entry.size) && entry.size>=0 && entry.size<=100*1024*1024 && /^[a-f0-9]{64}$/.test(entry.sha256)
    ? entry : null;
}
export function securityHeaders(type,config,preview=false) {
  const own=config.mode==="hostname" ? `${config.scheme??"https"}://*.${config.domain}${config.port?":"+config.port:""}` : "'self'";
  const ancestor=preview ? config.previewOrigin??config.viewerOrigin : config.viewerOrigin;
  return {
    "Content-Type":type,"X-Content-Type-Options":"nosniff","Cache-Control":"no-store",
    "Referrer-Policy":"no-referrer","Access-Control-Allow-Origin":"*",
    "Cross-Origin-Resource-Policy":"cross-origin",
    "Permissions-Policy":"camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Content-Security-Policy": type.startsWith("text/html")
      ? `sandbox allow-scripts; default-src 'none'; script-src ${own} https: 'unsafe-inline'; style-src ${own} https: 'unsafe-inline'; img-src ${own} https: data:; font-src ${own} https:; connect-src ${own}; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${ancestor}`
      : `default-src 'none'; object-src 'none'; frame-ancestors ${ancestor}`,
  };
}

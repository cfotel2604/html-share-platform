import { getDomain } from 'tldts';
import { TYPES, validAsset } from '../../scripts/gateway-policy.mjs';
export { TYPES, validAsset };
export const CODE=/^[A-Za-z0-9]{10}$/;
export const GRANT=/^[a-f0-9]{32}$/;
export class HttpError extends Error {
  constructor(status,message='Request denied') {super(message);this.status=status;}
}
export const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export const randomHex=()=>hex(crypto.getRandomValues(new Uint8Array(16)));
export async function hash(value) {return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));}
export function shareCode() {
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';let out='';
  while(out.length<10) for(const b of crypto.getRandomValues(new Uint8Array(16))) {
    if(b<248) out+=alphabet[b%62];if(out.length===10) break;
  }
  return out;
}
export function origin(env) {
  const url=new URL(env.PUBLIC_ORIGIN),studio=new URL(env.STUDIO_ORIGIN);
  const loop=u=>['127.0.0.1','localhost','[::1]'].includes(u.hostname);
  if(url.origin!==env.PUBLIC_ORIGIN || studio.origin!==env.STUDIO_ORIGIN ||
    (url.protocol!=='https:' && !loop(url)) || (studio.protocol!=='https:' && !loop(studio)) ||
    url.origin===studio.origin ||
    (!loop(url) && getDomain(url.hostname,{allowPrivateDomains:true})===getDomain(studio.hostname,{allowPrivateDomains:true})))
    throw new Error('Unsafe pilot origins');
  return url.origin;
}
export function headers(type='text/plain; charset=utf-8',base=null,prefix=null) {
  const result={'Content-Type':type,'Cache-Control':'no-store','Referrer-Policy':'no-referrer',
    'X-Content-Type-Options':'nosniff','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; object-src 'none'"};
  if(base && prefix) {
    const own=`${base}/${prefix}/`;
    result['Access-Control-Allow-Origin']='*';
    result['Cross-Origin-Resource-Policy']='cross-origin';
    if(type.startsWith('text/html')) result['Content-Security-Policy']=
      `sandbox allow-scripts; default-src 'none'; script-src ${own} https: 'unsafe-inline'; style-src ${own} https: 'unsafe-inline'; img-src ${own} https: data:; font-src ${own} https:; connect-src ${own}; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
  }
  return result;
}
export const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:headers('application/json; charset=utf-8')});
export const denial=(status=404)=>new Response(status===503?'Serving unavailable':'Not found',{status,headers:headers()});
export function assetPath(raw) {
  if(/%(?:2f|5c|00|25|2e)/i.test(raw)) return null;
  let path;try{path=decodeURIComponent(raw)||'index.html';}catch{return null;}
  const type=TYPES.get(/\.[^./]+$/.exec(path)?.[0]?.toLowerCase());
  return validAsset(path) && type ? {path,type}:null;
}
export function manifest(raw) {
  if(!Array.isArray(raw)||!raw.length||raw.length>500) throw new HttpError(400,'Invalid manifest');
  let total=0;const names=new Set();
  for(const a of raw) {
    const info=typeof a.path==='string' && assetPath(a.path);
    if(!info||info.type!==a.type||names.has(a.path.toLowerCase())||!Number.isInteger(a.size)||a.size<0||
      (total+=a.size)>100*1024*1024||!/^[a-f0-9]{64}$/.test(a.sha256)||
      typeof a.etag!=='string'||!/^[a-zA-Z0-9-]{1,128}$/.test(a.etag)) throw new HttpError(400,'Invalid manifest');
    names.add(a.path.toLowerCase());
  }
  if(!raw.some(a=>a.path==='index.html')) throw new HttpError(400,'Missing index.html');
  return raw.map(({path,type,size,sha256,etag})=>({path,type,size,sha256,etag}));
}

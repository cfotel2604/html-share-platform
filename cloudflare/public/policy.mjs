import { getDomain } from 'tldts';
import { TYPES,validAsset } from '../../scripts/gateway-policy.mjs';

const CODE=/^[A-Za-z0-9]{10}$/;
const SITE=/^[a-f0-9]{32}$/;
const VERSION=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export function publicOrigin(publicValue,studioValue){
  const content=new URL(publicValue),studio=new URL(studioValue);
  const contentDomain=getDomain(content.hostname,{allowPrivateDomains:true});
  const studioDomain=getDomain(studio.hostname,{allowPrivateDomains:true});
  if(content.origin!==publicValue || studio.origin!==studioValue || content.protocol!=='https:' || studio.protocol!=='https:'
    || !contentDomain || !studioDomain || contentDomain===studioDomain || content.username || studio.username || content.password || studio.password)throw new Error('unsafe_origins');
  return content.origin;
}

export function assetPath(raw){
  if(/%(?:2f|5c|00|25|2e)/i.test(raw))return null;
  let path;try{path=decodeURIComponent(raw)||'index.html';}catch{return null;}
  const type=TYPES.get(/\.[^./]+$/.exec(path)?.[0]?.toLowerCase());
  return validAsset(path) && type?{path,type}:null;
}

export function requestRoute(rawUrl,origin){
  const url=new URL(rawUrl);
  if(url.origin!==origin || url.username || url.password || url.hash)return null;
  // Check the available raw representation before URL dot-segment normalization.
  // A browser/proxy may already have normalized it; the manifest remains the boundary.
  const rawPath=/^https:\/\/[^/?#]+([^?#]*)/.exec(rawUrl)?.[1];
  const match=rawPath && /^\/([^/]+)(?:\/(.*))?$/.exec(rawPath);
  if(!match || !CODE.test(match[1]))return null;
  const info=assetPath(match[2]??'');
  return info?{code:match[1],redirect:match[2]===undefined,...info}:null;
}

export function publicSnapshot(row){
  if(!row || JSON.stringify(Object.keys(row).sort())!==JSON.stringify(['active_version','manifest','projection_version','site_id','updated_at'])
    || !SITE.test(row.site_id) || !VERSION.test(row.active_version)
    || !Number.isSafeInteger(row.projection_version) || row.projection_version<1
    || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(row.updated_at)
    || typeof row.manifest!=='string' || row.manifest.length>1048576)throw new Error('invalid_snapshot');
  const manifest=JSON.parse(row.manifest);
  if(!Array.isArray(manifest) || manifest.length<1 || manifest.length>500)throw new Error('invalid_manifest');
  const assets=new Map(),names=new Set();let total=0;
  for(const entry of manifest){
    if(!entry || JSON.stringify(Object.keys(entry).sort())!==JSON.stringify(['etag','path','r2_key','size']))throw new Error('invalid_manifest');
    const info=typeof entry.path==='string' && assetPath(entry.path);
    if(!info || info.path!==entry.path || names.has(entry.path.toLowerCase())
      || entry.r2_key!==`${row.site_id}/${row.active_version}/${entry.path}`
      || !Number.isSafeInteger(entry.size) || entry.size<0 || (total+=entry.size)>104857600
      || typeof entry.etag!=='string' || !/^[A-Za-z0-9-]{1,128}$/.test(entry.etag))throw new Error('invalid_manifest');
    names.add(entry.path.toLowerCase());assets.set(entry.path,{...entry,type:info.type});
  }
  if(!assets.has('index.html'))throw new Error('invalid_manifest');
  return assets;
}

export function responseHeaders(type='text/plain; charset=utf-8',origin=null,code=null){
  const headers={'Content-Type':type,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; object-src 'none'"};
  if(origin && code){
    const own=`${origin}/${code}/`;
    headers['Access-Control-Allow-Origin']='*';headers['Cross-Origin-Resource-Policy']='cross-origin';
    if(type.startsWith('text/html'))headers['Content-Security-Policy']=
      `sandbox allow-scripts; default-src 'none'; script-src ${own} https: 'unsafe-inline'; style-src ${own} https: 'unsafe-inline'; img-src ${own} https: data:; font-src ${own} https:; connect-src ${own}; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
  }
  return headers;
}

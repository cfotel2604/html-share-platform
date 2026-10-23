import { origin,CODE,GRANT,hash,headers,denial,assetPath } from './policy.mjs';
export async function serve(request,env,preview=false) {
  try {
    const base=origin(env),url=new URL(request.url);
    if(url.origin!==base) return denial();
    if(!['GET','HEAD'].includes(request.method)) return denial(405);
    const match=/^\/([^/]+)(?:\/(.*))?$/.exec(url.pathname);
    if(!match || !(preview?GRANT:CODE).test(match[1])) return denial();
    const info=assetPath(match[2]??'');if(!info) return denial();
    const common=`SELECT v.storage_prefix,a.size,a.etag,a.type FROM site_versions v
      JOIN version_assets a ON a.version_id=v.id JOIN sites s ON s.id=v.site_id`;
    const row=preview ? await env.DB.prepare(`${common}
      JOIN preview_grants g ON g.site_id=s.id AND g.version_id=v.id
      JOIN users u ON u.id=g.actor_id JOIN auth_allowlist p ON p.email=u.email
      WHERE g.token_hash=? AND g.expires_at>? AND u.status='active' AND p.status='active'
      AND (s.owner_id=u.id OR p.role='admin') AND s.status<>'deleted' AND a.path=?`)
      .bind(await hash(match[1]),new Date().toISOString(),info.path).first()
      : await env.DB.prepare(`${common} JOIN site_share_links l ON l.site_id=s.id
        WHERE l.code=? COLLATE BINARY AND l.revoked_at IS NULL AND s.status='published'
        AND s.active_version_id=v.id AND a.path=?`).bind(match[1],info.path).first();
    if(!row) return denial();
    if(row.type!==info.type || !/^[a-f0-9]{32}\/[a-f0-9-]{36}$/.test(row.storage_prefix)) return denial(503);
    if(match[2]===undefined) return new Response(null,{status:308,headers:{...headers(),Location:`${base}/${match[1]}/`}});
    const key=`${row.storage_prefix}/${info.path}`;
    const obj=request.method==='HEAD' ? await env.ASSETS.head(key)
      : await env.ASSETS.get(key,{onlyIf:{etagMatches:row.etag}});
    if(!obj || obj.size!==row.size || obj.etag!==row.etag || (request.method==='GET'&&!obj.body)) {
      await obj?.body?.cancel();return denial(503);
    }
    return new Response(request.method==='HEAD'?null:obj.body,{headers:{...headers(row.type,base,match[1]),'Content-Length':String(row.size)}});
  } catch {return denial(503);} // Never log URLs, bearer paths, provider details or content.
}

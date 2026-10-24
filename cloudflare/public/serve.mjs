import { publicOrigin,requestRoute,publicSnapshot,responseHeaders } from './policy.mjs';

const deny=(request,status=404)=>new Response(request.method==='HEAD'?null:status===503?'Serving unavailable':'Not found',
  {status,headers:{...responseHeaders(),...(status===405?{Allow:'GET, HEAD'}:{})}});
async function discard(object){try{await object?.body?.cancel();}catch{/* No provider details or content in logs. */}}

// Reader interface contains lookup/get/head only. It is a code boundary, not a
// claim that the underlying provider grants IAM read-only native bindings.
export async function servePublic(request,reader,settings){
  try{
    const origin=publicOrigin(settings.publicOrigin,settings.studioOrigin);
    if(!['GET','HEAD'].includes(request.method))return deny(request,405);
    const route=requestRoute(request.url,origin);if(!route)return deny(request);
    const row=await reader.lookup(route.code);if(!row)return deny(request);
    const assets=publicSnapshot(row),asset=assets.get(route.path);if(!asset)return deny(request);
    if(route.redirect)return new Response(null,{status:308,headers:{...responseHeaders(),Location:`/${route.code}/`}});
    const object=request.method==='HEAD'?await reader.head(asset.r2_key)
      :await reader.get(asset.r2_key,{onlyIf:{etagMatches:asset.etag}});
    if(!object || object.size!==asset.size || object.etag!==asset.etag || (request.method==='GET' && !object.body)){
      await discard(object);return deny(request,503);
    }
    return new Response(request.method==='HEAD'?null:object.body,{headers:{...responseHeaders(asset.type,origin,route.code),'Content-Length':String(asset.size)}});
  }catch{return deny(request,503);} // No URLs, identifiers, headers, tokens, SQL, provider details or uploaded bytes logged.
}

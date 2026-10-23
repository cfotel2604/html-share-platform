import { actor as authenticate,service } from './shared/auth.mjs';
import { origin,json,HttpError,hash } from './shared/policy.mjs';
import * as metadata from './shared/metadata.mjs';
import { reconcileExpired } from './shared/reconcile.mjs';
export function createApi(authenticateActor=authenticate) {
  return async (request,env)=>{
    try {
      origin(env);origin({...env,PUBLIC_ORIGIN:env.PREVIEW_ORIGIN});
      if(new Set([env.PUBLIC_ORIGIN,env.PREVIEW_ORIGIN,env.STUDIO_ORIGIN,env.API_ORIGIN]).size!==4) throw new HttpError(503);
      if(new URL(request.url).origin!==env.API_ORIGIN) throw new HttpError(404);
      if(request.method==='GET'&&new URL(request.url).pathname==='/internal/health') {
        await service(request,env);await env.DB.prepare('SELECT 1').first();return json({status:'ready'});
      }
      const actor=await metadata.current(env.DB,await authenticateActor(request,env));
      const path=new URL(request.url).pathname,method=request.method;
      const key=request.headers.get('Idempotency-Key');
      if(!['GET','HEAD'].includes(method)&&!(/^[A-Za-z0-9_-]{16,128}$/).test(key??'')) throw new HttpError(400,'Idempotency key required');
      let input={};
      if(request.body) {
        const reader=request.body.getReader(),chunks=[];let size=0;
        while(true) {const {value,done}=await reader.read();if(done) break;size+=value.length;
          if(size>512*1024) {await reader.cancel();throw new HttpError(413);}chunks.push(value);}
        const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
        if(size) try {input=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400);}
        if(!input||Array.isArray(input)||typeof input!=='object') throw new HttpError(400);
      }
      if(method==='GET'&&path==='/v1/actor') return json(actor);
      if(method==='GET'&&path==='/v1/workspace') return json({actor,sites:await metadata.list(env,actor)});
      if(method==='GET'&&path==='/v1/sites') return json({sites:await metadata.list(env,actor)});
      if(method==='POST'&&path==='/v1/uploads') return json(await metadata.beginUpload(env,actor,key,input),201);
      let m;
      if(method==='GET'&&(m=/^\/v1\/receipts\/([A-Za-z0-9_-]{16,128})$/.exec(path))) {
        const row=await metadata.receipt(env.DB,actor,m[1]);if(!row) throw new HttpError(404);
        return json({action:row.action,result:JSON.parse(row.response_json)});
      }
      if((m=/^\/v1\/uploads\/([a-f0-9-]{36})\/(finalize|abort|cleanup)$/.exec(path))&&method==='POST') {
        const result=m[2]==='finalize'?await metadata.finalize(env,actor,key,m[1],input)
          :m[2]==='abort'?await metadata.abort(env,actor,key,m[1]):await metadata.cleanup(env,actor,m[1]);
        return json(result);
      }
      if((m=/^\/v1\/sites\/([a-f0-9]{32})(?:\/(share|preview))?$/.exec(path))) {
        if(method==='GET'&&!m[2]) return json(await metadata.owned(env.DB,actor,m[1]));
        if(method==='PATCH'&&!m[2]) return json(await metadata.status(env,actor,key,m[1],input));
        if(m[2]==='share'&&['POST','DELETE'].includes(method)) return json(await metadata.share(env,actor,key,m[1],method==='DELETE'));
        if(m[2]==='preview'&&method==='POST') {
          const secret=env.HSP_SERVICE_TOKEN;if(!secret||secret.length<32) throw new HttpError(503);
          const signingKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
          const token=(await hash(Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',signingKey,new TextEncoder().encode(`preview\0${actor.id}\0${key}`)))).join(','))).slice(0,32);
          const result=await metadata.preview(env,actor,key,m[1],token);
          return json({...result,url:`${env.PREVIEW_ORIGIN}/${token}/`});
        }
      }
      throw new HttpError(404);
    } catch(e) {return json({error:e instanceof HttpError?e.message:'Service unavailable'},e instanceof HttpError?e.status:503);}
  };
}
const worker={fetch:createApi(),scheduled:(_event,env,ctx)=>ctx.waitUntil(reconcileExpired(env,{dryRun:false}))};
export default worker;

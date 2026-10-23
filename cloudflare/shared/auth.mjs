import { createClerkClient,verifyToken } from '@clerk/backend';
import { HttpError,hash } from './policy.mjs';
export async function service(request,env) {
  const expected=env.HSP_SERVICE_TOKEN,actual=request.headers.get('X-HSP-Service-Token')??'';
  if(typeof expected!=='string'||expected.length<32||await hash(actual)!==await hash(expected)) throw new HttpError(401);
}
export function createActor({verify=verifyToken,client:createClient=createClerkClient}={}) {
return async function actor(request,env) {
  await service(request,env);
  const token=/^Bearer (\S+)$/.exec(request.headers.get('Authorization')??'')?.[1];
  if(!token||!env.CLERK_SECRET_KEY) throw new HttpError(401);
  let claims,user;
  try {
    claims=await verify(token,{secretKey:env.CLERK_SECRET_KEY,authorizedParties:[env.STUDIO_ORIGIN]});
    if(!claims.sid||!claims.sub) throw new HttpError(401);
    const client=createClient({secretKey:env.CLERK_SECRET_KEY});
    const [session,identity]=await Promise.all([
      client.sessions.getSession(claims.sid),client.users.getUser(claims.sub),
    ]);
    if(session.status!=='active'||session.userId!==claims.sub||session.expireAt<=Date.now()) throw new HttpError(401);
    user=identity;
  } catch(e) {if(e instanceof HttpError) throw e;throw new HttpError(503,'Identity unavailable');}
  const primary=user.emailAddresses.find(a=>a.id===user.primaryEmailAddressId);
  const email=primary?.emailAddress?.trim().toLowerCase();
  if(user.banned||user.locked||!email||primary.verification?.status!=='verified'||
    !user.externalAccounts.some(a=>a.provider==='oauth_google'&&a.emailAddress?.toLowerCase()===email)) throw new HttpError(403);
  await env.DB.prepare(`INSERT INTO users(id,external_identity,email,status)
    SELECT ?,?,email,'active' FROM auth_allowlist WHERE email=? AND status='active'
    ON CONFLICT(external_identity) DO UPDATE SET email=excluded.email WHERE users.status='active'`)
    .bind(crypto.randomUUID(),'clerk:'+user.id,email).run();
  const found=await env.DB.prepare(`SELECT u.id,p.role FROM users u JOIN auth_allowlist p ON p.email=u.email
    WHERE u.external_identity=? AND u.status='active' AND p.status='active'`).bind('clerk:'+user.id).first();
  if(!found) throw new HttpError(403);
  return found;
}
}
export const actor=createActor();

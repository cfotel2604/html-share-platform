// This entrypoint is used ONLY by local tests. Production api.mjs has no fixture auth path.
import { createApi } from '../../cloudflare/api.mjs';
import { service } from '../../cloudflare/shared/auth.mjs';
import { HttpError } from '../../cloudflare/shared/policy.mjs';
const worker={fetch:createApi(async(request,env)=>{
  await service(request,env);
  const id=/^Bearer fixture:(a|b|admin)$/.exec(request.headers.get('Authorization')??'')?.[1];
  if(!id) throw new HttpError(401);return {id};
})};
export default worker;

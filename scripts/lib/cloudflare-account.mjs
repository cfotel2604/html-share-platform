import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

// OAuth stays in memory. Never forward raw Wrangler output or API error bodies
// (which may contain account identity, SQL parameters or credential material).
export function wrangler(args,{input,cwd=process.cwd()}={}) {
  const result=spawnSync(process.execPath,[resolve(cwd,'node_modules/wrangler/bin/wrangler.js'),...args],{
    cwd,input,encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'},maxBuffer:8*1024*1024,
  });
  if(result.status!==0) throw new Error(`Wrangler command failed (${args[0]}, exit ${result.status??'unavailable'})`);
  return result.stdout;
}
export async function cloudflareAccount() {
  const parse=(output)=>{try{return JSON.parse(output);}catch{throw new Error('Wrangler returned invalid JSON; raw output suppressed');}};
  const identity=parse(wrangler(['whoami','--json']));
  if(!identity.loggedIn||identity.accounts?.length!==1) throw new Error('Expected one authenticated Cloudflare account');
  const accountId=identity.accounts[0].id;
  const credentials=parse(wrangler(['auth','token','--json']));
  if(!credentials.token||!['oauth','api_token'].includes(credentials.type)) throw new Error('Supported Wrangler credential unavailable');
  async function api(path,{method='GET',body}={}) {
    const response=await fetch('https://api.cloudflare.com/client/v4'+path,{
      method,redirect:'error',signal:AbortSignal.timeout(30_000),
      headers:{Authorization:'Bearer '+credentials.token,'Content-Type':'application/json'},
      body:body===undefined?undefined:JSON.stringify(body),
    });
    let data;try{data=await response.json();}catch{throw new Error('Cloudflare returned a non-JSON response');}
    if(!response.ok||!data.success) {
      const error=new Error(`Cloudflare HTTP ${response.status}; codes ${(data.errors??[]).map(e=>e.code).join(',')}`);
      error.status=response.status;error.codes=(data.errors??[]).map(e=>e.code);throw error;
    }
    return data.result;
  }
  return {accountId,api};
}

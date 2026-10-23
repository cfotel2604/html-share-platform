import { cloudflareAccount } from './lib/cloudflare-account.mjs';
import { wrangler } from './lib/cloudflare-account.mjs';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { privateDirectory, readEnv, writeEnv, healthReady } from './lib/pilot-config.mjs';

try {
  const provision=process.argv.includes('--provision');
  const privateArg=process.argv.indexOf('--private-dir');
  const privateDir=provision?privateDirectory(privateArg>=0?process.argv[privateArg+1]:null):null;
  const {accountId,api}=await cloudflareAccount();
  const root='/accounts/'+accountId;
  if(provision) {
    await mkdir(privateDir,{recursive:true});
    const statePath=resolve(privateDir,'resources.json');
    let state;try{state=JSON.parse(await readFile(statePath,'utf8'));}catch(error){if(error.code!=='ENOENT') throw error;}
    if(state&&state.accountId!==accountId) throw new Error('Pilot account mismatch');
    const namespace=(await api(root+'/workers/subdomain')).subdomain;
    if(namespace!=='odsusercontent') throw new Error('Unexpected Workers namespace; preserve account routing');
    const bucket='hsp-pilot-desktop',database='hsp-pilot-desktop';
    if(!state) {
      const buckets=(await api(root+'/r2/buckets')).buckets??[];
      const databases=await api(root+'/d1/database');
      const workers=await api(root+'/workers/scripts');
      if(buckets.some(b=>b.name===bucket)||databases.some(d=>d.name===database)||workers.some(w=>['hsp-pilot','hsp-pilot-preview','hsp-pilot-api'].includes(w.id)))
        throw new Error('Pilot names exist without a local ownership record; do not overwrite');
      state={accountId,namespace,bucket,database,createdAt:new Date().toISOString()};
      await writeFile(statePath,JSON.stringify(state,null,2)+'\n',{flag:'wx',mode:0o600});
    }
    const save=()=>writeFile(statePath,JSON.stringify(state,null,2)+'\n',{mode:0o600});
    if(!state.bucketCreated) {
      await api(root+'/r2/buckets',{method:'POST',body:{name:bucket}});
      state.bucketCreated=true;await save();console.log('Created private pilot bucket');
    }
    if(!state.databaseId) {
      const created=await api(root+'/d1/database',{method:'POST',body:{name:database}});
      state.databaseId=created.uuid;await save();console.log('Created pilot D1 database');
    }
    const managed=await api(root+`/r2/buckets/${bucket}/domains/managed`);
    const custom=await api(root+`/r2/buckets/${bucket}/domains/custom`);
    if(managed.enabled||(custom.domains??[]).length) throw new Error('Pilot bucket public bypass detected');
    const origin={public:`https://hsp-pilot.${namespace}.workers.dev`,preview:`https://hsp-pilot-preview.${namespace}.workers.dev`,api:`https://hsp-pilot-api.${namespace}.workers.dev`,studio:'http://localhost:3101'};
    state.origins=origin;
    const generatedPath=resolve(privateDir,'.env.generated');
    let existing={};try{existing=await readEnv(generatedPath);}catch(error){if(error.code!=='ENOENT') throw error;}
    const service=existing.CLOUDFLARE_SERVICE_TOKEN??randomBytes(32).toString('hex');
    const settings={...existing,CLOUDFLARE_API_ORIGIN:origin.api,CLOUDFLARE_SERVICE_TOKEN:service,
      CLOUDFLARE_R2_ENDPOINT:`https://${accountId}.r2.cloudflarestorage.com`,CLOUDFLARE_R2_BUCKET:bucket,
      HSP_PILOT_PRIVATE_DIR:privateDir.replaceAll('\\','/'),HSP_PILOT_PORT:'3101',STUDIO_PUBLIC_ORIGIN:origin.studio,AUTH_TRUSTED_ORIGINS:origin.studio};
    await writeEnv(generatedPath,settings);
    for(const kind of ['api','public','preview']) {
      const name=kind==='public'?'hsp-pilot':'hsp-pilot-'+kind;
      const config={name,account_id:accountId,main:resolve('cloudflare',kind+'.mjs'),compatibility_date:'2026-07-29',
        workers_dev:true,preview_urls:false,observability:{enabled:false},
        d1_databases:[{binding:'DB',database_name:database,database_id:state.databaseId,migrations_dir:resolve('cloudflare/migrations')}],
        r2_buckets:[{binding:'ASSETS',bucket_name:bucket}],
        vars:{PUBLIC_ORIGIN:kind==='preview'?origin.preview:origin.public,PREVIEW_ORIGIN:origin.preview,API_ORIGIN:origin.api,STUDIO_ORIGIN:origin.studio}};
      const configPath=resolve(privateDir,'wrangler.'+kind+'.json');
      await writeFile(configPath,JSON.stringify(config,null,2)+'\n',{mode:0o600});
      if(kind==='api') {
        wrangler(['d1','migrations','apply','DB','--remote','--config',configPath]);
        console.log('Applied pilot D1 migrations through 0003');
      }
      const deployment=wrangler(['deploy','--config',configPath]);
      state.versions??={};state.versions[kind]=/Current Version ID:\s*([a-f0-9-]{36})/i.exec(deployment)?.[1]??'verify-in-provider';await save();
      console.log('Deployed '+name);
    }
    await api(root+'/workers/scripts/hsp-pilot-api/secrets',{method:'PUT',body:{name:'HSP_SERVICE_TOKEN',text:service,type:'secret_text'}});
    await healthReady(origin.api,service);
    state.healthCheckedAt=new Date().toISOString();await save();
    console.log(JSON.stringify({origins:origin,privateBucket:true,workerDatabaseHealth:'ready',clerk:'pending private configuration',r2S3Credential:'pending scoped token'}));
    process.exit(0);
  }
  const reads=[['namespace','/workers/subdomain'],['workers','/workers/scripts'],['buckets','/r2/buckets'],['databases','/d1/database'],['tokenPermissions','/tokens/permission_groups'],['subscriptions','/subscriptions']];
  const results=await Promise.allSettled(reads.map(async([label,path])=>[label,await api(root+path)]));
  const summary={};
  for(let i=0;i<results.length;i++) {
    const row=results[i];const label=reads[i][0];
    if(row.status==='rejected') {summary[label]={unavailable:row.reason.message};continue;}
    const data=row.value[1];
    summary[label]=label==='namespace'?data:label==='buckets'?(data.buckets??[]).map(v=>v.name):
      label==='workers'?data.map(v=>v.id):label==='databases'?data.map(v=>v.name):
      label==='tokenPermissions'?data.map(v=>({id:v.id,name:v.name})):
      data.map(v=>({service:v.rate_plan?.public_name??v.rate_plan?.id,status:v.state}));
  }
  process.stdout.write(JSON.stringify(summary,null,2)+'\n');
} catch(error) {console.error(error.message);process.exitCode=1;}

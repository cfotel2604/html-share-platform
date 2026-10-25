import pg from 'pg';
import { pathToFileURL } from 'node:url';
import { assertPostgresBackend } from './metadata-backend.mjs';
import { createD1Writer,ProjectionError } from './lib/public-projector.mjs';
import { planRecovery,publicRecoveryPlan,applyRecovery } from './lib/read-model-recovery.mjs';

export function recoveryOptions(args,environment=process.env){
  const [mode,...flags]=args;
  if(!['rebuild','reconcile'].includes(mode) || flags.some((flag,index)=>
    !['--dry-run','--apply','--repair','--plan'].includes(flag) && flags[index-1]!=='--plan'))throw new ProjectionError('invalid_config');
  const apply=flags.includes('--apply'),dry=flags.includes('--dry-run'),repair=flags.includes('--repair');
  const planIndex=flags.indexOf('--plan'),fingerprint=planIndex<0?undefined:flags[planIndex+1];
  if(apply===dry || (repair && mode!=='reconcile') || (apply && mode==='reconcile' && !repair)
    || (apply && !/^[a-f0-9]{64}$/.test(fingerprint??'')) || (!apply && planIndex>=0)
    || new Set(flags).size!==flags.length)throw new ProjectionError('invalid_config');
  if(environment.READ_MODEL_RECOVERY_ENABLED!=='1' || (apply && environment.PROJECTOR_REMOTE_APPROVED!=='1'))throw new ProjectionError('recovery_disabled');
  assertPostgresBackend(environment);
  return {mode,apply,fingerprint,operatorId:environment.READ_MODEL_OPERATOR_ID};
}

export async function runRecovery(args=process.argv.slice(2),environment=process.env){
  const options=recoveryOptions(args,environment);
  const send=createD1Writer({accountId:environment.D1_PROJECTOR_ACCOUNT_ID,databaseId:environment.D1_PROJECTOR_DATABASE_ID,token:environment.D1_PROJECTOR_API_TOKEN});
  const pool=new pg.Pool({max:2,connectionTimeoutMillis:5000,query_timeout:20000});
  const log=value=>process.stdout.write(JSON.stringify(value)+'\n');
  pool.on('error',()=>log({event:'recovery.db_unavailable'}));
  try{
    const plan=await planRecovery(pool,send,options);log({event:'recovery.plan',...publicRecoveryPlan(plan)});
    if(!options.apply)return plan.blocked?3:plan.differences.length?2:0;
    const result=await applyRecovery(pool,send,plan,{...options,log});log({event:'recovery.applied',...result});
    if(result.state!=='projected')return 3;
    const verified=await planRecovery(pool,send);log({event:'recovery.readback',...publicRecoveryPlan(verified)});
    return verified.differences.length?3:0;
  }finally{await pool.end();}
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  runRecovery().then(code=>{process.exitCode=code;}).catch(error=>{
    const allowed=['recovery_disabled','invalid_config','invalid_operator','source_changed','plan_changed','recovery_blocked',
      'recovery_plan_too_large','invalid_target_snapshot','target_mismatch','rate_limited','http_401','http_403'];
    const code=error instanceof ProjectionError && allowed.includes(error.code)?error.code:'recovery_failed';
    console.error(JSON.stringify({event:'recovery.stopped',error_code:code}));process.exitCode=1;
  });
}

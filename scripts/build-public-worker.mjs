import { build } from 'esbuild';
import { mkdir,writeFile } from 'node:fs/promises';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export async function buildPublicWorker({write=false}={}){
  const root=fileURLToPath(new URL('../',import.meta.url));
  const result=await build({absWorkingDir:root,entryPoints:['cloudflare/public/worker.mjs'],bundle:true,
    format:'esm',platform:'browser',target:'es2022',loader:{'.sql':'text'},write:false,
    metafile:true,legalComments:'none',logLevel:'silent',outfile:'worker.mjs'});
  const code=result.outputFiles[0].text;
  if(write){
    const directory=resolve(root,'dist/public-worker');await mkdir(directory,{recursive:true});
    await writeFile(resolve(directory,'worker.mjs'),code);
    await writeFile(resolve(directory,'metafile.json'),JSON.stringify(result.metafile,null,2)+'\n');
  }
  return {code,metafile:result.metafile};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=await buildPublicWorker({write:true});
  console.log(`Public Worker built locally: ${Buffer.byteLength(result.code)} bytes; no provider call or deployment`);
}

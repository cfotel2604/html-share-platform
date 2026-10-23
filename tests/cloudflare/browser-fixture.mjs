// Explicit local-only synthetic fixture transport. Not a production auth/deploy entrypoint.
import { createServer } from 'node:http';
import { harness } from './harness.mjs';
const h=await harness();
const probe=`<h1>Sandbox fixture ready</h1><script>
window.probe={};
for(const [name,fn] of Object.entries({cookieRead:()=>document.cookie,cookieWrite:()=>document.cookie='injected=1; Domain=odsusercontent.workers.dev; Path=/',localStorage:()=>localStorage.setItem('injected','1'),sessionStorage:()=>sessionStorage.setItem('injected','1'),indexedDB:()=>indexedDB.open('injected'),domain:()=>document.domain='odsusercontent.workers.dev'})){
 try{fn();probe[name]='allowed';}catch{probe[name]='blocked';}
}
try{const w=new Worker('./assets/worker.js');probe.worker='pending';w.onmessage=()=>probe.worker='allowed';w.onerror=e=>{e.preventDefault();probe.worker='blocked';};}catch{probe.worker='blocked';}
try{probe.popup=window.open('about:blank')?'allowed':'blocked';}catch{probe.popup='blocked';}
try{navigator.serviceWorker.register('./assets/worker.js').then(()=>probe.serviceWorker='allowed').catch(()=>probe.serviceWorker='blocked');}catch{probe.serviceWorker='blocked';}
fetch('./assets/data.json').then(r=>r.json()).then(v=>probe.fetch=v.ok?'ok':'failed').catch(()=>probe.fetch='failed');
</script><script type="module" src="./assets/module.mjs"></script>`;
const files={'index.html':probe,'nested/page.htm':probe.replaceAll('./assets/','../assets/'),
  'assets/data.json':'{"ok":true}','assets/module.mjs':'window.moduleWorked=true;','assets/worker.js':"postMessage('executed');"};
const fixtures={a:await h.publish(undefined,'a',files),b:await h.publish(undefined,'b',files)};
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/reset'&&req.method==='POST') {
      fixtures.a=await h.publish(undefined,'a',files);fixtures.b=await h.publish(undefined,'b',files);
      res.writeHead(200).end('Synthetic fixtures reset');return;
    }
    if(url.pathname==='/shutdown'&&req.method==='POST') {
      res.writeHead(200).end('Fixture stopping');setTimeout(close,50);return;
    }
    if(url.pathname==='/info') {
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({publicOrigin:h.vars.PUBLIC_ORIGIN,previewOrigin:h.vars.PREVIEW_ORIGIN,
        a:h.vars.PUBLIC_ORIGIN+'/'+fixtures.a.code+'/',b:h.vars.PUBLIC_ORIGIN+'/'+fixtures.b.code+'/'}));return;
    }
    if(url.pathname==='/proxy') {
      const kind=url.searchParams.get('kind'),path=url.searchParams.get('path')??'/';
      if(!path.startsWith('/')||!['public','preview'].includes(kind)) {res.writeHead(400).end();return;}
      const response=await (kind==='public'?h.publicWorker:h.previewWorker).fetch((kind==='public'?h.vars.PUBLIC_ORIGIN:h.vars.PREVIEW_ORIGIN)+path,{method:req.method,redirect:'manual'});
      res.writeHead(response.status,Object.fromEntries(response.headers));
      if(response.body) for await(const chunk of response.body) res.write(chunk);res.end();return;
    }
    if(url.pathname==='/control'&&req.method==='POST') {
      const fixture=fixtures[url.searchParams.get('site')??'a'];if(!fixture) {res.writeHead(400).end();return;}
      const action=url.searchParams.get('action');
      let response;
      if(action==='preview') response=await h.api('/v1/sites/'+fixture.site.id+'/preview',{method:'POST',actor:url.searchParams.get('site')??'a'});
      else if(action==='unpublish') response=await h.api('/v1/sites/'+fixture.site.id,{method:'PATCH',body:{published:false},actor:url.searchParams.get('site')??'a'});
      else if(action==='revoke') response=await h.api('/v1/sites/'+fixture.site.id+'/share',{method:'DELETE',actor:url.searchParams.get('site')??'a'});
      else {res.writeHead(400).end();return;}
      res.writeHead(response.status,{'Content-Type':'application/json'});res.end(await response.text());return;
    }
    res.writeHead(200,{'Content-Type':'text/html'}).end('<h1>Local synthetic fixture transport ready</h1>');
  } catch {res.writeHead(503).end('Synthetic fixture unavailable');}
});
server.listen(0,'127.0.0.1',()=>console.log('LOCAL_BROWSER_FIXTURE=http://127.0.0.1:'+server.address().port));
async function close(){server.close();await h.close();process.exit(0);}
process.on('SIGINT',close);process.on('SIGTERM',close);

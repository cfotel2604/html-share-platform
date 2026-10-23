// playwright-cli run-code --filename tests/browser/cloudflare-path.js
// Set fixture transport origin in this CLI session via page.goto(local URL) first.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async(page)=>{
  const local=new URL(page.url()).origin;
  await page.request.post(local+'/reset');
  const info=await (await page.request.get(local+'/info')).json();
  const context=page.context(),passed=[];
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin===local) return route.continue();
    if(url.origin==='https://studio.ods.vn') return route.fulfill({status:200,contentType:'text/html',body:'<h1>Trusted synthetic Studio marker</h1>'});
    const kind=url.origin===info.publicOrigin?'public':url.origin===info.previewOrigin?'preview':null;
    if(!kind) return route.abort(); // No request reaches a real workers.dev service.
    const response=await page.request.fetch(local+'/proxy?kind='+kind+'&path='+encodeURIComponent(url.pathname+url.search),{method:route.request().method(),maxRedirects:0});
    return route.fulfill({status:response.status(),headers:response.headers(),body:await response.body()});
  });
  await context.addCookies([{name:'existing_parent',value:'preserved',domain:'.odsusercontent.workers.dev',path:'/',secure:true,sameSite:'Lax'},
    {name:'__Host-studio_fixture',value:'synthetic',domain:'studio.ods.vn',path:'/',secure:true,httpOnly:true,sameSite:'Strict'}]);
  for(const root of [info.a,info.b]) for(const path of ['', 'nested/page.htm']) {
    const response=await page.goto(root+path);
    if(response.status()!==200||!response.headers()['content-security-policy'].startsWith('sandbox allow-scripts;')) throw new Error('HTTP sandbox missing');
    await page.getByText('Sandbox fixture ready').waitFor();
    await page.waitForFunction(()=>window.probe?.serviceWorker && window.probe?.fetch && window.probe?.worker!=='pending' && window.moduleWorked);
    const check=await page.evaluate(()=>({probe:window.probe,origin:window.origin,module:window.moduleWorked}));
    for(const key of ['cookieRead','cookieWrite','localStorage','sessionStorage','indexedDB','domain','worker','serviceWorker','popup']) if(check.probe[key]!=='blocked') throw new Error('Sandbox boundary failed: '+key);
    if(check.origin!=='null'||check.probe.fetch!=='ok'||!check.module) throw new Error('Opaque origin or relative assets failed');
  }
  passed.push('two independent hostile packages: direct/nested HTTP sandbox and opaque origin');
  passed.push('cookie/storage/IndexedDB/domain/worker/service-worker/popup denied');
  passed.push('relative modules and fetch/CORS succeed for both site prefixes');
  const trusted=await context.newPage();await trusted.goto('https://studio.ods.vn/');
  const created=context.waitForEvent('page');await trusted.evaluate(url=>window.open(url,'synthetic-attacker'),info.a);
  const attacker=await created;await attacker.waitForLoadState();
  const cross=await attacker.evaluate(()=>{
    const result={};
    try{window.opener.document.body.textContent='changed';result.dom='allowed';}catch{result.dom='blocked';}
    try{window.opener.location='https://studio.ods.vn/changed';result.navigation='allowed';}catch{result.navigation='blocked';}
    return result;
  });
  if(cross.dom!=='blocked'||cross.navigation!=='blocked'||trusted.url()!=='https://studio.ods.vn/') throw new Error('Opener DOM/navigation boundary failed');
  await attacker.close();await trusted.close();
  passed.push('hostile document cannot modify trusted opener DOM or navigate it');
  const cookies=await context.cookies();
  if(cookies.some(c=>c.name==='injected')||cookies.find(c=>c.name==='existing_parent')?.value!=='preserved'||!cookies.some(c=>c.name==='__Host-studio_fixture'))throw new Error('Sibling/Studio markers changed');
  passed.push('content parent cookie and Studio host-only cookie markers preserved');
  if((await page.goto(info.publicOrigin+'/assets/data.json')).status()!==404) throw new Error('Root asset escaped prefix');
  await page.request.post(local+'/control?action=unpublish&site=a');
  if((await page.goto(info.a)).status()!==404)throw new Error('Unpublish ineffective');
  const grant=await (await page.request.post(local+'/control?action=preview&site=a')).json();
  const preview=await page.goto(grant.url);
  if(preview.status()!==200||new URL(page.url()).origin!==info.previewOrigin)throw new Error('Separate preview failed');
  await page.waitForFunction(()=>window.probe?.serviceWorker==='blocked');
  if(await page.locator('iframe').count()) throw new Error('Preview unexpectedly embeds another document');
  passed.push('unpublished public denial; separate preview tab remains sandboxed');
  await page.request.post(local+'/control?action=revoke&site=b');
  if((await page.goto(info.b)).status()!==404)throw new Error('Revoke ineffective');
  passed.push('revocation denies direct content, no viewer alias');
  return {result:'PASS',browser:context.browser().version(),groups:passed};
}

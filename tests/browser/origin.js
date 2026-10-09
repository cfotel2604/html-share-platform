// CLI loads this function expression directly using run-code --filename.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async (page) => {

  await page.goto("https://studio.ods.test:4443/fixture-ids"); const fixture=JSON.parse(await page.locator("body").innerText());
  const context=page.context(), passed=[], errors=[];
  async function browserGet(url) { const tab=await context.newPage();try {const response=await tab.goto(url);const status=response.status();return {status:()=>status};}finally{await tab.close();}}
  page.on('pageerror',error=>errors.push(error.message));
  await context.addCookies([{name:'existing_parent',value:'preserved',domain:'.matbao.test',path:'/',secure:true,sameSite:'Lax'},
    {name:'__Host-dashboard_fixture',value:'synthetic',domain:'studio.ods.test',path:'/',secure:true,httpOnly:true,sameSite:'Strict'}]);
  await page.goto('https://matbao.test:4443/boundary');
  await page.getByText('Existing trusted origin fixture').waitFor();
  if(await page.evaluate(()=>localStorage.getItem('trusted-marker'))!=='present')throw new Error('Trusted control unavailable');
  await page.goto('https://studio.ods.test:4443/boundary');
  await page.getByText('Existing trusted origin fixture').waitFor();
  const viewer='https://view.ods.test:4443/'+fixture.published;
  const response=await page.goto(viewer);
  if(response.status()!==200)throw new Error('Viewer shell failed: '+response.status());
  if(response.headers()['set-cookie'])throw new Error('Viewer created an auth cookie');
  if(!response.headers()['content-security-policy'].includes('frame-src https://*.matbao.test:4443'))throw new Error('Viewer frame policy missing');
  const iframe=page.locator('iframe');
  if(await iframe.getAttribute('sandbox')!=='allow-scripts')throw new Error('Iframe policy changed');
  await page.frameLocator('iframe').getByText('Sandbox fixture ready').waitFor();
  const frame=page.frames().find(frame=>frame.url().includes('.matbao.test:4443'));
  await frame.waitForFunction(()=>window.probe?.fetch==='fetch-ok' && window.moduleWorked==='module-ok' && window.cdnWorked===true && window.probe?.serviceWorker);
  const probe=await frame.evaluate(()=>({probe:window.probe,classic:window.classicWorked,module:window.moduleWorked,cdn:window.cdnWorked,color:getComputedStyle(document.getElementById('marker')).color}));
  for(const key of ['cookieRead','cookieWrite','localStorage','sessionStorage','popup','serviceWorker','worker','topNavigation'])if(probe.probe[key]!=='blocked')throw new Error('Iframe boundary failed: '+key+'='+probe.probe[key]);
  if(probe.color!=='rgb(2, 132, 199)' || !probe.classic || probe.module!=='module-ok' || !probe.cdn)throw new Error('Asset compatibility failed');
  if(page.url()!==viewer)throw new Error('Upload navigated parent');
  passed.push('trusted viewer, sandbox iframe, root CSS/classic/ES modules/fetch, HTTPS CDN');
  passed.push('iframe blocks cookie read/write, storage, workers, popup and parent navigation');
  const direct=await context.newPage();
  for(const path of ['/','/sub/page.htm']) {
    const result=await direct.goto('https://'+fixture.published+'.matbao.test:4443'+path);
    if(result.status()!==200 || !result.headers()['content-security-policy'].startsWith('sandbox allow-scripts;'))throw new Error('Direct HTML sandbox missing');
    await direct.waitForFunction(()=>window.probe?.serviceWorker==='blocked');
    const checks=await direct.evaluate(()=>window.probe);
    for(const key of ['cookieRead','cookieWrite','localStorage','sessionStorage','popup','serviceWorker','worker'])if(checks[key]!=='blocked')throw new Error('Direct boundary failed: '+key);
  }
  await direct.close();passed.push('HTTP sandbox on direct index and nested .htm');
  const preview=await context.newPage();await preview.goto('https://studio.ods.test:4443/preview-embed');
  await preview.frameLocator('iframe').getByText('Sandbox fixture ready').waitFor();await preview.close();
  const privateResult=await browserGet('https://'+fixture.privateSite+'.matbao.test:4443/');if(privateResult.status()!==404)throw new Error('Private site exposed');
  passed.push('private preview capability works; ordinary unpublished hostname returns 404');
  for(const path of ['/api/sites','/api/auth','/sign-in','/preview/'+fixture.published])if((await browserGet('https://view.ods.test:4443'+path)).status()!==404)throw new Error('Viewer reached admin route');
  for(const path of ['/test.svg','/test.xhtml','/test.xml','/test.pdf'])if((await browserGet('https://'+fixture.published+'.matbao.test:4443'+path)).status()!==404)throw new Error('Active format reachable');
  passed.push('viewer denies admin routes; unsupported active types return 404');
  const cookies=await context.cookies();if(cookies.some(cookie=>cookie.name==='injected') || cookies.find(cookie=>cookie.name==='existing_parent')?.value!=='preserved')throw new Error('Parent cookie changed');
  await page.goto('https://matbao.test:4443/boundary');if(await page.evaluate(()=>localStorage.getItem('trusted-marker'))!=='present')throw new Error('Existing origin storage changed');
  for(const host of ['www.matbao.test','mail.matbao.test']){await page.goto('https://'+host+':4443/boundary');await page.getByText('Existing trusted origin fixture').waitFor();}
  passed.push('existing parent cookie/storage and reserved host fixtures unchanged');
  if(errors.length)throw new Error('Unexpected page errors: '+errors.join(';'));
  return {result:'PASS',browser:context.browser().version(),passed};
}

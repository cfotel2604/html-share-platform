import { zipBytes } from '../helpers/zip.mjs';

// Synthetic remote packages only; no credentials, user data, or external API.
export function pilotPackage(label, count = 4) {
  if (!/^[AB]$/.test(label) || !Number.isInteger(count) || count < 4 || count > 500) throw new Error('Invalid synthetic package');
  const html = prefix => `<!doctype html><meta charset="utf-8"><title>Synthetic pilot ${label}</title>
<h1>Synthetic pilot ${label}</h1><pre id="probe">pending</pre><a href="${prefix}nested/page.html">Nested page</a>
<script>(async()=>{const r={label:${JSON.stringify(label)},origin:window.origin};
for(const [name,work] of Object.entries({cookie:()=>{document.cookie='pilot_injected=1; Path=/';return document.cookie},localStorage:()=>localStorage.setItem('pilot','1'),sessionStorage:()=>sessionStorage.setItem('pilot','1'),indexedDB:()=>indexedDB.open('pilot'),worker:()=>new Worker('${prefix}assets/module.js'),popup:()=>{const w=window.open('about:blank');if(!w)throw Error('blocked');w.close()}})){try{work();r[name]='allowed'}catch{r[name]='blocked'}}
try{await navigator.serviceWorker.register('${prefix}assets/module.js');r.serviceWorker='allowed'}catch{r.serviceWorker='blocked'}
try{r.relativeFetch=(await(await fetch('${prefix}assets/data.json')).json()).synthetic===${JSON.stringify(label)}}catch{r.relativeFetch=false}
try{r.module=(await import('${prefix}assets/module.js')).synthetic===${JSON.stringify(label)}}catch{r.module=false}
try{await fetch('/assets/data.json');r.rootFetch='allowed'}catch{r.rootFetch='blocked'}
document.getElementById('probe').textContent=JSON.stringify(r)})();</script>`;
  return zipBytes([
    { name: 'index.html', body: html('./') },
    { name: 'nested/page.html', body: html('../') },
    { name: 'assets/data.json', body: JSON.stringify({ synthetic: label }) },
    { name: 'assets/module.js', body: 'export const synthetic=' + JSON.stringify(label) + ';' },
    ...Array.from({ length: count - 4 }, (_, index) => ({ name: 'assets/filler-' + index + '.txt', body: 'synthetic quota asset ' + index })),
  ]);
}

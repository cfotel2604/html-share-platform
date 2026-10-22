import {createServer} from "node:https";
import {request} from "node:http";
import {readFileSync} from "node:fs";
const server=createServer({key:readFileSync("/app/tls/key.pem"),cert:readFileSync("/app/tls/cert.pem")},(req,res)=>{
  const host=(req.headers.host??"").split(":")[0];
  if(host==="studio.ods.test" && req.url==="/fixture-ids") {
    const fixture=JSON.parse(readFileSync("/app/browser-artifacts/fixture.json","utf8"));
    res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store"});
    res.end(JSON.stringify({published:fixture.published,publishedCode:fixture.publishedCode,privateSite:fixture.privateSite}));return;
  }
  if(host==="cdn.safe.test" && req.url==="/cdn.js") {res.writeHead(200,{"Content-Type":"text/javascript","Cache-Control":"no-store"});res.end("window.cdnWorked=true");return;}
  if(["studio.ods.test","matbao.test","www.matbao.test","mail.matbao.test"].includes(host) && req.url==="/boundary") {
    res.writeHead(200,{"Content-Type":"text/html","Cache-Control":"no-store"});res.end("<!doctype html><p>Existing trusted origin fixture</p><script>localStorage.setItem('trusted-marker','present')</script>");return;
  }
  if(host==="studio.ods.test" && req.url==="/preview-embed") {
    const fixture=JSON.parse(readFileSync("/app/browser-artifacts/fixture.json","utf8"));
    res.writeHead(200,{"Content-Type":"text/html","Cache-Control":"no-store","Referrer-Policy":"no-referrer"});
    res.end(`<iframe sandbox="allow-scripts" referrerpolicy="no-referrer" src="${fixture.previewUrl}"></iframe>`);return;
  }
  const upstream=host==="view.ods.test" || host==="studio.ods.test" ? "web" : /^[a-f0-9]{32}(?:--[a-z2-7]{26})?\.matbao\.test$/.test(host)?"gateway":null;
  if(!upstream){res.writeHead(404,{"Cache-Control":"no-store"});res.end("Not found");return;}
  const headers={...req.headers};delete headers.cookie;delete headers.authorization;
  const outgoing=request({hostname:upstream,port:upstream==="web"?3000:4000,path:req.url,method:req.method,headers},incoming=>{res.writeHead(incoming.statusCode,incoming.headers);incoming.pipe(res);});
  outgoing.on("error",()=>{if(!res.headersSent)res.writeHead(503);res.end("Unavailable");});req.pipe(outgoing);
});
server.listen(4443,"0.0.0.0",()=>console.log("Isolated HTTPS origin probe ready (self-signed lab certificate)"));

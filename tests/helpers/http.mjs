import http from "node:http";
// Real network requests with explicit virtual Host. Undici may override Host headers.
export async function virtualFetch(url,init={}) {
  const encoded=new Request(url,init),bytes=encoded.body?Buffer.from(await encoded.arrayBuffer()):null;
  const headers=Object.fromEntries(encoded.headers);
  return new Promise((resolve,reject)=>{
    const request=http.request(url,{method:encoded.method,headers},async response=>{
      const chunks=[];for await(const chunk of response)chunks.push(chunk);
      const output=new Headers();for(const [key,value]of Object.entries(response.headers)) {
        if(Array.isArray(value))value.forEach(item=>output.append(key,item));else if(value!==undefined)output.set(key,value);
      }
      resolve(new Response(encoded.method==="HEAD"?null:Buffer.concat(chunks),{status:response.statusCode,headers:output}));
    });request.on("error",reject);request.end(bytes);
  });
}

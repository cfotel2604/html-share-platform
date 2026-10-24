import resolveSql from '../read-model/queries/resolve.sql';
import { servePublic,servingUnavailable } from './serve.mjs';

const worker={
  async fetch(request,env){
    try{
      const reader={
        lookup:code=>env.PUBLIC_READ_MODEL.prepare(resolveSql).bind(code).first(),
        get:(key,options)=>env.ASSETS.get(key,options),
        head:key=>env.ASSETS.head(key),
      };
      return await servePublic(request,reader,{publicOrigin:env.PUBLIC_ORIGIN,studioOrigin:env.STUDIO_ORIGIN});
    }catch{return servingUnavailable(request);}
  },
};
export default worker;

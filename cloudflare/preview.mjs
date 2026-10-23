import { serve } from './shared/serve.mjs';
const worker={fetch:(request,env)=>serve(request,env,true)};
export default worker;

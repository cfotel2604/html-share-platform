import { serve } from './shared/serve.mjs';
const worker={fetch:(request,env)=>serve(request,env,false)};
export default worker;

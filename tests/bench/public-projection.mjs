import { localPostgres,localD1,seedActor,nodeServices } from '../helpers/public-projection.mjs';
import { measureProjection } from '../helpers/projection-benchmark.mjs';

// Always local/in-memory, synthetic transport. Never read remote env/credentials.
const pg=await localPostgres(),d1=await localD1();
try {
  const actor={...await seedActor(pg.pool,'benchmark'),mode:'clerk'};
  const result=await measureProjection({pool:pg.pool,services:nodeServices(pg.pool),actor,d1,
    progress:sample=>console.log(JSON.stringify({event:'local_projection_sample',...sample}))});
  console.log(JSON.stringify(result,null,2));
} finally {await d1.close();await pg.close();}

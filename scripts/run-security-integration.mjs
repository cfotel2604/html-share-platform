import {randomBytes} from "node:crypto";
import {execFileSync} from "node:child_process";
import {existsSync,mkdirSync,readFileSync,writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
const root=fileURLToPath(new URL("..",import.meta.url));
const envFile=resolve(root,"tmp/security-check.env");mkdirSync(resolve(root,"tmp"),{recursive:true});
if(!existsSync(envFile)) {
  const random=()=>randomBytes(32).toString("hex");
  writeFileSync(envFile,`# Isolated security tests only\nPOSTGRES_USER=upload_test\nPOSTGRES_DB=upload_test\nPOSTGRES_PASSWORD=${random()}\nMINIO_ROOT_USER=security_test\nMINIO_ROOT_PASSWORD=${random()}\nLOCAL_DEMO_MODE=1\nLOCAL_DEMO_PASSWORD=${random()}\nLOCAL_DEMO_SESSION_SECRET=${random()}\nAPP_PORT=3700\nGATEWAY_PORT=4700\n`,{mode:0o600});
}
if(!/^POSTGRES_DB=upload_test$/m.test(readFileSync(envFile,"utf8"))) throw new Error("Refuse non-test database config");
const env={...process.env,UPLOAD_TEST_IMAGE:process.env.UPLOAD_TEST_IMAGE??"html-share-security:ci"};
const args=["compose","-p","html-share-security-checks","--env-file",envFile,"-f","compose.yaml","-f","compose.upload-test.yaml"];
const run=extra=>execFileSync("docker",[...args,...extra],{cwd:root,env,stdio:"inherit",windowsHide:true});
try {run(["config","--quiet"]);run(["up","-d","--no-build"]);run(["run","--rm","upload-checks"]);run(["run","--rm","auth-origin-checks"]);}
finally {run(["down"]);} // Retain named test volumes/env; never affect owner projects.

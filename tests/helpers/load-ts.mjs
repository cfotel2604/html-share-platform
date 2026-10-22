import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Execute repository production functions, replacing only external dependencies.
export function tsLoader(stubs = {}) {
  const cache = new Map();
  function load(input) {
    const filename = input instanceof URL ? fileURLToPath(input) : input;
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = { exports: {} };
    cache.set(filename, loaded);
    const require = createRequire(filename);
    const source = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const dependency = (name) => {
      if (Object.hasOwn(stubs, name)) return stubs[name];
      const local = name.startsWith("@/")
        ? resolve(fileURLToPath(new URL("../../src/", import.meta.url)), name.slice(2))
        : name.startsWith(".") ? resolve(dirname(filename), name) : null;
      if (local && existsSync(local + ".ts")) return load(local + ".ts");
      return require(name);
    };
    new Function("require", "module", "exports", source)(dependency, loaded, loaded.exports);
    return loaded.exports;
  }
  return load;
}

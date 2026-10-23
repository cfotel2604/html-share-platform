export function metadataBackend(): "postgres" | "cloudflare" {
  const value=process.env.METADATA_BACKEND??"postgres";
  if(value!=="postgres"&&value!=="cloudflare") throw new Error("Invalid metadata backend");
  return value;
}

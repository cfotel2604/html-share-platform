import type { Actor } from "./auth-policy";
import { metadataBackend } from "./metadata-backend";
import { cloudflareClient } from "./cloudflare-rpc";
import { uploadPilot } from "./cloudflare-upload";
import * as postgres from "@/lib/site-ops";
import * as links from "@/lib/share-links";
import * as previews from "@/lib/preview";
import type { SiteSummary } from "@/features/studio/types";
const pilot=(actor:Actor)=>cloudflareClient(actor.getSessionToken);
export async function listSites(actor:Actor) {
  return metadataBackend()==='postgres'?postgres.listSites(actor):(await pilot(actor)<{sites:SiteSummary[]}>('/v1/sites')).sites;
}
export async function assertSiteOwner(actor:Actor,id:string) {
  if(metadataBackend()==='postgres') return postgres.assertSiteOwner(actor,id);
  await pilot(actor)('/v1/sites/'+id);
}
export async function uploadVersion(actor:Actor,file:File,name:string,id?:string,signal?:AbortSignal) {
  return metadataBackend()==='postgres'?postgres.uploadVersion(actor,file,name,id):uploadPilot(actor.getSessionToken,file,name,id,signal);
}
export async function setPublished(actor:Actor,id:string,published:boolean) {
  return metadataBackend()==='postgres'?postgres.setPublished(actor,id,published):pilot(actor)('/v1/sites/'+id,'PATCH',{published});
}
export async function changeShareLink(actor:Actor,id:string,action:'rotate'|'revoke') {
  return metadataBackend()==='postgres'?links.changeShareLink(actor,id,action):pilot(actor)('/v1/sites/'+id+'/share',action==='rotate'?'POST':'DELETE');
}
export async function createPreview(actor:Actor,id:string) {
  return metadataBackend()==='postgres'?previews.createPreview(actor,id):pilot(actor)<{url:string;expiresAt:string;displayName:string}>('/v1/sites/'+id+'/preview','POST');
}

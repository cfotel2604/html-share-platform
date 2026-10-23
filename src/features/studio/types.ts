// Browser-safe API data. Never import server implementation into these contracts.
export type SiteStatus = "draft" | "published" | "unpublished";
export type SiteSummary = {
  id: string;
  display_name: string;
  status: SiteStatus;
  updated_at: string;
  active_version_id?: string | null;
  share_code: string | null;
  share_url: string | null;
};
export type AuthStatus = { signedIn: boolean; demoAvailable: boolean; available?: boolean; provider?: "clerk" | "local-demo" | "disabled"; role?: "employee" | "admin" | null; denied?: boolean };
export type StudioWorkspace = { auth: AuthStatus; sites: SiteSummary[] };
export type UploadResult = { id: string; fileCount: number };
export interface StudioApi {
  workspace?(): Promise<StudioWorkspace>;
  auth(): Promise<AuthStatus>;
  listSites(): Promise<SiteSummary[]>;
  login(password: string): Promise<void>;
  logout(): Promise<void>;
  createSite(file: File, name: string): Promise<UploadResult>;
  updateSite(id: string, file: File, name: string): Promise<UploadResult>;
  setPublished(id: string, published: boolean): Promise<void>;
  preview(id: string): Promise<{url:string;displayName:string;expiresAt:string}>;
  rotateShare(id: string): Promise<{id:string;share_code:string;share_url:string}>;
  revokeShare(id: string): Promise<void>;
}

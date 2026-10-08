// Browser-safe API data. Never import server implementation into these contracts.
export type SiteStatus = "draft" | "published" | "unpublished";
export type SiteSummary = {
  id: string;
  display_name: string;
  status: SiteStatus;
  updated_at: string;
  active_version_id?: string | null;
};
export type AuthStatus = { signedIn: boolean; demoAvailable: boolean };
export type UploadResult = { id: string; fileCount: number };
export interface StudioApi {
  auth(): Promise<AuthStatus>;
  listSites(): Promise<SiteSummary[]>;
  login(password: string): Promise<void>;
  logout(): Promise<void>;
  createSite(file: File, name: string): Promise<UploadResult>;
  updateSite(id: string, file: File, name: string): Promise<UploadResult>;
  setPublished(id: string, published: boolean): Promise<void>;
}

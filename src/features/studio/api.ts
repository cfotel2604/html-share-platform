import type { AuthStatus, SiteSummary, StudioApi, UploadResult } from "./types";

export class StudioApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "StudioApiError";
  }
}

// A replacement UI can reuse this adapter; another backend can implement StudioApi.
export function createStudioApi(
  fetcher: typeof fetch = globalThis.fetch,
): StudioApi {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetcher(`/api${path}`, {
      cache: "no-store",
      credentials: "same-origin",
      ...init,
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new StudioApiError(
        "Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.",
        response.status,
      );
    }
    if (!response.ok)
      throw new StudioApiError(
        typeof data?.error === "string"
          ? data.error
          : "Yêu cầu không thành công.",
        response.status,
      );
    return data as T;
  }
  function upload(path: string, method: string, file: File, name: string) {
    const body = new FormData();
    body.set("file", file);
    body.set("name", name);
    return request<UploadResult>(path, { method, body });
  }
  return {
    auth: () => request<AuthStatus>("/auth"),
    listSites: async () =>
      (await request<{ sites: SiteSummary[] }>("/sites")).sites,
    login: async (password) => {
      await request("/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
    },
    logout: async () => {
      await request("/auth", { method: "DELETE" });
    },
    createSite: (file, name) => upload("/sites", "POST", file, name),
    updateSite: (id, file, name) =>
      upload(`/sites/${encodeURIComponent(id)}`, "PUT", file, name),
    setPublished: async (id, published) => {
      await request(`/sites/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published }),
      });
    },
  };
}
export const studioApi = createStudioApi();

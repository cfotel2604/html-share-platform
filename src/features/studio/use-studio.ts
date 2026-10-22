"use client";
import { useEffect, useState } from "react";
import { studioApi, StudioApiError } from "./api";
import type { SiteSummary, StudioApi } from "./types";
type Session =
  "checking" | "unavailable" | "signed-out" | "signed-in" | "error";

export function useStudio(client: StudioApi = studioApi) {
  const [session, setSession] = useState<Session>("checking");
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const auth = await client.auth();
        const items = auth.signedIn ? await client.listSites() : [];
        if (!active) return;
        setSites(items);
        setSession(
          !auth.demoAvailable
            ? "unavailable"
            : auth.signedIn
              ? "signed-in"
              : "signed-out",
        );
      } catch {
        if (active) {
          setSession("error");
          setError("Không kết nối được với Studio. Vui lòng thử lại.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [client, retry]);
  async function mutate(
    key: string,
    action: () => Promise<string>,
    refresh = true,
  ) {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      const message = await action();
      setNotice(message);
      if (refresh) setSites(await client.listSites());
      return true;
    } catch (cause) {
      if (cause instanceof StudioApiError && cause.status === 401) {
        setSession("signed-out");
        setSites([]);
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "Yêu cầu chưa hoàn tất. Vui lòng thử lại.",
      );
      return false;
    } finally {
      setBusy("");
    }
  }
  return {
    session,
    sites,
    busy,
    error,
    notice,
    retry: () => {
      setError("");
      setSession("checking");
      setRetry((value) => value + 1);
    },
    login: (password: string) =>
      mutate("login", async () => {
        await client.login(password);
        setSession("signed-in");
        return "";
      }),
    logout: () =>
      mutate(
        "logout",
        async () => {
          await client.logout();
          setSites([]);
          setSession("signed-out");
          return "";
        },
        false,
      ),
    refresh: () => mutate("refresh", async () => "Danh sách đã được cập nhật."),
    create: (file: File, name: string) =>
      mutate("upload", async () => {
        const result = await client.createSite(file, name);
        return `Đã xuất bản “${name}” với ${result.fileCount} file. Bạn có thể sao chép link để chia sẻ.`;
      }),
    update: (site: SiteSummary, file: File) =>
      mutate(site.id, async () => {
        await client.updateSite(site.id, file, site.display_name);
        return `Đã cập nhật “${site.display_name}” và giữ nguyên link chia sẻ.`;
      }),
    toggle: (site: SiteSummary) =>
      mutate(site.id, async () => {
        const published = site.status !== "published";
        await client.setPublished(site.id, published);
        return published
          ? `Đã xuất bản lại “${site.display_name}”.`
          : `Đã tắt chia sẻ “${site.display_name}”.`;
      }),
  };
}

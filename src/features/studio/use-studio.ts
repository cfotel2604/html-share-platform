"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { studioApi, StudioApiError } from "./api";
import type { AuthStatus, SiteSummary, StudioApi } from "./types";
type Session =
  "checking" | "unavailable" | "signed-out" | "signed-in" | "error";

export function useStudio(client: StudioApi = studioApi, {pathBased=false}:{pathBased?:boolean}={}) {
  const router = useRouter();
  const [session, setSession] = useState<Session>("checking");
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const auth = await client.auth();
        const items = auth.signedIn ? await client.listSites() : [];
        if (!active) return;
        setSites(items);
        setAuthStatus(auth);
        if(auth.denied) {setSession("error");setError("Tài khoản Google chưa được cấp quyền hoặc đã bị khóa.");return;}
        setSession(
          !(auth.available ?? auth.demoAvailable)
            ? "unavailable"
            : auth.signedIn
              ? "signed-in"
              : "signed-out",
        );
      } catch (cause) {
        if (active) {
          setSession("error");
          setError(cause instanceof StudioApiError ? cause.message : "Không kết nối được với Studio. Vui lòng thử lại.");
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
      if (cause instanceof StudioApiError && [401,403].includes(cause.status)) {
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
    provider: authStatus?.provider ?? "local-demo",
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
          if (authStatus?.provider === "clerk") router.push("/sign-out");
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
    rotateShare: (site: SiteSummary) => mutate(site.id, async () => {
      await client.rotateShare(site.id);
      return `Đã tạo link xem mới cho “${site.display_name}”. Hãy sao chép và gửi lại link mới.`;
    }),
    revokeShare: (site: SiteSummary) => mutate(site.id, async () => {
      await client.revokeShare(site.id);
      return pathBased
        ? `Đã thu hồi link của “${site.display_name}”. Link cũ đã bị chặn; nội dung đã tải trong tab không thể thu hồi.`
        : `Đã thu hồi link xem của “${site.display_name}”. Nội dung trực tiếp còn mở nếu website đang xuất bản.`;
    }),
  };
}

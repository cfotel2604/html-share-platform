import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ODS Studio · HTML Share",
  description: "Tạo, xem trước và chia sẻ trang HTML trong môi trường local",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

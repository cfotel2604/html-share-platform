import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HTML Share Platform — Foundation",
  description: "Development foundation for the HTML sharing dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

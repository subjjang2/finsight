import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "finsight",
  description: "카드 명세서 CSV 기반 지출 분석 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body>{children}</body>
    </html>
  );
}

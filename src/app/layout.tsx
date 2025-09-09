import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kiznet - 家系図作成アプリ",
  description: "直感的に操作できる家系図作成Webアプリケーション。家族の繋がりを美しく視覚化し、世代を超えて受け継がれる絆を大切に記録できます。",
  keywords: ["家系図", "家族", "系図", "家譜", "ファミリーツリー", "家族関係", "家系"],
  authors: [{ name: "Kiznet Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
  openGraph: {
    title: "Kiznet - 家系図作成アプリ",
    description: "直感的に操作できる家系図作成Webアプリケーション",
    type: "website",
    locale: "ja_JP",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Disclaimer from "@/components/Disclaimer";

export const metadata: Metadata = {
  title: "本店移転らくらく登記 | 書類作成支援",
  description:
    "株式会社・合同会社の本店移転登記に必要な書類一式を、フォーム入力から数分で自動生成。本人申請向けの低価格な書類作成支援サービス。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-gray-50 text-gray-900">
        <Header />
        <main className="flex-1">{children}</main>
        <Disclaimer />
      </body>
    </html>
  );
}

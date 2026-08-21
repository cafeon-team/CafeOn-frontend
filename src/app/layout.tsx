import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-store";
import { OwnerAuthProvider } from "@/lib/owner-auth-store";

export const metadata: Metadata = {
  title: "CafeOn | 가까운 카페, 빈자리를 바로 확인하세요",
  description: "카페온 - 손님용 모바일 앱",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="app-frame">
          <AuthProvider>
            <OwnerAuthProvider>{children}</OwnerAuthProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}

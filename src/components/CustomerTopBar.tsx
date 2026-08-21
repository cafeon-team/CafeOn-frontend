"use client";

import Image from "next/image";
import Link from "next/link";
import { Store } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { useOwnerAuth } from "@/lib/owner-auth-store";

/**
 * 지도 화면(로그인 전 첫 화면) 상단바.
 * - 왼쪽: CafeOn 로고 (사장님 메인화면의 OwnerTopBar와 동일한 위치/스타일)
 * - 오른쪽: 사장님 로그인 버튼 (손님 로그인과는 별도 진입점)
 * 손님은 로그인하지 않고도 이 화면을 볼 수 있고, 로그인이 필요한 기능을 누르면
 * AuthGate가 로그인을 안내해요. 사장님은 이 버튼으로 /owner/login으로 이동해요.
 *
 * "사장님 로그인" 버튼은 손님/사장님 둘 다 로그인하지 않은 상태에서만 보여요.
 * - 손님으로 이미 로그인했다면, 이 화면은 이미 로그인된 손님의 홈 화면이라
 *   굳이 다른 계정(사장님) 로그인 버튼을 보여줄 필요가 없어요.
 * - 사장님으로 로그인된 채로 (예: 예전 화면에서) 이 지도 화면에 온 경우에도
 *   똑같이 숨겨요 — 이미 로그인돼 있는데 "로그인" 버튼을 또 보여주는 건 혼란스러워요.
 */
export default function CustomerTopBar() {
  const { isLoggedIn } = useAuth();
  const { isOwnerLoggedIn } = useOwnerAuth();
  const showOwnerLoginButton = !isLoggedIn && !isOwnerLoggedIn;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-4">
      <Link href="/map" className="flex items-center">
        <Image
          src="/images/logo.png"
          alt="CafeOn"
          width={108}
          height={21}
          priority
          className="h-[21px] w-auto object-contain"
        />
      </Link>

      {showOwnerLoginButton && (
        <Link
          href="/owner/login"
          className="flex items-center gap-1.5 rounded-full border border-trust/30 bg-trust-tint px-3.5 py-2 text-[13px] font-bold text-trust-dark"
        >
          <Store size={14} strokeWidth={2.5} />
          사장님 로그인
        </Link>
      )}
    </header>
  );
}

"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Calendar, Star, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { useOwnerAuth } from "@/lib/owner-auth-store";

export default function StartPage() {
  const { logout } = useAuth();
  const { ownerLogout } = useOwnerAuth();

  // 계정 선택 화면에 도착하면 손님/사장님 로그인 상태를 모두 초기화해요.
  // (로그아웃 버튼은 상태 변경 없이 이 화면으로만 이동시키고, 실제 로그아웃
  //  처리는 여기서 하기 때문에 이전 화면의 인증 가드와 경합이 생기지 않아요.)
  useEffect(() => {
    logout();
    ownerLogout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-cream px-6 pb-10 pt-14">
      <Image
        src="/images/logo.png"
        alt="CafeOn"
        width={132}
        height={26}
        priority
        className="mx-auto h-[26px] w-auto object-contain"
      />
      <h2 className="mt-8 text-center text-[20px] font-bold text-ink">
        어떤 계정으로 시작할까요?
      </h2>
      <p className="mt-2 text-center text-[14px] text-ink-secondary">
        손님과 사장님에게 맞는 화면으로 시작해요
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <Link
          href="/login"
           className="flex items-center gap-4 rounded-2xl border border-brand/25 bg-brand-tint p-5"
        >
          <Image
            src="/images/avatar-guest.png"
            alt="손님 계정"
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="text-[16px] font-bold text-ink">손님 계정</p>
            <p className="mt-1 text-[13px] leading-snug text-ink-secondary">
              카페 찾기, 좌석 확인,
              <br />
              주문 및 혜택 이용
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white">
            <ChevronRight size={18} />
          </span>
        </Link>

        <Link
          href="/owner/login"
          className="flex items-center gap-4 rounded-2xl border border-trust/25 bg-trust-tint p-5"
        >
          <Image
            src="/images/avatar-owner.png"
            alt="사장님 계정"
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="text-[16px] font-bold text-ink">사장님 계정</p>
            <p className="mt-1 text-[13px] leading-snug text-ink-secondary">
              매장 관리, 좌석 현황,
              <br />
              메뉴 및 고객 관리
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-trust text-white">
            <ChevronRight size={18} />
          </span>
        </Link>
      </div>

    

      <p className="mt-6 text-center text-[13px] text-ink-secondary">
        <Link href="/map" className="font-bold text-ink-secondary underline underline-offset-2">
          로그인 하지 않고 둘러볼게요
        </Link>
      </p>

      <div className="my-8 h-px w-full bg-border" />

      <h3 className="text-[20px] font-bold leading-snug text-ink">
        CafeON으로 헛걸음 없이
      </h3>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-secondary">
        지금 자리가 있는 카페를 확인하고
        <br />
        원하는 카페까지 편하게 찾아가세요.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl border border-border bg-white p-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand">
            <Calendar size={20} />
          </span>
          <p className="text-[12.5px] font-bold text-ink">빈자리 확인</p>
          <p className="text-[11.5px] leading-snug text-ink-secondary">
            좌석 현황을
            <br />
            바로 확인해요
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-tint text-amber-dark">
            <Star size={20} />
          </span>
          <p className="text-[12.5px] font-bold text-ink">카페 탐색</p>
          <p className="text-[11.5px] leading-snug text-ink-secondary">
            내 주변 카페를
            <br />
            한눈에 찾아요
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-tint text-sage-dark">
            <TrendingUp size={20} />
          </span>
          <p className="text-[12.5px] font-bold text-ink">주문 &amp; 혜택</p>
          <p className="text-[11.5px] leading-snug text-ink-secondary">
            주문하고 혜택도
            <br />
            차곡차곡 쌓아요
          </p>
        </div>
      </div>
      <p className="mt-6 text-center text-[12.5px] text-ink-muted">
        가까운 카페를 더 편하게, CafeON
      </p>
    </div>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useOwnerAuth } from "@/lib/owner-auth-store";

/**
 * 사장님 소셜 로그인(카카오/구글/네이버) 완료 후 백엔드가 리다이렉트하는 페이지.
 * 백엔드가 붙여주는 쿼리:
 *   - 성공: ?code=...&provider=...
 *   - 실패: ?error=social_login_failed&message=...
 *
 * ⚠️ 손님용 콜백(/login/callback)과 구분하기 위한 페이지예요. 백엔드가 사장님
 * 소셜 로그인을 시작할 때(getSocialLoginUrl(provider, "owner")) 이 주소
 * (예: http://localhost:3000/owner/login/callback)로 다시 리다이렉트해주도록
 * 백엔드 팀과 확인해주세요.
 */
function OwnerSocialLoginCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ownerLoginWithSocialCode } = useOwnerAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const message = searchParams.get("message");
    const code = searchParams.get("code");

    if (errorParam) {
      setError(message || "소셜 로그인에 실패했어요. 다시 시도해주세요.");
      return;
    }

    if (!code) {
      setError("잘못된 접근이에요. 다시 로그인해주세요.");
      return;
    }

    let cancelled = false;
    (async () => {
      const result = await ownerLoginWithSocialCode(code);
      if (cancelled) return;
      if (result.ok) {
        router.replace("/owner");
      } else {
        setError(result.error);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
      {error ? (
        <>
          <p className="text-[15px] text-danger">{error}</p>
          <Link href="/owner/login" className="text-[14px] font-bold text-trust">
            로그인 화면으로 돌아가기
          </Link>
        </>
      ) : (
        <p className="text-[15px] text-ink-secondary">로그인 처리 중이에요...</p>
      )}
    </div>
  );
}

export default function OwnerSocialLoginCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-cream">
          <p className="text-[15px] text-ink-secondary">로그인 처리 중이에요...</p>
        </div>
      }
    >
      <OwnerSocialLoginCallback />
    </Suspense>
  );
}

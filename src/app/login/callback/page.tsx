"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-store";

/**
 * 소셜 로그인(카카오/구글/네이버) 완료 후 백엔드가 리다이렉트하는 페이지.
 * 백엔드가 붙여주는 쿼리:
 *   - 성공: ?code=...&provider=...
 *   - 실패: ?error=social_login_failed&message=...
 *
 * 백엔드 .env 의 FRONTEND_SOCIAL_CALLBACK_URL 이 이 페이지 주소
 * (예: http://localhost:3000/login/callback) 로 설정돼 있어야 해요.
 */
function SocialLoginCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithSocialCode } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

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
      const result = await loginWithSocialCode(code);
      if (cancelled) return;
      if (result.ok) {
        router.replace("/map");
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
          <Link href="/login" className="text-[14px] font-bold text-brand">
            로그인 화면으로 돌아가기
          </Link>
        </>
      ) : (
        <p className="text-[15px] text-ink-secondary">
          로그인 처리 중이에요...
        </p>
      )}
    </div>
  );
}

export default function SocialLoginCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-cream">
          <p className="text-[15px] text-ink-secondary">
            로그인 처리 중이에요...
          </p>
        </div>
      }
    >
      <SocialLoginCallback />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-store";

export default function SignupPage() {
  const router = useRouter();
  const { signup, authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않아요.");
      return;
    }

    const result = await signup({ name, email, password });
    if (result.ok) {
      router.push("/map");
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-cream px-6 pb-10">
      <div className="flex h-14 items-center">
        <button onClick={() => router.back()} aria-label="뒤로가기" className="text-ink">
          <ChevronLeft size={24} />
        </button>
      </div>

      <Image
        src="/images/logo.png"
        alt="CafeOn"
        width={144}
        height={28}
        priority
        className="mx-auto mt-12 h-7 w-auto object-contain"
      />
      <p className="mt-2 text-center text-[14px] text-ink-secondary">
        CafeON 손님 계정으로 시작해요
      </p>

      <form className="mt-8 flex flex-col gap-3" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 주소"
          autoComplete="email"
          className="h-14 rounded-2xl border border-border bg-white px-5 text-[15px] placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 (8자 이상)"
          autoComplete="new-password"
          className="h-14 rounded-2xl border border-border bg-white px-5 text-[15px] placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <input
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder="비밀번호 확인"
          autoComplete="new-password"
          className="h-14 rounded-2xl border border-border bg-white px-5 text-[15px] placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          autoComplete="name"
          className="h-14 rounded-2xl border border-border bg-white px-5 text-[15px] placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
        />

        <button
          type="button"
          className="mt-6 flex items-center justify-between text-[13.5px] text-ink-secondary"
        >
          이용약관 및 개인정보처리방침에 동의합니다.
          <ChevronRight size={16} className="text-ink-muted" />
        </button>

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <div className="mt-4">
          <Button type="submit" disabled={authLoading}>
            {authLoading ? "가입 중..." : "회원가입"}
          </Button>
        </div>
      </form>

      <p className="mt-auto pt-10 text-center text-[13px] text-ink-secondary">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-bold text-brand">
          로그인
        </Link>
      </p>
    </div>
  );
}

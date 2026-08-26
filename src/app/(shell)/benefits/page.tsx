"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import { useBenefits, type BenefitCouponKind } from "@/lib/benefits-store";

function couponBadge(kind: BenefitCouponKind | undefined): { label: string; className: string } | null {
  switch (kind) {
    case "signup":
      return { label: "가입 혜택", className: "bg-brand-tint text-brand-dark" };
    case "birthday":
      return { label: "생일 혜택", className: "bg-amber-100 text-amber-700" };
    default:
      return null;
  }
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return expiresAt < new Date().toISOString().slice(0, 10);
}

export default function BenefitsPage() {
  const { points, coupons, pointLogs, loading, usePoints, useCoupon } = useBenefits();
  const [showPointForm, setShowPointForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [amount, setAmount] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const couponListRef = useRef<HTMLDivElement>(null);

  const activeCouponCount = coupons.filter((c) => !c.used && !isExpired(c.expiresAt)).length;

  const scrollToCoupons = () => {
    couponListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const flashToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 1800);
  };

  const submitPointUse = () => {
    const value = Number(amount);
    if (!value || value <= 0 || value > points) return;
    usePoints(value);
    setAmount("");
    setShowPointForm(false);
    flashToast(`${value.toLocaleString()}P를 사용했어요`);
  };

  const submitCouponUse = (id: string, title: string) => {
    useCoupon(id);
    flashToast(`'${title}' 쿠폰을 사용했어요`);
  };

  return (
    <div className="flex flex-col">
      <Header title="혜택" />

      <div className="px-6 pt-5">
        <p className="text-[12.5px] font-bold tracking-wide text-ink-muted">
          MY BENEFIT
        </p>
        <div className="mt-3 flex items-center rounded-2xl border border-border bg-white p-6">
          <div className="flex-1 text-center">
            <p className="text-[12px] text-ink-muted">보유 포인트</p>
            <p className="mt-1 text-[22px] font-extrabold text-ink">
              {points.toLocaleString()} P
            </p>
            <button
              onClick={() => setShowPointForm(true)}
              disabled={points <= 0}
              className="mt-3 rounded-full bg-brand-tint px-4 py-1.5 text-[12.5px] font-bold text-brand-dark disabled:opacity-40"
            >
              포인트 사용
            </button>
          </div>
          <div className="h-14 w-px bg-border" />
          <div className="flex-1 text-center">
            <p className="text-[12px] text-ink-muted">쿠폰</p>
            <p className="mt-1 text-[22px] font-extrabold text-ink">
              {activeCouponCount}장
            </p>
            <button
              onClick={scrollToCoupons}
              className="mt-3 rounded-full bg-brand px-4 py-1.5 text-[12.5px] font-bold text-white"
            >
              쿠폰 보기
            </button>
          </div>
        </div>

        {pointLogs.length > 0 && (
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="mt-3 w-full text-center text-[12.5px] font-medium text-ink-secondary underline underline-offset-2"
          >
            {showHistory ? "적립 내역 닫기" : "포인트 적립 내역 보기"}
          </button>
        )}
        {showHistory && (
          <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-border bg-white p-4">
            {pointLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-center justify-between text-[13px]">
                <div>
                  <p className="font-medium text-ink">{log.reason}</p>
                  <p className="text-[11.5px] text-ink-muted">{log.createdAt}</p>
                </div>
                <p className="font-bold text-brand-dark">+{log.amount.toLocaleString()}P</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div ref={couponListRef} className="mt-8 flex items-center justify-between px-6">
        <h2 className="text-[18px] font-bold text-ink">쿠폰</h2>
        <button
          onClick={scrollToCoupons}
          className="rounded-full border border-border px-3 py-1.5 text-[12.5px] font-medium text-ink-secondary"
        >
          전체보기
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 px-6 pb-8">
        {coupons.length === 0 && (
          <p className="mt-8 text-center text-[14px] text-ink-muted">
            {loading ? "불러오는 중..." : "보유한 쿠폰이 없어요."}
          </p>
        )}
        {coupons.map((c) => {
          const expired = isExpired(c.expiresAt);
          const badge = couponBadge(c.kind);
          const disabled = c.used || expired;
          return (
            <div
              key={c.id}
              className={
                "flex items-center justify-between rounded-2xl border border-border bg-white p-5 " +
                (disabled ? "opacity-50" : "")
              }
            >
              <div>
                <div className="flex items-center gap-1.5">
                  {badge && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                  <p className="text-[15px] font-bold text-ink">{c.title}</p>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-secondary">{c.subtitle}</p>
                {c.expiresAt && (
                  <p className="mt-0.5 text-[11.5px] text-ink-muted">
                    {expired ? "기간 만료" : `${c.expiresAt}까지`}
                  </p>
                )}
              </div>
              {c.used ? (
                <span className="rounded-full bg-border px-3 py-1.5 text-[12.5px] font-bold text-ink-muted">
                  사용 완료
                </span>
              ) : expired ? (
                <span className="rounded-full bg-border px-3 py-1.5 text-[12.5px] font-bold text-ink-muted">
                  기간 만료
                </span>
              ) : (
                <button
                  onClick={() => submitCouponUse(c.id, c.title)}
                  className="rounded-full bg-brand-tint px-3.5 py-1.5 text-[12.5px] font-bold text-brand-dark active:bg-brand/20"
                >
                  사용하기
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showPointForm && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-app rounded-t-3xl bg-white p-6 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-ink">포인트 사용</h3>
              <button
                onClick={() => setShowPointForm(false)}
                aria-label="닫기"
                className="flex h-9 w-9 items-center justify-center text-ink-muted"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-[13px] text-ink-secondary">
              보유 포인트 {points.toLocaleString()}P
            </p>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="사용할 포인트를 입력하세요"
              max={points}
              min={0}
              className="mt-3 h-14 w-full rounded-2xl border border-border bg-white px-5 text-[16px] text-ink outline-none focus:ring-2 focus:ring-brand/30"
            />
            {Number(amount) > points && (
              <p className="mt-2 text-[12.5px] text-brand">
                보유 포인트보다 많이 사용할 수 없어요.
              </p>
            )}
            <button
              onClick={submitPointUse}
              disabled={!amount || Number(amount) <= 0 || Number(amount) > points}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-brand text-[14.5px] font-bold text-white disabled:opacity-40"
            >
              사용하기
            </button>
          </div>
        </div>
      )}

      <Toast show={Boolean(toastMsg)} message={toastMsg ?? ""} />
    </div>
  );
}

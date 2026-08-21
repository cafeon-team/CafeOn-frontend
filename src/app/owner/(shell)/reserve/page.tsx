"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import Header from "@/components/Header";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { useOwner } from "@/lib/owner-store";

const stateStyle: Record<string, string> = {
  // ⚠️ 손님이 아직 결제를 끝내지 않은 주문이에요. 접수/거절 대상이 아니라서
  // (서버가 이 상태에서는 상태 변경 자체를 거부해요) "접수 대기"엔 포함하지
  // 않고, 주문내역에서만 회색 배지로 구분해 보여줘요.
  결제대기: "bg-border text-ink-muted",
  주문접수: "bg-amber-tint text-amber-dark",
  준비중: "bg-brand-tint text-brand-dark",
  준비완료: "bg-trust-tint text-trust",
  완료: "bg-sage-tint text-sage-dark",
  취소됨: "bg-border text-ink-muted",
};

/**
 * ⚠️ 예전엔 이 화면(/owner/reserve)이 손님의 "자리 예약"을 수락/거절하는
 * 화면이었어요. 이제 자리 예약 기능 자체가 없고, 손님이 메뉴를 주문하면
 * 사장님은 여기서 주문을 확인하고 접수/준비완료 처리를 해요.
 */
export default function OwnerOrdersPage() {
  const { orders, acceptOrder, rejectOrder, markOrderReady } = useOwner();
  const [tab, setTab] = useState<"주문내역" | "접수 대기">("주문내역");

  const pending = orders.filter((o) => o.status === "주문접수");

  return (
    <div className="flex flex-col">
      <Header title="주문" />

      <div className="flex border-b border-border px-6">
        {(["주문내역", "접수 대기"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-[15px] font-bold " +
              (tab === t
                ? "border-trust text-trust"
                : "border-transparent text-ink-muted")
            }
          >
            {t}
            {t === "접수 대기" && pending.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-trust px-1 text-[11px] font-bold text-white">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-6 py-6">
        {tab === "주문내역" &&
          (orders.length === 0 ? (
            <p className="mt-16 text-center text-[14px] text-ink-muted">
              아직 들어온 주문이 없어요.
            </p>
          ) : (
            orders.map((o) => (
              <div
                key={o.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5"
              >
                <Link
                  href={`/owner/reserve/${o.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4"
                >
                  <ImagePlaceholder
                    className="h-14 w-14 shrink-0"
                    rounded="rounded-full"
                    src={o.customerImageUrl}
                    alt={o.customerName}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-bold text-ink">{o.customerName} 고객님</p>
                    <p className="mt-0.5 truncate text-[13px] text-ink-secondary">
                      {o.date} · {o.items.map((it) => `${it.name} ${it.quantity}개`).join(", ")}
                    </p>
                    <span
                      className={
                        "mt-2 inline-flex rounded-full px-3 py-1 text-[12.5px] font-bold " +
                        stateStyle[o.status]
                      }
                    >
                      {o.status}
                    </span>
                  </div>
                </Link>
                {o.status === "준비중" && (
                  <button
                    type="button"
                    onClick={() => markOrderReady(o.id)}
                    className="shrink-0 text-[13px] font-bold text-trust underline underline-offset-2"
                  >
                    준비완료
                  </button>
                )}
              </div>
            ))
          ))}

        {tab === "접수 대기" &&
          (pending.length === 0 ? (
            <p className="mt-16 text-center text-[14px] text-ink-muted">
              접수 대기 중인 주문이 없어요.
            </p>
          ) : (
            pending.map((o) => (
              <div key={o.id} className="rounded-2xl border border-border bg-white p-5">
                <Link href={`/owner/reserve/${o.id}`} className="flex items-center gap-4">
                  <ImagePlaceholder
                    className="h-14 w-14 shrink-0"
                    rounded="rounded-full"
                    src={o.customerImageUrl}
                    alt={o.customerName}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-bold text-ink">{o.customerName} 고객님</p>
                    <p className="mt-0.5 truncate text-[13px] text-ink-secondary">
                      {o.items.map((it) => `${it.name} ${it.quantity}개`).join(", ")}
                    </p>
                  </div>
                </Link>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => rejectOrder(o.id)}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border text-[14px] font-bold text-ink-secondary active:bg-cream"
                  >
                    <X size={16} strokeWidth={2.4} />
                    거절
                  </button>
                  <button
                    onClick={() => acceptOrder(o.id)}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-trust text-[14px] font-bold text-white active:bg-trust-dark"
                  >
                    <Check size={16} strokeWidth={2.4} />
                    접수
                  </button>
                </div>
              </div>
            ))
          ))}
      </div>
    </div>
  );
}

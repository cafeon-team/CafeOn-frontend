"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Check, X } from "lucide-react";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { useOwner } from "@/lib/owner-store";

const stateStyle: Record<string, string> = {
  결제대기: "bg-border text-ink-muted",
  주문접수: "bg-amber-tint text-amber-dark",
  준비중: "bg-brand-tint text-brand-dark",
  준비완료: "bg-trust-tint text-trust",
  완료: "bg-sage-tint text-sage-dark",
  취소됨: "bg-border text-ink-muted",
};

export default function OwnerOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { orders, acceptOrder, rejectOrder, markOrderReady, completeOrder, cancelOrder } =
    useOwner();
  const order = orders.find((o) => o.id === params.id);

  if (!order) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6">
        <p className="text-[14px] text-ink-muted">주문 정보를 찾을 수 없어요.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-[14px] font-bold text-trust"
        >
          뒤로가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex h-14 items-center gap-3 px-4">
        <button onClick={() => router.back()} aria-label="뒤로가기" className="text-ink">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[17px] font-bold text-ink">주문 상세</h1>
      </div>

      <div className="px-6 pt-2">
        <div className="flex items-center gap-4">
          <ImagePlaceholder
            className="h-14 w-14 shrink-0"
            rounded="rounded-full"
            src={order.customerImageUrl}
            alt={order.customerName}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-bold text-ink">{order.customerName} 고객님</p>
            <span
              className={
                "mt-1 inline-flex rounded-full px-3 py-1 text-[12.5px] font-bold " +
                stateStyle[order.status]
              }
            >
              {order.status}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-border bg-white p-5">
          {order.items.map((it, i) => (
            <div key={i} className="flex justify-between text-[14px] text-ink-secondary">
              <span>
                {it.name} × {it.quantity}
              </span>
              <span>{(it.price * it.quantity).toLocaleString()}원</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-3 text-[15px] font-bold text-ink">
            <span>결제 금액</span>
            <span>{order.amount.toLocaleString()}원</span>
          </div>
        </div>

        {order.status === "결제대기" && (
          <p className="mt-6 text-center text-[13px] text-ink-muted">
            손님이 아직 결제를 완료하지 않은 주문이에요. 결제가 끝나면 여기서 접수/거절할 수 있어요.
          </p>
        )}

        {order.status === "주문접수" && (
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => {
                rejectOrder(order.id);
                router.back();
              }}
              className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border text-[14px] font-bold text-ink-secondary active:bg-cream"
            >
              <X size={16} strokeWidth={2.4} />
              거절
            </button>
            <button
              onClick={() => acceptOrder(order.id)}
              className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-trust text-[14px] font-bold text-white active:bg-trust-dark"
            >
              <Check size={16} strokeWidth={2.4} />
              접수
            </button>
          </div>
        )}

        {order.status === "준비중" && (
          <div className="mt-6">
            <button
              onClick={() => markOrderReady(order.id)}
              className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-trust text-[14px] font-bold text-white active:bg-trust-dark"
            >
              <Check size={16} strokeWidth={2.4} />
              준비완료 처리
            </button>
          </div>
        )}

        {order.status === "준비완료" && (
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => {
                cancelOrder(order.id);
                router.back();
              }}
              className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border text-[14px] font-bold text-ink-secondary active:bg-cream"
            >
              <X size={16} strokeWidth={2.4} />
              주문 취소
            </button>
            <button
              onClick={() => {
                completeOrder(order.id);
                router.back();
              }}
              className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-trust text-[14px] font-bold text-white active:bg-trust-dark"
            >
              <Check size={16} strokeWidth={2.4} />
              픽업완료
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

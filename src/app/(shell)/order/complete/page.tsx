"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";
import Button from "@/components/Button";
import { useCart } from "@/lib/cart-store";

export default function OrderCompletePage() {
  const { lastOrder } = useCart();

  return (
    <div className="flex min-h-full flex-col">
      <Header title="주문 완료" />

      <div className="flex flex-1 flex-col items-center px-6 pt-10 text-center">
        <CheckCircle2 size={56} className="text-sage" strokeWidth={1.6} />
        <h2 className="mt-5 text-[20px] font-bold text-ink">주문이 완료되었어요</h2>
        <p className="mt-2 text-[14px] text-ink-secondary">
          {lastOrder?.cafeName ?? "매장"}에서 주문을 확인하는 대로 준비를 시작해요.
        </p>

        {lastOrder && (
          <div className="mt-8 w-full rounded-2xl border border-border bg-white p-5 text-left">
            <p className="text-[12.5px] font-bold text-ink-muted">주문번호 {lastOrder.orderId}</p>
            <div className="mt-3 flex flex-col gap-2">
              {lastOrder.items.map((item) => (
                <div key={item.id} className="flex justify-between text-[14px] text-ink-secondary">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span>{(item.price * item.quantity).toLocaleString()}원</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-border pt-3 text-[15px] font-bold text-ink">
              <span>결제 금액</span>
              <span>{lastOrder.amount.toLocaleString()}원</span>
            </div>
          </div>
        )}

        {/* ⚠️ 예전엔 href="/"였는데, "/"는 앱의 첫 스플래시 화면("시작하기" 버튼만
            있는 화면)이라 주문 완료 후 눌러도 앱을 처음부터 다시 시작하는
            것처럼 보였어요. 이제 /reserve는 좌석 예약이 아니라 주문내역
            화면이라 방금 한 주문이 바로 거기 나타나요. */}
        <div className="mt-10 flex w-full flex-col gap-3">
          <Link href="/reserve">
            <Button>주문내역 보기</Button>
          </Link>
          <Link
            href="/map"
            className="flex h-14 w-full items-center justify-center rounded-2xl border border-brand text-[15px] font-bold text-brand"
          >
            지도로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

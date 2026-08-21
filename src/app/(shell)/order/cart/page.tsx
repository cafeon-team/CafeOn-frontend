"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import Button from "@/components/Button";
import { useCart } from "@/lib/cart-store";
import { useBenefits } from "@/lib/benefits-store";

export default function OrderCartPage() {
  const router = useRouter();
  const cart = useCart();
  const { points, coupons } = useBenefits();
  // ⚠️ 빠르게 두 번 누르면 checkout 화면이 두 번 눌린 채로 라우팅되면서
  // 주문이 중복 생성될 여지가 있었어요. 한 번 누르면 다시 못 누르게 잠가요.
  const navigatingRef = useRef(false);
  const [navigating, setNavigating] = useState(false);

  const usableCoupons = coupons.filter((c) => !c.used);
  const finalAmount = Math.max(0, cart.subtotal - cart.pointUsed);

  if (cart.items.length === 0) {
    return (
      <div className="flex min-h-full flex-col">
        <Header title="장바구니" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-[15px] text-ink-secondary">
            장바구니가 비어있어요. 카페 메뉴에서 담아주세요.
          </p>
          <button onClick={() => router.back()} className="text-[14px] font-bold text-brand">
            메뉴 보러가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header title="장바구니" />

      <div className="flex flex-1 flex-col px-6 pt-4">
        <h2 className="text-[16px] font-bold text-ink">{cart.cafeName}</h2>

        <div className="mt-4 flex flex-col gap-3">
          {cart.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-white px-4 py-3.5"
            >
              <div>
                <p className="text-[14.5px] font-bold text-ink">{item.name}</p>
                <p className="mt-0.5 text-[13px] text-ink-secondary">
                  {(item.price * item.quantity).toLocaleString()}원
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  aria-label="수량 줄이기"
                  onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink-secondary"
                >
                  {item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                </button>
                <span className="w-4 text-center text-[14.5px] font-bold text-ink">
                  {item.quantity}
                </span>
                <button
                  aria-label="수량 늘리기"
                  onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink-secondary"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <h3 className="mt-8 text-[14px] font-bold text-ink">포인트 사용</h3>
        <p className="mt-1 text-[12.5px] text-ink-muted">보유 포인트 {points.toLocaleString()}P</p>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={Math.min(points, cart.subtotal)}
            value={cart.pointUsed || ""}
            onChange={(e) => cart.setPointUsed(Number(e.target.value) || 0)}
            placeholder="0"
            className="h-12 flex-1 rounded-xl border border-border bg-white px-4 text-[14.5px] text-ink outline-none focus:border-trust"
          />
          <button
            onClick={() => cart.setPointUsed(Math.min(points, cart.subtotal))}
            className="h-12 shrink-0 rounded-xl border border-trust px-4 text-[13.5px] font-bold text-trust"
          >
            전액사용
          </button>
        </div>

        <h3 className="mt-8 text-[14px] font-bold text-ink">쿠폰</h3>
        {usableCoupons.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-ink-muted">사용 가능한 쿠폰이 없어요.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {usableCoupons.map((c) => {
              const selected = cart.couponId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => cart.setCouponId(selected ? null : c.id)}
                  className={
                    "flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left " +
                    (selected ? "border-trust ring-2 ring-trust" : "border-border bg-white")
                  }
                >
                  <div>
                    <p className="text-[14px] font-bold text-ink">{c.title}</p>
                    <p className="text-[12.5px] text-ink-secondary">{c.subtitle}</p>
                  </div>
                  <span className="text-[13.5px] font-bold text-brand">{c.valueLabel}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-2 rounded-2xl bg-white p-5 text-[14px]">
          <div className="flex justify-between text-ink-secondary">
            <span>주문 금액</span>
            <span>{cart.subtotal.toLocaleString()}원</span>
          </div>
          {cart.pointUsed > 0 && (
            <div className="flex justify-between text-ink-secondary">
              <span>포인트 사용</span>
              <span>-{cart.pointUsed.toLocaleString()}원</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-border pt-3 text-[16px] font-bold text-ink">
            <span>결제 금액</span>
            <span>{finalAmount.toLocaleString()}원</span>
          </div>
        </div>

        <div className="mt-6 mb-8">
          <Button
            disabled={navigating}
            onClick={() => {
              if (navigatingRef.current) return;
              navigatingRef.current = true;
              setNavigating(true);
              router.push("/order/checkout");
            }}
          >
            {navigating ? "이동 중…" : "결제하기"}
          </Button>
        </div>
      </div>
    </div>
  );
}

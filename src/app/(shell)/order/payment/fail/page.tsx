"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";
import Header from "@/components/Header";
import Button from "@/components/Button";
import { clearPendingTossPayment } from "@/lib/api";

/** 토스 결제창에서 실패/취소하면 브라우저가 이 주소(failUrl)로 이동해요. */
export default function OrderPaymentFailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  useEffect(() => {
    clearPendingTossPayment();
  }, []);

  return (
    <div className="flex min-h-full flex-col bg-cream">
      <Header title="결제 실패" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <XCircle size={48} className="text-danger" strokeWidth={1.6} />
        <p className="text-[16px] font-bold text-ink">결제가 완료되지 않았어요</p>
        <p className="text-[13.5px] text-ink-muted">
          {message ?? "결제창을 닫았거나 오류가 발생했어요. 다시 시도해주세요."}
        </p>
        <div className="mt-8 w-full">
          <Button onClick={() => router.replace("/order/cart")}>장바구니로 돌아가기</Button>
        </div>
      </div>
    </div>
  );
}

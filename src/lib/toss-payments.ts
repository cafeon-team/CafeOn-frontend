"use client";

/**
 * 토스페이먼츠 결제창(일반결제) 연동.
 * ------------------------------------------------------------------
 * ⚠️ 과제 요구사항: "실제로 결제되게 하는 게 아니라 토스페이먼츠 테스트 계정으로
 * 결제 흐름만 보이면 됨". 그래서 여기서는 실제 카드 승인은 토스의 테스트
 * 클라이언트 키로 진행되는 진짜 결제창(테스트 모드)을 띄우고, 성공/실패 시
 * successUrl/failUrl로 돌아온 뒤 우리 백엔드(POST /api/payments/confirm)에
 * 최종 승인을 맡겨요 — 실제 카드사 매출은 절대 일어나지 않는 테스트 키예요.
 *
 * NPM 패키지 설치 없이 토스 공식 CDN 스크립트(v1 SDK)를 그때그때 불러와서 써요.
 * (이 프로젝트 sandbox에서 새 패키지를 설치/빌드 검증하기 어려운 점을 고려한
 * 선택이고, 공식적으로도 지원되는 연동 방식이에요.)
 */

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance;
  }
}

type TossPaymentsInstance = {
  requestPayment: (
    method: "카드" | "가상계좌" | "계좌이체" | "휴대폰",
    params: {
      amount: number;
      orderId: string;
      orderName: string;
      customerName?: string;
      successUrl: string;
      failUrl: string;
    },
  ) => Promise<void>;
};

const TOSS_SCRIPT_SRC = "https://js.tosspayments.com/v1/payment";

/** 토스페이먼츠 "개별 연동" 테스트 클라이언트 키.
 * 토스 공식 개발자 문서에 공개돼있는, 실제 사업자 등록 없이 흐름을 테스트해볼
 * 수 있는 범용 테스트 키예요(비밀 키가 아니라 브라우저에 노출되는 공개 키라
 * 코드에 있어도 안전해요). 우리 매장 전용 테스트 키를 발급받았다면
 * .env.local의 NEXT_PUBLIC_TOSS_CLIENT_KEY로 덮어써서 그 키를 대신 써요. */
export const TOSS_CLIENT_KEY =
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() || "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";

let scriptLoadPromise: Promise<void> | null = null;

function loadTossScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 사용할 수 있어요."));
  }
  if (window.TossPayments) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TOSS_SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("토스 결제 스크립트 로드 실패")));
      return;
    }
    const script = document.createElement("script");
    script.src = TOSS_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("토스 결제 스크립트를 불러오지 못했어요."));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

/** 토스 결제창(카드, 테스트 모드)을 띄워요. 사용자가 결제창에서 성공/실패하면
 * 브라우저가 successUrl/failUrl로 이동하면서 이 함수 호출 자체는 끝나지
 * 않아요(페이지 전체가 넘어가요) — 그래서 호출부에서 별도의 후속 처리를
 * 기다릴 필요 없이, 이동한 뒤의 성공/실패 페이지에서 이어받아 처리해요. */
export async function requestTossPayment(params: {
  orderId: string;
  orderName: string;
  amount: number;
  customerName?: string;
  successUrl: string;
  failUrl: string;
}): Promise<void> {
  await loadTossScript();
  if (!window.TossPayments) throw new Error("토스 결제 SDK를 불러오지 못했어요.");
  const toss = window.TossPayments(TOSS_CLIENT_KEY);
  await toss.requestPayment("카드", {
    amount: params.amount,
    orderId: params.orderId,
    orderName: params.orderName,
    customerName: params.customerName,
    successUrl: params.successUrl,
    failUrl: params.failUrl,
  });
}

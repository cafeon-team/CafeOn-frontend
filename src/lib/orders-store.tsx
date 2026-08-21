"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  apiGetMyOrders,
  apiCancelMyOrder,
  isApiConfigured,
  type ApiOrderDetail,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { usePathname } from "next/navigation";

export type OrderStatus = "결제대기" | "주문접수" | "준비중" | "준비완료" | "완료" | "취소됨";

export type MyOrder = {
  id: string;
  cafeName: string;
  date: string;
  status: OrderStatus;
  amount: number;
  pointUsed: number;
  items: { name: string; quantity: number; price: number }[];
};

/** 서버 status 문자열을 화면 배지 문구로 바꿔요. 서버가 아직 안 내려주거나
 * 모르는 값이면 "주문접수"로 안전하게 표시해요(화면이 깨지지 않아요). */
function toOrderStatus(raw: string): OrderStatus {
  switch (raw) {
    case "PENDING_PAYMENT":
      return "결제대기";
    case "CONFIRMED":
    case "PREPARING":
      return "준비중";
    case "READY":
      return "준비완료";
    case "COMPLETED":
      return "완료";
    case "CANCELLED":
    case "REJECTED":
    case "REFUNDED":
      return "취소됨";
    default:
      return "주문접수";
  }
}

function mapApiOrder(o: ApiOrderDetail): MyOrder {
  return {
    id: String(o.id),
    cafeName: o.storeName ?? (o.storeId ? `매장 #${o.storeId}` : "매장"),
    date: o.createdAt?.slice(0, 10) ?? "",
    status: toOrderStatus(o.status),
    amount: o.totalAmount,
    pointUsed: o.pointUsed,
    items: o.items.map((it) => ({ name: it.name, quantity: it.quantity, price: it.price })),
  };
}

type OrdersContextValue = {
  orders: MyOrder[];
  loading: boolean;
  /** 결제 완료 직후 등 화면에서 주문 목록을 최신 상태로 다시 불러오고 싶을 때 사용해요. */
  refetchOrders: () => void;
  cancelOrder: (id: string) => Promise<boolean>;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

/**
 * 손님의 주문 내역을 관리하는 컨텍스트.
 * ------------------------------------------------------------------
 * 예전에는 이 자리(/reserve)가 "자리 예약" 목록이었는데, 이제는 메뉴를
 * 주문하면(POST /api/orders → 결제 완료) 그 주문이 바로 여기(주문내역)에
 * 나타나요. 화면이 열릴 때 GET /api/users/me/orders로 실제 주문 내역을
 * 불러와요.
 */
export function OrdersProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const pathname = usePathname();
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ⚠️ 주문 생성/결제 화면(/order/checkout, /order/payment/*)에서는 백그라운드
  // 폴링을 잠깐 멈춰요. 두 가지 이유예요.
  // 1) 개발 서버(php artisan serve)는 요청을 한 번에 하나씩만 처리하는
  //    단일 스레드라, 8초마다 도는 주문내역 폴링이 지금 막 보내는 "주문
  //    생성(POST /api/orders)" 요청 앞에 끼어들면 체감 지연이 커져요.
  // 2) 폴링 응답이 지금 막 만든 주문을 반영하기 전에 화면을 되돌릴 수 있어요.
  const isCheckoutBusy =
    pathname?.startsWith("/order/checkout") || pathname?.startsWith("/order/payment");

  // ⚠️ 예전엔 화면에 들어올 때 딱 한 번만 불러와서, 사장님이 상태를 바꿔도
  // 손님 화면(주문내역)엔 새로고침 전까진 "주문접수" 그대로였어요("실시간 반영이
  // 안 된다"는 문제). 8초마다 다시 불러오고, 다른 앱을 보다가 돌아오면
  // (포커스/가시성 복귀) 즉시 한 번 더 불러와서 체감 지연을 줄여요.
  //
  // ⚠️ requestIdRef: 폴링 응답이 순서대로 도착한다는 보장이 없어요(느린 응답이
  // 나중에 도착). 응답이 왔을 때 "지금 이 응답이 최신 요청의 응답이 맞는지"를
  // 확인해서, 낡은(stale) 응답이 방금 취소한 주문을 다시 되살리는 등 최신 상태를
  // 덮어쓰지 않게 해요. cancelOrder가 성공했을 때도 이 값을 올려서, 그 시점
  // 이전에 이미 날아가 있던 폴링 응답은 결과가 와도 무시돼요.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!isApiConfigured() || !isLoggedIn) {
      setOrders([]);
      return;
    }
    if (isCheckoutBusy) return;
    let cancelled = false;
    const load = (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      const reqId = ++requestIdRef.current;
      apiGetMyOrders()
        .then((rows) => {
          if (cancelled || !rows || reqId !== requestIdRef.current) return;
          setOrders(rows.map(mapApiOrder));
        })
        .finally(() => {
          if (!cancelled && showLoading) setLoading(false);
        });
    };
    load(true);
    const interval = setInterval(() => load(false), 8000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [isLoggedIn, refreshKey, isCheckoutBusy]);

  const refetchOrders = () => setRefreshKey((k) => k + 1);

  const cancelOrder = async (id: string) => {
    const ok = await apiCancelMyOrder(id);
    if (ok) {
      requestIdRef.current++; // 그 전에 나가 있던 폴링 응답은 무시하게 만들어요.
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: "취소됨" } : o))
      );
    }
    return ok;
  };

  const value = useMemo<OrdersContextValue>(
    () => ({ orders, loading, refetchOrders, cancelOrder }),
    [orders, loading]
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}

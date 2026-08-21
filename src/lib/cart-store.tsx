"use client";

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/lib/auth-store";

export type CartItem = {
  id: string; // 메뉴 id
  name: string;
  price: number;
  quantity: number;
};

/** 마지막으로 완료한 주문 정보. 결제 완료 화면(/order/complete)에서만 참조해요. */
export type LastOrder = {
  orderId: string;
  cafeName: string;
  items: CartItem[];
  amount: number;
};

type CartContextValue = {
  cafeId: string | null;
  cafeName: string;
  items: CartItem[];
  totalCount: number;
  subtotal: number;

  pointUsed: number;
  setPointUsed: (amount: number) => void;
  couponId: string | null;
  setCouponId: (id: string | null) => void;

  /** 다른 매장 상품을 담으면 기존 장바구니는 비우고 새로 시작해요(한 번에 한
   * 매장만 주문 가능 — 대부분의 배달/주문 앱과 동일한 방식이에요). */
  addItem: (cafeId: string, cafeName: string, item: { id: string; name: string; price: number }) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;

  lastOrder: LastOrder | null;
  setLastOrder: (order: LastOrder | null) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [cafeName, setCafeName] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [pointUsed, setPointUsedState] = useState(0);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);

  // ⚠️ 예전엔 장바구니가 로그인 상태와 완전히 무관하게 동작해서, 어떤 아이디로
  // 담아둔 뒤 로그아웃해도(심지어 다른 사람이 같은 기기에서 그 다음에 로그인해도)
  // 장바구니 내용이 그대로 남아있었어요. 회원이 아니면애초에 담을 수 없게
  // 화면(카페 상세)에서 막았지만, 그것과 별개로 "로그아웃하면 장바구니를 비운다"도
  // 필요해서 로그인 상태가 false로 바뀔 때마다 장바구니를 초기화해요.
  useEffect(() => {
    if (!isLoggedIn) {
      setItems([]);
      setCafeId(null);
      setCafeName("");
      setPointUsedState(0);
      setCouponId(null);
    }
  }, [isLoggedIn]);

  const addItem = (
    newCafeId: string,
    newCafeName: string,
    item: { id: string; name: string; price: number }
  ) => {
    setItems((prev) => {
      // 장바구니에 다른 매장 상품이 이미 있으면 새 매장 기준으로 새로 시작해요.
      const base = cafeId && cafeId !== newCafeId ? [] : prev;
      const existing = base.find((i) => i.id === item.id);
      if (existing) {
        return base.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...base, { ...item, quantity: 1 }];
    });
    if (cafeId !== newCafeId) {
      setCafeId(newCafeId);
      setCafeName(newCafeName);
      setPointUsedState(0);
      setCouponId(null);
    }
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clear = () => {
    setItems([]);
    setCafeId(null);
    setCafeName("");
    setPointUsedState(0);
    setCouponId(null);
  };

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const setPointUsed = (amount: number) =>
    setPointUsedState(Math.max(0, Math.min(amount, subtotal)));

  const value = useMemo<CartContextValue>(
    () => ({
      cafeId,
      cafeName,
      items,
      totalCount,
      subtotal,
      pointUsed,
      setPointUsed,
      couponId,
      setCouponId,
      addItem,
      updateQuantity,
      removeItem,
      clear,
      lastOrder,
      setLastOrder,
    }),
    [cafeId, cafeName, items, totalCount, subtotal, pointUsed, couponId, lastOrder]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

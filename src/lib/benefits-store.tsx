"use client";

import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiGetMyCoupons, apiGetMyMembership, isApiConfigured } from "@/lib/api";

export type BenefitCoupon = {
  id: string;
  title: string;
  subtitle: string;
  valueLabel: string;
  used: boolean;
};

type BenefitsContextValue = {
  points: number;
  coupons: BenefitCoupon[];
  loading: boolean;
  usePoints: (amount: number) => void;
  useCoupon: (id: string) => void;
};

const BenefitsContext = createContext<BenefitsContextValue | null>(null);

function readNumberField(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

/**
 * 포인트·쿠폰 사용 상태를 화면 간 공유하는 컨텍스트.
 * 혜택 화면에서 포인트를 사용하거나 쿠폰을 쓰면 여기서 반영돼요.
 *
 * 백엔드 연동: 화면이 열릴 때 GET /api/users/me/membership 으로 보유 포인트를,
 * GET /api/users/me/coupons 로 쿠폰 목록을 불러와서 채워요. 서버 연동 전이거나
 * 응답을 못 받아오는 동안에는 가짜 숫자 대신 0/빈 목록으로 시작해요.
 * 응답 필드명이 스펙에 명시돼 있지 않아(Eloquent 리소스 그대로) 흔히 쓰는
 * 필드명 몇 가지를 순서대로 시도해서 매핑해요. 실제 응답을 받아본 뒤
 * 아래 readNumberField / 매핑 부분의 후보 필드명을 백엔드 응답에 맞게 다듬어주세요.
 * 포인트/쿠폰 "사용"은 이 화면 목업에는 대응하는 전용 API가 명세에 없어서
 * (주문 시 point_used로 차감하는 방식으로 보여요) 우선 화면 상태만 갱신해요.
 */
export function BenefitsProvider({ children }: { children: ReactNode }) {
  const [points, setPoints] = useState(0);
  const [coupons, setCoupons] = useState<BenefitCoupon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isApiConfigured()) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      apiGetMyMembership().then((membership) => {
        if (cancelled || !membership) return;
        const p = readNumberField(membership, ["point", "points", "point_balance", "available_point"]);
        if (p !== null) setPoints(p);
      }),
      apiGetMyCoupons().then((rows) => {
        if (cancelled || !rows) return;
        setCoupons(
          rows.map((row, i) => {
            const id = String(row["id"] ?? row["user_coupon_id"] ?? i);
            const title = String(row["title"] ?? row["name"] ?? row["coupon_name"] ?? "쿠폰");
            const subtitle = String(row["description"] ?? row["subtitle"] ?? "");
            const valueLabel = String(row["value_label"] ?? row["discount_label"] ?? "");
            const used = Boolean(row["used_at"] ?? row["is_used"] ?? false);
            return { id, title, subtitle, valueLabel, used };
          })
        );
      }),
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<BenefitsContextValue>(
    () => ({
      points,
      coupons,
      loading,
      usePoints: (amount) =>
        setPoints((prev) => Math.max(0, prev - amount)),
      useCoupon: (id) =>
        setCoupons((prev) =>
          prev.map((c) => (c.id === id ? { ...c, used: true } : c))
        ),
    }),
    [points, coupons, loading]
  );

  return (
    <BenefitsContext.Provider value={value}>
      {children}
    </BenefitsContext.Provider>
  );
}

export function useBenefits() {
  const ctx = useContext(BenefitsContext);
  if (!ctx) throw new Error("useBenefits must be used within BenefitsProvider");
  return ctx;
}

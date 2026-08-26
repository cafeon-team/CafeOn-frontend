"use client";

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiGetMyCoupons, apiGetMyMembership, isApiConfigured } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { useOrders } from "@/lib/orders-store";
import { useReviews } from "@/lib/reviews-store";
import { consumePendingSignupBonus } from "@/lib/benefit-flags";
import Toast from "@/components/Toast";

export type BenefitCouponKind = "signup" | "birthday" | "general";

export type BenefitCoupon = {
  id: string;
  title: string;
  subtitle: string;
  valueLabel: string;
  used: boolean;
  /** 이 쿠폰이 왜 발급됐는지. 화면에서 뱃지로 구분해서 보여줘요.
   * 서버에서 받아온(기존) 쿠폰은 "general"이에요. */
  kind?: BenefitCouponKind;
  issuedAt?: string;
  /** YYYY-MM-DD. 없으면 만료일 표시를 생략해요. */
  expiresAt?: string | null;
};

export type PointLogEntry = {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
};

type BenefitsMeta = {
  /** 신규가입 쿠폰을 이미 받은 계정(이메일) 목록. 같은 기기에서 여러 계정을
   * 오가며 로그인해도 계정별로 한 번만 지급돼요. */
  signupIssuedFor: string[];
  /** 생일 쿠폰을 이미 받은 연도. 계정(이메일)별로 "올해 받았는지"만 기억해요. */
  birthdayIssuedFor: Record<string, string>;
  /** 포인트를 이미 지급한 주문 id 목록(중복 적립 방지). */
  orderPointsAwarded: string[];
  /** 포인트를 이미 지급한 리뷰 id 목록(중복 적립 방지). */
  reviewPointsAwarded: string[];
  /** 이 기능이 이 기기에 처음 켜졌을 때, 그 시점에 이미 있던 "완료" 주문들을
   * 전부 소급 적립하지 않도록 기준선을 한 번만 세워요. */
  ordersBaselineDone: boolean;
  /** 위와 같은 이유로, 이미 작성돼 있던 리뷰들을 소급 적립하지 않기 위한 기준선. */
  reviewsBaselineDone: boolean;
};

type BenefitsState = {
  points: number;
  coupons: BenefitCoupon[];
  pointLogs: PointLogEntry[];
  meta: BenefitsMeta;
};

const STORAGE_KEY = "cafeon_benefits_state_v1";

const EMPTY_STATE: BenefitsState = {
  points: 0,
  coupons: [],
  pointLogs: [],
  meta: {
    signupIssuedFor: [],
    birthdayIssuedFor: {},
    orderPointsAwarded: [],
    reviewPointsAwarded: [],
    ordersBaselineDone: false,
    reviewsBaselineDone: false,
  },
};

function readState(): BenefitsState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...EMPTY_STATE,
      ...parsed,
      meta: { ...EMPTY_STATE.meta, ...(parsed?.meta ?? {}) },
    };
  } catch {
    return null;
  }
}

function writeState(state: BenefitsState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 시크릿 모드 등 localStorage를 못 쓰는 환경이면 조용히 무시해요.
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDaysKey(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

/** 주문 결제 금액의 5%를 포인트로 적립해요(10P 단위로 내림). */
function computeOrderPoints(amount: number): number {
  if (!amount || amount <= 0) return 0;
  return Math.floor((amount * 0.05) / 10) * 10;
}

const REVIEW_BASE_POINT = 300;
const REVIEW_PHOTO_BONUS = 200;
const SIGNUP_COUPON_VALID_DAYS = 30;
const BIRTHDAY_COUPON_VALID_DAYS = 7;

type BenefitsContextValue = {
  points: number;
  coupons: BenefitCoupon[];
  pointLogs: PointLogEntry[];
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
 * 포인트·쿠폰을 화면 간 공유하는 컨텍스트.
 * ------------------------------------------------------------------
 * 실제로 동작하는 4가지 혜택을 이 컨텍스트가 직접 관리해요:
 *  1) 신규가입 쿠폰 — auth-store.signup()이 남겨둔 표시(benefit-flags.ts)를
 *     보고 딱 한 번 발급해요.
 *  2) 생일 쿠폰 — 로그인한 손님의 프로필 생년월일(profile.birth)이 오늘과
 *     월/일이 같으면, 그 해에 한 번만 발급해요.
 *  3) 주문 완료 포인트 적립 — useOrders()의 주문 목록을 지켜보다가 상태가
 *     "완료"로 바뀐 주문마다 결제금액의 5%를 포인트로 적립해요.
 *  4) 리뷰 작성 포인트 적립 — useReviews()의 리뷰 목록을 지켜보다가 새로
 *     작성된 리뷰마다 300P(사진 첨부 시 500P)를 적립해요.
 *
 * 이 네 가지는 백엔드에 전용 지급 API가 없어서(스웨거에 "쿠폰 발급"/"포인트
 * 적립" 엔드포인트가 없어요 — GET으로 조회만 가능), 이 기기(브라우저)에
 * localStorage로 실제 지급 내역을 저장해서 화면이 새로고침돼도 그대로
 * 유지돼요. 백엔드에 전용 API가 추가되면, 아래 4개 useEffect 안의 "지급"
 * 부분만 그 API 호출로 바꾸면 돼요.
 *
 * 서버 연동(NEXT_PUBLIC_API_BASE_URL 설정)이 돼 있으면, 이 기기에 저장된
 * 값이 하나도 없는 "최초 1회"에만 GET /api/users/me/membership,
 * GET /api/users/me/coupons 값으로 시작해요. 그 이후로는 이 네 가지 혜택으로
 * 쌓인 값이 진짜 값이라 계속 로컬 기준으로 이어가요.
 */
export function BenefitsProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, profile } = useAuth();
  const { orders } = useOrders();
  const { reviews } = useReviews();

  const [state, setState] = useState<BenefitsState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const flashToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((cur) => (cur === msg ? null : cur)), 2400);
  };

  const persist = (next: BenefitsState) => {
    writeState(next);
    return next;
  };

  // 최초 1회: 이 기기에 저장된 값이 있으면 그대로 이어서 쓰고, 없으면(이
  // 기기에서 처음 켜진 경우) 서버 값(연동돼 있으면)으로 시작해요.
  useEffect(() => {
    let cancelled = false;
    const local = readState();
    if (local) {
      setState(local);
      setReady(true);
      return;
    }
    if (!isApiConfigured()) {
      setReady(true);
      return;
    }
    setLoading(true);
    Promise.all([apiGetMyMembership(), apiGetMyCoupons()])
      .then(([membership, coupons]) => {
        if (cancelled) return;
        const p = membership
          ? readNumberField(membership, ["point", "points", "point_balance", "available_point"])
          : null;
        const mapped: BenefitCoupon[] = (coupons ?? []).map((row, i) => {
          const id = String(row["id"] ?? row["user_coupon_id"] ?? i);
          const title = String(row["title"] ?? row["name"] ?? row["coupon_name"] ?? "쿠폰");
          const subtitle = String(row["description"] ?? row["subtitle"] ?? "");
          const valueLabel = String(row["value_label"] ?? row["discount_label"] ?? "");
          const used = Boolean(row["used_at"] ?? row["is_used"] ?? false);
          return { id, title, subtitle, valueLabel, used, kind: "general" as const };
        });
        persist({ ...EMPTY_STATE, points: p ?? 0, coupons: mapped });
        setState({ ...EMPTY_STATE, points: p ?? 0, coupons: mapped });
      })
      .finally(() => {
        if (!cancelled) {
          setReady(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 1) 신규가입 쿠폰
  useEffect(() => {
    if (!ready || !isLoggedIn) return;
    if (!consumePendingSignupBonus()) return;
    const emailKey = profile.email || "guest";
    setState((prev) => {
      if (prev.meta.signupIssuedFor.includes(emailKey)) return prev;
      const now = new Date();
      const coupon: BenefitCoupon = {
        id: `signup-${Date.now()}`,
        title: "신규가입 축하 쿠폰",
        subtitle: "첫 주문 시 사용할 수 있어요",
        valueLabel: "3,000원 할인",
        used: false,
        kind: "signup",
        issuedAt: dateKey(now),
        expiresAt: addDaysKey(now, SIGNUP_COUPON_VALID_DAYS),
      };
      return persist({
        ...prev,
        coupons: [coupon, ...prev.coupons],
        meta: { ...prev.meta, signupIssuedFor: [...prev.meta.signupIssuedFor, emailKey] },
      });
    });
    flashToast("🎉 신규가입 축하 쿠폰이 발급됐어요!");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isLoggedIn, profile.email]);

  // 2) 생일 쿠폰 — 오늘이 생일(월-일)이고 올해 아직 못 받았으면 발급해요.
  useEffect(() => {
    if (!ready || !isLoggedIn || !profile.birth) return;
    const match = profile.birth.match(/^\d{4}-(\d{2})-(\d{2})/);
    if (!match) return;
    const [, bm, bd] = match;
    const now = new Date();
    const isBirthdayToday = now.getMonth() + 1 === Number(bm) && now.getDate() === Number(bd);
    if (!isBirthdayToday) return;
    const emailKey = profile.email || "guest";
    const thisYear = String(now.getFullYear());
    let issued = false;
    setState((prev) => {
      if (prev.meta.birthdayIssuedFor[emailKey] === thisYear) return prev;
      issued = true;
      const coupon: BenefitCoupon = {
        id: `birthday-${thisYear}-${Date.now()}`,
        title: "생일 축하 쿠폰",
        subtitle: "생일을 진심으로 축하드려요",
        valueLabel: "5,000원 할인",
        used: false,
        kind: "birthday",
        issuedAt: dateKey(now),
        expiresAt: addDaysKey(now, BIRTHDAY_COUPON_VALID_DAYS),
      };
      return persist({
        ...prev,
        coupons: [coupon, ...prev.coupons],
        meta: {
          ...prev.meta,
          birthdayIssuedFor: { ...prev.meta.birthdayIssuedFor, [emailKey]: thisYear },
        },
      });
    });
    if (issued) flashToast("🎂 생일 축하 쿠폰이 발급됐어요!");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isLoggedIn, profile.birth, profile.email]);

  // 3) 주문 완료 포인트 적립
  useEffect(() => {
    if (!ready || orders.length === 0) return;
    let addedPoints = 0;
    setState((prev) => {
      // 이 기능이 이 기기에 처음 켜졌을 때 이미 "완료"였던 과거 주문까지
      // 전부 소급 적립하지 않도록, 기준선이 없으면 지금 완료 상태인 주문들을
      // "이미 처리됨"으로만 표시하고 지급 없이 넘어가요.
      if (!prev.meta.ordersBaselineDone) {
        const completedIds = orders.filter((o) => o.status === "완료").map((o) => o.id);
        return persist({
          ...prev,
          meta: {
            ...prev.meta,
            ordersBaselineDone: true,
            orderPointsAwarded: Array.from(new Set([...prev.meta.orderPointsAwarded, ...completedIds])),
          },
        });
      }
      const newlyCompleted = orders.filter(
        (o) => o.status === "완료" && !prev.meta.orderPointsAwarded.includes(o.id)
      );
      if (newlyCompleted.length === 0) return prev;
      const logs: PointLogEntry[] = [];
      for (const o of newlyCompleted) {
        const earned = computeOrderPoints(o.amount);
        if (earned > 0) {
          addedPoints += earned;
          logs.push({
            id: `order-${o.id}`,
            amount: earned,
            reason: `${o.cafeName} 주문 완료 적립`,
            createdAt: dateKey(new Date()),
          });
        }
      }
      return persist({
        ...prev,
        points: prev.points + addedPoints,
        pointLogs: [...logs, ...prev.pointLogs].slice(0, 50),
        meta: {
          ...prev.meta,
          orderPointsAwarded: [...prev.meta.orderPointsAwarded, ...newlyCompleted.map((o) => o.id)],
        },
      });
    });
    if (addedPoints > 0) flashToast(`✅ 주문 완료로 ${addedPoints.toLocaleString()}P가 적립됐어요!`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, orders]);

  // 4) 리뷰 작성 포인트 적립
  useEffect(() => {
    if (!ready || reviews.length === 0) return;
    let addedPoints = 0;
    setState((prev) => {
      if (!prev.meta.reviewsBaselineDone) {
        const ids = reviews.map((r) => r.id);
        return persist({
          ...prev,
          meta: {
            ...prev.meta,
            reviewsBaselineDone: true,
            reviewPointsAwarded: Array.from(new Set([...prev.meta.reviewPointsAwarded, ...ids])),
          },
        });
      }
      const newlyWritten = reviews.filter((r) => !prev.meta.reviewPointsAwarded.includes(r.id));
      if (newlyWritten.length === 0) return prev;
      const logs: PointLogEntry[] = [];
      for (const r of newlyWritten) {
        const hasPhoto = Boolean(r.images && r.images.length > 0);
        const earned = REVIEW_BASE_POINT + (hasPhoto ? REVIEW_PHOTO_BONUS : 0);
        addedPoints += earned;
        logs.push({
          id: `review-${r.id}`,
          amount: earned,
          reason: hasPhoto ? `${r.cafeName} 포토리뷰 작성 적립` : `${r.cafeName} 리뷰 작성 적립`,
          createdAt: dateKey(new Date()),
        });
      }
      return persist({
        ...prev,
        points: prev.points + addedPoints,
        pointLogs: [...logs, ...prev.pointLogs].slice(0, 50),
        meta: {
          ...prev.meta,
          reviewPointsAwarded: [...prev.meta.reviewPointsAwarded, ...newlyWritten.map((r) => r.id)],
        },
      });
    });
    if (addedPoints > 0) flashToast(`✅ 리뷰 작성으로 ${addedPoints.toLocaleString()}P가 적립됐어요!`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, reviews]);

  const value = useMemo<BenefitsContextValue>(
    () => ({
      points: state.points,
      coupons: state.coupons,
      pointLogs: state.pointLogs,
      loading,
      usePoints: (amount) =>
        setState((prev) => persist({ ...prev, points: Math.max(0, prev.points - amount) })),
      useCoupon: (id) =>
        setState((prev) =>
          persist({
            ...prev,
            coupons: prev.coupons.map((c) => (c.id === id ? { ...c, used: true } : c)),
          })
        ),
    }),
    [state, loading]
  );

  return (
    <BenefitsContext.Provider value={value}>
      {children}
      <Toast show={Boolean(toastMsg)} message={toastMsg ?? ""} />
    </BenefitsContext.Provider>
  );
}

export function useBenefits() {
  const ctx = useContext(BenefitsContext);
  if (!ctx) throw new Error("useBenefits must be used within BenefitsProvider");
  return ctx;
}

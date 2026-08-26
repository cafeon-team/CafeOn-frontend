"use client";

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  /** 지금까지 "포인트 사용"으로 실제 차감된 총량. points는 항상
   * "적립 내역 합계 - spent"로 계산되는 값이라, 보유 포인트 화면에 보이는
   * 숫자와 적립 내역 목록이 서로 어긋나는 일이 없어요. */
  spent: number;
  coupons: BenefitCoupon[];
  pointLogs: PointLogEntry[];
  meta: BenefitsMeta;
};

/** 예전 버전에서 계정 구분 없이 쓰던 고정 키예요. 지금은 이 키를 "그대로"
 * localStorage에 쓰지 않고, 아래 storageKeyFor()로 계정별 키를 만들어서 써요.
 * (버그였던 옛날 데이터를 한 번만 이어받기 위한 마이그레이션 용도로만 남겨둬요.) */
const STORAGE_KEY_PREFIX = "cafeon_benefits_state_v1";

/**
 * 로그인한 계정을 구분할 값을 만들어요.
 * ------------------------------------------------------------------
 * 예전 버그: 포인트·쿠폰을 저장하는 localStorage 키가
 * "cafeon_benefits_state_v1" 하나로 고정돼 있어서, 같은 브라우저(기기)에서는
 * 로그인한 계정이 무엇이든 같은 저장 칸을 공유했어요. 그래서 김길동 계정과
 * 카페온 계정이 똑같은 포인트·생일 쿠폰을 보게 됐던 거예요.
 *
 * 고친 방법: 이메일(계정을 구분하는 유일한 값)을 저장 키에 포함시켜서,
 * 계정마다 완전히 다른 localStorage 칸을 쓰게 했어요. 로그인 전이거나
 * 이메일을 아직 못 받아온 경우엔 "guest" 칸을 써요(이 칸은 실제 혜택 지급
 * 로직에서는 isLoggedIn 체크 때문에 어차피 쓰이지 않아요).
 */
function normalizeAccountId(email: string | null | undefined): string {
  const trimmed = (email ?? "").trim().toLowerCase();
  return trimmed || "guest";
}

/** 계정 ID로 실제 localStorage 키를 만들어요. 계정마다 완전히 다른 칸이에요. */
function storageKeyFor(accountId: string): string {
  return `${STORAGE_KEY_PREFIX}:${accountId}`;
}

const EMPTY_STATE: BenefitsState = {
  points: 0,
  spent: 0,
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

function readState(key: string): BenefitsState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
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

function writeState(key: string, state: BenefitsState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // 시크릿 모드 등 localStorage를 못 쓰는 환경이면 조용히 무시해요.
  }
}

/** 계정별 키로 나누기 전, 옛날 공용 키에 남아있던 데이터를 지워요. 이 기기에서
 * 맨 처음 켜본 계정이 한 번 이어받고 나면 곧바로 지워서, 다른 계정이 또
 * 그 데이터를 가져가지 못하게 해요. */
function clearLegacyState() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_PREFIX);
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

/** 주문을 완료할 때마다 정액으로 50P를 적립해요(결제 금액과 무관, 리뷰 작성 적립과 동일). */
const ORDER_COMPLETE_POINT = 50;
function computeOrderPoints(amount: number): number {
  if (!amount || amount <= 0) return 0;
  return ORDER_COMPLETE_POINT;
}

const REVIEW_BASE_POINT = 50;
const REVIEW_PHOTO_BONUS = 50;
const SIGNUP_COUPON_VALID_DAYS = 30;
const BIRTHDAY_COUPON_VALID_DAYS = 7;

function sumLogAmounts(logs: PointLogEntry[]): number {
  return logs.reduce((sum, log) => sum + log.amount, 0);
}

/** 보유 포인트는 항상 "적립 내역 합계 - 사용한 포인트"로 다시 계산해요.
 * 이렇게 하면 화면에 보이는 보유 포인트 숫자가 그 아래 적립 내역 목록과
 * 절대 어긋날 수 없어요(예: 목록엔 50P+50P만 있는데 보유 포인트는 660P처럼
 * 나오는 일이 없어져요). */
function derivePoints(state: BenefitsState): number {
  return Math.max(0, sumLogAmounts(state.pointLogs) - state.spent);
}

/**
 * 예전에 저장돼 있던 포인트 적립 내역 중, 지금 적립 규칙
 * (REVIEW_BASE_POINT / REVIEW_PHOTO_BONUS / ORDER_COMPLETE_POINT)과 다른
 * 금액으로 남아있는 게 있으면 지금 규칙에 맞게 바로잡아요. 그 다음 보유
 * 포인트를 적립 내역 합계 기준으로 다시 계산해서, 예전 버전에서 잘못
 * 쌓였거나 남아있던 원인 모를 "숨은 포인트"까지 전부 정리해요.
 * ------------------------------------------------------------------
 * 예를 들어 "커피엔 방앗간 주문 완료 적립" 내역이 지금 규칙(50P)과
 * 다른 금액(예: 280P나 100P)으로 남아있고, 보유 포인트도 적립 내역
 * 목록에는 없는 금액(예: 660P)까지 섞여서 부풀려져 있던 문제를
 * 화면을 켤 때마다 이 함수가 한 번에 바로잡아줘요.
 */
function reconcilePointLogs(state: BenefitsState): BenefitsState {
  const fixedLogs = state.pointLogs.map((log) => {
    let expected: number | null = null;
    if (log.id.startsWith("order-")) {
      expected = ORDER_COMPLETE_POINT;
    } else if (log.id.startsWith("review-")) {
      const hasPhotoBonus = log.reason.includes("포토리뷰");
      expected = hasPhotoBonus ? REVIEW_BASE_POINT + REVIEW_PHOTO_BONUS : REVIEW_BASE_POINT;
    }
    if (expected !== null && log.amount !== expected) {
      return { ...log, amount: expected };
    }
    return log;
  });
  const next = { ...state, pointLogs: fixedLogs };
  return { ...next, points: derivePoints(next) };
}

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
 *     "완료"로 바뀐 주문마다 정액 100P를 적립해요.
 *  4) 리뷰 작성 포인트 적립 — useReviews()의 리뷰 목록을 지켜보다가 새로
 *     작성된 리뷰마다 50P(사진 첨부 시 100P)를 적립해요.
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
 *
 * ⚠️ localStorage 저장 칸은 로그인한 계정(이메일)마다 따로 나눠져 있어요
 * (storageKeyFor 참고). 예전엔 "cafeon_benefits_state_v1"라는 고정된 키
 * 하나만 써서, 같은 기기에서 계정을 바꿔 로그인해도 포인트·쿠폰(생일 쿠폰
 * 포함)이 계속 똑같이 보이는 문제가 있었어요. 지금은 계정이 바뀌면(로그인/
 * 로그아웃/다른 계정으로 로그인) 자동으로 그 계정 전용 칸을 다시 읽어와요.
 */
export function BenefitsProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, authReady, profile } = useAuth();
  const { orders } = useOrders();
  const { reviews } = useReviews();

  const [state, setState] = useState<BenefitsState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 지금 어느 계정 칸에 읽고/쓰고 있는지를 기억해요. 아래 persist()와 다른
  // useEffect들(신규가입/생일/주문/리뷰 적립)이 전부 이 값을 참고해서 저장하기
  // 때문에, 계정이 바뀌면(로그인/로그아웃/다른 계정 로그인) 이 값도 곧바로
  // 따라 바뀌어야 다른 계정의 저장 칸에 잘못 쓰는 일이 없어요.
  const storageKeyRef = useRef<string>(storageKeyFor(normalizeAccountId(null)));

  const flashToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((cur) => (cur === msg ? null : cur)), 2400);
  };

  const persist = (next: BenefitsState) => {
    writeState(storageKeyRef.current, next);
    return next;
  };

  // 계정(이메일)이 바뀔 때마다 다시 실행돼요: 로그인 직후, 로그아웃, 또는
  // 같은 브라우저에서 다른 계정으로 다시 로그인했을 때 전부 포함돼요.
  // ------------------------------------------------------------------
  // 1) 이 계정 전용 저장 칸(cafeon_benefits_state_v1:이메일)에 값이 있으면
  //    그대로 이어서 써요.
  // 2) 없다면, 계정 구분이 없던 예전 버전 때문에 이 기기에 남아있을 수 있는
  //    공용 데이터(cafeon_benefits_state_v1)를 딱 한 번만 이 계정에게
  //    넘겨주고, 다른 계정이 또 가져가지 못하도록 바로 지워요.
  // 3) 그마저도 없으면(이 기기에서 이 계정으로 처음 켠 경우) 서버 값(연동돼
  //    있으면)으로 새로 시작해요.
  //
  // ⚠️ 이 효과는 반드시 authReady가 true가 된 뒤에만 실행해요. authReady가
  // false인 동안의 isLoggedIn은 "실제 로그아웃 상태"가 아니라 "아직 이
  // 기기의 로그인 정보를 확인하기 전"이에요. 예전엔 이 효과가 authReady를
  // 기다리지 않고 곧바로 실행돼서(BenefitsProvider가 AuthGate 바깥,
  // 즉 로그인 여부가 확정되기 "전"에 함께 마운트되는 구조라), 실제로는
  // 로그인돼 있는 계정인데도 이 효과가 "아직 확인 전"인 isLoggedIn=false
  // 값을 "guest"로 오해해서 예전 공용 데이터(생일·가입 쿠폰 등)를 엉뚱하게
  // "guest" 칸으로 옮겨버리고 곧바로 지워버렸어요. 그 직후 authReady 없이도
  // isLoggedIn이 뒤늦게 true로 바뀌면서 이 효과가 다시 실행됐지만, 이미
  // 지워진 뒤라 진짜 계정 쪽에서는 쿠폰이 하나도 없는 것처럼(0장) 보였던
  // 거예요. authReady를 기다리면 이 효과가 "확정된" 로그인 상태로 딱 한 번만
  // 판단하기 때문에 이 사고가 재현되지 않아요.
  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    const accountId = normalizeAccountId(isLoggedIn ? profile.email : null);
    const storageKey = storageKeyFor(accountId);
    storageKeyRef.current = storageKey;

    // 계정이 바뀌는 순간, 방금 전 계정의 포인트·쿠폰이 화면에 잠깐이라도
    // 겹쳐 보이지 않도록 먼저 비워두고 이 계정의 데이터를 다시 불러와요.
    setReady(false);
    setState(EMPTY_STATE);

    const local = readState(storageKey);
    if (local) {
      const fixed = reconcilePointLogs(local);
      writeState(storageKey, fixed);
      setState(fixed);
      setReady(true);
      return;
    }

    // ⚠️ 예전 공용 데이터를 이어받는 건 "확실히 로그인된 계정"일 때만
    // 해요. 로그인하지 않은 상태(guest)에서는 이어받지도, 지우지도
    // 않아요 — 이 상태에서 지워버리면 잠시 후 실제 계정으로 로그인했을
    // 때 이어받을 데이터가 이미 사라진 뒤라 쿠폰이 0장으로 보이게 돼요.
    if (isLoggedIn) {
      const legacy = readState(STORAGE_KEY_PREFIX);
      if (legacy) {
        const fixed = reconcilePointLogs(legacy);
        writeState(storageKey, fixed);
        clearLegacyState();
        setState(fixed);
        setReady(true);
        return;
      }
    }

    if (!isApiConfigured() || !isLoggedIn) {
      // 로그인 전이거나 백엔드 연동 전이면 서버 값을 받아올 수 없으니
      // 빈 상태로 준비만 끝내요. 로그인하면(또는 연동되면) 이 효과가
      // 다시 실행돼서 그때 다시 판단해요.
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
        // 보유 포인트는 적립 내역(리뷰/주문 적립) 합계로만 계산해요. 서버
        // 회원 정보의 point 값은 적립 내역과 짝지을 수 있는 근거가 없어서
        // 보유 포인트에 섞지 않아요(대신 필요하면 그대로 로그로 남겨요).
        if (p) {
          // eslint-disable-next-line no-console
          console.info(`[benefits] 서버 membership.point(${p})는 적립 내역과 무관해 보유 포인트에 반영하지 않았어요.`);
        }
        writeState(storageKey, { ...EMPTY_STATE, coupons: mapped });
        setState({ ...EMPTY_STATE, coupons: mapped });
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
  }, [authReady, isLoggedIn, profile.email]);

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
      const nextLogs = [...logs, ...prev.pointLogs].slice(0, 50);
      const nextState = {
        ...prev,
        pointLogs: nextLogs,
        meta: {
          ...prev.meta,
          orderPointsAwarded: [...prev.meta.orderPointsAwarded, ...newlyCompleted.map((o) => o.id)],
        },
      };
      return persist({ ...nextState, points: derivePoints(nextState) });
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
      const nextLogs = [...logs, ...prev.pointLogs].slice(0, 50);
      const nextState = {
        ...prev,
        pointLogs: nextLogs,
        meta: {
          ...prev.meta,
          reviewPointsAwarded: [...prev.meta.reviewPointsAwarded, ...newlyWritten.map((r) => r.id)],
        },
      };
      return persist({ ...nextState, points: derivePoints(nextState) });
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
        setState((prev) => {
          const nextState = { ...prev, spent: prev.spent + amount };
          return persist({ ...nextState, points: derivePoints(nextState) });
        }),
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

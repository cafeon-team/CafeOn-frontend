"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Review } from "@/lib/data";
import {
  apiCreateReview,
  apiUpdateReview,
  apiDeleteReview,
  isApiConfigured,
} from "@/lib/api";

type ReviewsContextValue = {
  reviews: Review[];
  getReview: (id: string) => Review | undefined;
  addReview: (input: {
    cafeId: string;
    cafeName: string;
    rating: number;
    content: string;
    /** 리뷰 작성 화면에서 이미 POST /api/uploads/images로 업로드해 받은 실제
     * 이미지 URL들. (서버의 리뷰 생성 API는 이미지 필드를 문서화하고 있지 않아서,
     * 카페 상세 "사진" 탭에서 쓸 수 있도록 이 기기에 함께 저장해둬요.) */
    images?: string[];
  }) => void;
  updateReview: (
    id: string,
    patch: { rating: number; content: string; images?: string[] }
  ) => void;
  removeReview: (id: string) => void;
};

const ReviewsContext = createContext<ReviewsContextValue | null>(null);

const REVIEWS_STORAGE_KEY = "cafeon_my_reviews";

function readReviewsStorage(): Review[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Review[]) : [];
  } catch {
    return [];
  }
}

function writeReviewsStorage(reviews: Review[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    // 시크릿 모드 등 localStorage를 못 쓰는 환경이면 조용히 무시해요.
  }
}

/** 서버가 실제로 만들어준 리뷰 id인지(=숫자) 판별해요. 서버 id가 있어야
 * PUT/DELETE /api/reviews/{review}로 수정·삭제가 가능해요. 이 앱에서 직접
 * 등록한 게 아닌 리뷰(로컬 임시 id, 예: "r-1734...")는 화면에만 있는 상태예요. */
function isServerReviewId(id: string): boolean {
  return /^\d+$/.test(id);
}

/**
 * 손님이 작성한 리뷰 목록을 관리하는 컨텍스트.
 * 리뷰 관리 목록(/my/reviews)과 작성/수정 화면(/my/reviews/write)이
 * 같은 데이터를 공유해서, 실제로 "수정"이 반영되도록 해요.
 *
 * ⚠️ api-docs.json 스웨거에는 "내가 쓴 리뷰 목록 전체 조회" API가 없어요
 * (GET /api/stores/{store}/reviews처럼 매장 단위 조회만 있어요). 그래서 이 목록은
 * 서버의 진짜 목록이 아니라, 이 기기에서 이 앱으로 작성/조회한 리뷰를 모아두는
 * 로컬 캐시예요. 새로 작성하면 즉시 화면에 반영하고, 뒤에서
 * POST /api/stores/{store}/reviews로 서버 등록도 시도해요(성공하면 서버가 준 진짜
 * id로 교체돼서 이후 수정·삭제도 서버에 반영돼요). 백엔드에 "내 리뷰 목록" API가
 * 추가되면, 아래 초기값을 그 API 응답으로 채우도록 바꾸면 돼요.
 */
export function ReviewsProvider({ children }: { children: ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>(() => readReviewsStorage());

  const persist = (next: Review[]) => {
    writeReviewsStorage(next);
    return next;
  };

  const value = useMemo<ReviewsContextValue>(
    () => ({
      reviews,
      getReview: (id) => reviews.find((r) => r.id === id),
      addReview: ({ cafeId, cafeName, rating, content, images }) => {
        const now = new Date();
        const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(
          now.getDate()
        ).padStart(2, "0")}`;
        const localId = `r-${Date.now()}`;
        setReviews((prev) =>
          persist([{ id: localId, cafeId, cafeName, rating, content, date, images }, ...prev])
        );

        if (!isApiConfigured()) return;
        void apiCreateReview(cafeId, { rating, content }).then((created) => {
          if (!created) return;
          // 서버가 실제로 발급해준 id로 바꿔서, 이후 수정·삭제가 서버에도 반영되게 해요.
          setReviews((prev) =>
            persist(prev.map((r) => (r.id === localId ? { ...r, id: String(created.id) } : r)))
          );
        });
      },
      updateReview: (id, patch) => {
        setReviews((prev) => persist(prev.map((r) => (r.id === id ? { ...r, ...patch } : r))));
        if (isApiConfigured() && isServerReviewId(id)) {
          // 서버 API는 rating/content만 문서화돼 있어서, images는 이 기기에만
          // 저장하고 서버로는 rating/content만 보내요.
          void apiUpdateReview(id, { rating: patch.rating, content: patch.content });
        }
      },
      removeReview: (id) => {
        setReviews((prev) => persist(prev.filter((r) => r.id !== id)));
        if (isApiConfigured() && isServerReviewId(id)) {
          void apiDeleteReview(id);
        }
      },
    }),
    [reviews]
  );

  return (
    <ReviewsContext.Provider value={value}>
      {children}
    </ReviewsContext.Provider>
  );
}

export function useReviews() {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error("useReviews must be used within ReviewsProvider");
  return ctx;
}

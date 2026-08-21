"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Heart, Navigation, Star } from "lucide-react";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import StatusBadge from "@/components/StatusBadge";
import AmenityIcon from "@/components/AmenityIcon";
import StarRating from "@/components/StarRating";
import { useReviews } from "@/lib/reviews-store";
import { useWishlist } from "@/lib/wishlist-store";
import { useStores } from "@/lib/stores-store";
import { useAuth } from "@/lib/auth-store";
import { apiGetStoreMenus, isApiConfigured, resolveImageUrl, type ApiMenu } from "@/lib/api";
import { useCart } from "@/lib/cart-store";

export default function CafeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const cart = useCart();
  // 이 화면(/cafe/[id])은 비로그인 상태로도 볼 수 있어요(auth-store.ts의
  // isPublicPath 참고). 하지만 찜하기/장바구니 담기는 회원만 가능한 행동이라,
  // 비로그인 상태에서 눌렀을 땐 로그인 화면으로 안내해요.
  const { isLoggedIn } = useAuth();
  // ⚠️ 예전엔 @/lib/data의 하드코딩된 mock 카페(getCafe)만 참조해서, 지도/검색에서
  // 실제 서버 매장(id가 mock 목록에 없는 숫자 id)을 눌러 들어오면 화면이 늘 같은
  // mock 카페("온기 로스터스")로 대체돼서 보였어요. 이제 useStores()(실제
  // GET /api/stores 결과)에서 실제 매장을 찾아요.
  const { getCafe, refreshCafe } = useStores();
  const cafe = getCafe(params.id);

  useEffect(() => {
    refreshCafe(params.id);
    // 이 화면을 보고 있는 동안엔(=사장님이 지금 좌석을 바꾸고 있을 수도 있는
    // 시점) stores-store의 전역 폴링(15초)보다 조금 더 자주 이 매장만 다시
    // 불러와서, 잔여 좌석 수가 화면에 뜬 채로 최대한 빨리 갱신되게 해요.
    const interval = setInterval(() => refreshCafe(params.id), 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const [menu, setMenu] = useState<ApiMenu[] | null>(null);
  useEffect(() => {
    if (!isApiConfigured()) return;
    let cancelled = false;
    apiGetStoreMenus(params.id).then((rows) => {
      if (!cancelled) setMenu(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const [tab, setTab] = useState<"메뉴" | "리뷰" | "사진">("메뉴");
  const { isLiked, toggleLike } = useWishlist();
  const cafeId = cafe?.id ?? params.id;
  const liked = isLiked(cafeId);
  const { reviews } = useReviews();
  const cafeReviews = reviews.filter((r) => r.cafeId === cafeId);
  const cafePhotos = cafeReviews.flatMap((r) => r.images ?? []);

  // 서버에서 아직 목록을 못 받아왔거나(로딩 중) 존재하지 않는 id면 안내만 보여줘요.
  // (예전처럼 엉뚱한 mock 카페로 조용히 대체하지 않아요.)
  if (!cafe) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[15px] text-ink-secondary">
          카페 정보를 불러오는 중이거나, 존재하지 않는 카페예요.
        </p>
        <button
          onClick={() => router.back()}
          className="text-[14px] font-bold text-brand"
        >
          뒤로가기
        </button>
      </div>
    );
  }

  // ⚠️ 예전엔 서버 메뉴가 비어있으면 data.ts의 가짜(mock) 메뉴(아메리카노/카페라떼 등)로
  // 화면을 채웠어요. 그래서 사장님이 실제로 메뉴를 하나도 등록하지 않았거나, 서버
  // 저장이 실패한 매장도 마치 메뉴가 있는 것처럼 손님에게 보여서 혼란을 줬어요.
  // 이제 서버가 준 실제 메뉴만 쓰고, 없으면 빈/로딩 상태를 그대로 보여줘요.
  const menuLoading = isApiConfigured() && menu === null;
  const menuItems = (menu ?? []).map((m) => ({
    id: String(m.id),
    name: m.name,
    price: Math.round(Number(m.price)),
    // 사장님이 메뉴 등록 시 올린 사진(image_url)을 그대로 써요. 상대경로면
    // resolveImageUrl이 API 서버 절대주소로 바꿔줘요(없으면 회색 플레이스홀더로
    // 자동 폴백).
    imageUrl: resolveImageUrl(m.image_url),
  }));

  const handleAddToCart = (m: { id: string; name: string; price: number }) => {
    // ⚠️ 예전엔 비로그인 상태로 "담기"를 누르면 곧장 /login(로그인 입력 폼)으로
    // 보냈는데, "예약하기"를 누를 때는 다른 화면이 떠요 — /reserve/new는
    // isPublicPath에 없어서 AuthGate가 가로채 "로그인이 필요해요" 안내 화면을
    // 보여줘요(로그인/회원가입 버튼 + 나중에 할게요). 두 버튼의 비로그인 경험이
    // 서로 달라서 어색했어요. 장바구니(/order/cart)도 이미 isPublicPath에
    // 없으므로, 여기로 보내면 AuthGate가 예약하기와 똑같은 "로그인이 필요해요"
    // 화면을 띄워줘요 — 굳이 로그인 폼으로 직행시키지 않아도 돼요.
    if (!isLoggedIn) {
      router.push("/order/cart");
      return;
    }
    cart.addItem(cafe.id, cafe.name, m);
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="relative">
        <ImagePlaceholder
          rounded="rounded-none"
          className="h-64 w-full"
          iconSize={30}
          src={cafe.imageUrl}
          alt={cafe.name}
        />
        <button
          aria-label="뒤로가기"
          onClick={() => router.back()}
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink"
        >
          <ChevronLeft size={22} />
        </button>
      </div>

      <div className="px-6 pt-5">
        <div className="flex items-start justify-between">
          <h1 className="text-[22px] font-bold text-ink">{cafe.name}</h1>
          <div className="flex items-center gap-3">
            <p className="flex items-center gap-1 text-[13.5px] text-ink-secondary">
              <Star size={14} className="fill-amber text-amber" />
              {cafe.rating} ({cafe.reviewCount})
            </p>
            {/* 하단의 큰 "길찾기/메뉴 보고 주문하기" 버튼 두 개를 없애면서, 길찾기는
                여기 별점/찜 옆에 작은 버튼으로 옮겨왔어요. */}
            <Link
              href={`/cafe/${cafe.id}/route`}
              aria-label="길찾기"
              className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[12.5px] font-bold text-ink-secondary"
            >
              <Navigation size={12} />
              길찾기
            </Link>
            <button aria-label="찜하기" onClick={() => toggleLike(cafe.id)}>
              <Heart
                size={22}
                className={liked ? "fill-brand text-brand" : "text-ink"}
                strokeWidth={1.8}
              />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <StatusBadge status={cafe.status} filled={cafe.seatsFilled} total={cafe.seatsTotal} />
          <span className="text-[12.5px] text-ink-muted">{cafe.updatedAgo}</span>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2.5">
          {cafe.amenities.map((a) => (
            <AmenityIcon key={a} type={a} />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2 text-[14px] text-ink-secondary">
          <p>📍 {cafe.address}</p>
          <p>🕐 평일 {cafe.hours}</p>
        </div>

        {/* 사장님이 매장 프로필에서 지정한 태그. amenities 아이콘과 달리 커스텀
            태그까지 이름 그대로 보여줘요(없으면 아예 표시 안 함). */}
        {cafe.tags && cafe.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {cafe.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-cream px-3 py-1 text-[12.5px] font-medium text-ink-secondary"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex border-b border-border px-6">
        {(["메뉴", "리뷰", "사진"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "flex-1 border-b-2 py-3 text-[15px] font-bold " +
              (tab === t ? "border-brand text-brand" : "border-transparent text-ink-muted")
            }
          >
            {t === "리뷰" ? `리뷰 ${cafe.reviewCount}` : t}
          </button>
        ))}
      </div>

      {tab === "메뉴" && (
        <div className="px-6 pb-6 pt-4">
          {menuLoading ? (
            <p className="mt-8 text-center text-[14px] text-ink-muted">메뉴를 불러오는 중이에요...</p>
          ) : menuItems.length === 0 ? (
            <p className="mt-8 text-center text-[14px] text-ink-muted">
              아직 등록된 메뉴가 없어요.
            </p>
          ) : (
          <div className="flex flex-col gap-4">
            {menuItems.map((m) => (
              <div key={m.id} className="flex items-center gap-4">
                <ImagePlaceholder
                  className="h-14 w-14 shrink-0"
                  rounded="rounded-full"
                  iconSize={16}
                  src={m.imageUrl}
                  alt={m.name}
                />
                <div className="flex-1">
                  <p className="text-[15px] text-ink">{m.name}</p>
                  <p className="mt-0.5 text-[14px] font-bold text-ink">
                    {m.price.toLocaleString()}원
                  </p>
                </div>
                <button
                  onClick={() => handleAddToCart(m)}
                  className="flex h-9 items-center rounded-full border border-brand px-4 text-[13px] font-bold text-brand"
                >
                  담기
                </button>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {tab === "리뷰" && (
        <div className="flex flex-col gap-4 px-6 py-6">
          <Link
            href={`/my/reviews/write?cafeId=${cafe.id}`}
            className="flex h-12 items-center justify-center rounded-2xl border border-brand text-[14px] font-bold text-brand"
          >
            리뷰 작성하기
          </Link>

          {cafeReviews.length === 0 ? (
            <p className="mt-8 text-center text-[14px] text-ink-muted">
              아직 작성된 리뷰가 없어요. 첫 리뷰를 남겨보세요!
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {cafeReviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-white p-5">
                  <div className="flex items-center gap-2">
                    <StarRating rating={r.rating} />
                    <span className="text-[12.5px] text-ink-muted">{r.date}</span>
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
                    {r.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "사진" && (
        // ⚠️ 예전엔 여기가 항상 회색 아이콘 6칸짜리 가짜 그리드였어요(리뷰 사진과
        // 전혀 연결이 안 돼 있었어요). 이제 이 카페에 달린 리뷰들에서 실제로 첨부된
        // 사진(review.images, 서버에 업로드된 실제 URL)만 모아서 보여줘요.
        cafePhotos.length === 0 ? (
          <p className="mt-8 text-center text-[14px] text-ink-muted">
            아직 등록된 사진이 없어요. 리뷰에 사진을 첨부해보세요!
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 px-6 py-6">
            {cafePhotos.map((src, i) => (
              <ImagePlaceholder
                key={`${src}-${i}`}
                className="aspect-square"
                iconSize={16}
                src={src}
                alt={`${cafe.name} 리뷰 사진 ${i + 1}`}
              />
            ))}
          </div>
        )
      )}
      {cart.cafeId === cafe.id && cart.totalCount > 0 && (
        <div className="sticky bottom-0 z-20 px-6 pb-6 pt-3">
          <Link
            href="/order/cart"
            className="flex h-14 w-full items-center justify-between rounded-2xl bg-brand px-5 text-[15px] font-bold text-white shadow-sheet"
          >
            <span>장바구니 {cart.totalCount}개</span>
            <span>{cart.subtotal.toLocaleString()}원 · 주문하기 ›</span>
          </Link>
        </div>
      )}

      <div className="pb-4" />
    </div>
  );
}

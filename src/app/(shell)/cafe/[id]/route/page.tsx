"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Navigation, Locate } from "lucide-react";
import MapPlaceholder from "@/components/MapPlaceholder";
import { useStores } from "@/lib/stores-store";

// 두 좌표 사이의 실제 직선 거리(m). map/page.tsx의 "거리순" 정렬과 동일한 공식이에요
// (Haversine). 예전엔 이 화면이 cafe.distance("-" 문자열, 실서버 데이터엔 애초에 값이
// 없어요)에서 숫자만 뽑아 쓰려고 해서 항상 NaN → "도보 1분"으로 고정 표시됐어요.
// 실제 내 위치와 카페 좌표로 직접 계산해야 맞는 거리/시간이 나와요.
function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

// 성인 평균 도보 속도 기준 약 75m/분.
function estimateWalkMinutes(meters: number): number {
  if (!Number.isFinite(meters) || meters <= 0) return 1;
  return Math.max(1, Math.round(meters / 75));
}

export default function CafeRoutePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  // ⚠️ 예전엔 @/lib/data의 mock cafes/getCafe를 그대로 썼어요. 이제 실제 서버
  // 매장 목록(useStores)에서 찾아요.
  const { cafes, getCafe } = useStores();
  const cafe = getCafe(params.id);
  const pins = cafes.map((c) => ({ id: c.id, status: c.status, lat: c.lat, lng: c.lng }));
  const destPin = pins.find((p) => p.id === cafe?.id) ?? pins[0];
  const [guiding, setGuiding] = useState(false);

  // 내 실제 위치(위경도). MapPlaceholder가 geolocation을 성공적으로 가져오면
  // 알려줘요(map/page.tsx와 동일한 방식). 이 값이 오기 전까지는 경로선을 그리지
  // 않아요.
  // ⚠️ 예전엔 내 위치를 몰라도 MapPlaceholder 내부에서 곧바로 "기본 좌표(강남역
  // 인근)"를 출발점 삼아 목적지까지 직선을 그렸어요. 카페가 대구 등 강남과 먼
  // 지역이면 두 지점을 모두 담으려고 지도가 남한 전체가 보일 정도로 축소돼서,
  // "화면 위쪽엔 작은 지도, 아래쪽엔 한반도 전체" 처럼 보이는 원인이었어요.
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  // 6초가 지나도 위치를 못 받아오면(권한 거부/GPS 실패) "확인하는 중이에요"
  // 문구가 영원히 떠 있지 않도록 안내 문구+재시도 버튼으로 전환해요.
  useEffect(() => {
    if (myLocation) return;
    const timer = window.setTimeout(() => setLocationDenied(true), 6000);
    return () => window.clearTimeout(timer);
  }, [myLocation]);

  const distanceM = useMemo(
    () => (myLocation && destPin ? distanceMeters(myLocation, destPin) : null),
    [myLocation, destPin]
  );
  const walkMinutes = distanceM !== null ? estimateWalkMinutes(distanceM) : null;
  const distanceLabel = distanceM !== null ? formatDistance(distanceM) : null;

  if (!cafe) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[15px] text-ink-secondary">
          카페 정보를 불러오는 중이거나, 존재하지 않는 카페예요.
        </p>
        <button onClick={() => router.back()} className="text-[14px] font-bold text-brand">
          뒤로가기
        </button>
      </div>
    );
  }

  return (
    // ⚠️ min-h-0이 없으면 이 화면이 부모(overflow-y-auto인 셸 레이아웃)보다
    // 커질 수 있어서 페이지 자체가 스크롤되고, 지도가 상단바 높이만큼만 보이다가
    // 아래로 스크롤해야 나머지가 보이는 상태가 돼요(전달주신 스크린샷의 증상과
    // 동일해요). map/page.tsx에 적용한 것과 같은 방식으로 고정해요 — 이제 이
    // 화면도 지도 홈 화면처럼 화면 전체(inset-0)를 지도가 꽉 채워요.
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="absolute inset-0">
        <MapPlaceholder
          pins={pins}
          activePinId={cafe.id}
          // 내 위치를 아직 모르면 경로선을 아예 그리지 않아요(잘못된 기본 좌표
          // 기준으로 전국을 가로지르는 직선이 그려지는 걸 막기 위함).
          routeTo={myLocation ? destPin : undefined}
          onMyLocation={setMyLocation}
          showZoomControls
        />
      </div>

      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-4 pt-5">
        <button
          aria-label="뒤로가기"
          onClick={() => router.back()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-card"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex h-11 flex-1 items-center rounded-full border-2 border-sage bg-sage-tint px-5 text-[14px] font-bold text-sage-dark shadow-card">
          {distanceLabel && walkMinutes !== null
            ? `${distanceLabel} · 도보 ${walkMinutes}분`
            : "내 위치를 확인하는 중이에요..."}
        </div>
      </div>

      {/* ⚠️ 이 카드가 스크롤할 때만 잠깐 보였다 사라지던 문제도 지도 화면과
          동일한 원인이었어요(z-index 없는 형제 요소가 카카오맵 내부 레이어
          아래로 깔림). z-10을 명시해서 항상 지도 위에 뜨게 해요. */}
      <div className="absolute inset-x-4 bottom-6 z-10 rounded-2xl bg-white p-5 shadow-sheet">
        {distanceLabel && walkMinutes !== null ? (
          <>
            <p className="text-[18px] font-bold text-ink">도보 {distanceLabel}</p>
            <p className="mt-1 text-[13px] text-ink-secondary">
              약 {walkMinutes}분 소요 · 직선 거리 기준
            </p>
          </>
        ) : locationDenied ? (
          <>
            <p className="text-[18px] font-bold text-ink">내 위치를 확인할 수 없어요</p>
            <p className="mt-1 text-[13px] text-ink-secondary">
              위치 권한을 허용하면 카페까지 거리/시간을 계산해드려요
            </p>
          </>
        ) : (
          <p className="text-[15px] font-bold text-ink">내 위치를 확인하는 중이에요...</p>
        )}
        <p className="mt-1 text-[13px] text-ink-secondary">
          현재 위치 → {cafe.name}
        </p>
        <button
          onClick={() => setGuiding((v) => !v)}
          disabled={!myLocation}
          className={
            "mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold transition-colors disabled:opacity-50 " +
            (guiding
              ? "bg-sage-tint text-sage-dark"
              : "bg-brand text-white")
          }
        >
          <Navigation size={17} className={guiding ? "animate-pulse" : ""} />
          {guiding ? "경로 안내 중" : "경로 안내 시작"}
        </button>
        {guiding && (
          <p className="mt-2 text-center text-[12.5px] text-sage-dark">
            현재 위치를 기준으로 실시간 안내하고 있어요
          </p>
        )}
        {!myLocation && !locationDenied && (
          <button
            onClick={() => {
              navigator.geolocation?.getCurrentPosition(
                (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => setLocationDenied(true),
                { enableHighAccuracy: true, timeout: 5000 }
              );
            }}
            className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-border text-[13px] font-bold text-ink-secondary"
          >
            <Locate size={14} />
            위치 다시 확인하기
          </button>
        )}
      </div>
    </div>
  );
}

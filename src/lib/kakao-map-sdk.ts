/**
 * 카카오맵 SDK를 앱 전체에서 한 번만 로드하기 위한 공용 모듈.
 *
 * ⚠️ 예전엔 MapPlaceholder.tsx가 자체적으로 <script>를 삽입했는데, 그 스크립트
 * URL에 `&libraries=services`가 빠져 있었어요. `services` 라이브러리가 없으면
 * kakao.maps.services.Geocoder(주소 → 위경도 변환)를 쓸 수 없어서, 매장 주소를
 * 저장해도 좌표를 구할 방법이 아예 없었어요. 이제 지도 표시와 지오코딩이 항상
 * 같은 SDK 인스턴스(services 라이브러리 포함)를 공유하도록 한 곳으로 모았어요.
 */

declare global {
  interface Window {
    kakao: any;
  }
}

let kakaoLoadPromise: Promise<void> | null = null;

export function loadKakaoMapSdk(appKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.kakao?.maps?.services) return Promise.resolve();
  if (kakaoLoadPromise) return kakaoLoadPromise;

  kakaoLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("kakao-map-sdk");
    if (existing) {
      existing.addEventListener("load", () => window.kakao.maps.load(() => resolve()));
      return;
    }

    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve());
    script.onerror = () => reject(new Error("카카오맵 SDK 로드 실패"));
    document.head.appendChild(script);
  });

  return kakaoLoadPromise;
}

/**
 * 주소 문자열을 위도/경도로 변환해요(카카오 Geocoder). 매장 프로필 화면에서
 * 사장님이 주소를 저장할 때 이 함수로 좌표를 구해서 함께 서버에 보내요 —
 * 그래야 지도에 실제 핀이 찍혀요(좌표가 없으면 서버 latitude/longitude가
 * null로 남고, 프론트는 그걸 (0,0)으로 다뤄서 지도가 걸러버려요).
 *
 * 도로명/지번 주소 둘 다 시도하고, 상세 주소(detailAddress)가 있으면 함께
 * 붙여서 더 정확한 결과를 먼저 시도해요. 실패하면 null을 돌려줘요(호출한
 * 쪽에서 좌표 없이 나머지 필드만 저장하도록 처리해요).
 */
export async function geocodeAddress(
  address: string,
  appKey: string
): Promise<{ lat: number; lng: number } | null> {
  if (!address.trim() || !appKey) return null;

  try {
    await loadKakaoMapSdk(appKey);
  } catch {
    return null;
  }

  const { kakao } = window;
  if (!kakao?.maps?.services) return null;

  return new Promise((resolve) => {
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(address, (result: any[], status: string) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        resolve({ lat: Number(result[0].y), lng: Number(result[0].x) });
      } else {
        resolve(null);
      }
    });
  });
}

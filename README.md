# CafeOn — 손님용 앱 (Next.js App Router + Tailwind)

카페온(CafeOn) 팀 프로젝트의 손님용 모바일 화면을 Next.js(App Router) + Tailwind CSS로 퍼블리싱한 코드입니다.
기획한 목업 이미지(이미지.zip)와 `기본_색상가이드.html`의 컬러 토큰을 기준으로 제작했습니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속 → 데스크탑에서도 모바일 비율(max-w-app, 28rem)로 중앙 정렬되어 보입니다.

## 화면 목록

| 경로 | 화면 |
|---|---|
| `/` | 스플래시 |
| `/start` | 계정 선택 (손님/사장님) |
| `/login`, `/signup` | 손님 로그인 / 회원가입 |
| `/map` | 지도 (홈, 하단 탭) |
| `/search` | 카페 검색 |
| `/cafe/[id]` | 카페 상세 (메뉴/리뷰/사진 탭) |
| `/cafe/[id]/route` | 길찾기 · 경로 안내 |
| `/reserve` | 예약 (예약하기/예약내역 탭, 하단 탭) |
| `/reserve/new?cafeId=` | 예약 신청 폼 |
| `/reserve/login` | 예약 시 로그인 유도 화면 |
| `/wishlist` | 찜한 카페 (하단 탭) |
| `/benefits` | 혜택 · 포인트 · 쿠폰 (하단 탭) |
| `/my` | MY (하단 탭) |
| `/my/profile` | 프로필 관리 |
| `/my/reviews` | 리뷰 관리 |
| `/my/reviews/write?cafeId=` | 리뷰 작성 |
| `/my/settings` | 설정 |
| `/my/support` | 고객센터 |

## 구조

```
src/
  app/                 App Router 페이지
    (shell)/           하단 탭바가 붙는 화면 그룹 (지도/찜/예약/혜택/MY 및 하위 화면)
  components/          재사용 컴포넌트 (BottomNav, Header, CafeListCard, MapPlaceholder 등)
  lib/data.ts          목업 데이터 (카페, 메뉴, 리뷰, 예약, 쿠폰)
```

## 에셋 처리

- 실제 이미지 파일이 없어 사진이 들어가는 모든 자리는 비율에 맞는 회색 박스(`ImagePlaceholder` 컴포넌트)로 처리했습니다.
- 지도 영역은 추후 카카오맵/구글맵 SDK 연동을 염두에 두고 스키매틱 도로 격자 + 상태별 색상 핀으로 임시 표현했습니다(`MapPlaceholder`).
- 아이콘은 전부 `lucide-react`를 사용했습니다.

## 디자인 토큰 (기본_색상가이드.html 기준)

`tailwind.config.js`에 등록되어 있습니다.

- brand `#D85A30` / brand-dark `#993C1D` / brand-tint `#FAECE7`
- cream(배경) `#F5F1E8`
- trust(사장님 전용) `#185FA5`
- sage(여유/포인트) `#639922`
- amber(주의) `#BA7517`
- danger(오류 전용) `#A32D2D`
- ink `#2C2C2A` / ink-secondary `#5F5E5A` / ink-muted `#888780`
- border `#E3DECE`

> 참고: 색상가이드 v2 업데이트에 따라 좌석 "혼잡" 상태는 danger(레드)가 아닌 brand-dark를 사용했습니다.

## 백엔드 연동 현황 (`CafeOn Backend API v2.0.0` 기준)

`.env.local`의 `NEXT_PUBLIC_API_BASE_URL`을 채우면 아래 기능들이 실제 서버와
통신해요. 값이 비어있으면 지금까지처럼 mock 데이터로 동작해서 화면 확인에는
문제가 없어요. 연동 로직은 전부 `src/lib/api.ts` + 각 `*-store.tsx`에 있어요.

- **로그인/회원가입/로그아웃** (손님 `/api/auth/login`, `/api/auth/signup`,
  사장님 `/api/auth/login`, `/api/auth/owner/signup`) — Sanctum 토큰을
  브라우저에 저장하고, 이후 요청에 `Authorization: Bearer` 헤더로 실어요.
- **찜(favorite)**, **리뷰 작성**, **예약 신청**, **예약 취소**, **쿠폰/포인트 조회**
  (`/api/stores/{store}/favorite`, `/api/stores/{store}/reviews`,
  `/api/stores/{store}/reservations`, `/api/users/me/*`)
- **사장님 대시보드**: 오늘 매출 카드/그래프, 메뉴 CRUD, 예약 수락/거절,
  리뷰 답글, 좌석 상태 변경 (`/api/owner/**`, `/api/reservations/{id}/status`)

### ⚠️ 알아야 할 제약 (다음 작업으로 이어가면 좋아요)

이 화면들의 카페 목록(`src/lib/data.ts`의 `cafes`)은 아직 실제 API가 아니라
프론트에 있는 목업 데이터예요. 그래서 카페 id가 `"onki-roasters"`같은 문자열이고,
백엔드가 기대하는 숫자 매장 id와 달라요. 찜/리뷰/예약 등 "쓰기" 요청은 이미
전부 연결해뒀지만, 실제 서버에 정확히 반영되려면 **카페 목록 자체를
`GET /api/stores`(지도/검색), `GET /api/stores/{store}`(상세)로 교체**해서
진짜 숫자 id가 화면에 흐르도록 해주는 작업이 이어져야 해요. 그 전까지는
요청이 조용히 실패하고(404 등) 화면은 기존처럼 로컬 상태로만 동작해요
(에러로 화면이 깨지지 않도록 설계했어요).

같은 이유로 사장님 좌석/메뉴도, 서버에서 새로 만든 항목은 서버가 준 진짜 id로
교체되지만 처음 seed된 mock 항목들은 실제 서버의 좌석/메뉴와 매칭되지 않아요.

## 다음 단계

사장님(오너) 화면은 이어서 별도로 작업합니다.

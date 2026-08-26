"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  apiCustomerLogin,
  apiSignup,
  apiLogout,
  apiSocialExchange,
  apiGetMe,
  apiUpdateMe,
  apiUploadImage,
  ApiError,
  isApiConfigured,
  setCustomerToken,
  getCustomerToken,
  type ApiUser,
} from "@/lib/api";
import { markPendingSignupBonus } from "@/lib/benefit-flags";

type AuthResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      /** 429(요청 과다) 실패일 때만 채워져요 — "몇 초 후 다시 시도할 수
       * 있는지"예요. 로그인 화면이 버튼을 잠깐 비활성화하고 카운트다운을
       * 보여줄 때 써요. */
      retryAfterSeconds?: number;
    };

/** 화면에 표시/수정하는 손님 프로필. 이메일은 회원가입 때 받은 값을 그대로 쓰고,
 * 이름/전화번호/프로필사진/생년월일은 회원가입 후 프로필 관리 화면에서 직접 입력해 저장해요.
 * 생년월일(birth)은 2026-08-19 백엔드 변경사항 문서로 PUT /api/users/me의 birth_date
 * 필드가 확정돼서, 이제 서버에도 함께 저장되고 로그인/GET /api/users/me 응답에서
 * 그대로 다시 불러와요(형식은 YYYY-MM-DD, 미래 날짜는 서버에서 422로 거절돼요). */
export type CustomerProfile = {
  name: string;
  email: string;
  phone: string | null;
  birth: string | null;
  profileImageUrl: string | null;
};

const EMPTY_PROFILE: CustomerProfile = {
  name: "",
  email: "",
  phone: null,
  birth: null,
  profileImageUrl: null,
};

const PROFILE_STORAGE_KEY = "cafeon_profile";

function readProfileStorage(): CustomerProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...EMPTY_PROFILE, ...parsed };
  } catch {
    return null;
  }
}

function writeProfileStorage(profile: CustomerProfile | null) {
  if (typeof window === "undefined") return;
  try {
    if (profile === null) window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    else window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // 시크릿 모드 등 localStorage를 못 쓰는 환경이면 조용히 무시해요.
  }
}

/** 화면 입력(예: "1995.05.20", "1995/05/20")을 서버가 요구하는 YYYY-MM-DD 형식으로
 * 바꿔줘요. 이미 하이픈 형식이거나 형식을 알아볼 수 없으면 원래 값을 그대로 둬서
 * 서버가 검증 메시지를 내려주도록 해요. */
function normalizeBirthDate(input: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (!match) return trimmed;
  const [, y, m, d] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function fromApiUser(apiUser: ApiUser, fallback: CustomerProfile): CustomerProfile {
  return {
    name: apiUser.name ?? fallback.name,
    email: apiUser.email ?? fallback.email,
    // "??"는 서버가 일부러 null(예: 프로필 사진을 지우고 저장)을 돌려줘도 무시하고
    // 이전 값으로 되돌려버려서, 사진을 지우고 저장해도 화면엔 예전 사진이 계속
    // 남아있는 버그가 있었어요. 필드가 응답에 아예 없을 때(undefined)만 이전 값을
    // 쓰고, 서버가 명시적으로 null을 준 경우엔 그대로(지워진 상태로) 반영해요.
    phone: apiUser.phone !== undefined ? apiUser.phone : fallback.phone,
    birth: apiUser.birth_date !== undefined ? apiUser.birth_date : fallback.birth,
    profileImageUrl:
      apiUser.profile_image_url !== undefined ? apiUser.profile_image_url : fallback.profileImageUrl,
  };
}

type AuthContextValue = {
  isLoggedIn: boolean;
  /** 회원가입 때 받은 정보 + 프로필 화면에서 직접 입력한 정보. 로그인 직후에는
   * 아직 서버에서 못 받아온 상태일 수 있어(profileLoading), 화면에서는 이를 참고해서
   * 로딩 표시를 해주면 좋아요. */
  profile: CustomerProfile;
  profileLoading: boolean;
  /** 이메일/비밀번호가 없으면(소셜 로그인 버튼 등) 데모용으로 바로 로그인 처리해요. */
  login: (email?: string, password?: string) => Promise<AuthResult>;
  signup: (input: { name: string; email: string; password: string }) => Promise<AuthResult>;
  /** 소셜 로그인 콜백(/login/callback)에서 받은 1회용 code로 로그인을 완료해요. */
  loginWithSocialCode: (code: string) => Promise<AuthResult>;
  logout: () => void;
  authLoading: boolean;
  /** 프로필 관리 화면에서 "저장하기"를 누르면 호출해요. imageFile이 있으면 먼저
   * 업로드해서 URL로 바꾼 뒤 함께 저장해요. */
  updateProfile: (input: {
    name: string;
    phone?: string | null;
    birth?: string | null;
    imageFile?: File | null;
    /** 사진을 새로 고르지 않았지만 기존 사진을 유지/삭제하고 싶을 때 씀 */
    profileImageUrl?: string | null;
  }) => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 손님(고객) 로그인 상태를 관리하는 컨텍스트.
 * - 로그인하지 않아도 지도(/map)와 카페 상세(/cafe/[id])는 볼 수 있어요.
 * - 그 외 기능(찜, 예약, 혜택, MY 등)은 로그인이 필요해요.
 *
 * NEXT_PUBLIC_API_BASE_URL이 설정돼 있으면 실제 /api/auth/customer/login,
 * /api/auth/signup을 호출하고 Sanctum 토큰을 저장해요. 설정 전이면(백엔드 연동 전)
 * 이전처럼 데모용으로 바로 로그인 상태가 되도록 동작해서 화면 흐름은 그대로
 * 확인할 수 있어요.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // ⚠️ 로그인 여부/프로필은 브라우저 localStorage에만 있어서 서버에서는 알 수 없어요.
  // 예전에는 useState(() => Boolean(getCustomerToken()))처럼 초기값을 바로 읽어왔는데,
  // 그러면 서버가 그려준 화면(항상 "비로그인" 기준)과 브라우저의 첫 렌더 결과(실제 로그인
  // 상태 반영)가 서로 달라져서 "Hydration failed" 오류가 났어요(로그인 화면 헤더 유무가
  // 달라지는 형태로 나타남). 그래서 초기값은 서버와 동일하게 항상 false/빈 값으로 시작하고,
  // 아래 useEffect에서 마운트된 뒤에(=하이드레이션이 끝난 뒤에) 실제 저장값으로 바꿔요.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(getCustomerToken()));
    const stored = readProfileStorage();
    if (stored) setProfile(stored);
  }, []);

  // 이미 로그인된 상태로 앱이 열렸을 때(새로고침 등) 서버에서 최신 프로필을 받아와요.
  // 백엔드 연동 전(API 미설정)에는 기기에 저장해둔 값을 그대로 써요.
  useEffect(() => {
    if (!isLoggedIn || !isApiConfigured()) return;
    let cancelled = false;
    setProfileLoading(true);
    apiGetMe("customer")
      .then((apiUser) => {
        if (cancelled || !apiUser) return;
        setProfile((prev) => {
          const next = fromApiUser(apiUser, prev);
          // ⚠️ 저장 직후뿐 아니라, 앱을 새로고침/재실행해서 서버 프로필을
          // 다시 받아올 때도 서버가 birth_date를 계속 null로 돌려주는 문제가
          // 있어요. 이 기기에 이미 저장해둔 생년월일이 있는데 서버가 null을
          // 주면, "서버가 몰라서 지운 것"과 "서버가 원래 이 필드를 잘
          // 못 돌려주는 것"을 구분할 방법이 없으니 이 기기에 저장된 값을
          // 계속 신뢰해요. 서버가 실제로 다른(진짜) 날짜를 주면 정상적으로
          // 그 값이 반영돼요 — null을 줄 때만 무시해요.
          if (apiUser.birth_date === null && prev.birth) {
            next.birth = prev.birth;
          }
          writeProfileStorage(next);
          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email?: string, password?: string): Promise<AuthResult> => {
    if (!isApiConfigured()) {
      // 백엔드 URL이 아직 설정 안 된 상태(연동 전)에서만 데모용으로 통과시켜요.
      // 이전에 이 기기에서 프로필을 저장해둔 적이 있으면 그대로 이어서 보여줘요.
      // ⚠️ 예전엔 여기서 setIsLoggedIn(true)만 하고 아무것도 저장하지 않아서,
      // 새로고침하면(마운트 시 Boolean(getCustomerToken())로 다시 판단) 로그인
      // 상태가 원인 없이 사라졌어요("로그아웃한 적 없는데 새로고침하면 로그인
      // 버튼이 도로 나타난다"는 것과 같은 종류의 문제예요). 데모 토큰을 실제로
      // 저장해서 새로고침해도 상태가 그대로 유지되게 해요.
      setCustomerToken("demo");
      setIsLoggedIn(true);
      return { ok: true };
    }
    if (!email || !password) {
      return { ok: false, error: "이메일과 비밀번호를 입력해주세요." };
    }
    setAuthLoading(true);
    try {
      const res = await apiCustomerLogin(email, password);
      setCustomerToken(res.token);
      setProfile((prev) => {
        const next = fromApiUser(res.user, prev);
        writeProfileStorage(next);
        return next;
      });
      setIsLoggedIn(true);
      return { ok: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "로그인에 실패했어요. 다시 시도해주세요.";
      const retryAfterSeconds = err instanceof ApiError ? err.retryAfterSeconds : undefined;
      return { ok: false, error: message, retryAfterSeconds };
    } finally {
      setAuthLoading(false);
    }
  };

  const signup = async (input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult> => {
    if (!isApiConfigured()) {
      // 백엔드 연동 전에는 회원가입 폼에 입력한 이름/이메일을 그대로 프로필에 저장해서
      // MY 화면 등에서 곧바로 확인할 수 있게 해요. (데모 토큰도 함께 저장해서
      // 새로고침해도 로그인 상태가 유지돼요 — 위 login()과 같은 이유예요.)
      setProfile(() => {
        const next: CustomerProfile = { ...EMPTY_PROFILE, name: input.name, email: input.email };
        writeProfileStorage(next);
        return next;
      });
      setCustomerToken("demo");
      setIsLoggedIn(true);
      // 신규 회원가입 축하 쿠폰을 발급하도록 표시해둬요(BenefitsProvider가 소비해요).
      markPendingSignupBonus();
      return { ok: true };
    }
    setAuthLoading(true);
    try {
      const res = await apiSignup({ ...input, terms_accepted: true });
      setCustomerToken(res.token);
      setProfile(() => {
        const next = fromApiUser(res.user, EMPTY_PROFILE);
        writeProfileStorage(next);
        return next;
      });
      setIsLoggedIn(true);
      // 신규 회원가입 축하 쿠폰을 발급하도록 표시해둬요(BenefitsProvider가 소비해요).
      markPendingSignupBonus();
      return { ok: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "회원가입에 실패했어요. 다시 시도해주세요.";
      const retryAfterSeconds = err instanceof ApiError ? err.retryAfterSeconds : undefined;
      return { ok: false, error: message, retryAfterSeconds };
    } finally {
      setAuthLoading(false);
    }
  };

  const loginWithSocialCode = async (code: string): Promise<AuthResult> => {
    if (!isApiConfigured()) {
      setCustomerToken("demo");
      setIsLoggedIn(true);
      return { ok: true };
    }
    setAuthLoading(true);
    try {
      const res = await apiSocialExchange(code, "customer");
      setCustomerToken(res.token);
      setProfile((prev) => {
        const next = fromApiUser(res.user, prev);
        writeProfileStorage(next);
        return next;
      });
      setIsLoggedIn(true);
      return { ok: true };
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "소셜 로그인에 실패했어요. 다시 시도해주세요.";
      return { ok: false, error: message };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    if (isApiConfigured()) {
      void apiLogout("customer");
    }
    setCustomerToken(null);
    setIsLoggedIn(false);
    setProfile(EMPTY_PROFILE);
    writeProfileStorage(null);
  };

  const updateProfile: AuthContextValue["updateProfile"] = async ({
    name,
    phone,
    birth,
    imageFile,
    profileImageUrl,
  }) => {
    setAuthLoading(true);
    try {
      // 새 사진을 골랐으면 먼저 업로드해서 URL로 바꿔요(백엔드 미연동 시에는
      // 업로드를 건너뛰고 로컬 미리보기 URL을 그대로 써서 화면은 정상 동작해요).
      let nextImageUrl = profileImageUrl !== undefined ? profileImageUrl : profile.profileImageUrl;
      if (imageFile && isApiConfigured()) {
        const uploaded = await apiUploadImage(imageFile, "customer");
        if (!uploaded) {
          // ⚠️ 예전엔 업로드가 실패해도 조용히 기존 사진으로 되돌리고 "저장 완료"
          // 토스트를 보여줬어요. 그러면 사용자는 사진이 바뀐 줄 알지만 실제로는
          // 아무 것도 바뀌지 않아서 "계속 오류가 난다"고 느끼게 돼요. 이제는
          // 업로드가 실패하면 저장을 중단하고 화면에 바로 실패를 알려요.
          // 실패 사유(401/422 등)는 브라우저 개발자도구 Console에
          // "[apiUploadImage]"로 시작하는 로그로 남아요.
          return {
            ok: false,
            error: "사진 업로드에 실패했어요. 개발자도구 콘솔(F12)에서 [apiUploadImage] 로그를 확인해주세요.",
          };
        }
        nextImageUrl = uploaded;
      }

      const applyLocal = (imageUrl: string | null) => {
        setProfile((prev) => {
          const next: CustomerProfile = {
            ...prev,
            name,
            phone: phone ?? null,
            birth: birth ?? null,
            profileImageUrl: imageUrl,
          };
          writeProfileStorage(next);
          return next;
        });
      };

      if (!isApiConfigured()) {
        applyLocal(nextImageUrl);
        return { ok: true };
      }

      try {
        const updated = await apiUpdateMe({
          name,
          phone: phone ?? null,
          profile_image_url: nextImageUrl,
          birth_date: normalizeBirthDate(birth ?? null),
        });
        setProfile((prev) => {
          // ⚠️ 지난 수정(필드가 "아예 없을 때만" 예전 값 대신 쓰기)으로도 이 문제가
          // 다시 재발했어요. 원인을 더 파보니, 서버가 필드를 아예 안 주는 게
          // 아니라 birth_date: null 이라고 "명시적으로" 돌려주고 있었어요. null은
          // JS에서 undefined가 아니라서, "필드가 없을 때만" 예전 값 대신 쓰는
          // 이전 로직은 이 경우를 못 잡았어요 — 서버가 준 explicit null이 그대로
          // 이겨서 방금 저장한 생년월일이 다시 사라졌던 거예요.
          //
          // 그래서 이제 birth_date는 서버 응답을 아예 신뢰하지 않아요. PUT
          // 요청이 예외 없이 성공했다면(이 catch 블록까지 안 왔다면) 우리가 보낸
          // 값 그대로 화면에 반영해요. 만약 서버가 생년월일 값 자체를 문제
          // 삼았다면(미래 날짜 등) 애초에 요청 전체가 422로 실패해서 아래
          // catch 블록으로 빠지지, 여기까지 200으로 오지 않으니 안전해요.
          const base = fromApiUser(updated, prev);
          const next: CustomerProfile = {
            ...base,
            birth: normalizeBirthDate(birth ?? null),
          };
          writeProfileStorage(next);
          return next;
        });
      } catch (err) {
        // ⚠️ 예전엔 서버 저장이 실패해도 applyLocal()로 화면(및 localStorage)에는
        // "저장된 것처럼" 반영해버렸어요. 그러면 그 순간엔 저장된 것처럼 보이지만,
        // 서버엔 실제로 저장이 안 됐기 때문에 다음에 앱을 새로고침하면(서버에서
        // 진짜 값을 다시 받아오면서) 방금 입력한 내용이 조용히 사라진 것처럼
        // 보였어요(특히 생년월일에서 자주 보고됨). 이제는 서버 저장이 실패하면
        // 절대 로컬 상태/localStorage를 건드리지 않고, 실패했다는 사실만 화면에
        // 알려서 "성공한 척"하지 않게 했어요. 입력 화면(ProfileEditPage)의 입력값
        // 자체는 그 화면의 로컬 state라 지워지지 않으니, 원인을 해결한 뒤 같은
        // 값으로 다시 저장을 누르기만 하면 돼요.
        const message = err instanceof ApiError ? err.message : "서버에 저장하지 못했어요. 다시 시도해주세요.";
        // eslint-disable-next-line no-console
        console.error("[updateProfile] /api/users/me 저장 실패:", err);
        return { ok: false, error: message };
      }
      return { ok: true };
    } finally {
      setAuthLoading(false);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoggedIn,
      profile,
      profileLoading,
      login,
      signup,
      loginWithSocialCode,
      logout,
      authLoading,
      updateProfile,
    }),
    [isLoggedIn, profile, profileLoading, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** 로그인 없이 접근 가능한 경로 (지도, 카페 상세). 그 외 화면은 전부 로그인 필요. */
export function isPublicPath(pathname: string) {
  // ⚠️ 원래 의도는 "지도 · 검색 · 검색 후 카페 확인"까지는 로그인 없이 볼 수
  // 있어야 하는 거였는데, /search가 이 목록에서 빠져 있었어요. 그래서 지도
  // 화면에서 검색창에 검색어를 입력해 제출하면 /search로 이동하자마자
  // AuthGate가 "로그인이 필요해요" 화면으로 막아버렸어요(카페 상세 /cafe/[id]는
  // 이미 공개였는데, 그 앞 단계인 검색 결과 목록만 막혀 있었던 것). 예약하기,
  // 찜하기, 리뷰 작성 등 실제 "행동"이 필요한 기능은 각 화면/버튼에서 여전히
  // 로그인을 요구해요 — 여긴 "보기"만 허용하는 화면 단위 게이트예요.
  if (pathname === "/map") return true;
  if (pathname === "/search") return true;
  if (pathname.startsWith("/cafe/")) return true;
  return false;
}

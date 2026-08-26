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

// ⚠️ 생년월일이 "뒤로가기 → 로그아웃 → 다시 로그인"하면 0000-00-00으로 돌아가던
// 문제의 진짜 원인: logout()이 PROFILE_STORAGE_KEY를 통째로 지우는데, 서버가
// (알려진 백엔드 이슈로) 로그인 응답에서 birth_date를 계속 null로 내려줘요.
// 로그아웃 전에는 "이 기기에 저장된 값을 믿는다"는 폴백(아래 fromApiUser 호출부)이
// 있어서 괜찮았지만, 로그아웃이 그 폴백용 캐시까지 함께 지워버리니 재로그인 시점엔
// 되돌릴 값이 아예 없어서 null이 그대로 화면에 나왔던 거예요.
//
// 그래서 생년월일만 "계정(이메일)별"로 별도 저장소에 백업해두고, 이 저장소는
// logout()이 지우지 않아요. 서버가 이메일과 함께 null을 내려줄 때마다 이 백업을
// 확인해서 채워 넣고, 서버가 실제 값을 내려주면(혹은 사용자가 직접 저장하면) 이
// 백업도 함께 최신화해요.
const BIRTH_OVERRIDE_STORAGE_KEY = "cafeon_profile_birth_by_email";

function normalizeEmailKey(email: string | null | undefined): string | null {
  const trimmed = (email ?? "").trim().toLowerCase();
  return trimmed || null;
}

function readBirthOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(BIRTH_OVERRIDE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function getBirthOverride(email: string | null | undefined): string | null {
  const key = normalizeEmailKey(email);
  if (!key) return null;
  return readBirthOverrides()[key] ?? null;
}

function setBirthOverride(email: string | null | undefined, birth: string | null) {
  const key = normalizeEmailKey(email);
  if (!key || typeof window === "undefined") return;
  try {
    const overrides = readBirthOverrides();
    if (birth) {
      overrides[key] = birth;
    } else {
      // 사용자가 생년월일을 직접 지우고 저장한 경우엔 백업도 같이 지워서,
      // 다음 로그인 때 지운 값이 되살아나지 않게 해요.
      delete overrides[key];
    }
    window.localStorage.setItem(BIRTH_OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // 시크릿 모드 등 localStorage를 못 쓰는 환경이면 조용히 무시해요.
  }
}

/** 서버 응답으로 만든 프로필에 이메일별 생년월일 백업을 적용해요.
 * - 서버가 실제 값을 줬으면 그 값을 그대로 쓰고, 백업도 최신값으로 맞춰둬요.
 * - 서버가 null/빈 값을 줬으면(알려진 백엔드 이슈) 이 기기에 백업해둔 값이
 *   있는지 확인해서 채워 넣어요. */
function applyBirthOverride(profile: CustomerProfile): CustomerProfile {
  if (profile.birth) {
    setBirthOverride(profile.email, profile.birth);
    return profile;
  }
  const override = getBirthOverride(profile.email);
  return override ? { ...profile, birth: override } : profile;
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
  /** 앱이 막 켜져서 이 기기에 저장된 로그인 정보를 아직 확인 중이면 false예요.
   * 이 값이 true가 되기 전까지는 isLoggedIn이 false여도 "진짜 로그아웃 상태"라고
   * 단정하면 안 돼요(아직 확인 중일 뿐일 수 있어요). 계정별로 나뉘어 저장되는
   * 데이터(예: 포인트·쿠폰)를 다루는 화면은 반드시 authReady가 true가 된 뒤에만
   * isLoggedIn/profile 값을 신뢰해서 저장 위치를 정해야, 확인이 끝나기도 전에
   * 잘못된(비로그인 취급) 위치에 데이터를 저장/이전해버리는 사고를 막을 수 있어요.
   */
  authReady: boolean;
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
  // ⚠️ isLoggedIn/profile의 초기값(false/빈 값)은 "아직 확인 전"이라는 뜻이지
  // "실제로 로그아웃 상태"라는 뜻이 아니에요. 그런데 BenefitsProvider 등 다른
  // 화면들은 이 값만 보고 "지금 로그인 상태가 맞다"고 판단해서, 실제로는
  // 로그인돼 있는데도 이 초기값(false)을 잠깐이라도 "진짜 로그아웃 상태"로
  // 오해하면 문제가 생길 수 있어요(예: 계정별 데이터를 잘못된 계정 칸에
  // 저장/이전해버리는 것). authReady는 바로 아래 useEffect가 한 번 실행돼서
  // isLoggedIn/profile이 "이 기기에 저장된 진짜 값"으로 바뀐 뒤에만 true가
  // 되는 값이에요. 다른 화면은 authReady가 true가 되기 전까지는 isLoggedIn을
  // 신뢰하지 말고 기다려야 해요.
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // ⚠️ 예전엔 이 useEffect가 setIsLoggedIn(true)를 호출한 뒤, 바로 아래에
    // 있는 "서버에서 최신 프로필 받아오기" useEffect가 그 결과를 보고 동작하길
    // 기대하면서 의존성 배열을 []로 뒀어요. 그런데 리액트에서 deps가 []인
    // useEffect는 "맨 처음 렌더" 시점에 만들어진 함수(그 안의 isLoggedIn은
    // 항상 초기값인 false)만 실행되고, setIsLoggedIn(true)로 인한 리렌더 이후엔
    // 다시 실행되지 않아요. 그 결과 "서버에서 최신 프로필 받아오기" 코드가
    // 사실상 한 번도 실행되지 않는 죽은 코드가 되어 있었어요(항상
    // localStorage 캐시만 보여준 것). 그래서 두 로직을 하나의 useEffect로
    // 합치고, state가 아니라 방금 읽은 실제 토큰 값(hasToken)을 기준으로
    // 판단하도록 고쳤어요.
    const hasToken = Boolean(getCustomerToken());
    setIsLoggedIn(hasToken);
    const stored = readProfileStorage();
    if (stored) setProfile(stored);
    setAuthReady(true);

    // 이미 로그인된 상태로 앱이 열렸을 때(새로고침, 뒤로가기로 복귀 등) 서버에서
    // 최신 프로필을 받아와요. 백엔드 연동 전(API 미설정)에는 기기에 저장해둔
    // 값을 그대로 써요.
    if (!hasToken || !isApiConfigured()) return;
    let cancelled = false;
    setProfileLoading(true);
    apiGetMe("customer")
      .then((apiUser) => {
        if (cancelled || !apiUser) return;
        setProfile((prev) => {
          const next = applyBirthOverride(fromApiUser(apiUser, prev));
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
        const next = applyBirthOverride(fromApiUser(res.user, prev));
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
        const next = applyBirthOverride(fromApiUser(res.user, EMPTY_PROFILE));
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
        const next = applyBirthOverride(fromApiUser(res.user, prev));
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
          setBirthOverride(next.email, next.birth);
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
          // 방금 성공적으로 저장한 생년월일을 이메일별 백업에도 반영해요.
          // 서버가 이후 로그인 응답에서 다시 null을 내려주더라도(알려진
          // 백엔드 이슈) 이 백업으로 되살릴 수 있어요.
          setBirthOverride(next.email, next.birth);
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
      authReady,
      profile,
      profileLoading,
      login,
      signup,
      loginWithSocialCode,
      logout,
      authLoading,
      updateProfile,
    }),
    [isLoggedIn, authReady, profile, profileLoading, authLoading]
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

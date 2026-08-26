/**
 * auth-store(회원가입)와 benefits-store(혜택) 사이의 아주 작은 연결 다리예요.
 * ------------------------------------------------------------------
 * BenefitsProvider는 ShellLayout 안쪽에만 있어서(AuthProvider보다 안쪽), auth-store의
 * signup() 함수 안에서 useBenefits()를 직접 부를 수 없어요. 그렇다고 benefits-store.tsx를
 * auth-store.tsx가 그대로 import하면, benefits-store.tsx도 useAuth를 쓰려고
 * auth-store.tsx를 import하고 있어서 순환 참조(circular import)가 생겨요.
 *
 * 그래서 React 컨텍스트와 무관한 이 파일 하나에만 "회원가입 축하 쿠폰을 아직
 * 못 받았어요" 표시를 localStorage로 남기고 지우는 순수 함수만 둬요. 두 store
 * 파일 모두 이 파일만 import하면 되고, 서로를 직접 import하지 않아요.
 */

const SIGNUP_PENDING_KEY = "cafeon_new_signup_bonus_pending";

/** 회원가입이 막 성공했다는 표시를 남겨요. BenefitsProvider가 다음에 값을
 * 확인할 때(같은 세션의 다음 렌더, 혹은 새로고침 이후에도) 이 표시를 보고
 * 신규가입 쿠폰을 한 번 발급해줘요. */
export function markPendingSignupBonus() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIGNUP_PENDING_KEY, "1");
  } catch {
    // 시크릿 모드 등 localStorage를 못 쓰는 환경이면 조용히 무시해요.
  }
}

/** 표시가 남아있으면 true를 돌려주고, 동시에 지워서 다음번엔 다시 발급되지
 * 않게 해요(한 번만 소비되는 "1회용 신호"예요). */
export function consumePendingSignupBonus(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const has = window.localStorage.getItem(SIGNUP_PENDING_KEY) === "1";
    if (has) window.localStorage.removeItem(SIGNUP_PENDING_KEY);
    return has;
  } catch {
    return false;
  }
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOwnerAuth } from "@/lib/owner-auth-store";

/**
 * 사장님 로그아웃 전용 경로.
 * ------------------------------------------------------------------
 * ⚠️ 예전에는 사장님 MY/설정 화면의 "로그아웃" 버튼이 `<Link href="/map">`에
 * onClick={() => ownerLogout()}를 같이 붙여서, 클릭 한 번에
 *  1) /map으로 이동(Link 자체 동작)
 *  2) ownerLogout()으로 로그인 상태를 false로 변경
 * 이 동시에 일어났어요. 그런데 이 버튼은 사장님 화면(/owner/(shell)/...)
 * 안에 있고, 그 화면은 OwnerAuthGate로 보호돼 있어서, 로그인 상태가 false로
 * 바뀌는 순간 OwnerAuthGate가 "아직 로그인 안 됨"으로 판단하고
 * router.replace("/owner/login")을 호출해버려요. 이게 /map으로의 이동과
 * 경합(둘 다 거의 동시에 발생)하면서, 로그아웃 후 지도 화면이 아니라
 * 사장님 로그인 화면으로 튕기는 문제가 있었어요.
 *
 * 이 페이지는 OwnerAuthGate로 보호되지 않는 별도 경로라서, 여기 도착한 뒤에
 * 로그아웃을 처리하면 더 이상 그 가드와 경합하지 않아요. 화면에는 아무것도
 * 보여주지 않고(깜빡임 없이) 곧바로 /map으로 이동해요.
 */
export default function OwnerLogoutPage() {
  const { ownerLogout } = useOwnerAuth();
  const router = useRouter();

  useEffect(() => {
    ownerLogout();
    router.replace("/map");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

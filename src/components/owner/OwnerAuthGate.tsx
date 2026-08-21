"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOwnerAuth } from "@/lib/owner-auth-store";

export default function OwnerAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOwnerLoggedIn } = useOwnerAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isOwnerLoggedIn) {
      router.replace("/owner/login");
    }
  }, [isOwnerLoggedIn, router]);

  if (!isOwnerLoggedIn) return null;

  return <>{children}</>;
}

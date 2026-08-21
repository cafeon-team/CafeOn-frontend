"use client";

import { Home, Receipt, Store, ClipboardList, User } from "lucide-react";
import ElevatedBottomNav from "@/components/ElevatedBottomNav";

const items = [
  { href: "/owner", label: "홈", icon: Home, exact: true },
  { href: "/owner/reserve", label: "주문", icon: Receipt },
  { href: "/owner/menu", label: "메뉴", icon: ClipboardList },
  { href: "/owner/my", label: "MY", icon: User },
];

const center = { href: "/owner/store", label: "매장", icon: Store };

export default function OwnerBottomNav() {
  return <ElevatedBottomNav items={items} center={center} color="trust" />;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const colorMap = {
  brand: { text: "text-brand", bgActive: "bg-brand", bgInactive: "bg-brand/85" },
  trust: { text: "text-trust", bgActive: "bg-trust", bgInactive: "bg-trust/85" },
} as const;

export default function ElevatedBottomNav({
  items,
  center,
  color = "brand",
}: {
  /** exactly 4 items — rendered as 2 on the left, 2 on the right of the center item */
  items: NavItem[];
  center: NavItem;
  color?: "brand" | "trust";
}) {
  const pathname = usePathname();
  const c = colorMap[color];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const left = items.slice(0, 2);
  const right = items.slice(2, 4);
  const centerActive = isActive(center.href, center.exact);
  const CenterIcon = center.icon;

  const renderItem = (item: NavItem) => {
    const active = isActive(item.href, item.exact);
    const Icon = item.icon;
    return (
      <li key={item.href} className="flex-1">
        <Link href={item.href} className="flex flex-col items-center gap-1 py-1">
          <span className="flex h-6 items-center justify-center">
            <Icon
              size={22}
              strokeWidth={active ? 2.4 : 1.8}
              className={active ? c.text : "text-ink-muted"}
            />
          </span>
          <span
            className={
              "text-[11px] " + (active ? `font-bold ${c.text}` : "text-ink-muted")
            }
          >
            {item.label}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <nav className="relative z-30 shrink-0 border-t border-border bg-white">
      <ul className="flex items-start justify-between px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {left.map(renderItem)}

        <li className="flex-1">
          <Link href={center.href} className="flex flex-col items-center gap-1 py-1">
            <span className="relative flex h-6 items-center justify-center">
              <span
                className={
                  "absolute -top-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white shadow-sheet transition-colors " +
                  (centerActive ? c.bgActive : c.bgInactive)
                }
              >
                <CenterIcon size={24} strokeWidth={2.2} className="text-white" />
              </span>
            </span>
            <span
              className={
                "text-[11px] " +
                (centerActive ? `font-bold ${c.text}` : "text-ink-muted")
              }
            >
              {center.label}
            </span>
          </Link>
        </li>

        {right.map(renderItem)}
      </ul>
    </nav>
  );
}

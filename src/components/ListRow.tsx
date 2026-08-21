import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function ListRow({
  href,
  label,
  danger = false,
  color,
  onClick,
}: {
  href: string;
  label: string;
  danger?: boolean;
  color?: "brand" | "trust";
  onClick?: () => void;
}) {
  const textColor = color
    ? color === "trust"
      ? "text-trust"
      : "text-brand"
    : danger
    ? "text-brand"
    : "text-ink";

  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex h-16 items-center justify-between rounded-2xl border border-border bg-white px-5"
    >
      <span className={"text-[15px] font-medium " + textColor}>{label}</span>
      <ChevronRight size={18} className="text-ink-muted" />
    </Link>
  );
}

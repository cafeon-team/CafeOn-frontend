import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white active:bg-brand-hover",
  outline: "bg-white text-brand border border-brand",
  ghost: "bg-transparent text-ink-secondary",
};

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={
        `flex h-14 w-full items-center justify-center rounded-2xl text-[16px] font-bold transition-colors disabled:opacity-40 ${variants[variant]} ` +
        className
      }
      {...rest}
    >
      {children}
    </button>
  );
}

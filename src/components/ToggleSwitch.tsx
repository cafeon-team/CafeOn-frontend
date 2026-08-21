"use client";

export default function ToggleSwitch({
  checked,
  onChange,
  color = "brand",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  color?: "brand" | "trust";
}) {
  const activeBg = color === "trust" ? "bg-trust" : "bg-brand";

  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        "flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors " +
        (checked ? `justify-end ${activeBg}` : "justify-start bg-border")
      }
    >
      <span className="h-6 w-6 rounded-full bg-white shadow" />
    </button>
  );
}

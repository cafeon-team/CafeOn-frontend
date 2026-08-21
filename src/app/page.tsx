import Image from "next/image";
import Link from "next/link";

export default function SplashPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <Image
        src="/images/splash.png"
        alt=""
        fill
        priority
        sizes="(max-width: 448px) 100vw, 448px"
        className="object-cover object-[center_60%]"
      />
      <div className="absolute inset-0 bg-black/25" />

      <div className="relative z-10 mt-auto px-6 pb-14">
        <Link
          href="/map"
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-brand text-[16px] font-bold text-white shadow-sheet"
        >
          시작하기
        </Link>
      </div>
    </div>
  );
}

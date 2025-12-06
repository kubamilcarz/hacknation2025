"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AccessibilityToolbar from "./AccessibilityToolbar";

type NavBarProps = {
  variant?: "default" | "employee";
};

export default function NavBar({ variant }: NavBarProps = {}) {
  const pathname = usePathname();
  const resolvedVariant = variant ?? (pathname?.startsWith("/dashboard/employee") ? "employee" : "default");
  const isEmployee = resolvedVariant === "employee";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-subtle bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/75">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-6 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
        >
          <div className="relative h-10 w-28">
            <Image
              src="/zus_logo.svg"
              alt="Zakład Ubezpieczeń Społecznych"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 112px, 140px"
              priority
            />
          </div>
          <span className="mr-3 h-2 w-2 rounded-full bg-(--color-support)" aria-hidden="true" />
          <span className="hidden text-sm font-semibold text-muted md:inline">ZANT</span>
        </Link>
 
        <div className="flex items-center gap-4">
          {isEmployee && (
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
            >
              Wyloguj
            </Link>
          )}
          <AccessibilityToolbar variant="inline" />
        </div>
      </div>
    </header>
  );
}

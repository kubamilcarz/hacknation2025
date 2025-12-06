"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AccessibilityToolbar from "./AccessibilityToolbar";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";

type NavBarProps = {
  variant?: "default" | "employee";
};

export default function NavBar({ variant }: NavBarProps = {}) {
  const pathname = usePathname();
  const resolvedVariant = variant ?? (pathname?.startsWith("/dashboard/employee") ? "employee" : "default");
  const isEmployee = resolvedVariant === "employee";
  const router = useRouter();
  const { resetSessionUserId, isSessionUserReady } = useSession();

  const handleLogout = () => {
    if (isSessionUserReady) {
      resetSessionUserId();
    }

    void router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-subtle bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/75">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-6 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
        >
          <div className="relative h-10 w-22">
            <Image
              src="/zus_logo.svg"
              alt="Zakład Ubezpieczeń Społecznych"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 112px, 140px"
              priority
            />
          </div>
          <span className="hidden text-sm font-semibold text-muted md:inline">
            AccidentFlow | {isEmployee ? "Panel Weryfikacji" : "Generator Zgłoszeń"}
          </span>
        </Link>
 
        <div className="flex items-center gap-4">
          {isEmployee && (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 cursor-pointer"
            >
              <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Wyloguj
            </button>
          )}
          <AccessibilityToolbar variant="inline" />
        </div>
      </div>
    </header>
  );
}

"use client";

type FooterProps = {
  router: {
    push: (href: string) => void;
  };
  showPanelButton: boolean;
};

export default function Footer({ router, showPanelButton }: FooterProps) {
  return (
    <footer className="mt-12 text-sm text-muted">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">© 2025 Zakład Ubezpieczeń Społecznych - ZANT</p>
        {showPanelButton && (
          <button
            type="button"
            onClick={() => router.push("/dashboard/employee")}
            className="inline-flex items-center justify-center rounded-md border border-subtle px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:border-(--color-border-strong) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 hover:cursor-pointer"
          >
          Panel pracownika ZUS
        </button>
        )}
      </div>
    </footer>
  );
}
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-6rem)] items-center justify-center bg-background px-6 py-16">
      <section className="w-full max-w-3xl rounded-2xl border border-subtle bg-surface p-8 shadow-toolbar" aria-labelledby="not-found-title">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-(--color-accent-soft)">
          <span className="text-2xl font-semibold text-(--color-accent-strong)" aria-hidden="true">
            404
          </span>
        </div>

        <h1 id="not-found-title" className="text-3xl font-semibold text-primary">
          Nie znaleźliśmy tej strony
        </h1>
        <p className="mt-3 text-base text-secondary">
          Adres mógł ulec zmianie albo został wpisany niepoprawnie. Sprawdź pisownię lub wróć do strony głównej, aby kontynuować pracę.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-(--color-accent) px-6 py-2.5 text-sm font-semibold text-(--color-accent-text) transition hover:bg-(--color-accent-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
          >
            Wróć na stronę główną
          </Link>
          <Link
            href="/dashboard/employee"
            className="inline-flex items-center justify-center rounded-md border border-subtle px-6 py-2.5 text-sm font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
          >
            Panel pracownika ZUS
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted">
          Jeśli uważasz, że to błąd, skontaktuj się z administratorem systemu ZANT.
        </p>
      </section>
    </main>
  );
}

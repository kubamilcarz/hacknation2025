"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-16 lg:px-12 lg:py-20">
        <section className="flex flex-1 flex-col justify-center gap-12">
          <div className="rounded-xl bg-white p-8 shadow-md">
            <div className="flex flex-col gap-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1 text-sm font-semibold text-emerald-700">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m4 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Bezpieczne zgłoszenie w kilka minut
              </span>
              <p className="text-2xl font-semibold text-gray-900">Zgłoś wypadek</p>
              <p className="text-lg leading-relaxed text-gray-700">
                Jeśli właśnie doświadczyłeś wypadku, przeprowadzimy Cię przez każdy krok. Asystent przypilnuje formalności,
                podpowie brakujące dane i przekaże je dalej do zespołu ZUS. Ty możesz w spokoju skupić się na
                zdrowiu.
              </p>
            </div>

            <ol className="mt-8 flex flex-col gap-6 text-gray-700 sm:grid-cols-3">
              {[
                {
                  title: "Opowiedz co się stało",
                  body: "Wpisz zdarzenie własnymi słowami, a system podpowie, o co jeszcze warto uzupełnić opis.",
                },
                {
                  title: "Uzupełnij wymagane dane",
                  body: "Asystent przypomina o PESEL, czasie, miejscu wypadku i dokumentach, które zwiększą szanse na uznanie.",
                },
                {
                  title: "Przejmujemy kontakt z ZUS",
                  body: "Gotowe zgłoszenie trafia do pracownika, który widzi nasze wskazówki i szybciej udziela odpowiedzi.",
                },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">{step.title}</p>
                    <p className="text-sm leading-relaxed text-gray-600">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-col gap-3 sm:items-start sm:justify-between">
              <button
                onClick={() => router.push("/dashboard/user")}
                className="rounded-sm bg-emerald-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-700 w-auto cursor-pointer" 
              >
                Rozpocznij
              </button>
            </div>
          </div>
        </section>

        <footer className="mt-12 text-sm text-gray-600">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => router.push("/dashboard/employee")}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-900"
            >
              Panel pracownika ZUS
            </button>
            <p className="text-xs text-gray-500">© 2025 Zakład Ubezpieczeń Społecznych - ZANT</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

import type { EmployeeDocument } from "@/types/employeeDocument";

const met = (summary: string) => ({ status: "met" as const, summary } satisfies EmployeeDocument["assessment"][keyof EmployeeDocument["assessment"]]);
const partial = (summary: string, recommendation: string) => ({
  status: "partial" as const,
  summary,
  recommendation,
} satisfies EmployeeDocument["assessment"][keyof EmployeeDocument["assessment"]]);
const unmet = (summary: string, recommendation: string) => ({
  status: "unmet" as const,
  summary,
  recommendation,
} satisfies EmployeeDocument["assessment"][keyof EmployeeDocument["assessment"]]);

export interface EmployeeDocumentSeed extends EmployeeDocument {
  mockContent: string;
}

export const mockEmployeeDocumentSeed: EmployeeDocumentSeed[] = [
  {
    id: 101,
    fileName: "raport-budowa-mokotow.pdf",
    fileSize: 248_512,
    fileType: "application/pdf",
    storageUrl: "mock-storage://101",
    uploadedAt: "2025-02-21T08:15:00.000Z",
    incidentDescription:
      "Upadek z drabiny podczas montażu oświetlenia elewacyjnego. AI zidentyfikowała brak zabezpieczenia antypoślizgowego.",
    analysisStatus: "completed",
    descriptionSource: "ai",
    assessment: {
      suddenness: met("Zdarzenie trwało poniżej 3 sekund – klasyfikacja jako nagłe."),
      externalCause: met("Poślizg na mokrym szczeblu rusztowania wskazany w zgłoszeniu."),
      injury: met("Rozpoznano złamanie przedramienia – dokumentacja medyczna załączona."),
      workRelation: partial(
        "Opis nie zawiera nazwiska przełożonego zlecającego pracę.",
        "Poproś zgłaszającego o potwierdzenie kto zlecił wymianę oświetlenia tego dnia."
      ),
    },
    mockContent:
      "Raport PDF: Upadek z drabiny na budowie Mokotów. Poszkodowany doznał urazu barku. Dokument pochodzący z importu.",
  },
  {
    id: 102,
    fileName: "zgłoszenie-warsztat-gniezno.pdf",
    fileSize: 199_144,
    fileType: "application/pdf",
    storageUrl: "mock-storage://102",
    uploadedAt: "2025-02-22T11:42:00.000Z",
    incidentDescription:
      "Zmiażdżenie dłoni w prasie hydraulicznej. Analiza wskazała brak blokady krańcowej po wymianie matrycy.",
    analysisStatus: "completed",
    descriptionSource: "ai",
    assessment: {
      suddenness: met("Zamykanie stołu nastąpiło w ułamku sekundy."),
      externalCause: partial(
        "Brak jasnej informacji, który element prasy uległ awarii.",
        "Uzupełnij nazwę komponentu i datę ostatniego przeglądu maszyny."
      ),
      injury: met("Zmiażdżenie dwóch palców potwierdzone wpisem medycznym."),
      workRelation: met("Regulacja czujników krańcowych wykonywana podczas zmiany."),
    },
    mockContent:
      "Raport PDF: Zdarzenie w warsztacie Gniezno. Prasa hydrauliczna uruchomiła się samoczynnie podczas kalibracji.",
  },
  {
    id: 103,
    fileName: "analiza_placu-magazynowego.pdf",
    fileSize: 310_224,
    fileType: "application/pdf",
    storageUrl: "mock-storage://103",
    uploadedAt: "2025-02-22T15:05:00.000Z",
    incidentDescription:
      "Potknięcie o niezabezpieczoną paletę podczas rozładunku. System zasugerował weryfikację instrukcji BHP dla magazynu.",
    analysisStatus: "completed",
    descriptionSource: "ai",
    assessment: {
      suddenness: met("Potknięcie nastąpiło zaraz po kontakcie z przeszkodą."),
      externalCause: met("Niezabezpieczona paleta wskazana jako przyczyna."),
      injury: partial(
        "Brak jednoznacznego potwierdzenia urazu w zgłoszeniu.",
        "Poproś o krótką informację medyczną dot. skręcenia lub otarć."
      ),
      workRelation: met("Zdarzenie miało miejsce podczas rozładunku dostawy."),
    },
    mockContent:
      "Raport PDF: Potknięcie o paletę w magazynie. Świadkowie zgłaszają brak oznakowania stref przeładunkowych.",
  },
  {
    id: 104,
    fileName: "wypadek-maszyna-cnc.pdf",
    fileSize: 275_968,
    fileType: "application/pdf",
    storageUrl: "mock-storage://104",
    uploadedAt: "2025-02-23T07:58:00.000Z",
    incidentDescription:
      "Cięcie materiału na frezarce CNC. AI nadal analizuje błędy w logach maszyny.",
    analysisStatus: "processing",
    descriptionSource: "ai",
    assessment: {
      suddenness: partial(
        "Logi temperatury wskazują powolny wzrost, brak potwierdzenia nagłości.",
        "Prześlij wykres z dokładnym momentem przekroczenia progu, aby wykazać nagłość."
      ),
      externalCause: met("Alert temperaturowy wrzeciona traktowany jako czynnik zewnętrzny."),
      injury: unmet(
        "Brak informacji o obrażeniach – operator mógł nie ucierpieć.",
        "Dodaj informację, czy pracownik doznał urazu (nawet jeśli nie)."
      ),
      workRelation: met("Zadanie wykonywane w ramach bieżącej zmiany produkcyjnej."),
    },
    mockContent:
      "Raport PDF: incydent na maszynie CNC. Analiza logów w toku, wstępny opis obejmuje alert temperatury wrzeciona.",
  },
  {
    id: 105,
    fileName: "zgloszenie_hala-produkcji.pdf",
    fileSize: 165_904,
    fileType: "application/pdf",
    storageUrl: "mock-storage://105",
    uploadedAt: "2025-02-24T12:20:00.000Z",
    incidentDescription:
      "Brak możliwości rozpoznania treści. Operator musi ręcznie przepisać dane.",
    analysisStatus: "failed",
    descriptionSource: "manual",
    assessment: {
      suddenness: partial(
        "Skan nieczytelny – brak danych o sekwencji zdarzeń.",
        "Poproś o ponowne przesłanie skanu z opisem przebiegu zdarzenia."
      ),
      externalCause: partial(
        "Nie udało się odczytać wskazania przyczyny z dokumentu.",
        "Zapytaj klienta o krótkie streszczenie: co było przyczyną wypadku?"
      ),
      injury: unmet(
        "Brak danych o urazie w przesłanych materiałach.",
        "Wiadomość: prosimy o informację czy doszło do urazu oraz jaki był jego charakter."
      ),
      workRelation: partial(
        "Niejasne czy zadanie było wykonywane w godzinach pracy.",
        "Poproś o doprecyzowanie obowiązków wykonywanych w chwili zdarzenia."
      ),
    },
    mockContent:
      "Uszkodzony PDF: brak danych binarnych. Wymagane ręczne uzupełnienie opisu zdarzenia.",
  },
];

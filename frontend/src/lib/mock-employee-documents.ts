import type { EmployeeDocument } from "@/types/employeeDocument";

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
    mockContent:
      "Uszkodzony PDF: brak danych binarnych. Wymagane ręczne uzupełnienie opisu zdarzenia.",
  },
];

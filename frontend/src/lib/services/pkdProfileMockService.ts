import type { EmployeeDocument } from "@/types/employeeDocument";

export interface CompanySnapshot {
  nip: string | null;
  region: string | null;
  declaredIndustry: string | null;
}

export interface PkdProfileMock {
  nip: string;
  pkdCode: string;
  pkdName: string;
  registeredIndustry: string;
  employeesRange: string;
  updatedAt: string;
  reliabilityScore: number;
}

const REGIONS = [
  "Dolnośląskie",
  "Kujawsko-pomorskie",
  "Lubelskie",
  "Lubuskie",
  "Łódzkie",
  "Małopolskie",
  "Mazowieckie",
  "Opolskie",
  "Podkarpackie",
  "Podlaskie",
  "Pomorskie",
  "Śląskie",
  "Świętokrzyskie",
  "Warmińsko-mazurskie",
  "Wielkopolskie",
  "Zachodniopomorskie",
] as const;

const INDUSTRY_RULES: Array<{ label: string; keywords: string[] }> = [
  { label: "Budownictwo", keywords: ["budow", "remont", "monter", "ruszt", "dach", "szalunek", "elewac", "kopark"] },
  { label: "Transport i logistyka", keywords: ["transport", "kierow", "logist", "magazyn", "spedyc", "kurier", "dostaw"] },
  { label: "Produkcja i przemysł", keywords: ["produkc", "hala", "linia", "montaż", "fabryk", "przemys", "taśm"] },
  { label: "IT i technologie", keywords: ["it", "oprogram", "system", "aplikac", "serwer", "developer", "kod"] },
  { label: "Opieka zdrowotna", keywords: ["pacjent", "klinika", "szpital", "rehabilit", "pielęg", "medycz"] },
  { label: "Usługi dla ludności", keywords: ["salon", "klient", "usług", "sprząt", "opieka", "kosmet", "fryz"] },
];

const PKD_LIBRARY: Array<{ code: string; name: string; industry: string }> = [
  {
    code: "43.99.Z",
    name: "Pozostałe specjalistyczne roboty budowlane, gdzie indziej niesklasyfikowane",
    industry: "Budownictwo",
  },
  { code: "49.41.Z", name: "Transport drogowy towarów", industry: "Transport i logistyka" },
  { code: "28.41.Z", name: "Produkcja maszyn do obróbki metali", industry: "Produkcja i przemysł" },
  { code: "62.01.Z", name: "Działalność związana z oprogramowaniem", industry: "IT i technologie" },
  { code: "86.90.A", name: "Działalność fizjoterapeutyczna", industry: "Opieka zdrowotna" },
  {
    code: "96.02.Z",
    name: "Fryzjerstwo i pozostałe zabiegi kosmetyczne",
    industry: "Usługi dla ludności",
  },
  {
    code: "71.12.Z",
    name: "Działalność w zakresie inżynierii i związane doradztwo techniczne",
    industry: "Budownictwo",
  },
  {
    code: "52.29.C",
    name: "Działalność pozostałych agencji transportowych",
    industry: "Transport i logistyka",
  },
] as const;

const EMPLOYEE_RANGES = ["1-9", "10-49", "50-249", "250+"] as const;
const DEFAULT_INDUSTRY = "Usługi ogólnobiznesowe";

export function buildCompanySnapshot(document: EmployeeDocument | null | undefined): CompanySnapshot {
  if (!document) {
    return { nip: null, region: null, declaredIndustry: null };
  }

  const hashSeed = `${document.id ?? document.fileName ?? "0"}-${document.uploadedAt ?? ""}-${document.fileSize ?? 0}`;
  const hash = hashString(hashSeed);
  const nip = buildNipFromHash(hash);
  const region = REGIONS[Math.abs(hash) % REGIONS.length];
  const declaredIndustry = detectIndustryFromDescription(document.incidentDescription);

  return {
    nip,
    region,
    declaredIndustry,
  };
}

export function fetchMockPkdProfile(nip: string): Promise<PkdProfileMock> {
  const hash = hashString(nip);
  const profile = PKD_LIBRARY[Math.abs(hash) % PKD_LIBRARY.length];
  const employeesRange = EMPLOYEE_RANGES[Math.abs(hash) % EMPLOYEE_RANGES.length];
  const daysOffset = Math.abs(hash) % 25;
  const updatedAt = new Date(Date.now() - daysOffset * 24 * 60 * 60 * 1000).toISOString();
  const reliabilityScore = 72 + (Math.abs(hash) % 25);

  return new Promise((resolve) => {
    const delay = 600 + (Math.abs(hash) % 800);
    setTimeout(() => {
      resolve({
        nip,
        pkdCode: profile.code,
        pkdName: profile.name,
        registeredIndustry: profile.industry,
        employeesRange,
        updatedAt,
        reliabilityScore,
      });
    }, delay);
  });
}

function detectIndustryFromDescription(description: string | null | undefined): string {
  if (!description) {
    return DEFAULT_INDUSTRY;
  }

  const normalized = description.toLowerCase();
  for (const rule of INDUSTRY_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.label;
    }
  }

  return DEFAULT_INDUSTRY;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return hash;
}

function buildNipFromHash(hash: number): string {
  const normalized = 1000000000 + (Math.abs(hash) % 899999999);
  return normalized.toString().padStart(10, "0");
}

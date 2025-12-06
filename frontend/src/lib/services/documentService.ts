import { defaultDocumentData, mockDocuments } from "../mock-documents";
import type { CreateDocumentDto, DocumentDetailDto, DocumentListResponseDto } from "@/lib/dtos/documentDtos";
import { mapDocumentDetailDtoToDocument, mapDocumentListItemDtoToDocument, mapDocumentToDetailDto, mapPartialDocumentToCreateDto } from "@/lib/mappers/documentMapper";
import type { Document } from "@/types/document";

export type DocumentExportFormat = "csv" | "excel" | "json" | "pdf";

const EXPORT_FILE_PREFIX = "dokumenty-wypadkowe";
const NETWORK_DELAY_MS = 350;

const delay = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

type ExportColumn = { label: string; accessor: (document: Document) => string };

const EXPORT_COLUMNS: ExportColumn[] = [
  { label: "ID", accessor: (document) => String(document.id ?? "-") },
  { label: "Imię", accessor: (document) => document.imie },
  { label: "Nazwisko", accessor: (document) => document.nazwisko },
  { label: "PESEL", accessor: (document) => document.pesel },
  { label: "Data wypadku", accessor: (document) => document.data_wypadku },
  { label: "Godzina wypadku", accessor: (document) => document.godzina_wypadku },
  { label: "Miejsce wypadku", accessor: (document) => document.miejsce_wypadku },
  { label: "Rodzaj urazów", accessor: (document) => document.rodzaj_urazow },
  { label: "Czy udzielono pomocy", accessor: (document) => (document.czy_udzielona_pomoc ? "Tak" : "Nie") },
];

const PDF_TABLE_COLUMNS: Array<ExportColumn & { lengthHint?: number }> = [
  { label: "ID", accessor: (document) => String(document.id ?? "Brak danych"), lengthHint: 6 },
  { label: "Data wypadku", accessor: (document) => formatPdfIncidentDate(document), lengthHint: 18 },
  {
    label: "Poszkodowany",
    accessor: (document) => normalizeCellValue(`${document.imie} ${document.nazwisko}`.trim()) || "Brak danych",
    lengthHint: 20,
  },
  { label: "PESEL", accessor: (document) => document.pesel || "Brak danych", lengthHint: 14 },
  { label: "Miejsce wypadku", accessor: (document) => document.miejsce_wypadku || "Brak danych", lengthHint: 28 },
  { label: "Rodzaj urazu", accessor: (document) => document.rodzaj_urazow || "Brak danych", lengthHint: 28 },
];

const NOTO_SANS_FONT_BASE64 = `
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AfQAKAPoACgArwAMAK8ADAD6AB8BZwAMAWcADAGgAB8BeABNAxcASADoACcBmAAnATYAKAE2ACcAgv9BAjwAFwMFABEBXgAKAV4AHgFeABwBXgAZAfQAAACmAAAAAAAAAAAAAAPoACkArwAMAK8ADAFeABMBXgAUAV4AEQKwAA8CWgAPAloADwOyAA8DsgAPAQIAVQJIADcBuQAZAisAJgI8AC0CPAAVAjwAPwI8ADcB/wAIAk0AOgI8ADIBXgATAV4AJQFeABgBXgARAV4ACgFeAB4BXgAUAV4AHAFeABkBXgARAV4AEwFeACUBXgAYAV4AEQFeAAoBXgAeAV4AFAFeABwBXgAZAV4AEQAAAAABBAAAAQQAAAE4AFEBfwCTAfYAcwKNACIDPAA5AUYAcwFiAEQBYgA7Al8ASQInADIBDAAuAVQAMQEMAEgBrQAqAicAMAInAFcCJwAvAicAKAInAAsCJwBAAicANwInACwCJwA0AicANAEmAFUBJgAsAicAMgInADICJwAyAgYARwFkAGwBrQAqAWQANgInAB0Bm//+AYcALAIcAOoBeAA2AicAMgEEAAAB9AAoA+gAKAE4AFIBOABRAfQAUwH0AFEDJABIAicARQAyADIAAgAAAAAAAP+cADIAAAAAAAAAAAAAAAAAAAAAAAAAAAFCAAABAgEDAAMABAAFAAYABwAIAAkACgALAAwADQAOAA8AEAARABIAEwAUABUAFgAXABgAGQAaABsAHAAdAB4AHwAgACEAIgAjACQAJQAmACcAKAApACoAKwAsAC0ALgAvADAAMQAyADMANAA1ADYANwA4ADkAOgA7ADwAPQA+AD8AQABBAEIAQwBEAEUARgBHAEgASQBKAEsATABNAE4ATwBQAFEAUgBTAFQAVQBWAFcAWABZAFoAWwBcAF0AXgBfAGAAYQEEAKMAhACFAL0AlgDoAIYAjgCLAJ0AqQCkAQUAigEGAIMAkwEHAQgAjQEJAIgAwwDeAQoAngCqAPUA9AD2AKIArQDJAMcArgBiAGMAkABkAMsAZQDIAMoAzwDMAM0AzgDpAGYA0wDQANEArwBnAPAAkQDWANQA1QBoAOsA7QCJAGoAaQBrAG0AbABuAKAAbwBxAHAAcgBzAHUAdAB2AHcA6gB4AHoAeQB7AH0AfAC4AKEAfwB+AIAAgQDsAO4AugELAQwAsACxANgA3ADdANkAsgCzALYAtwDEALQAtQDFAIcAqwENAQ4AvgC/ALwBDwCMARABEQESARMBFAEVARYBFwEYARkBGgEbARwBHQEeAMAAwQEfASAA1wEhASIBIwEkASUBJgEnASgBKQEqASsBLAEtAS4BLwEwATEBMgEzATQBNQE2ATcBOAE5AToBOwE8AT0BPgE/AUABQQFCAUMBRAFFAUYBRwFIAUkBSgFLAUwBTQFOAU8BUAFRAVIBUwFUAVUBVgFXAVgBWQFaAVsBXAFdAV4BXwFgAWEBYgFjAWQBZQFmAWcBaAFpAWoBawFsAW0BbgFvAXABcQFyAXMETlVMTAJDUgd1bmkwMEEwB3VuaTAwQUQJb3ZlcnNjb3JlB3VuaTAwQjIHdW5pMDBCMwd1bmkwMEI1B3VuaTAwQjkETGRvdARsZG90Bm1pbnV0ZQZzZWNvbmQERXVybwd1bmkyMDc0B3VuaTIwNzUHdW5pMjA3Nwd1bmkyMDc4B3VuaTIwMDIHdW5pMjAwOQd1bmkyMDBCB3VuaUZFRkYHdW5pRkZGRAd1bmkwMkJDB3VuaTAyQkIHdW5pMjA3MAd1bmkyMDc2B3VuaTIwNzkDZl9mBWZfZl9pBWZfZl9sB3plcm8ubGYGb25lLmxmBnR3by5sZgh0aHJlZS5sZgdmb3VyLmxmB2ZpdmUubGYGc2l4LmxmCHNldmVuLmxmCGVpZ2h0LmxmB25pbmUubGYJemVyby5kbm9tCG9uZS5kbm9tCHR3by5kbm9tCnRocmVlLmRub20JZm91ci5kbm9tCWZpdmUuZG5vbQhzaXguZG5vbQpzZXZlbi5kbm9tCmVpZ2h0LmRub20JbmluZS5kbm9tCXplcm8ubnVtcghvbmUubnVtcgh0d28ubnVtcgp0aHJlZS5udW1yCWZvdXIubnVtcglmaXZlLm51bXIIc2l4Lm51bXIKc2V2ZW4ubnVtcgplaWdodC5udW1yCW5pbmUubnVtcgRudWxsBENSXzEHc3BhY2VfMQl1bmkwMkJDXzELZXhjbGFtLmRldmENcXVvdGVkYmwuZGV2YQ9udW1iZXJzaWduLmRldmEMcGVyY2VudC5kZXZhEHF1b3Rlc2luZ2xlLmRldmEOcGFyZW5sZWZ0LmRldmEPcGFyZW5yaWdodC5kZXZhDWFzdGVyaXNrLmRldmEJcGx1cy5kZXZhCmNvbW1hLmRldmELaHlwaGVuLmRldmELcGVyaW9kLmRldmEKc2xhc2guZGV2YQl6ZXJvLmRldmEIb25lLmRldmEIdHdvLmRldmEKdGhyZWUuZGV2YQlmb3VyLmRldmEJZml2ZS5kZXZhCHNpeC5kZXZhCnNldmVuLmRldmEKZWlnaHQuZGV2YQluaW5lLmRldmEKY29sb24uZGV2YQ5zZW1pY29sb24uZGV2YQlsZXNzLmRldmEKZXF1YWwuZGV2YQxncmVhdGVyLmRldmENcXVlc3Rpb24uZGV2YRBicmFja2V0bGVmdC5kZXZhDmJhY2tzbGFzaC5kZXZhEWJyYWNrZXRyaWdodC5kZXZhEGFzY2lpY2lyY3VtLmRldmEPdW5kZXJzY29yZS5kZXZhDmJyYWNlbGVmdC5kZXZhCGJhci5kZXZhD2JyYWNlcmlnaHQuZGV2YQ9hc2NpaXRpbGRlLmRldmEMbmJzcGFjZS5kZXZhC2VuZGFzaC5kZXZhC2VtZGFzaC5kZXZhDnF1b3RlbGVmdC5kZXZhD3F1b3RlcmlnaHQuZGV2YRFxdW90ZWRibGxlZnQuZGV2YRJxdW90ZWRibHJpZ2h0LmRldmENZWxsaXBzaXMuZGV2YQ1tdWx0aXBseS5kZXZhC2RpdmlkZS5kZXZhCm1pbnVzLmRldmEAAAEAAAAKADAAPgAEREZMVAAaY3lybAAaZ3JlawAabGF0bgAaAAQAAAAA//8AAQAAAAFrZXJuAAgAAAABAAAAAQAEAAIACAACCJIACgACBPIABAAABzoFsAAZABkAAAAAAAAAAAAAAAAAAP/sAAAAAAAAAAAAAAAAAAAAAAAA//b/9gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/sAAAAAAAA//YAAP/2AAAAAAAA/9j/4gAAAAAAAP/2AAAAAAAAAAAAAAAA/+wAAAAAAAAAAAAAAAD/xAAA/9gAAAAAAAAAAP+6AAD/ugAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/9gAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//YAAAAAAAAAAAAAAAAAAAAAAAD/7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyAAAAAAAAAAD/zv/s/+L/zv/EAAAAAAAAAAAAAAAAAAD/2P/O/8QAAP/sAAAAAAAAAAD/4v+wAAAAAP/EAAD/4v/Y/7oAAAAAAAAACgAAABQAAP/i/+IAAAAUAAAAAAAAAAAAAAAAAAD/sAAA/+z/9v/2/+z/2AAAAAAAAAAAAAAAAAAA//b/9v/OAAAAAAAAAAAAAAAA//b/4gAAAAAAAP/sAAAAAAAA//YAAAAA/+IAAP/sAAAAAAAAAAD/7AAA/7AAAAAAAAAAAAAAAAAAAAAA/+wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAD/uv/s/87/sP+6AAD/7AAAAAAAAAAAAAD/xP+6/8QAFP/YAAD/2AAAAAD/4v/EAAAAAP/sAAAAAP/sAAAAAAAAAAAAAAAAAAAAAAAA//b/YAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/9gAAAAAAAAAAAAAAAAAAAAAAAAAAP/OAAAAAAAA/+wAAAAA/8QAAP/EAAAAAAAAAAD/ugAAAAAAAAAAAAAAAAAAAAAAAAAA//YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+wAAAAAAAD/7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/7AAAAAD/7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/sAAA/+IAAAAAAAAAAP/EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/iAAD/9gAAAAAAAAAA/+IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+wAAAAAADwAAAAAACgAAAAAAAAAAAAAAAAAAAAA/84AAAAAAAAAAAAAAAAAAAAAAAD/fgAAAAAAAAAA//YAAAAA/+z/4gACAB8ABQAFAAAACgAKAAEADwARAAIAJAAkAAUAJgAoAAYALgAvAAkAMgA0AAsANwA9AA4ARABFABUASABJABcASwBLABkAUABTABoAVQBVAB4AVwBXAB8AWQBcACAAbQBtACQAfQB9ACUAggCNACYAkgCSADIAlACYADMAmgCgADgAogCoAD8AqgCtAEYAsACyAEoAtAC4AE0AugC6AFIAvwDCAFMAxADFAFcAygDRAFkA1gDXAGEA6QDpAGMAAgBBAAUABQASAAoACgASAAwADAAVAA8ADwAPABAAEAATABEAEQAPACQAJAAFACYAJgACACoAKgACADIAMgACADQANAACADcANwAQADgAOAAGADkAOgALADwAPAAJAD0APQAUAEAAQAAVAEQARAAEAEUARQAIAEYASAABAEkASQAKAEoASgAOAEsASwAIAE4ATwAIAFAAUQADAFIAUgABAFMAUwADAFQAVAABAFUAVQADAFYAVgANAFcAVwAMAFgAWAADAFkAXAAHAF0AXQARAGAAYAAVAG0AbQAXAH0AfQAWAIIAhwAFAIgAiAAYAIkAiQACAJQAmAACAJoAmgACAJsAngAGAJ8AnwAJAKIAogABAKMAqAAEAKkArQABALQAuAABALoAugABALsAvgADAL8AvwAHAMAAwAAIAMEAwQAHAMMAwwAIAMQAxAACAMUAxQABAMoAywATAM0AzQASAM4AzgAPANAA0AASANEA0QAPANMA0wAPANYA1gAXANcA1wAWAOkA7QAKAAIANwAFAAUACQAKAAoACQAPAA8AEQAQABAAEAARABEAEQAkACQAAwAmACYADAAnACcAAgAoACgABAAuAC4AEwAvAC8ACwAyADIAAgAzADMAGAA0ADQAAgA3ADcADgA4ADgABgA5ADoACgA7ADsAEwA8ADwACAA9AD0AEgBEAEQAAQBJAEkAFwBLAEsAAQBQAFEAAQBVAFUADwBXAFcADQBZAFoABQBbAFsAFABcAFwABQBtAG0AFgB9AH0AFQCCAIcAAwCIAIgABACJAIkADACKAI0ABACSAJIAAgCUAJgAAgCaAJoAAgCbAJ4ABgCfAJ8ACACg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`;

const PDF_FONT_NAME = "NotoSansRegular";

type FontTableDirectory = Record<string, { offset: number; length: number }>;

type EmbeddedFontInfo = {
  data: Uint8Array;
  cmap: Map<number, number>;
  fallbackGlyphId: number;
  unitsPerEm: number;
  ascent: number;
  descent: number;
  capHeight: number;
  fontBBox: [number, number, number, number];
  numOfLongHorMetrics: number;
  hmtxView: DataView;
};

type PdfFontEncoder = {
  encodeText: (value: string) => string;
  getGlyphUsage: () => Map<number, number>;
};

let embeddedFontCache: EmbeddedFontInfo | null = null;

function getEmbeddedFontInfo(): EmbeddedFontInfo {
  if (embeddedFontCache) {
    return embeddedFontCache;
  }

  const data = decodeBase64ToUint8Array(NOTO_SANS_FONT_BASE64);
  const tables = parseFontTableDirectory(data);
  const cmap = parseCmapTable(data, tables);
  const fallbackGlyphId = cmap.get(63) ?? cmap.get(32) ?? 0;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const headEntry = tables["head"];
  const hheaEntry = tables["hhea"];
  const hmtxEntry = tables["hmtx"];

  if (!headEntry || !hheaEntry || !hmtxEntry) {
    throw new Error("Missing TrueType font tables required for PDF export.");
  }

  const unitsPerEm = view.getUint16(headEntry.offset + 18);
  const fontBBox: [number, number, number, number] = [
    view.getInt16(headEntry.offset + 36),
    view.getInt16(headEntry.offset + 38),
    view.getInt16(headEntry.offset + 40),
    view.getInt16(headEntry.offset + 42),
  ];

  const ascent = view.getInt16(hheaEntry.offset + 4);
  const descent = view.getInt16(hheaEntry.offset + 6);
  const numOfLongHorMetrics = view.getUint16(hheaEntry.offset + 34);

  let capHeight = ascent;
  const os2Entry = tables["OS/2"];
  if (os2Entry) {
    const version = view.getUint16(os2Entry.offset);
    const capHeightOffset = os2Entry.offset + 88;
    if (version >= 2 && capHeightOffset + 2 <= os2Entry.offset + os2Entry.length) {
      capHeight = view.getInt16(capHeightOffset) || capHeight;
    }
  }

  const hmtxView = new DataView(data.buffer, data.byteOffset + hmtxEntry.offset, hmtxEntry.length);

  embeddedFontCache = {
    data,
    cmap,
    fallbackGlyphId,
    unitsPerEm: unitsPerEm || 1000,
    ascent,
    descent,
    capHeight,
    fontBBox,
    numOfLongHorMetrics: Math.max(1, numOfLongHorMetrics),
    hmtxView,
  };

  return embeddedFontCache;
}

function decodeBase64ToUint8Array(base64: string) {
  const sanitized = base64.replace(/\s+/g, "");
  if (typeof atob === "function") {
    const binaryString = atob(sanitized);
    const length = binaryString.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  const globalBuffer = typeof globalThis !== "undefined" ? (globalThis as { Buffer?: { from: (input: string, encoding: string) => Uint8Array } }).Buffer : undefined;
  if (globalBuffer) {
    const buffer = globalBuffer.from(sanitized, "base64") as unknown as Uint8Array & { buffer: ArrayBuffer; byteOffset: number; length: number };
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length);
  }

  throw new Error("Base64 decoding is not supported in this environment.");
}

function parseFontTableDirectory(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const numTables = view.getUint16(4);
  const tables: FontTableDirectory = {};
  let offset = 12;

  for (let index = 0; index < numTables; index += 1) {
    const tag =
      String.fromCharCode(view.getUint8(offset)) +
      String.fromCharCode(view.getUint8(offset + 1)) +
      String.fromCharCode(view.getUint8(offset + 2)) +
      String.fromCharCode(view.getUint8(offset + 3));

    const tableOffset = view.getUint32(offset + 8);
    const length = view.getUint32(offset + 12);
    tables[tag] = { offset: tableOffset, length };
    offset += 16;
  }

  return tables;
}

function parseCmapTable(data: Uint8Array, tables: FontTableDirectory) {
  const cmapEntry = tables["cmap"];
  if (!cmapEntry) {
    throw new Error("Font is missing cmap table.");
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const tableOffset = cmapEntry.offset;
  const numTables = view.getUint16(tableOffset + 2);

  let chosenOffset: number | null = null;

  for (let index = 0; index < numTables; index += 1) {
    const recordOffset = tableOffset + 4 + index * 8;
    const platformId = view.getUint16(recordOffset);
    const encodingId = view.getUint16(recordOffset + 2);
    const subtableOffset = view.getUint32(recordOffset + 4);
    const format = view.getUint16(tableOffset + subtableOffset);

    if (format === 4 && platformId === 3 && (encodingId === 1 || encodingId === 0)) {
      chosenOffset = tableOffset + subtableOffset;
      break;
    }
  }

  if (chosenOffset == null) {
    throw new Error("Unsupported cmap format in embedded font.");
  }

  return parseCmapFormat4(new DataView(data.buffer, data.byteOffset, data.byteLength), chosenOffset);
}

function parseCmapFormat4(view: DataView, offset: number) {
  const segCount = view.getUint16(offset + 6) / 2;
  const endCountOffset = offset + 14;
  const startCountOffset = endCountOffset + 2 * segCount + 2;
  const idDeltaOffset = startCountOffset + 2 * segCount;
  const idRangeOffsetOffset = idDeltaOffset + 2 * segCount;
  const cmap = new Map<number, number>();

  for (let segment = 0; segment < segCount; segment += 1) {
    const endCode = view.getUint16(endCountOffset + 2 * segment);
    const startCode = view.getUint16(startCountOffset + 2 * segment);
    const idDelta = view.getInt16(idDeltaOffset + 2 * segment);
    const idRangeOffset = view.getUint16(idRangeOffsetOffset + 2 * segment);

    for (let codePoint = startCode; codePoint <= endCode; codePoint += 1) {
      let glyphId: number;
      if (idRangeOffset === 0) {
        glyphId = (codePoint + idDelta) & 0xffff;
      } else {
        const glyphOffset =
          idRangeOffsetOffset +
          2 * segment +
          idRangeOffset +
          2 * (codePoint - startCode);

        if (glyphOffset >= view.byteLength) {
          continue;
        }

        const glyphIndex = view.getUint16(glyphOffset);
        if (glyphIndex === 0) {
          continue;
        }
        glyphId = (glyphIndex + idDelta) & 0xffff;
      }

      cmap.set(codePoint, glyphId);
    }
  }

  return cmap;
}

function createPdfFontEncoder(font: EmbeddedFontInfo): PdfFontEncoder {
  const glyphUsage = new Map<number, number>();

  const encodeText = (value: string) => {
    if (!value) {
      return "";
    }

    const normalized = typeof value.normalize === "function" ? value.normalize("NFC") : value;
    const glyphIds: number[] = [];

    for (const char of normalized) {
      const codePoint = char.codePointAt(0) ?? 32;
      const glyphId = font.cmap.get(codePoint) ?? font.fallbackGlyphId;
      if (!glyphUsage.has(glyphId)) {
        glyphUsage.set(glyphId, codePoint);
      }
      glyphIds.push(glyphId);
    }

    return glyphIds.map((glyphId) => glyphId.toString(16).padStart(4, "0")).join("");
  };

  return {
    encodeText,
    getGlyphUsage: () => glyphUsage,
  };
}

function getGlyphAdvanceWidth(glyphId: number, font: EmbeddedFontInfo) {
  if (glyphId < font.numOfLongHorMetrics) {
    return font.hmtxView.getUint16(glyphId * 4);
  }

  const lastMetricOffset = (font.numOfLongHorMetrics - 1) * 4;
  return font.hmtxView.getUint16(lastMetricOffset);
}

function buildWidthDefinition(entries: Array<[number, number]>) {
  if (entries.length === 0) {
    return "";
  }

  const sorted = entries.slice().sort((first, second) => first[0] - second[0]);
  const chunks: string[] = [];
  let currentStart = sorted[0][0];
  let currentWidths: number[] = [sorted[0][1]];

  for (let index = 1; index < sorted.length; index += 1) {
    const [glyphId, width] = sorted[index];
    const previousGlyphId = sorted[index - 1][0];

    if (glyphId === previousGlyphId + 1) {
      currentWidths.push(width);
    } else {
      chunks.push(`${currentStart} [${currentWidths.join(" ")}]`);
      currentStart = glyphId;
      currentWidths = [width];
    }
  }

  chunks.push(`${currentStart} [${currentWidths.join(" ")}]`);
  return chunks.join(" ");
}

function createToUnicodeCMap(glyphUsage: Map<number, number>) {
  const entries = Array.from(glyphUsage.entries()).sort((first, second) => first[0] - second[0]);
  const lines = [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> def",
    `/CMapName /${PDF_FONT_NAME}Unicode def`,
    "/CMapType 2 def",
    "1 begincodespacerange",
    "<0000> <FFFF>",
    "endcodespacerange",
  ];

  const chunkSize = 100;
  for (let index = 0; index < entries.length; index += chunkSize) {
    const chunk = entries.slice(index, index + chunkSize);
    lines.push(`${chunk.length} beginbfchar`);
    chunk.forEach(([glyphId, codePoint]) => {
      lines.push(`<${glyphId.toString(16).padStart(4, "0")}> <${codePointToHex(codePoint)}>`);
    });
    lines.push("endbfchar");
  }

  lines.push("endcmap");
  lines.push("CMapName currentdict /CMap defineresource pop");
  lines.push("end");
  lines.push("end");

  return lines.join("\n");
}

function codePointToHex(codePoint: number) {
  if (codePoint <= 0xffff) {
    return codePoint.toString(16).padStart(4, "0");
  }

  const offset = codePoint - 0x10000;
  const highSurrogate = 0xd800 + (offset >> 10);
  const lowSurrogate = 0xdc00 + (offset & 0x3ff);
  return `${highSurrogate.toString(16).padStart(4, "0")}${lowSurrogate.toString(16).padStart(4, "0")}`;
}

function toAsciiHex(data: Uint8Array) {
  const parts: string[] = [];
  for (let index = 0; index < data.length; index += 1) {
    parts.push(data[index].toString(16).padStart(2, "0"));
    if ((index + 1) % 64 === 0) {
      parts.push("\n");
    }
  }
  return parts.join("");
}

export type DocumentListSortField =
  | "id"
  | "imie"
  | "nazwisko"
  | "pesel"
  | "data_wypadku"
  | "miejsce_wypadku";

export interface DocumentListOptions {
  page?: number;
  pageSize?: number;
  search?: string | null;
  sort?: DocumentListSortField | null;
  direction?: "asc" | "desc" | null;
}

export interface DocumentListResponse {
  items: Document[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export type CreateDocumentInput = Partial<Document>;

export interface DocumentService {
  list(options?: DocumentListOptions): Promise<DocumentListResponse>;
  getById(id: number): Promise<Document | null>;
  create(payload: CreateDocumentInput): Promise<Document>;
  downloadAttachment(id: number, format: "docx" | "pdf"): Promise<void>;
  setExportFormat(format: DocumentExportFormat): void;
}

interface DocumentApi {
  list(options?: DocumentListOptions): Promise<DocumentListResponseDto>;
  getById(id: number): Promise<DocumentDetailDto | null>;
  create(payload: CreateDocumentDto): Promise<DocumentDetailDto>;
  downloadAttachment(id: number, format: "docx" | "pdf"): Promise<void>;
  setExportFormat(format: DocumentExportFormat): void;
}

class DefaultDocumentService implements DocumentService {
  constructor(private readonly api: DocumentApi) {}

  setExportFormat(format: DocumentExportFormat) {
    this.api.setExportFormat(format);
  }

  async list(options?: DocumentListOptions): Promise<DocumentListResponse> {
    const responseDto = await this.api.list(options);
    return {
      items: responseDto.items.map(mapDocumentListItemDtoToDocument),
      totalCount: responseDto.totalCount,
      totalPages: responseDto.totalPages,
      page: responseDto.page,
      pageSize: responseDto.pageSize,
    } satisfies DocumentListResponse;
  }

  async getById(id: number): Promise<Document | null> {
    const dto = await this.api.getById(id);
    return dto ? mapDocumentDetailDtoToDocument(dto) : null;
  }

  async create(payload: CreateDocumentInput): Promise<Document> {
    const dtoPayload = mapPartialDocumentToCreateDto(payload);
    const createdDto = await this.api.create(dtoPayload);
    return mapDocumentDetailDtoToDocument(createdDto);
  }

  async downloadAttachment(id: number, format: "docx" | "pdf") {
    await this.api.downloadAttachment(id, format);
  }
}

class MockDocumentApi implements DocumentApi {
  private documents: DocumentDetailDto[];
  private pendingExportFormat: DocumentExportFormat | null = null;
  private nextId: number;

  constructor(seed: Document[]) {
    this.documents = seed.map((document) => this.cloneDto(mapDocumentToDetailDto(document)));
    this.nextId = this.calculateNextId();
  }

  setExportFormat(format: DocumentExportFormat) {
    this.pendingExportFormat = format;
  }

  private consumeExportFormat() {
    const format = this.pendingExportFormat;
    this.pendingExportFormat = null;
    return format;
  }

  async list(options?: DocumentListOptions): Promise<DocumentListResponseDto> {
    await delay();

    const sortField: DocumentListSortField = options?.sort && this.isSortableField(options.sort)
      ? options.sort
      : "data_wypadku";
    const direction: "asc" | "desc" = options?.direction === "asc" || options?.direction === "desc"
      ? options.direction
      : sortField === "data_wypadku"
        ? "desc"
        : "asc";

    const normalizedPageSize = this.normalizePositiveInteger(options?.pageSize, 10);
    const normalizedPage = this.normalizePositiveInteger(options?.page, 1);
    const searchTerm = options?.search?.trim().toLowerCase() ?? "";

    const filtered = this.documents.filter((document) => {
      if (!searchTerm) {
        return true;
      }

      const haystack = [
        document.imie,
        document.nazwisko,
        document.pesel,
        document.miejsce_wypadku,
        document.rodzaj_urazow,
        document.szczegoly_okolicznosci,
        document.organ_postepowania ?? "",
      ];

      return haystack.some((value) => value.toLowerCase().includes(searchTerm));
    });

    const sorted = filtered.slice().sort((first, second) => {
      const firstValue = this.getComparableValue(first, sortField);
      const secondValue = this.getComparableValue(second, sortField);

      if (firstValue === secondValue) {
        return 0;
      }

      if (firstValue == null) {
        return direction === "asc" ? -1 : 1;
      }

      if (secondValue == null) {
        return direction === "asc" ? 1 : -1;
      }

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return direction === "asc" ? firstValue - secondValue : secondValue - firstValue;
      }

      return direction === "asc"
        ? firstValue.toString().localeCompare(secondValue.toString(), "pl")
        : secondValue.toString().localeCompare(firstValue.toString(), "pl");
    });

    const totalCount = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / normalizedPageSize));
    const safePage = Math.min(normalizedPage, totalPages);
    const startIndex = (safePage - 1) * normalizedPageSize;
    const paged = sorted.slice(startIndex, startIndex + normalizedPageSize).map((document) => this.cloneDto(document));

    const response: DocumentListResponseDto = {
      items: paged,
      totalCount,
      totalPages,
      page: safePage,
      pageSize: normalizedPageSize,
    } satisfies DocumentListResponseDto;

    const format = this.consumeExportFormat();
    if (!format || (format === "csv" && typeof document === "undefined")) {
      return response;
    }

    this.handleExport(format, sorted);
    return { ...response, items: [] } satisfies DocumentListResponseDto;
  }

  async getById(id: number): Promise<DocumentDetailDto | null> {
    await delay();
    const found = this.documents.find((document) => document.id === id);
    return found ? this.cloneDto(found) : null;
  }

  async create(payload: CreateDocumentDto): Promise<DocumentDetailDto> {
    await delay();
    const newId = this.generateId();
    const { witnesses: payloadWitnesses, ...restPayload } = payload;

    const base = mapDocumentToDetailDto(defaultDocumentData);
    const newDocument: DocumentDetailDto = {
      ...base,
      ...restPayload,
      id: newId,
      witnesses:
        payloadWitnesses && payloadWitnesses.length > 0
          ? payloadWitnesses.map((witness) => ({
              ...witness,
              documentId: witness.documentId ?? newId,
              id: witness.id,
            }))
          : undefined,
    };

    const storedDocument = this.cloneDto(newDocument);
    this.documents = [storedDocument, ...this.documents];
    return this.cloneDto(storedDocument);
  }

  async downloadAttachment(id: number, format: "docx" | "pdf"): Promise<void> {
    await delay();
    const found = this.documents.find((document) => document.id === id);
    if (!found) {
      throw new Error("Nie znaleziono zgłoszenia do pobrania.");
    }

    const domainDocument = mapDocumentDetailDtoToDocument(found);
    downloadDocumentSummary(domainDocument, format, {
      fileName: `zgloszenie-${id}.${format === "pdf" ? "pdf" : "docx"}`,
    });
  }

  private handleExport(format: DocumentExportFormat, documents: DocumentDetailDto[]) {
    const domainDocuments = documents.map(mapDocumentDetailDtoToDocument);
    switch (format) {
      case "excel":
        downloadExcel(domainDocuments);
        break;
      case "json":
        downloadJson(domainDocuments);
        break;
      case "pdf":
        downloadPdf(domainDocuments);
        break;
      default:
        break;
    }
  }

  private isSortableField(field: string): field is DocumentListSortField {
    return ["id", "imie", "nazwisko", "pesel", "data_wypadku", "miejsce_wypadku"].includes(field as DocumentListSortField);
  }

  private getComparableValue(document: DocumentDetailDto, field: DocumentListSortField) {
    switch (field) {
      case "id":
        return document.id ?? null;
      case "imie":
        return document.imie;
      case "nazwisko":
        return document.nazwisko;
      case "pesel":
        return document.pesel;
      case "miejsce_wypadku":
        return document.miejsce_wypadku;
      case "data_wypadku":
        return document.data_wypadku;
      default:
        return null;
    }
  }

  private normalizePositiveInteger(value: number | null | undefined, fallback: number) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return fallback;
    }
    return Math.max(1, Math.floor(value));
  }

  private calculateNextId() {
    return (this.documents.reduce((acc, document) => Math.max(acc, document.id ?? 0), 0) || 0) + 1;
  }

  private generateId() {
    const id = this.nextId;
    this.nextId += 1;
    return id;
  }

  private cloneDto(document: DocumentDetailDto): DocumentDetailDto {
    return {
      ...document,
      witnesses: document.witnesses?.map((witness) => ({ ...witness })),
    } satisfies DocumentDetailDto;
  }
}

function downloadExcel(items: Document[]) {
  const headerRow = EXPORT_COLUMNS.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
  const bodyRows = items
    .map((document) => {
      const cells = EXPORT_COLUMNS.map((column) => `<td>${escapeHtml(column.accessor(document))}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const html = `\uFEFF<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40" lang="pl">
  <head>
    <meta charset="UTF-8" />
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>Zgłoszenia</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines />
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
  </head>
  <body>
    <table border="1">
      <thead><tr>${headerRow}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </body>
</html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  downloadBlob(blob, "xls");
}

function downloadJson(items: Document[]) {
  const payload = items.map((document) => {
    const result: Record<string, string | number | boolean | null> = {};
    EXPORT_COLUMNS.forEach((column) => {
      result[column.label] = column.accessor(document);
    });
    return result;
  });

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
  downloadBlob(blob, "json");
}

void createTablePdfBlob;

function downloadPdf(items: Document[]) {
  if (typeof window === "undefined") {
    return;
  }

  const headers = PDF_TABLE_COLUMNS.map((column) => column.label);
  const rows =
    items.length > 0
      ? items.map((document) => PDF_TABLE_COLUMNS.map((column) => column.accessor(document)))
      : [
          PDF_TABLE_COLUMNS.map((_, columnIndex) =>
            columnIndex === 0 ? "Brak dokumentów spełniających bieżące kryteria." : ""
          ),
        ];

  void (async () => {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const autoTable = (autoTableModule as typeof import("jspdf-autotable")).default;
    if (!autoTable) {
      return;
    }
    const doc = new jsPDF({ orientation: "landscape", unit: "pt" });

    autoTable(doc, {
      head: [headers],
      body: rows,
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [16, 61, 122], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 247, 252] },
      margin: { top: 40, bottom: 30, left: 40, right: 40 },
    });

    doc.save(`${EXPORT_FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.pdf`);
  })();
}

function createDocumentSummaryPdf(document: Document) {
  const headers = ["Pole", "Wartość"];
  const rows = buildDocumentSummaryRows(document);
  return createTablePdfBlob(headers, rows, { columnLengthHints: [18, 42], maxLinesPerCell: 6 });
}

function createDocumentSummaryDocx(document: Document) {
  const rows = buildDocumentSummaryRows(document);
  const issuedAt = new Date().toLocaleString("pl-PL", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const sections = rows
    .map(([label, value]) => `<p><strong>${escapeHtmlBasic(label)}:</strong> ${escapeHtmlPreservingBreaks(value)}</p>`)
    .join("\n");

  const html = `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8" /><title>Zawiadomienie o wypadku</title><style>body{font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1c2333;}h1{font-size:20px;margin-bottom:16px;}p{margin:8px 0;}strong{color:#103d7a;}</style></head><body><h1>Zawiadomienie o wypadku</h1><p>Wygenerowano: ${escapeHtmlBasic(issuedAt)}</p>${sections}</body></html>`;

  return new Blob([html], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8",
  });
}

type DownloadDocumentSummaryOptions = {
  fileName?: string;
};

export function downloadDocumentSummary(
  document: Document,
  format: "docx" | "pdf",
  options: DownloadDocumentSummaryOptions = {}
) {
  const targetFileName = buildSummaryFileName(format, options.fileName);

  if (format === "pdf") {
    const pdfBlob = createDocumentSummaryPdf(document);
    downloadBlobWithName(pdfBlob, targetFileName);
    return;
  }

  const docxBlob = createDocumentSummaryDocx(document);
  downloadBlobWithName(docxBlob, targetFileName);
}

function buildDocumentSummaryRows(document: Document): string[][] {
  const rows: Array<[string, string]> = [
    ["Numer zgłoszenia", formatSummaryValue(document.id != null ? document.id.toString() : null)],
    ["Imię i nazwisko", formatSummaryValue(`${document.imie ?? ""} ${document.nazwisko ?? ""}`)],
    ["PESEL", formatSummaryValue(document.pesel)],
    ["Numer dokumentu tożsamości", formatSummaryValue(document.nr_dowodu)],
    ["Adres zamieszkania", formatSummaryValue(formatSummaryAddress(document))],
    ["Telefon kontaktowy", formatSummaryValue(document.numer_telefonu)],
    [
      "Data i godzina wypadku",
      formatSummaryValue(formatSummaryDateTime(document.data_wypadku, document.godzina_wypadku)),
    ],
    ["Miejsce wypadku", formatSummaryValue(document.miejsce_wypadku)],
    ["Czy udzielono pierwszej pomocy", formatSummaryBoolean(document.czy_udzielona_pomoc)],
    ["Opis okoliczności", formatSummaryValue(document.szczegoly_okolicznosci)],
    ["Maszyny i urządzenia", formatSummaryValue(document.opis_maszyn)],
    ["Świadkowie", formatWitnessList(document)],
  ];

  return rows.map(([label, value]) => [label, value]);
}

function formatSummaryValue(value: string | number | null | undefined) {
  const normalized = normalizeSummaryValue(value);
  return normalized.length > 0 ? normalized : "Brak danych";
}

function normalizeSummaryValue(value: string | number | null | undefined) {
  if (value == null) {
    return "";
  }

  const asString = typeof value === "number" ? value.toString() : value;
  return asString.trim();
}

function formatSummaryDateTime(date: string | null | undefined, time: string | null | undefined) {
  const normalizedDate = normalizeSummaryValue(date);
  const normalizedTime = normalizeSummaryValue(time ? time.slice(0, 5) : time);
  return [normalizedDate, normalizedTime].filter(Boolean).join(" ");
}

function formatSummaryAddress(document: Document) {
  const street = normalizeSummaryValue(document.ulica);
  const house = normalizeSummaryValue(document.nr_domu);
  const flat = normalizeSummaryValue(document.nr_lokalu);
  const postal = normalizeSummaryValue(document.kod_pocztowy);
  const city = normalizeSummaryValue(document.miejscowosc);
  const country = normalizeSummaryValue(document.nazwa_panstwa);

  const parts: string[] = [];
  const streetLine: string[] = [];

  if (street) {
    streetLine.push(street);
  }

  if (house || flat) {
    const numberParts = [house, flat].filter(Boolean);
    if (numberParts.length > 0) {
      streetLine.push(numberParts.join("/"));
    }
  }

  if (streetLine.length > 0) {
    parts.push(streetLine.join(" "));
  }

  const locality: string[] = [];
  if (postal && city) {
    locality.push(`${postal} ${city}`);
  } else {
    if (postal) {
      locality.push(postal);
    }
    if (city) {
      locality.push(city);
    }
  }

  if (locality.length > 0) {
    parts.push(locality.join(" "));
  }

  if (country) {
    parts.push(country);
  }

  return parts.join(", ");
}

function formatSummaryBoolean(value: boolean | null | undefined) {
  if (value === true) {
    return "Tak";
  }
  if (value === false) {
    return "Nie";
  }
  return "Brak danych";
}

function formatWitnessList(document: Document) {
  const names = (document.witnesses ?? [])
    .map((witness) => normalizeSummaryValue(`${witness.imie ?? ""} ${witness.nazwisko ?? ""}`))
    .filter((name) => name.length > 0);

  return names.length > 0 ? names.join(", ") : "Brak świadków";
}

function escapeHtmlBasic(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlPreservingBreaks(value: string) {
  return escapeHtmlBasic(value).replace(/\r\n|\r|\n/g, "<br />");
}

function formatPdfIncidentDate(document: Document) {
  if (!document.data_wypadku && !document.godzina_wypadku) {
    return "Brak danych";
  }

  const date = document.data_wypadku ?? "";
  const time = (document.godzina_wypadku ?? "").slice(0, 5);
  return time ? `${date} ${time}`.trim() : date;
}

function normalizeCellValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function escapeHtml(value: string) {
  return normalizeCellValue(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const sharedTextEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

type CreateTablePdfOptions = {
  columnLengthHints?: number[];
  maxLinesPerCell?: number;
};

type PreparedPdfRow = {
  cells: string[][];
  height: number;
  rowIndex: number;
};

function createTablePdfBlob(headers: string[], rows: string[][], options: CreateTablePdfOptions = {}) {
  const PDF_PAGE_WIDTH = 612;
  const PDF_PAGE_HEIGHT = 792;
  const PAGE_MARGIN = 40;
  const HEADER_HEIGHT = 28;
  const FOOTER_HEIGHT = 32;
  const HEADER_FONT_SIZE = 11;
  const ROW_FONT_SIZE = 10;
  const ROW_LINE_HEIGHT = ROW_FONT_SIZE + 4;
  const CELL_PADDING = 6;
  const MAX_LINES_PER_CELL = Math.max(1, options.maxLinesPerCell ?? 2);
  const tableWidth = PDF_PAGE_WIDTH - PAGE_MARGIN * 2;
  const generatedAt = new Date().toISOString().slice(0, 10);
  const fontInfo = getEmbeddedFontInfo();
  const fontEncoder = createPdfFontEncoder(fontInfo);
  const columnLengthHints = options.columnLengthHints ?? [];

  const columnWeights = headers.map((header, columnIndex) => {
    const longestValue = rows.reduce((acc, row) => Math.max(acc, row[columnIndex]?.length ?? 0), header.length);
    const lengthHint = columnLengthHints[columnIndex] ?? 0;
    return Math.max(6, longestValue, lengthHint);
  });
  const totalWeight = columnWeights.reduce((sum, weight) => sum + weight, 0);
  const columnWidths = columnWeights.map((weight) => (weight / totalWeight) * tableWidth);

  const preparedRows: PreparedPdfRow[] = rows.map((row, rowIndex) => {
    const cellLines = row.map((cell, columnIndex) =>
      wrapCellText(cell, columnWidths[columnIndex], ROW_FONT_SIZE, CELL_PADDING, MAX_LINES_PER_CELL)
    );
    const maxCellLines = cellLines.reduce((acc, cellLine) => Math.max(acc, cellLine.length), 1);
    const rowHeight = ROW_LINE_HEIGHT * maxCellLines + CELL_PADDING * 2;
    return { cells: cellLines, height: rowHeight, rowIndex };
  });

  const availableHeight = PDF_PAGE_HEIGHT - PAGE_MARGIN * 2 - FOOTER_HEIGHT - HEADER_HEIGHT;
  const pages = paginatePreparedRows(preparedRows, availableHeight);
  const totalPages = Math.max(1, pages.length);

  const pageStreams = pages.map((pageRows, pageIndex) =>
    buildTablePageStream({
      headers,
      rows: pageRows,
      columnWidths,
      columnCount: headers.length,
      pageIndex,
      totalPages,
      dimensions: { width: PDF_PAGE_WIDTH, height: PDF_PAGE_HEIGHT },
      layout: {
        margin: PAGE_MARGIN,
        headerHeight: HEADER_HEIGHT,
        footerHeight: FOOTER_HEIGHT,
        headerFontSize: HEADER_FONT_SIZE,
        rowFontSize: ROW_FONT_SIZE,
        cellPadding: CELL_PADDING,
        rowLineHeight: ROW_LINE_HEIGHT,
      },
      generatedAt,
      font: fontEncoder,
    })
  );

  const pageCount = Math.max(1, pageStreams.length);
  const type0FontObjectId = 3 + 2 * pageCount;
  const cidFontObjectId = type0FontObjectId + 1;
  const fontDescriptorObjectId = type0FontObjectId + 2;
  const fontFileObjectId = type0FontObjectId + 3;
  const toUnicodeObjectId = type0FontObjectId + 4;

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  const pageReferences = Array.from({ length: pageCount }, (_, index) => `${3 + index} 0 R`).join(" ");
  objects.push(`2 0 obj\n<< /Type /Pages /Count ${pageCount} /Kids [${pageReferences}] >>\nendobj`);

  pageStreams.forEach((_, index) => {
    const contentId = 3 + pageCount + index;
    const pageObject = [
      `${3 + index} 0 obj`,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}]`,
      `/Contents ${contentId} 0 R`,
      `/Resources << /Font << /F1 ${type0FontObjectId} 0 R >> >>`,
      ">>",
      "endobj",
    ].join("\n");
    objects.push(pageObject);
  });

  pageStreams.forEach((stream, index) => {
    const contentLength = getPdfByteLength(stream);
    const contentObject = [
      `${3 + pageCount + index} 0 obj`,
      `<< /Length ${contentLength} >>`,
      "stream",
      stream,
      "endstream",
      "endobj",
    ].join("\n");
    objects.push(contentObject);
  });

  const glyphUsage = fontEncoder.getGlyphUsage();
  if (glyphUsage.size === 0) {
    glyphUsage.set(fontInfo.fallbackGlyphId, 32);
  }

  const widthEntries = Array.from(glyphUsage.keys()).map((glyphId) => {
    const advanceWidth = getGlyphAdvanceWidth(glyphId, fontInfo);
    const scaledWidth = Math.round((advanceWidth / fontInfo.unitsPerEm) * 1000);
    return [glyphId, scaledWidth] as [number, number];
  });

  const widthDefinition = buildWidthDefinition(widthEntries);
  const toUnicodeCMap = createToUnicodeCMap(glyphUsage);
  const fontHexData = toAsciiHex(fontInfo.data);
  const metricScale = 1000 / (fontInfo.unitsPerEm || 1000);
  const scaledAscent = Math.round(fontInfo.ascent * metricScale);
  const scaledDescent = Math.round(fontInfo.descent * metricScale);
  const scaledCapHeight = Math.round(fontInfo.capHeight * metricScale);
  const scaledBBox = fontInfo.fontBBox.map((value) => Math.round(value * metricScale));

  objects.push(
    `${type0FontObjectId} 0 obj\n<< /Type /Font /Subtype /Type0 /BaseFont /${PDF_FONT_NAME} /Encoding /Identity-H /DescendantFonts [${cidFontObjectId} 0 R] /ToUnicode ${toUnicodeObjectId} 0 R >>\nendobj`
  );

  objects.push(
    `${cidFontObjectId} 0 obj\n<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${PDF_FONT_NAME} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${fontDescriptorObjectId} 0 R /W [${widthDefinition}] /DW 600 /CIDToGIDMap /Identity >>\nendobj`
  );

  objects.push(
    `${fontDescriptorObjectId} 0 obj\n<< /Type /FontDescriptor /FontName /${PDF_FONT_NAME} /Flags 32 /FontBBox [${scaledBBox.join(
      " "
    )}] /Ascent ${scaledAscent} /Descent ${scaledDescent} /CapHeight ${scaledCapHeight} /ItalicAngle 0 /StemV 80 /FontFile2 ${fontFileObjectId} 0 R >>\nendobj`
  );

  objects.push(
    [
      `${fontFileObjectId} 0 obj`,
      `<< /Length ${fontHexData.length + 2} /Length1 ${fontInfo.data.length} /Filter /ASCIIHexDecode >>`,
      "stream",
      `${fontHexData}>\n`,
      "endstream",
      "endobj",
    ].join("\n")
  );

  objects.push(
    `${toUnicodeObjectId} 0 obj\n<< /Length ${toUnicodeCMap.length} >>\nstream\n${toUnicodeCMap}\nendstream\nendobj`
  );

  return finalizePdf(objects);
}

function paginatePreparedRows(rows: PreparedPdfRow[], availableHeight: number) {
  if (rows.length === 0) {
    return [[]];
  }

  const safeAvailableHeight = Math.max(1, availableHeight);
  const pages: PreparedPdfRow[][] = [];
  let currentPage: PreparedPdfRow[] = [];
  let remainingHeight = safeAvailableHeight;

  for (const row of rows) {
    if (row.height > remainingHeight && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      remainingHeight = safeAvailableHeight;
    }

    if (row.height > safeAvailableHeight && currentPage.length === 0) {
      currentPage.push(row);
      pages.push(currentPage);
      currentPage = [];
      remainingHeight = safeAvailableHeight;
      continue;
    }

    currentPage.push(row);
    remainingHeight -= row.height;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [[]];
}

function buildTablePageStream({
  headers,
  rows,
  columnWidths,
  columnCount,
  pageIndex,
  totalPages,
  dimensions,
  layout,
  generatedAt,
  font,
}: {
  headers: string[];
  rows: PreparedPdfRow[];
  columnWidths: number[];
  columnCount: number;
  pageIndex: number;
  totalPages: number;
  dimensions: { width: number; height: number };
  layout: {
    margin: number;
    headerHeight: number;
    footerHeight: number;
    headerFontSize: number;
    rowFontSize: number;
    rowLineHeight: number;
    cellPadding: number;
  };
  generatedAt: string;
  font: PdfFontEncoder;
}) {
  const { height } = dimensions;
  const {
    margin,
    headerHeight,
    footerHeight,
    headerFontSize,
    rowFontSize,
    rowLineHeight,
    cellPadding,
  } = layout;

  const commands: string[] = [];
  const tableStartX = margin;
  const tableTopY = height - margin;
  const tableWidth = columnWidths.reduce((sum, columnWidth) => sum + columnWidth, 0);
  const rowsHeight = rows.reduce((sum, row) => sum + row.height, 0);
  const tableHeight = headerHeight + rowsHeight;
  const tableBottomY = tableTopY - tableHeight;
  const columnOffsets = columnWidths.map((_, index) =>
    columnWidths.slice(0, index).reduce((acc, columnWidth) => acc + columnWidth, tableStartX)
  );
  const footerY = margin - footerHeight / 2 + 4;
  const headerTextY = tableTopY - headerHeight / 2 + headerFontSize / 3;

  // Header background
  commands.push("0.92 0.95 1 rg");
  commands.push(`${tableStartX} ${tableTopY - headerHeight} ${tableWidth} ${headerHeight} re`);
  commands.push("f");

  // Zebra rows
  let currentRowTop = tableTopY - headerHeight;
  rows.forEach((row) => {
    const rowBottom = currentRowTop - row.height;
    if (row.rowIndex % 2 === 0) {
      commands.push("0.98 0.98 0.99 rg");
      commands.push(`${tableStartX} ${rowBottom} ${tableWidth} ${row.height} re`);
      commands.push("f");
    }
    currentRowTop = rowBottom;
  });

  // Table grid
  commands.push("0.78 0.81 0.87 RG");
  commands.push("0.5 w");
  const horizontalLines = [tableTopY, tableTopY - headerHeight];
  currentRowTop = tableTopY - headerHeight;
  rows.forEach((row) => {
    const rowBottom = currentRowTop - row.height;
    horizontalLines.push(rowBottom);
    currentRowTop = rowBottom;
  });
  horizontalLines.forEach((y) => {
    commands.push(`${tableStartX} ${y} m`);
    commands.push(`${tableStartX + tableWidth} ${y} l`);
    commands.push("S");
  });

  const verticalLines: number[] = [];
  for (let i = 0; i <= columnCount; i += 1) {
    if (i === 0) {
      verticalLines.push(tableStartX);
    } else {
      verticalLines.push(columnOffsets[i - 1] + columnWidths[i - 1]);
    }
  }

  verticalLines.forEach((x) => {
    commands.push(`${x} ${tableTopY} m`);
    commands.push(`${x} ${tableBottomY} l`);
    commands.push("S");
  });

  // Header text
  commands.push("0.16 0.19 0.3 rg");
  commands.push("BT");
  commands.push("/F1 11 Tf");
  headers.forEach((header, columnIndex) => {
    const textX = columnOffsets[columnIndex] + cellPadding;
    const value = truncateTextToWidth(header, columnWidths[columnIndex], headerFontSize, cellPadding);
    const encoded = font.encodeText(value);
    if (encoded) {
      commands.push(`1 0 0 1 ${textX} ${headerTextY.toFixed(2)} Tm`);
      commands.push(`<${encoded}> Tj`);
    }
  });
  commands.push("ET");

  // Row text
  commands.push("0 0 0 rg");
  commands.push("BT");
  commands.push("/F1 10 Tf");
  currentRowTop = tableTopY - headerHeight;
  rows.forEach((row) => {
    const rowBottom = currentRowTop - row.height;
    const firstLineBaseline = currentRowTop - cellPadding - rowFontSize * 0.2;
    row.cells.forEach((cellLines, columnIndex) => {
      const textX = columnOffsets[columnIndex] + cellPadding;
      cellLines.forEach((line, lineIndex) => {
        const lineY = firstLineBaseline - rowLineHeight * lineIndex;
        const encodedLine = font.encodeText(line);
        if (encodedLine) {
          commands.push(`1 0 0 1 ${textX} ${lineY.toFixed(2)} Tm`);
          commands.push(`<${encodedLine}> Tj`);
        }
      });
    });
    currentRowTop = rowBottom;
  });
  commands.push("ET");

  // Footer
  commands.push("0.36 0.4 0.46 rg");
  commands.push("BT");
  commands.push("/F1 9 Tf");
  const footerLeftText = font.encodeText(`Raport zgłoszeń ZANT - ${generatedAt}`);
  if (footerLeftText) {
    commands.push(`1 0 0 1 ${tableStartX} ${footerY} Tm`);
    commands.push(`<${footerLeftText}> Tj`);
  }
  commands.push("ET");
  commands.push("0.36 0.4 0.46 rg");
  commands.push("BT");
  commands.push("/F1 9 Tf");
  const footerRightX = tableStartX + tableWidth - 120;
  const footerRightText = font.encodeText(`Strona ${pageIndex + 1}/${totalPages}`);
  if (footerRightText) {
    commands.push(`1 0 0 1 ${footerRightX} ${footerY} Tm`);
    commands.push(`<${footerRightText}> Tj`);
  }
  commands.push("ET");

  return commands.join("\n");
}

function truncateTextToWidth(value: string, columnWidth: number, fontSize: number, padding: number) {
  const maxWidth = Math.max(0, columnWidth - padding * 2);
  const averageCharWidth = fontSize * 0.55;
  const maxChars = maxWidth > 0 ? Math.max(1, Math.floor(maxWidth / averageCharWidth)) : 1;
  const normalized = normalizeCellValue(value);
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxChars - 3))}...`;
}

function wrapCellText(
  value: string,
  columnWidth: number,
  fontSize: number,
  padding: number,
  maxLines: number
) {
  const normalized = normalizeCellValue(value);
  const maxWidth = Math.max(0, columnWidth - padding * 2);
  const averageCharWidth = fontSize * 0.55;
  const maxCharsPerLine = maxWidth > 0 ? Math.max(1, Math.floor(maxWidth / averageCharWidth)) : 1;
  const words = normalized ? normalized.split(/\s+/) : [""];
  const lines: string[] = [];
  let currentLine = "";

  const commitLine = (line: string) => {
    lines.push(line);
  };

  words.forEach((word, wordIndex) => {
    let remainingWord = word;

    while (remainingWord.length > 0) {
      const separator = currentLine.length > 0 ? " " : "";
      const candidate = `${currentLine}${separator}${remainingWord}`.trim();

      if (candidate.length <= maxCharsPerLine) {
        currentLine = candidate;
        remainingWord = "";
      } else if (currentLine.length === 0) {
        commitLine(remainingWord.slice(0, maxCharsPerLine));
        remainingWord = remainingWord.slice(maxCharsPerLine);
      } else {
        commitLine(currentLine);
        currentLine = "";
      }
    }

    if (wordIndex === words.length - 1 && currentLine.length > 0) {
      commitLine(currentLine);
      currentLine = "";
    }
  });

  if (lines.length === 0) {
    lines.push("");
  }

  if (lines.length > maxLines) {
    const truncated = lines.slice(0, maxLines);
    truncated[maxLines - 1] = truncateLineWithEllipsis(truncated[maxLines - 1], maxCharsPerLine);
    return truncated;
  }

  return lines;
}

function truncateLineWithEllipsis(line: string, maxChars: number) {
  if (line.length <= maxChars) {
    return line;
  }

  if (maxChars <= 3) {
    return ".".repeat(Math.max(1, maxChars));
  }

  return `${line.slice(0, Math.max(0, maxChars - 3))}...`;
}

function finalizePdf(objects: string[]) {
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function getPdfByteLength(value: string) {
  return sharedTextEncoder ? sharedTextEncoder.encode(value).length : value.length;
}

function downloadBlob(blob: Blob, extension: string) {
  if (typeof document === "undefined") {
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${EXPORT_FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.${extension}`;
  anchor.style.display = "none";
  document.body?.appendChild(anchor);
  anchor.click();
  anchor.parentNode?.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function downloadBlobWithName(blob: Blob, fileName: string) {
  if (typeof document === "undefined") {
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body?.appendChild(anchor);
  anchor.click();
  anchor.parentNode?.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function buildSummaryFileName(format: "docx" | "pdf", explicitName?: string) {
  const extension = format === "pdf" ? "pdf" : "docx";
  if (explicitName) {
    return ensureFileExtension(explicitName, extension);
  }

  const today = new Date().toISOString().slice(0, 10);
  return `zgloszenie-${today}.${extension}`;
}

function ensureFileExtension(fileName: string, extension: string) {
  const normalized = fileName.trim();
  if (normalized.toLowerCase().endsWith(`.${extension}`)) {
    return normalized;
  }

  const withoutExtension = normalized.replace(/\.[^/.]+$/, "");
  return `${withoutExtension}.${extension}`;
}

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

const documentService: DocumentService = (() => {
  const api: DocumentApi = useMock
    ? new MockDocumentApi(mockDocuments)
    : new MockDocumentApi(mockDocuments);

  return new DefaultDocumentService(api);
})();

export { documentService, downloadDocumentSummary };

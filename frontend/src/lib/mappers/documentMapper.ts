import { defaultDocumentData } from "@/lib/mock-documents";
import type { CreateDocumentDto, DocumentDetailDto, DocumentListItemDto, WitnessDto } from "@/lib/dtos/documentDtos";
import type { Document, Witness } from "@/types/document";

export function mapDocumentDetailDtoToDocument(dto: DocumentDetailDto): Document {
  const { witnesses, ...rest } = dto;
  return {
    ...defaultDocumentData,
    ...rest,
    witnesses: (witnesses ?? []).map(mapWitnessDtoToDomain),
  } satisfies Document;
}

export function mapDocumentListItemDtoToDocument(dto: DocumentListItemDto): Document {
  return mapDocumentDetailDtoToDocument(dto);
}

export function mapDocumentToDetailDto(document: Document): DocumentDetailDto {
  const { witnesses, ...rest } = document;
  const witnessDtos = (witnesses ?? []).map(mapWitnessToDto);
  return {
    ...rest,
    witnesses: witnessDtos.length > 0 ? witnessDtos : undefined,
  } satisfies DocumentDetailDto;
}

export function mapPartialDocumentToCreateDto(input: Partial<Document>): CreateDocumentDto {
  const dto: CreateDocumentDto = {};

  Object.entries(input).forEach(([rawKey, value]) => {
    if (value === undefined) {
      return;
    }

    if (rawKey === "id") {
      return;
    }

    if (rawKey === "witnesses") {
      const witnesses = value as Witness[] | undefined;
      if (witnesses && witnesses.length > 0) {
        dto.witnesses = witnesses.map(mapWitnessToCreateDto);
      }
      return;
    }

    (dto as Record<string, unknown>)[rawKey] = value;
  });

  return dto;
}

function mapWitnessDtoToDomain(dto: WitnessDto): Witness {
  return {
    id: dto.id,
    imie: dto.imie,
    nazwisko: dto.nazwisko,
    ulica: dto.ulica,
    nr_domu: dto.nr_domu,
    nr_lokalu: dto.nr_lokalu ?? null,
    miejscowosc: dto.miejscowosc,
    kod_pocztowy: dto.kod_pocztowy,
    nazwa_panstwa: dto.nazwa_panstwa ?? null,
    document: dto.documentId ?? null,
  } satisfies Witness;
}

function mapWitnessToDto(witness: Witness): WitnessDto {
  return {
    id: witness.id,
    documentId: resolveDocumentId(witness.document),
    imie: witness.imie,
    nazwisko: witness.nazwisko,
    ulica: witness.ulica,
    nr_domu: witness.nr_domu,
    nr_lokalu: witness.nr_lokalu ?? null,
    miejscowosc: witness.miejscowosc,
    kod_pocztowy: witness.kod_pocztowy,
    nazwa_panstwa: witness.nazwa_panstwa ?? null,
  } satisfies WitnessDto;
}

function mapWitnessToCreateDto(witness: Witness): WitnessDto {
  const dto = mapWitnessToDto(witness);
  return {
    ...dto,
    id: undefined,
    documentId: undefined,
  } satisfies WitnessDto;
}

function resolveDocumentId(reference: Witness["document"]): number | null | undefined {
  if (typeof reference === "number") {
    return reference;
  }

  if (reference && typeof reference === "object") {
    return reference.id ?? undefined;
  }

  return reference === null ? null : undefined;
}

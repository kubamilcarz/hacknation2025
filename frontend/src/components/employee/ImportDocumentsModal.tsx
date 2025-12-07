"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Modal from "@/components/Modal";
import { useDocuments } from "@/context/DocumentContext";
import type { EmployeeDocument } from "@/types/employeeDocument";

type ImportDocumentsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type ImportStatus = "processing" | "success" | "error";

type ImportItem = {
  id: string;
  fileName: string;
  status: ImportStatus;
  message: string;
};

function createEmptyItem(fileName: string): ImportItem {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${fileName}-${Date.now()}`,
    fileName,
    status: "processing",
    message: "Przetwarzanie pliku...",
  } satisfies ImportItem;
}

function buildSuccessMessage(document: EmployeeDocument) {
  switch (document.analysisStatus) {
    case "processing":
      return "Plik zapisany. Analiza AI jest w toku.";
    case "failed":
      return "Plik zapisany, ale opis wymaga ręcznego uzupełnienia.";
    default:
      return "Zapisano plik i dodano opis zdarzenia.";
  }
}

export default function ImportDocumentsModal({ isOpen, onClose }: ImportDocumentsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { uploadDocument } = useDocuments();
  const [importItems, setImportItems] = useState<ImportItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const resetState = useCallback(() => {
    setImportItems([]);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleClose = useCallback(() => {
    if (isProcessing) {
      return;
    }
    resetState();
    onClose();
  }, [isProcessing, onClose, resetState]);

  const handleTriggerFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const processFile = useCallback(
    async (file: File, itemId: string) => {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension !== "pdf" && file.type !== "application/pdf") {
        throw new Error(`Format pliku ${file.name} nie jest obsługiwany. Wgraj plik PDF.`);
      }

      const createdDocument = await uploadDocument(file);
      setImportItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: "success",
                message: buildSuccessMessage(createdDocument),
              }
            : item
        )
      );
    },
    [uploadDocument]
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) {
        return;
      }

      const items = files.map((file) => createEmptyItem(file.name));
      setImportItems((current) => [...items, ...current]);
      setIsProcessing(true);

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const itemId = items[index].id;

        try {
          await processFile(file, itemId);
        } catch (error) {
          const message = error instanceof Error ? error.message : `Nie udało się przetworzyć pliku ${file.name}.`;
          setImportItems((current) =>
            current.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    status: "error",
                    message,
                  }
                : item
            )
          );
        }
      }

      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [processFile]
  );

  const handleFilesSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = event.target.files;
      if (!fileList || fileList.length === 0) {
        return;
      }

      const files = Array.from(fileList);
      await processFiles(files);
    },
    [processFiles]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!isProcessing) {
        setIsDragActive(true);
      }
    },
    [isProcessing]
  );

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);
      if (isProcessing) {
        return;
      }

      const fileList = event.dataTransfer?.files;
      if (!fileList || fileList.length === 0) {
        return;
      }

      const files = Array.from(fileList);
      void processFiles(files);
    },
    [isProcessing, processFiles]
  );

  const successfulImports = useMemo(
    () => importItems.filter((item) => item.status === "success").length,
    [importItems]
  );

  const failedImports = useMemo(
    () => importItems.filter((item) => item.status === "error").length,
    [importItems]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import dokumentów"
      description="Wgraj pliki PDF, a system zapisze je w repozytorium i poprosi AI o przygotowanie opisu zdarzenia."
      showCloseButton={!isProcessing}
    >
      <div className="flex flex-col gap-6">
        <div
          className={`rounded-lg border border-dashed p-6 text-center transition ${
            isDragActive
              ? 'border-(--color-accent) bg-(--color-accent-soft)'
              : 'border-subtle bg-surface-subdued'
          }`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p className="text-sm text-secondary">
            Po wgraniu pliku przeanalizujemy go automatycznie, zachowamy oryginał PDF i uzupełnimy listę dokumentów po lewej stronie.
          </p>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleTriggerFileDialog}
              className="inline-flex items-center justify-center rounded-md bg-(--color-accent) px-4 py-2 text-sm font-semibold text-(--color-accent-text) transition hover:bg-(--color-accent-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
              disabled={isProcessing}
            >
              Wybierz pliki
            </button>
            <p className="text-xs text-muted">Obsługiwany format: .pdf</p>
          </div>
          <p className="mt-3 text-xs text-muted">Możesz też przeciągnąć pliki PDF w to okno.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            multiple
            onChange={handleFilesSelected}
          />
        </div>

        {importItems.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-secondary">
              <span className="inline-flex items-center gap-1 rounded-full bg-(--color-success-soft) px-3 py-1 text-(--color-success)">
                {successfulImports} zakończonych
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-(--color-error-soft) px-3 py-1 text-(--color-error)">
                {failedImports} nieudanych
              </span>
            </div>
            <ul className="space-y-3">
              {importItems.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-lg border px-4 py-3 text-sm shadow-sm transition ${
                    item.status === "success"
                      ? "border-(--color-success) bg-(--color-success-soft) text-(--color-success)"
                      : item.status === "error"
                        ? "border-(--color-error) bg-(--color-error-soft) text-(--color-error)"
                        : "border-subtle bg-surface text-secondary"
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-primary">{item.fileName}</span>
                    <span>{item.message}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-lg border border-subtle bg-surface px-4 py-6 text-sm text-muted">
            Nie zaimportowano jeszcze żadnych plików.
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center justify-center rounded-md border border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-stronger) hover:text-foreground"
            disabled={isProcessing}
          >
            Zamknij
          </button>
        </div>
      </div>
    </Modal>
  );
}

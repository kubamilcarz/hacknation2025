"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

const COMPACT_BREAKPOINT = 640;

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: ReactNode;
  className?: string;
  showCloseButton?: boolean;
};

function useIsCompact(breakpoint = COMPACT_BREAKPOINT) {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => {};
      }

      const query = window.matchMedia(`(max-width: ${breakpoint}px)`);
      const handler = () => onStoreChange();

      query.addEventListener("change", handler);
      return () => query.removeEventListener("change", handler);
    },
    () => {
      if (typeof window === "undefined") {
        return false;
      }

      return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
    },
    () => false
  );
}

export default function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  className,
  showCloseButton = true,
}: ModalProps) {
  const isCompact = useIsCompact();
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const titleId = useId();
  const descriptionId = useId();
  const labelledBy = title ? titleId : undefined;
  const describedBy = description ? descriptionId : undefined;

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const sheetStyle: CSSProperties | undefined = isCompact
    ? {
        transform: `translateY(${dragOffset}px)`,
        transition: isDragging ? "none" : "transform 0.24s ease",
      }
    : undefined;

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isCompact) {
      return;
    }

    dragStartRef.current = event.clientY;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isCompact || !isDragging || dragStartRef.current === null) {
      return;
    }

    const offset = Math.max(0, event.clientY - dragStartRef.current);
    setDragOffset(offset);
  };

  const handleDragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isCompact || !isDragging) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const shouldDismiss = dragOffset > 120;
    dragStartRef.current = null;
    setIsDragging(false);

    if (shouldDismiss) {
      setDragOffset(0);
      onClose();
      return;
    }

    setDragOffset(0);
  };

  const modalNode = (
    <div
      className={`fixed inset-0 z-50 flex justify-center ${isCompact ? "items-end px-0 py-0" : "items-center px-4 py-6 sm:px-6"}`}
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        role="presentation"
        onClick={onClose}
        aria-hidden="true"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={`relative z-10 flex w-full flex-col overflow-hidden bg-surface text-primary shadow-card transition-transform duration-300 ${isCompact ? "h-full rounded-t-3xl" : "max-h-[85vh] max-w-2xl rounded-2xl"} ${className ?? ""}`}
        style={sheetStyle}
      >
        <div className={`flex flex-col ${isCompact ? "h-full" : ""}`}>
          <div className={`flex items-start gap-4 border-b border-subtle px-6 pt-6 ${description ? "pb-4" : "pb-6"} sm:px-8`}>
            <div className="flex-1">
              {isCompact && (
                <div
                  className="mb-3 flex justify-center"
                  role="presentation"
                >
                  <div
                    className="h-1.5 w-12 rounded-full bg-(--color-toolbar-selection-muted)"
                    onPointerDown={handleDragStart}
                    onPointerMove={handleDragMove}
                    onPointerUp={handleDragEnd}
                    onPointerCancel={handleDragEnd}
                  />
                </div>
              )}
              {title && (
                <h2
                  id={titleId}
                  className="text-lg font-semibold text-primary sm:text-xl"
                >
                  {title}
                </h2>
              )}
              {description && (
                <div
                  id={descriptionId}
                  className="mt-2 text-sm text-secondary"
                >
                  {description}
                </div>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-secondary transition hover:bg-(--color-toolbar-selection) hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                aria-label="Zamknij okno"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
            {children}
          </div>
        </div>
      </section>
    </div>
  );

  return createPortal(modalNode, document.body);
}

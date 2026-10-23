import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "../i18n/LanguageContext";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  itemSlotStyle?: string;
  titleDecoration?: ReactNode;
  closeIcon?: ReactNode;
  animateClose?: boolean;
};

export function Modal({ title, onClose, children, className = "", style, itemSlotStyle, titleDecoration, closeIcon, animateClose = false }: ModalProps) {
  const { t } = useTranslation();
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [closing, setClosing] = useState(false);
  // Capture before the commit disables the opener, and retain it across
  // StrictMode's effect replay (which already focuses the close button).
  const previousRef = useRef(document.activeElement as HTMLElement | null);
  const requestClose = () => {
    if (!animateClose) { onClose(); return; }
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 240);
  };
  const closeRef = useRef(requestClose);
  closeRef.current = requestClose;
  useEffect(() => {
    const previous = previousRef.current;
    const overflow = document.body.style.overflow;
    const paddingRight = document.body.style.paddingRight;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const controls = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, [tabindex="0"]') ?? []);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      document.removeEventListener("keydown", onKey);
      // React removes the scene's inert attribute during the same commit.
      // Restore after that commit, otherwise browsers reject focus into inert.
      requestAnimationFrame(() => {
        if (document.querySelector('[role="dialog"]')) return;
        const target = previous?.isConnected ? previous : document.querySelector<HTMLButtonElement>(".room-menu");
        target?.focus();
      });
    };
  }, []);
  const backdropClassName = ["modal-backdrop", closing ? "is-closing" : ""].filter(Boolean).join(" ");
  const modalClassName = ["modal", "scene-modal", className, closing ? "is-closing" : ""].filter(Boolean).join(" ");
  return <div className={backdropClassName} onClick={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
    <section ref={ref} className={modalClassName} style={style} data-item-slot-style={itemSlotStyle} role="dialog" aria-modal="true" aria-labelledby={id}>
      <header className="modal-heading"><div className="modal-title-wrap"><h2 id={id}>{title}</h2>{titleDecoration && <span className="modal-title-decoration" aria-hidden="true">{titleDecoration}</span>}</div><button type="button" className="text-button" onClick={requestClose} aria-label={t("common.closeDialog")}>{closeIcon ? <><span className="modal-close-icon" aria-hidden="true">{closeIcon}</span><span className="visually-hidden">{t("common.close")}</span></> : t("common.close")}</button></header>
      <div className="modal-body">{children}</div>
    </section>
  </div>;
}

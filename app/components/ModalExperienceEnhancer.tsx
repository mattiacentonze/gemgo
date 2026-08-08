"use client";

import { useEffect } from "react";

const focusableSelector = [
  "button:not(:disabled)",
  "a[href]",
  "input:not(:disabled)",
  "textarea:not(:disabled)",
  "select:not(:disabled)",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function ModalExperienceEnhancer() {
  useEffect(() => {
    let activeModal: HTMLElement | null = null;
    let previousFocus: HTMLElement | null = null;

    const closeModal = () => {
      activeModal?.querySelector<HTMLButtonElement>(".modal-close")?.click();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!activeModal) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...activeModal.querySelectorAll<HTMLElement>(focusableSelector)]
        .filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1) ?? first;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const sync = () => {
      const nextModal = document.querySelector<HTMLElement>(".modal-backdrop");
      if (nextModal === activeModal) return;

      if (activeModal && !nextModal) {
        document.documentElement.classList.remove("has-open-modal");
        previousFocus?.focus({ preventScroll: true });
        activeModal = null;
        previousFocus = null;
        return;
      }

      if (nextModal) {
        previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        activeModal = nextModal;
        document.documentElement.classList.add("has-open-modal");
        window.requestAnimationFrame(() => {
          const initialFocus = nextModal.querySelector<HTMLElement>(".modal-close, button:not(:disabled), input:not(:disabled)");
          initialFocus?.focus({ preventScroll: true });
        });
      }
    };

    const onBackdropClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.classList.contains("modal-backdrop")) closeModal();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onBackdropClick);
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onBackdropClick);
      document.documentElement.classList.remove("has-open-modal");
    };
  }, []);

  return null;
}

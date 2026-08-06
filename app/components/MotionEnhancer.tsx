"use client";

import { useEffect } from "react";

const SELECTOR = [
  ".marketing-section",
  ".problem-strip",
  ".final-cta-section",
  ".hero-map-wrap",
  ".planner-panel",
  ".catalogue-card",
  ".method-card",
  ".experience-card",
  ".compact-result",
  ".content-card",
  ".trip-main-card",
  ".trip-side > *",
  ".reward-card",
  ".earning-card",
  ".methodology-grid > article",
  ".dashboard-metrics > article",
  ".privacy-hero",
].join(",");

export default function MotionEnhancer() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observed = new WeakSet<Element>();
    let observer: IntersectionObserver | null = null;

    const revealImmediately = (element: Element) => {
      element.classList.add("motion-item", "is-revealed");
    };

    const configure = () => {
      observer?.disconnect();
      observer = reducedMotion.matches
        ? null
        : new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-revealed");
                observer?.unobserve(entry.target);
              });
            },
            { rootMargin: "0px 0px -8%", threshold: 0.08 },
          );

      document.querySelectorAll(SELECTOR).forEach((element, index) => {
        if (observed.has(element)) return;
        observed.add(element);
        element.classList.add("motion-item");
        if (element instanceof HTMLElement) {
          element.style.setProperty("--motion-delay", `${Math.min(index % 4, 3) * 45}ms`);
        }
        if (reducedMotion.matches || element.getBoundingClientRect().top < window.innerHeight * 0.88) {
          revealImmediately(element);
        } else {
          observer?.observe(element);
        }
      });
    };

    configure();
    const mutations = new MutationObserver(() => window.requestAnimationFrame(configure));
    mutations.observe(document.body, { childList: true, subtree: true });
    reducedMotion.addEventListener("change", configure);

    return () => {
      mutations.disconnect();
      observer?.disconnect();
      reducedMotion.removeEventListener("change", configure);
    };
  }, []);

  return null;
}

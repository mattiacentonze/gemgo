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
    const tracked = new Set<Element>();
    let observer: IntersectionObserver | null = null;
    let scanFrame: number | null = null;

    const createObserver = () => {
      observer?.disconnect();
      if (reducedMotion.matches) {
        observer = null;
        tracked.forEach((element) => element.classList.add("is-revealed"));
        return;
      }
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-revealed");
            observer?.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8%", threshold: 0.08 },
      );
      tracked.forEach((element) => {
        if (!element.classList.contains("is-revealed") && element.isConnected) observer?.observe(element);
      });
    };

    const scan = () => {
      scanFrame = null;
      document.querySelectorAll(SELECTOR).forEach((element, index) => {
        if (!tracked.has(element)) {
          tracked.add(element);
          element.classList.add("motion-item");
          if (element instanceof HTMLElement) {
            element.style.setProperty("--motion-delay", `${Math.min(index % 4, 3) * 45}ms`);
          }
        }
        if (reducedMotion.matches || element.getBoundingClientRect().top < window.innerHeight * 0.9) {
          element.classList.add("is-revealed");
          observer?.unobserve(element);
        } else if (!element.classList.contains("is-revealed")) {
          observer?.observe(element);
        }
      });
    };

    createObserver();
    scan();
    const scheduleScan = () => {
      if (scanFrame !== null) return;
      scanFrame = window.requestAnimationFrame(scan);
    };
    const mutations = new MutationObserver(scheduleScan);
    mutations.observe(document.body, { childList: true, subtree: true });
    const onPreferenceChange = () => {
      createObserver();
      scan();
    };
    reducedMotion.addEventListener("change", onPreferenceChange);

    return () => {
      mutations.disconnect();
      observer?.disconnect();
      reducedMotion.removeEventListener("change", onPreferenceChange);
      if (scanFrame !== null) window.cancelAnimationFrame(scanFrame);
    };
  }, []);

  return null;
}

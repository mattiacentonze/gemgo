"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { allExperiences } from "../product/integrated-data";
import type { Experience } from "../product/types";
import DestinationPhoto from "./DestinationPhoto";

type Slot = {
  target: Element;
  experience: Experience;
  role: "original" | "alternative";
};

export default function GemDropPhotoEnhancer() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const signatureRef = useRef("");

  useEffect(() => {
    const resolve = () => {
      const options = [...document.querySelectorAll(".gemdrop-panel .gemdrop-option")];
      const next = options.flatMap((target): Slot[] => {
        const name = target.querySelector("h3")?.textContent?.trim();
        if (!name) return [];
        const experience = allExperiences.find((item) => item.name === name);
        if (!experience) return [];
        return [{
          target,
          experience,
          role: target.classList.contains("alternative-option") ? "alternative" : "original",
        }];
      });
      const signature = next.map((slot) => `${slot.role}:${slot.experience.id}`).join("|");
      if (signature === signatureRef.current) return;
      signatureRef.current = signature;
      setSlots(next);
    };

    resolve();
    const observer = new MutationObserver(resolve);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {slots.map((slot) => {
        const key = `${slot.role}-${slot.experience.id}`;
        return createPortal(
          <DestinationPhoto
            name={slot.experience.name}
            region={slot.experience.region}
            compact
            className={`gemdrop-destination-gallery is-${slot.role}`}
          />,
          slot.target,
          key,
        );
      })}
    </>
  );
}

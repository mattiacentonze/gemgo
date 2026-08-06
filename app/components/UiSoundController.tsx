"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type SoundTone = "tap" | "success" | "info" | "error";

type AudioWindow = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

const SOUND_KEY = "gemgo-sound";

const frequencies: Record<SoundTone, number[]> = {
  tap: [520],
  info: [520, 680],
  success: [560, 720, 880],
  error: [360, 290],
};

export default function UiSoundController() {
  const [target, setTarget] = useState<Element | null>(null);
  const [enabled, setEnabled] = useState(true);
  const contextRef = useRef<AudioContext | null>(null);
  const lastToastRef = useRef("");
  const enabledRef = useRef(true);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const storedEnabled = window.localStorage.getItem(SOUND_KEY) !== "off";
    enabledRef.current = storedEnabled;
    setEnabled(storedEnabled);
    const resolveTarget = () => setTarget(document.querySelector(".integrated-app .header-actions"));
    resolveTarget();
    const observer = new MutationObserver(resolveTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      const context = contextRef.current;
      contextRef.current = null;
      if (context && context.state !== "closed") void context.close();
    };
  }, []);

  const audioContext = useCallback(() => {
    if (contextRef.current) return contextRef.current;
    const AudioContextClass = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!AudioContextClass) return null;
    contextRef.current = new AudioContextClass();
    return contextRef.current;
  }, []);

  const play = useCallback((tone: SoundTone) => {
    if (!enabledRef.current) return;
    try {
      const context = audioContext();
      if (!context) return;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      frequencies[tone].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = now + index * (tone === "tap" ? 0 : 0.055);
        const duration = tone === "tap" ? 0.055 : 0.12;
        oscillator.type = tone === "error" ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(tone === "tap" ? 0.012 : 0.025, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.015);
      });
    } catch {
      // Sound is an optional enhancement and must never block an action.
    }
  }, [audioContext]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest("button, a") : null;
      if (!element || element.closest(".sound-control") || element.matches(":disabled") || element.getAttribute("aria-disabled") === "true") return;
      play("tap");
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [play]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const toast = document.querySelector(".integrated-app .action-toast");
      const text = toast?.textContent?.trim() ?? "";
      if (!text || text === lastToastRef.current) return;
      lastToastRef.current = text;
      if (/denied|unavailable|not available|invalid|could not|error/i.test(text)) play("error");
      else if (/verified|saved|added|switched|unlocked|duplicated|feedback/i.test(text)) play("success");
      else play("info");
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [play]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    enabledRef.current = next;
    window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    if (next) window.setTimeout(() => play("success"), 0);
  };

  if (!target) return null;

  return createPortal(
    <button
      type="button"
      className="icon-button sound-control"
      aria-label={enabled ? "Turn interface sounds off" : "Turn interface sounds on"}
      aria-pressed={enabled}
      title={enabled ? "Sounds on" : "Sounds off"}
      onClick={toggle}
    >
      {enabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
    </button>,
    target,
  );
}

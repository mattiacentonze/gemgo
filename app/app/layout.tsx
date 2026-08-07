import type { ReactNode } from "react";
import IntegratedAppShell from "../components/IntegratedAppShell";
import UiSoundController from "../components/UiSoundController";

export default function GemGoApplicationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <IntegratedAppShell />
      <UiSoundController />
      {children}
    </>
  );
}

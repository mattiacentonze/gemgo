"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AppUtilityHeader from "./AppUtilityHeader";
import IntegratedAppShell from "./IntegratedAppShell";
import UiSoundController from "./UiSoundController";

const utilityRoutes = new Set(["/app/profile", "/app/notifications", "/app/admin"]);

export default function AppRouteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isUtilityRoute = utilityRoutes.has(pathname.replace(/\/$/, ""));

  return (
    <>
      {isUtilityRoute ? <AppUtilityHeader /> : <IntegratedAppShell />}
      <UiSoundController />
      {children}
    </>
  );
}

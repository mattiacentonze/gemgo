import type { ReactNode } from "react";
import AppRouteLayout from "../components/AppRouteLayout";

export default function GemGoApplicationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppRouteLayout>{children}</AppRouteLayout>;
}

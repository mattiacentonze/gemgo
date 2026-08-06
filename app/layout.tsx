import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import MotionEnhancer from "./components/MotionEnhancer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GemGo — Better Alpine choices",
  description:
    "A pan-Alpine recommendation and visitor-flow redistribution system that turns crowded plans into personalised alternatives, verified visits and local rewards.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/assets/gemgo-logo-green.svg?v=2",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <MotionEnhancer />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}",
          }}
        />
      </body>
    </html>
  );
}

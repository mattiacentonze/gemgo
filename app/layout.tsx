import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import GlobalFooter from "./components/GlobalFooter";
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
  const registerServiceWorker =
    process.env.NODE_ENV === "production"
      ? "if('serviceWorker' in navigator){window.addEventListener('load',()=>{const r=()=>navigator.serviceWorker.register('/sw.js').catch(()=>{});if('requestIdleCallback' in window){requestIdleCallback(r,{timeout:3000})}else{setTimeout(r,1200)}})}"
      : "";
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <GlobalFooter />
        <script
          dangerouslySetInnerHTML={{
            __html: registerServiceWorker,
          }}
        />
      </body>
    </html>
  );
}

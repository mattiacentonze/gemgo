import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import type { Locale } from "./domain";
import { AuthProvider } from "./components/AuthProvider";
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

const metadataCopy: Record<Locale, { title: string; description: string }> = {
  en: { title: "GemGo — Better Alpine choices", description: "Personalised Alpine alternatives, verified visits and local rewards." },
  it: { title: "GemGo — Scelte alpine migliori", description: "Alternative alpine personalizzate, visite verificate e premi locali." },
  de: { title: "GemGo — Bessere Entscheidungen in den Alpen", description: "Persönliche Alternativen in den Alpen, bestätigte Besuche und lokale Prämien." },
  fr: { title: "GemGo — De meilleurs choix alpins", description: "Des alternatives alpines personnalisées, des visites vérifiées et des récompenses locales." },
  sl: { title: "GemGo — Boljše izbire v Alpah", description: "Prilagojene alpske alternative, potrjeni obiski in lokalne nagrade." },
};

const readServerLocale = async (): Promise<Locale> => {
  const value = (await cookies()).get("gemgo-locale")?.value;
  return value === "it" || value === "de" || value === "fr" || value === "sl" ? value : "en";
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readServerLocale();
  return {
    ...metadataCopy[locale],
    other: { "codex-preview": "development" },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
      apple: "/assets/gemgo-logo-green.svg?v=2",
    },
    manifest: "/manifest.webmanifest",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await readServerLocale();
  const registerServiceWorker =
    process.env.NODE_ENV === "production"
      ? "if('serviceWorker' in navigator){window.addEventListener('load',()=>{const r=()=>navigator.serviceWorker.register('/sw.js').catch(()=>{});if('requestIdleCallback' in window){requestIdleCallback(r,{timeout:3000})}else{setTimeout(r,1200)}})}"
      : "";
  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          {children}
          <GlobalFooter />
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: registerServiceWorker,
          }}
        />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { directionOf, isLocale, LOCALES } from "@/lib/i18n/config";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Downloaded at build time and served by the app; no request to Google
// from the office's browsers.
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Al Fath Accounts & Tax Solutions",
    template: "%s | Al Fath",
  },
  description:
    "Accounting, audit, tax and compliance services in Abu Dhabi, UAE.",
};

// Both languages are known at build time, so every page is prerendered once
// per language and <html lang dir> is right in the very first byte.
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

// Runs before the first paint so a dark-mode user never sees a white flash:
// the saved choice, else the computer's setting. ThemeToggle keeps it in sync.
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <html
      lang={lang}
      dir={directionOf(lang)}
      className={`${geistSans.variable} ${geistMono.variable} ${plexArabic.variable} h-full antialiased`}
      // The theme script sets data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}

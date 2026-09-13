import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@/components/analytics";
import { AffiliateTracker } from "@/components/AffiliateTracker";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ensaiopro.site";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "EnsaioPro — Ensaios fotográficos profissionais com IA",
    template: "%s · EnsaioPro",
  },
  description:
    "Gere ensaios fotográficos profissionais em minutos com IA de última geração. Aniversário, corporativo, gestante, infantil, lifestyle e muito mais. A partir de R$0,20 por foto.",
  keywords: [
    "ensaio fotográfico IA",
    "fotos com inteligência artificial",
    "ensaio aniversário",
    "ensaio gestante",
    "ensaio corporativo",
    "ensaio infantil",
    "geração de fotos com IA",
    "ensaio profissional online",
  ],
  authors: [{ name: "EnsaioPro" }],
  creator: "EnsaioPro",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: APP_URL,
    siteName: "EnsaioPro",
    title: "EnsaioPro — Ensaios fotográficos profissionais com IA",
    description:
      "Envie 4-10 fotos e receba dezenas de imagens profissionais em minutos. Aniversário, gestante, corporativo e muito mais.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "EnsaioPro — Ensaios fotográficos com IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EnsaioPro — Ensaios fotográficos com IA",
    description:
      "Envie 4-10 fotos e receba dezenas de imagens profissionais em minutos.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geist.variable}`}>
      <body>
        {children}
        <Toaster theme="dark" position="top-right" richColors closeButton />
        <Analytics />
        <AffiliateTracker />
      </body>
    </html>
  );
}

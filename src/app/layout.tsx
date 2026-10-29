import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Lecteur Factur-X gratuit · timaub",
  description:
    "Ouvrez une facture électronique Factur-X ou ZUGFeRD, voyez son XML sous forme de facture et vérifiez ses totaux (EN 16931). Dans votre navigateur, rien n'est envoyé.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="mx-auto w-full max-w-4xl px-4 pt-6 sm:px-6">
          <a className="font-semibold" href="https://timaub.fr/">
            timaub
          </a>
        </header>
        {children}
        <footer className="mx-auto w-full max-w-4xl border-t border-line px-4 py-6 text-sm text-muted sm:px-6">
          Un outil gratuit de{" "}
          <a className="underline" href="https://timaub.fr/">
            Timothée Aubourg
          </a>
          , développeur freelance ·{" "}
          <a className="underline" href="https://github.com/timfidz/facturx-reader">
            Code source (licence MIT)
          </a>{" "}
          ·{" "}
          <a className="underline" href="https://timaub.fr/mentions-legales/">
            Mentions légales
          </a>
        </footer>
      </body>
    </html>
  );
}

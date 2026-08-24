import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Funds",
  description: "Personal finance tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Funds",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const DIRECTION_CONTRACT = `THESIS: Funds is an intaglio plate — money as engraved hairline numerals on a pure-black OLED ground; it refuses the gray-on-gray card dashboard for a banknote's black, ink, and one emerald thread.
OWN-WORLD: true #000 plates, 1px engraved borders at white/13, a faint guilloche lattice behind figures, latent-image microtext labels, Space Grotesk 700 engraved numerals, emerald reserved for capture/sync/positive.
STORY: a privacy-first owner reads net worth as a serial on a plate, scans hairline-ruled ledger rows, and logs a transaction on a tactile plate keypad in seconds.
FIRST VIEWPORT: home = slim header with sync dot; a black plate whose guilloche grounds the giant net-worth figure and its ruled Banks/Crypto split; hairline-ruled activity; a raised emerald capture key centered in the bottom bar.
FORM: assigned direction 3 of 7 — Intaglio Plate — seed 2f8f7c9d.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <span
          aria-hidden
          className="hidden"
          dangerouslySetInnerHTML={{ __html: `<!-- ${DIRECTION_CONTRACT} -->` }}
        />
        {children}
      </body>
    </html>
  );
}

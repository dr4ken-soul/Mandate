import type { Metadata } from "next";
import { archivo, plexMono } from "./fonts";
import { Providers } from "@/components/Providers";
import { DisconnectToast } from "@/components/wallet/DisconnectToast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mandate",
  description:
    "Mandate turns the rules you would say out loud into a contract that checks every perps order before it reaches the venue.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexMono.variable}`}>
      <body className="bg-paper font-sans text-ink antialiased">
        <Providers>
          {children}
          <DisconnectToast />
        </Providers>
      </body>
    </html>
  );
}

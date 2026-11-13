import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Seam } from "@/components/landing/Seam";
import { Admission } from "@/components/landing/Admission";
import { Clauses } from "@/components/landing/Clauses";
import { Measured } from "@/components/landing/Measured";
import { Ledger } from "@/components/landing/Ledger";
import { Limits } from "@/components/landing/Limits";
import { Footer } from "@/components/landing/Footer";
import { ConsoleGate } from "@/components/wallet/ConsoleGate";

export const dynamic = "force-dynamic";

/**
 * The landing page.
 *
 * A statement and its proof. Every figure on it is read from the chain at
 * request time.
 */
export default function LandingPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[600] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to the content
      </a>
      <ConsoleGate>
        <Nav />
        <main id="main">
          <Hero />
          <Seam />
          <Admission />
          <Clauses />
          <Measured />
          <Ledger />
          <Limits />
        </main>
        <Footer />
      </ConsoleGate>
    </>
  );
}

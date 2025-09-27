import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Timeline } from "@/components/landing/Timeline";
import { FAQs } from "@/components/landing/FAQs";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <Timeline />
        <FAQs />
      </main>
      <Footer />
    </div>
  );
}

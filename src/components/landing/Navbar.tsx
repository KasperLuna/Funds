import Link from "next/link";
import { FundsLogo } from "../icons/FundsLogo";

export const Navbar = () => (
  <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
    <div className="container flex h-16 items-center justify-between">
      <div className="flex items-center gap-2">
        <FundsLogo className="w-20 fill-slate-100" />
      </div>
      <nav className="hidden md:flex gap-6">
        <Link
          href="#features"
          className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
        >
          Features
        </Link>
        <Link
          href="#how-it-works"
          className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
        >
          How It Works
        </Link>
        <Link
          href="#faq"
          className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
        >
          FAQ
        </Link>
      </nav>
    </div>
  </header>
);

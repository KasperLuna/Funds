import Link from "next/link";
import { FundsLogo } from "../icons/FundsLogo";

export const Footer = () => (
  <footer className="w-full border-t border-zinc-800 py-6 md:py-12 bg-black">
    <div className="container px-4 md:px-6">
      <div className="grid grid-cols-2 gap-10 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <FundsLogo className="w-20 fill-slate-100" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Links</h3>
          <nav className="flex flex-col gap-2">
            <Link
              href="#features"
              className="text-sm text-zinc-400 hover:text-white"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-zinc-400 hover:text-white"
            >
              How It Works
            </Link>
            <Link
              href="#faq"
              className="text-sm text-zinc-400 hover:text-white"
            >
              FAQ
            </Link>
          </nav>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Legal</h3>
          <nav className="flex flex-col gap-2">
            <Link
              href="/privacy-policy"
              className="text-sm text-zinc-400 hover:text-white"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-of-service"
              className="text-sm text-zinc-400 hover:text-white"
            >
              Terms of Service
            </Link>
          </nav>
        </div>
      </div>
      <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-zinc-800 pt-6 md:flex-row">
        <p className="text-center text-sm text-zinc-400 md:text-left">
          © 2025 Funds. All rights reserved.
        </p>
        <div className="flex gap-4">
          <Link
            href="/privacy-policy"
            className="text-sm text-zinc-400 hover:text-white"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-of-service"
            className="text-sm text-zinc-400 hover:text-white"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  </footer>
);

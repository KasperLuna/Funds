import Link from "next/link";
import {
  BarChart3,
  CreditCard,
  DollarSign,
  LineChart,
  PieChart,
  Shield,
  Smartphone,
} from "lucide-react";

import { FundsLogo } from "@/components/icons/FundsLogo";
import { SignInButton } from "@/components/dashboard/SignInButton";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
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
      <main className="flex-1">
        <section className="w-full py-10 md:py-24 lg:py-24 xl:py-24 bg-black">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    You get the bread, we&apos;ll balance the books.
                  </h1>
                  <p className="max-w-[600px] text-zinc-400 md:text-xl">
                    Track your spending with ease. No complicated features, just
                    simple financial management.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <SignInButton />
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4 text-white" />
                    <span className="text-zinc-400">Free forever</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Smartphone className="h-4 w-4 text-white" />
                    <span className="text-zinc-400">Works on all devices</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative w-full aspect-square md:aspect-[4/3] lg:aspect-square rounded-lg overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-6">
                  <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(to_bottom_right,white,transparent,white)]" />
                  <div className="relative h-full w-full rounded-md bg-zinc-900/80 backdrop-blur-sm shadow-lg p-4">
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-semibold text-white">
                            Monthly Trend
                          </span>
                        </div>
                        <div className="text-sm text-zinc-400">May 2025</div>
                      </div>
                      <div className="w-full h-24 mb-4 flex items-end">
                        {/* Mock line graph using SVG */}
                        <svg
                          width="100%"
                          height="100%"
                          viewBox="0 0 200 60"
                          className="w-full h-full"
                          preserveAspectRatio="none"
                        >
                          {/* Y-axis */}
                          <line
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="60"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                            opacity="0.3"
                          />
                          {/* X-axis */}
                          <line
                            x1="0"
                            y1="60"
                            x2="200"
                            y2="60"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                            opacity="0.3"
                          />
                          <polyline
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2"
                            points="0,50 30,40 60,30 90,35 120,20 150,25 180,10 200,15"
                          />
                          <circle cx="0" cy="50" r="2" fill="#38bdf8" />
                          <circle cx="30" cy="40" r="2" fill="#38bdf8" />
                          <circle cx="60" cy="30" r="2" fill="#38bdf8" />
                          <circle cx="90" cy="35" r="2" fill="#38bdf8" />
                          <circle cx="120" cy="20" r="2" fill="#38bdf8" />
                          <circle cx="150" cy="25" r="2" fill="#38bdf8" />
                          <circle cx="180" cy="10" r="2" fill="#38bdf8" />
                          <circle cx="200" cy="15" r="2" fill="#38bdf8" />
                        </svg>
                      </div>
                      <div className="bg-slate-800 w-full h-10 rounded-md" />
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex gap-2 w-full">
                          <div className="flex-1 bg-white/10 rounded-md h-10 flex items-center justify-center text-xs text-white"></div>
                          <div className="flex-1 bg-white/10 rounded-md h-10 flex items-center justify-center text-xs text-white"></div>
                          <div className="flex-1 bg-white/10 rounded-md h-10 flex items-center justify-center text-xs text-white"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 w-full mt-2">
                        <div className="w-4 h-4 rounded-full bg-cyan-400" />
                        <div className="w-4 h-4 rounded-full bg-fuchsia-400" />
                      </div>
                      <div className="flex-1 flex items-end">
                        <div className="w-full h-32 bg-zinc-800 rounded-md p-2">
                          <div className="flex h-full items-end gap-2">
                            <div className="w-1/5 h-[40%] bg-white/20 rounded-t"></div>
                            <div className="w-1/5 h-[60%] bg-white/30 rounded-t"></div>
                            <div className="w-1/5 h-[80%] bg-white/40 rounded-t"></div>
                            <div className="w-1/5 h-[50%] bg-white/50 rounded-t"></div>
                            <div className="w-1/5 h-[70%] bg-white/60 rounded-t"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="w-full py-12 md:py-24 lg:py-32 bg-zinc-900"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-zinc-800 px-3 py-1 text-sm text-white">
                  Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                  Simplicity is our superpower
                </h2>
                <p className="max-w-[900px] text-zinc-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  No complicated features, just the essentials you need to
                  manage your money.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-2 rounded-lg border border-zinc-800 p-6 bg-zinc-900/50">
                <div className="rounded-full bg-zinc-800 p-3">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">Simple Tracking</h3>
                <p className="text-center text-zinc-400">
                  Easily log your income and expenses with minimal effort.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border border-zinc-800 p-6 bg-zinc-900/50">
                <div className="rounded-full bg-zinc-800 p-3">
                  <LineChart className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">Visual Reports</h3>
                <p className="text-center text-zinc-400">
                  See your spending patterns with clear, easy-to-understand
                  visuals.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border border-zinc-800 p-6 bg-zinc-900/50">
                <div className="rounded-full bg-zinc-800 p-3">
                  <PieChart className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">Spending Categories</h3>
                <p className="text-center text-zinc-400">
                  Organize your expenses into categories to understand where
                  your money goes.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border border-zinc-800 p-6 bg-zinc-900/50">
                <div className="rounded-full bg-zinc-800 p-3">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">Manual Control</h3>
                <p className="text-center text-zinc-400">
                  No automatic bank connections—you decide what to track and
                  when.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border border-zinc-800 p-6 bg-zinc-900/50">
                <div className="rounded-full bg-zinc-800 p-3">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">Cross-Platform</h3>
                <p className="text-center text-zinc-400">
                  Access your finances on desktop, tablet, or mobile—your data
                  syncs everywhere.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="w-full py-12 md:py-24 lg:py-32 bg-black"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-zinc-800 px-3 py-1 text-sm text-white">
                  How It Works
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                  Start tracking in seconds
                </h2>
                <p className="max-w-[900px] text-zinc-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  No complicated setup, no lengthy onboarding—just simple
                  financial tracking.
                </p>
              </div>
            </div>
            <div className="mx-auto max-w-2xl py-12 flex flex-col relative">
              {/* Timeline vertical line */}
              <div
                className="absolute left-6 top-0 bottom-0 w-1 bg-zinc-800 rounded-full"
                aria-hidden="true"
              />
              {/* Timeline steps */}
              <div className="relative flex items-start mb-12">
                <div className="flex flex-col items-center z-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-white font-bold text-xl border-4 border-black">
                    1
                  </div>
                </div>
                <div className="ml-8">
                  <h3 className="text-xl font-bold">Create an Account</h3>
                  <p className="text-zinc-400">
                    Sign up for free with Google SSO.
                  </p>
                </div>
              </div>
              <div className="relative flex items-start mb-12">
                <div className="flex flex-col items-center z-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-white font-bold text-xl border-4 border-black">
                    2
                  </div>
                </div>
                <div className="ml-8">
                  <h3 className="text-xl font-bold">Add your banks</h3>
                  <p className="text-zinc-400">
                    Add the bank accounts you want to track.
                  </p>
                </div>
              </div>
              <div className="relative flex items-start mb-12">
                <div className="flex flex-col items-center z-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-white font-bold text-xl border-4 border-black">
                    3
                  </div>
                </div>
                <div className="ml-8">
                  <h3 className="text-xl font-bold">Add your transactions</h3>
                  <p className="text-zinc-400">
                    Add transactions using the simple form.
                  </p>
                </div>
              </div>
              <div className="relative flex items-start">
                <div className="flex flex-col items-center z-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-white font-bold text-xl border-4 border-black">
                    4
                  </div>
                </div>
                <div className="ml-8">
                  <h3 className="text-xl font-bold">See your Progress</h3>
                  <p className="text-zinc-400">
                    Visualize your financial journey and track your goals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="w-full py-12 md:py-24 lg:py-32 bg-zinc-900"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-zinc-800 px-3 py-1 text-sm text-white">
                  FAQ
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                  Frequently asked questions
                </h2>
                <p className="max-w-[900px] text-zinc-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Everything you need to know about Funds.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Is Funds really free?</h3>
                <p className="text-zinc-400">
                  Yes, maintaining and supporting Funds as a passion project
                  means it will be free for the foreseeable future.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">
                  Do I need to connect my bank account?
                </h3>
                <p className="text-zinc-400">
                  No. Funds works without any bank connections. You manually
                  enter your transactions for complete control and privacy.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">How is my data stored?</h3>
                <p className="text-zinc-400">
                  Your financial data is stored securely on our servers with
                  encryption. We never share or sell your information.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">
                  Can I use Funds on my phone?
                </h3>
                <p className="text-zinc-400">
                  Yes, Funds works on any device with a web browser. The
                  experience also caters to Progressive Web Apps (PWAs), so you
                  can add it to your home screen for easy access.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">How do I get started?</h3>
                <p className="text-zinc-400">
                  Simply create a free account, and you&apos;ll be ready to
                  start tracking your finances immediately.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
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
    </div>
  );
}

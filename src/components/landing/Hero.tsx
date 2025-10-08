import { Shield, Smartphone, DollarSign } from "lucide-react";
import { SignInButton } from "../dashboard/SignInButton";

export const Hero = () => (
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
);

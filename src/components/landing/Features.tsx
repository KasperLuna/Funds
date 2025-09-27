import {
  BarChart3,
  LineChart,
  PieChart,
  CreditCard,
  Smartphone,
} from "lucide-react";

export const Features = () => (
  <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-zinc-900">
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
            No complicated features, just the essentials you need to manage your
            money.
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
            See your spending patterns with clear, easy-to-understand visuals.
          </p>
        </div>
        <div className="flex flex-col items-center space-y-2 rounded-lg border border-zinc-800 p-6 bg-zinc-900/50">
          <div className="rounded-full bg-zinc-800 p-3">
            <PieChart className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold">Spending Categories</h3>
          <p className="text-center text-zinc-400">
            Organize your expenses into categories to understand where your
            money goes.
          </p>
        </div>
        <div className="flex flex-col items-center space-y-2 rounded-lg border border-zinc-800 p-6 bg-zinc-900/50">
          <div className="rounded-full bg-zinc-800 p-3">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold">Manual Control</h3>
          <p className="text-center text-zinc-400">
            No automatic bank connections—you decide what to track and when.
          </p>
        </div>
        <div className="flex flex-col items-center space-y-2 rounded-lg border border-zinc-800 p-6 bg-zinc-900/50">
          <div className="rounded-full bg-zinc-800 p-3">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold">Cross-Platform</h3>
          <p className="text-center text-zinc-400">
            Access your finances on desktop, tablet, or mobile—your data syncs
            everywhere.
          </p>
        </div>
      </div>
    </div>
  </section>
);

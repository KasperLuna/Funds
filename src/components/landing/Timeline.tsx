export const Timeline = () => (
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
            No complicated setup, no lengthy onboarding—just simple financial
            tracking.
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
            <p className="text-zinc-400">Sign up for free with Google SSO.</p>
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
);

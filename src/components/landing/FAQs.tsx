export const FAQs = () => (
  <section id="faq" className="w-full py-12 md:py-24 lg:py-32 bg-zinc-900">
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
            Yes, maintaining and supporting Funds as a passion project means it
            will be free for the foreseeable future.
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold">
            Do I need to connect my bank account?
          </h3>
          <p className="text-zinc-400">
            No. Funds works without any bank connections. You manually enter
            your transactions for complete control and privacy.
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
          <h3 className="text-xl font-bold">Can I use Funds on my phone?</h3>
          <p className="text-zinc-400">
            Yes, Funds works on any device with a web browser. The experience
            also caters to Progressive Web Apps (PWAs), so you can add it to
            your home screen for easy access.
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold">How do I get started?</h3>
          <p className="text-zinc-400">
            Simply create a free account, and you&apos;ll be ready to start
            tracking your finances immediately.
          </p>
        </div>
      </div>
    </div>
  </section>
);

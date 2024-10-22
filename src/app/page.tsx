import { SignupCluster } from "@/components/dashboard/SignUpCluster";
import clsx from "clsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, Lock, Smartphone } from "lucide-react";
import { FundsLogo } from "@/components/icons/FundsLogo";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-slate-950">
      <div className="min-h-screen bg-[#0a0b14] text-white">
        <nav className="absolute z-10 py-5 container mx-auto px-6 flex justify-between items-center">
          <FundsLogo className="w-20 fill-slate-100" />
          <div className="space-x-4">
            <a href="#features" className="hover:text-blue-400">
              Features
            </a>
            <a href="#about" className="hover:text-blue-400">
              About
            </a>
          </div>
        </nav>

        <main
          id="Hero"
          className="h-[calc(100dvh-200px)] text-center w-full  relative flex items-center justify-center"
        >
          <div
            className={clsx(
              "absolute bottom-0 left-0 right-0 top-0",
              "bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_14px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"
            )}
          ></div>
          <div className="relative h-full w-full">
            <div className="container mt-20 xl:mt-52 flex flex-col gap-2 items-center">
              <h2 className="text-5xl sm:text-7xl font-bold relative z-20 bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-500 py-8">
                {`You get the bread `}{" "}
                <span className="text-white">{`🍞`}</span>{" "}
                {`we'll balance the books.`}{" "}
                <span className="text-white">{`📚`}</span>
              </h2>
              <p className="text-gray-400">{`Keep track of all your financial accounts and transactions in one place. – Funds lets you manage your money, your way.`}</p>
              <SignupCluster />
            </div>
          </div>
        </main>
        <div className="mx-6">
          <section id="features" className="py-20">
            <h2 className="text-3xl font-bold mb-12 text-center">
              Why Choose Funds?
            </h2>
            <div className="flex flex-wrap justify-center gap-8">
              <FeatureCard
                icon={<BarChart2 className="w-12 h-12 text-blue-500" />}
                title="Comprehensive Dashboard"
                description="Get a clear overview of your finances with our intuitive dashboard."
              />
              {/* <FeatureCard
                icon={<Lock className="w-12 h-12 text-blue-500" />}
                title="Bank-Level Security"
                description="Your financial data is protected with state-of-the-art encryption."
              /> */}
              <FeatureCard
                icon={<Smartphone className="w-12 h-12 text-blue-500" />}
                title="Mobile Friendly"
                description="Access your finances on your computer and on-the-go with our responsive design."
              />
            </div>
          </section>

          <section id="about" className="py-20 text-center">
            <h2 className="text-3xl font-bold mb-6">About Funds</h2>
            <p className="text-xl text-gray-300 mb-4 max-w-2xl mx-auto">
              Funds is a passion project created to help people better manage
              their finances. It&apos;s free,{" "}
              <Link
                // as="span"
                href={"https://github.com/KasperLuna/Funds"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400"
              >
                open-source
              </Link>
              , and constantly improving.
            </p>
            <p className="text-sm text-gray-400 max-w-2xl mx-auto">
              Disclaimer: While we strive to maintain and improve Funds, as a
              free service, we cannot guarantee long-term support or
              availability. Use at your own discretion.
            </p>
          </section>
        </div>
        <footer className="bg-[#0d0e1a] py-8">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-400 mb-4 md:mb-0">
                © {new Date().getFullYear()} Funds. All rights reserved.
              </div>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-blue-400">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-400 hover:text-blue-400">
                  Terms of Service
                </a>
                <Link
                  href="https://kasperluna.com/#Contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400"
                >
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="text-slate-200 bg-slate-900 basis-[320px]">
      <CardHeader>
        <CardTitle className="flex flex-col items-center text-center text-nowrap">
          {icon}
          <span className="mt-4">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-gray-300">{description}</p>
      </CardContent>
    </Card>
  );
}

"use client";
import { PreviewButton } from "@/components/PreviewButton";
import { SignInButton } from "@/components/SignInButton";
import clsx from "clsx";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-slate-950">
      <div
        id="Hero"
        className="h-[50rem] text-center w-full  relative flex items-center justify-center"
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
              {`You get the bread `} <span className="text-white">{`🍞`}</span>{" "}
              {`we'll balance the books.`}{" "}
              <span className="text-white">{`📚`}</span>
            </h2>
            <p className="text-gray-400">{`Keep track of all your financial accounts and transactions in one place. – Funds lets you manage your money, your way.`}</p>
            <PreviewButton />
            <SignInButton />
          </div>
        </div>
      </div>
    </main>
  );
}

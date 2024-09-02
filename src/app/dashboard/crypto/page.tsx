import { Bitcoin } from "lucide-react";
import dynamic from "next/dynamic";

function Page() {
  return (
    <main className="flex flex-col h-[calc(100dvh-245px)] items-center p-24 text-slate-200">
      <Bitcoin className="w-28 h-28" />
      Crypto will go here!
    </main>
  );
}

export default dynamic(() => Promise.resolve(Page), {
  ssr: false,
});

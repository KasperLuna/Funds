import type { Metadata } from "next";
import { WebLLMChat } from "@/components/WebLLMChat";

export const metadata: Metadata = {
  title: "WebLLM Chat Test | Funds",
  description:
    "Test deployment for WebLLM Phi-3 model running offline on device",
};

export default function TestChatPage() {
  return <WebLLMChat />;
}

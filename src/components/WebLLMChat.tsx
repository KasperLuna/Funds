"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertCircle, Loader2, Send, Settings } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

// Detect browser type
const getBrowserInfo = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) {
    return "You're using Firefox, which doesn't support WebGPU yet.";
  } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
    return "Safari needs version 18+.";
  } else if (ua.includes("Chrome") || ua.includes("Edge")) {
    return "Browser appears compatible but WebGPU unavailable.";
  }
  return "WebGPU not supported.";
};

// WebLLM requires model to be registered in appConfig
// Attempting multiple model IDs for compatibility (smallest first for GPU buffer limits)
const MODELS_TO_TRY = [
  "SmolLM2-360M-Instruct-q4f16_1-MLC", // 360M - ultra-light
  "Qwen3-0.6B-q4f16_1-MLC", // 600M - very light
  "Llama-3.2-1B-Instruct-q4f16_1-MLC", // 1B - lightweight
  "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC", // 1.1B - lightweight
  "Phi-3.5-mini-instruct-q4f16_1-MLC", // 3.8B - medium
];

const MODEL_ID = MODELS_TO_TRY[0]; // Try smallest first
const DEMO_MODE = true; // Default to demo for browsers without WebGPU (Firefox, etc.)

export function WebLLMChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(MODEL_ID);
  const [debugStatus, setDebugStatus] = useState<string>("");
  const engineRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeEngine();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeEngine = async () => {
    try {
      setModelLoading(true);
      setError(null);

      // Check WebGPU support - Firefox doesn't support it yet
      if (!(navigator as any).gpu) {
        const browserInfo = getBrowserInfo();
        throw new Error(
          `WebGPU not available. ${browserInfo}. WebLLM requires Chrome 113+, Edge 113+, or Safari 18+.`
        );
      }

      // Get GPU adapter info
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) {
        throw new Error("WebGPU adapter not available on this device");
      }

      const adapterInfo = await (adapter as any).requestAdapterInfo?.();
      console.log("GPU Info:", {
        vendor: adapterInfo?.vendor,
        architecture: adapterInfo?.architecture,
        device: adapterInfo?.device,
      });

      // Dynamic import to avoid SSR issues
      const { MLCEngine } = await import("@mlc-ai/web-llm");

      const engine = new MLCEngine({
        initProgressCallback: (progress) => {
          console.log(`Model loading: ${progress.text || "initializing"}`);
          setDebugStatus(`Loading: ${progress.text || "initializing"}`);
        },
      });

      // Try models in order
      let modelLoaded = false;
      let lastError: Error | null = null;

      for (const model of MODELS_TO_TRY) {
        try {
          console.log(`Attempting to load: ${model}`);
          setDebugStatus(`Loading: ${model}`);
          await engine.reload(model);
          engineRef.current = engine;
          modelLoaded = true;
          console.log(`✓ Loaded model: ${model}`);
          setDebugStatus(`✓ Loaded: ${model}`);
          break;
        } catch (err) {
          lastError = err as Error;
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.warn(`✗ ${model}: ${errorMsg}`);
          
          // Check for WebGPU limits
          if (errorMsg.includes("maxStorageBuffersPerShaderStage")) {
            console.log("GPU buffer limit hit - all models will fail. Check WebGPU support.");
            setDebugStatus(`GPU limit hit. Trying next...`);
          }
          continue;
        }
      }

      if (!modelLoaded) {
        const details = lastError?.message || "Unknown error";
        throw new Error(`No models loaded. Last error: ${details}`);
      }

      setIsDemoMode(false);
      setModelLoading(false);
    } catch (err) {
      // Fall back to demo mode
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("WebLLM initialization failed:", err);
      
      setIsDemoMode(true);
      setModelLoading(false);
      
      // Set user-friendly error message
      if (errorMsg.includes("Firefox")) {
        setError("Firefox doesn't support WebLLM. Use Chrome, Edge, or Safari 18+ for local AI.");
      } else if (errorMsg.includes("WebGPU not available")) {
        setError(errorMsg);
      } else if (errorMsg.includes("No models loaded")) {
        setError(`Initialization failed: ${errorMsg}. Running in demo mode.`);
      } else if (errorMsg.includes("maxStorageBuffersPerShaderStage")) {
        setError("Your GPU doesn't meet WebGPU requirements. Running in demo mode.");
      } else {
        setError(`WebLLM unavailable (${errorMsg}). Using demo mode.`);
      }
    }
  };

  const fetchAvailableModels = async () => {
    try {
      setDebugStatus("Fetching models...");
      const { prebuiltAppConfig } = await import("@mlc-ai/web-llm");

      // Get the prebuilt config with all available models
      const modelList = prebuiltAppConfig.model_list || [];
      const modelIds = modelList.map((m: any) => m.model_id);

      setAvailableModels(modelIds);
      setDebugStatus(`Found ${modelIds.length} models`);
      console.log("Available models:", modelIds);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch models";
      setDebugStatus(`Error: ${msg}`);
      console.error("Fetch models error:", err);
    }
  };

  const reloadSelectedModel = async () => {
    if (!selectedModel) {
      setDebugStatus("No model selected");
      return;
    }

    try {
      setDebugStatus(`Reloading ${selectedModel}...`);
      setModelLoading(true);

      const { MLCEngine } = await import("@mlc-ai/web-llm");

      const engine = new MLCEngine({
        initProgressCallback: (progress) => {
          console.log(`Loading: ${progress.text || ""}`);
        },
      });

      await engine.reload(selectedModel);
      engineRef.current = engine;
      setIsDemoMode(false);
      setModelLoading(false);
      setDebugStatus(`Loaded: ${selectedModel}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reload";
      setDebugStatus(`Error: ${msg}`);
      setModelLoading(false);
      console.error("Reload error:", err);
    }
  };

  const clearCache = async () => {
    try {
      setDebugStatus("Clearing cache...");

      // Clear IndexedDB
      const dbs = await indexedDB.databases?.();
      if (dbs) {
        for (const db of dbs) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        }
      }

      // Clear service worker cache
      if (typeof caches !== "undefined") {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      }

      setDebugStatus("Cache cleared. Reload page to restart.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to clear cache";
      setDebugStatus(`Error: ${msg}`);
      console.error("Clear cache error:", err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    if (!engineRef.current && !isDemoMode) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      let response = "";

      if (isDemoMode) {
        // Demo mode: simulate response
        await new Promise((resolve) => setTimeout(resolve, 1000));
        response = `[Demo Response] You said: "${input}"\n\nThis is a demo response because WebLLM models aren't currently available. In production, this would be processed by the local model running entirely on your device.`;
      } else {
        // Real inference - use chat.completions.create() API
        const result = await engineRef.current.chat.completions.create({
          messages: [{ role: "user", content: input }],
          max_tokens: 256,
          temperature: 0.7,
        });
        response = result.choices[0]?.message?.content || "No response generated";
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate response";
      setError(message);
      console.error("Generate error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-white safe-area-inset">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900 p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">WebLLM Chat (Phi-3.5)</h1>
            <p className="text-xs text-slate-400 mt-1">
              {modelLoading
                ? "Loading model..."
                : isDemoMode
                  ? "Demo Mode • Firefox detected (switch to Chrome/Edge for local AI)"
                  : "Model ready • Offline mode"}
            </p>
          </div>

          {/* Debug Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Debug Controls</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Status */}
              <div className="px-2 py-2 text-xs text-slate-400">
                {debugStatus || "Ready"}
              </div>
              <DropdownMenuSeparator />

              {/* Fetch Models */}
              <DropdownMenuItem onClick={fetchAvailableModels}>
                <span className="text-sm">Fetch Available Models</span>
              </DropdownMenuItem>

              {/* Model Select */}
              {availableModels.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs">
                    Select Model ({availableModels.length})
                  </DropdownMenuLabel>
                  {availableModels.slice(0, 8).map((model) => (
                    <DropdownMenuItem
                      key={model}
                      onClick={() => setSelectedModel(model)}
                      className={selectedModel === model ? "bg-blue-600" : ""}
                    >
                      <span className="text-xs truncate">{model}</span>
                    </DropdownMenuItem>
                  ))}
                  {availableModels.length > 8 && (
                    <DropdownMenuItem disabled>
                      <span className="text-xs">
                        +{availableModels.length - 8} more
                      </span>
                    </DropdownMenuItem>
                  )}
                </>
              )}

              {selectedModel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={reloadSelectedModel}>
                    <span className="text-sm">Load Selected Model</span>
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={clearCache}>
                <span className="text-sm">Clear Cache & Reset</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 overflow-hidden p-4">
        <div className="space-y-4 pr-4">
          {messages.length === 0 && !modelLoading && (
            <div className="text-center text-slate-400 py-8">
              <p>Start a conversation. Model runs offline on your device.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg break-words ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-100"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 px-4 py-2 rounded-lg flex items-center gap-2 text-slate-100">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Error Alert */}
      {error && (
        <div className="m-4 mt-0 p-3 rounded-lg bg-red-900/20 border border-red-700 flex items-center gap-2 text-red-200 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900 p-4 space-y-3 safe-area-inset-bottom">
        {modelLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Downloading model (~1.5GB first time)...
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            placeholder="Type a message..."
            className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { Download } from "lucide-react";

interface ModelLoadingIndicatorProps {
  support: { ok: true; engine: "webgpu" | "wasm"; recommendedModel: string } | null;
}

export const ModelLoadingIndicator = ({ support }: ModelLoadingIndicatorProps) => (
  <div
    role="status"
    aria-label="Downloading model"
    className="flex items-center gap-2 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 py-2 text-xs text-zinc-300"
  >
    <Download className="h-3.5 w-3.5 animate-pulse text-(--accent)" aria-hidden />
    <div>
      <p>Downloading model on this device</p>
      <p className="text-[10px] text-zinc-500">
        {support?.ok
          ? `${support.recommendedModel} · ${support.engine}`
          : "probing…"}
      </p>
    </div>
  </div>
);

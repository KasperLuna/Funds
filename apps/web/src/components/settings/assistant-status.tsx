"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAssistantSheet } from "@/components/assistant/assistant-sheet-context";
import type { ModelId } from "@/lib/llm/types";
import { MODEL_LABELS } from "@/lib/llm/types";
import { Section } from "@/components/settings/section";

export const AssistantStatus = () => {
  const { setOpen: setAssistantOpen } = useAssistantSheet();
  const queryClient = useQueryClient();
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadingModel, setDownloadingModel] = useState<ModelId | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ModelId | null>(null);

  const supportQuery = useQuery({
    queryKey: ["llm", "support"],
    queryFn: async () => {
      const { detectSupport } = await import("@/lib/llm/capability");
      return await detectSupport();
    },
  });

  const engineStatusQuery = useQuery({
    queryKey: ["llm", "engine-status"],
    queryFn: async () => {
      const { getLlmEngine } = await import("@/lib/llm");
      return getLlmEngine().status();
    },
  });

  const currentModelQuery = useQuery({
    queryKey: ["llm", "current-model"],
    queryFn: async () => {
      const { getLlmEngine } = await import("@/lib/llm");
      return getLlmEngine().currentModelId();
    },
  });

  const modelIdsQuery = useQuery({
    queryKey: ["llm", "model-ids"],
    queryFn: async () => {
      const { allModelIds } = await import("@/lib/llm");
      return allModelIds();
    },
  });

  const cachedModelsQuery = useQuery({
    queryKey: ["llm", "cached-models"],
    queryFn: async () => {
      const { allModelIds, isModelAvailable } = await import("@/lib/llm");
      const ids = allModelIds();
      const result: Record<string, boolean> = {};
      for (const id of ids) {
        result[id] = await isModelAvailable(id);
      }
      return result;
    },
  });

  const support = supportQuery.data
    ? supportQuery.data.ok
      ? `${supportQuery.data.engine} · ${supportQuery.data.recommendedModel}`
      : supportQuery.data.reason
    : null;
  const engineStatus = engineStatusQuery.data ?? "not-loaded";
  const currentModel = currentModelQuery.data ?? null;
  const modelIds = modelIdsQuery.data ?? [];
  const cachedModels = cachedModelsQuery.data ?? {};

  const downloadMutation = useMutation({
    mutationFn: async (modelId: ModelId) => {
      const { getLlmEngine } = await import("@/lib/llm");
      const engine = getLlmEngine();
      await engine.load(modelId, (p) => {
        setDownloadProgress(Math.round(p.loaded * 100));
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["llm", "engine-status"] });
      void queryClient.invalidateQueries({ queryKey: ["llm", "current-model"] });
      void queryClient.invalidateQueries({ queryKey: ["llm", "cached-models"] });
    },
    onError: (err) => {
      console.error("Model download failed:", err);
    },
  });

  const unloadMutation = useMutation({
    mutationFn: async () => {
      const { getLlmEngine } = await import("@/lib/llm");
      await getLlmEngine().unload();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["llm", "engine-status"] });
      void queryClient.invalidateQueries({ queryKey: ["llm", "current-model"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (modelId: ModelId) => {
      const { getLlmEngine } = await import("@/lib/llm");
      await getLlmEngine().deleteModel(modelId);
      return modelId;
    },
    onSuccess: (modelId) => {
      void queryClient.invalidateQueries({ queryKey: ["llm", "cached-models"] });
      if (currentModel === modelId) {
        void queryClient.invalidateQueries({ queryKey: ["llm", "engine-status"] });
        void queryClient.invalidateQueries({ queryKey: ["llm", "current-model"] });
      }
    },
    onError: (err) => {
      console.error("Model delete failed:", err);
    },
  });

  const handleDownload = (modelId: ModelId) => {
    setDownloadingModel(modelId);
    setDownloadProgress(0);
    downloadMutation.mutate(modelId, {
      onSettled: () => {
        setDownloadingModel(null);
        setDownloadProgress(null);
      },
    });
  };

  const handleUnload = () => {
    unloadMutation.mutate();
  };

  const supportLabel = supportQuery.isPending ? "checking…" : support;

  const downloadErrorMessage = downloadMutation.isError
    ? downloadMutation.error instanceof Error
      ? downloadMutation.error.message
      : "Unknown error"
    : null;

  return (
    <>
      <Section title="On-device assistant">
        <p className="mb-3 text-xs text-zinc-500">
          Ask about your money in plain language. Everything runs on this device — no
          data leaves the phone.
        </p>
        <button
          type="button"
          onClick={() => setAssistantOpen(true)}
          className="mb-3 inline-flex items-center gap-1.5 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-(--surface-3) focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
          Open chat
        </button>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Capability</span>
          <span className="text-zinc-300">{supportLabel}</span>
        </div>

        {downloadErrorMessage && (
          <div className="mt-2 rounded-(--radius-md) border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            <p className="font-medium">Download failed</p>
            <p className="mt-0.5 text-red-400/80">{downloadErrorMessage}</p>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2">
          {modelIds.map((id) => {
            const label = MODEL_LABELS[id];
            const isCached = cachedModels[id] ?? false;
            const isActive = currentModel === id && engineStatus === "ready";
            return (
              <div
                key={id}
                className="flex items-center justify-between rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{label}</span>
                  {isActive && (
                    <span className="rounded-full bg-(--accent)/10 px-1.5 py-0.5 text-[10px] font-medium text-(--accent)">
                      Active
                    </span>
                  )}
                  {isCached && !isActive && (
                    <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                      Cached
                    </span>
                  )}
                </div>
                {isActive ? (
                  <Button variant="ghost" size="sm" onClick={handleUnload}>
                    Unload
                  </Button>
                ) : deleteMutation.isPending && deleteTarget === id ? (
                  <span className="text-[10px] text-zinc-500">Deleting…</span>
                ) : downloadingModel === id ? (
                  downloadProgress !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-700">
                        <div
                          className="h-full rounded-full bg-(--accent) transition-[width]"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400">{downloadProgress}%</span>
                    </div>
                  ) : null
                ) : isCached ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(id)}
                    >
                      {isCached ? "Load" : "Download"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(id)}
                    >
                      Delete
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(id)}
                  >
                    Download
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {deleteTarget && (
        <AlertDialog open onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete model?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the model's cached weights from the device.
                The model will need to be re-downloaded to use it again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    const target = deleteTarget;
                    if (!target) return;
                    deleteMutation.mutate(target, {
                      onSettled: () => setDeleteTarget(null),
                    });
                  }}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

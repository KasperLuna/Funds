"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "../pocketbase/pocketbase";
import { useAuth } from "./useAuth";

export interface VoiceDraft {
  id: string;
  token: string;
  preview: any;
  source: string;
  createdAt: string;
  expiresAt: string;
  userId: string;
}

const parsePreview = (raw: any): any => {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
};

export const useVoiceDraftsQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: drafts = [], isLoading } = useQuery<VoiceDraft[]>({
    queryKey: ["voiceDrafts", user?.id],
    queryFn: async () => {
      const result = await pb.collection("voice_drafts").getFullList({
        filter: `user="${user?.id}"`,
      });
      const now = Date.now();
      return result
        .filter((rec) => {
          const exp = rec.expiresAt;
          return !exp || new Date(exp).getTime() > now;
        })
        .map((rec) => ({
          id: rec.id,
          token: rec.token,
          preview: parsePreview(rec.preview),
          source: rec.source,
          createdAt: rec.createdAt,
          expiresAt: rec.expiresAt,
          userId: rec.user,
        }));
    },
    enabled: !!user,
    refetchInterval: 15000, // refresh every 15s so expired ones disappear
    refetchOnWindowFocus: true,
  });

  const dismissDraft = async (id: string) => {
    await pb.collection("voice_drafts").delete(id);
    queryClient.setQueryData<VoiceDraft[]>(["voiceDrafts", user?.id], (prev) =>
      (prev ?? []).filter((d) => d.id !== id),
    );
  };

  return { drafts, loading: isLoading, dismissDraft };
};

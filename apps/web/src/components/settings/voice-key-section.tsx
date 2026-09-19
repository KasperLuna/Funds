"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

export const VoiceKeySection = () => {
  const [configured, setConfigured] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    trpc.voiceKey.status
      .query()
      .then((s) => setConfigured(s.configured))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const generate = async () => {
    setBusy(true);
    try {
      const { apiKey } = await trpc.voiceKey.generate.mutate();
      setFreshKey(apiKey);
      setCopied(false);
      setConfigured(true);
    } catch (err) {
      console.error("Failed to generate shortcut key:", err);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await trpc.voiceKey.revoke.mutate();
      setFreshKey(null);
      setConfigured(false);
    } catch (err) {
      console.error("Failed to revoke shortcut key:", err);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!freshKey) return;
    try {
      await navigator.clipboard.writeText(freshKey);
      setCopied(true);
    } catch (err) {
      console.error("Failed to copy key:", err);
    }
  };

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const label = !loaded ? "Checking…" : configured ? "Active" : "Not set up";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <KeyRound className="h-5 w-5 shrink-0 text-zinc-500" />
          <div>
            <p className="text-sm font-medium">Shortcut key</p>
            <p className="text-xs text-zinc-500">{label} — authenticates your iOS Shortcut</p>
          </div>
        </div>
        {loaded && !freshKey && !configured && (
          <Button variant="outline" size="sm" onClick={() => void generate()} disabled={busy}>
            Generate
          </Button>
        )}
        {loaded && !freshKey && configured && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void generate()} disabled={busy}>
              Replace
            </Button>
            <Button variant="outline" size="sm" onClick={() => void revoke()} disabled={busy}>
              Revoke
            </Button>
          </div>
        )}
      </div>

      {freshKey && (
        <div className="flex flex-col gap-2 rounded-(--radius-md) bg-(--surface-3) p-3">
          <div className="flex items-center justify-between gap-2">
            <code className="truncate font-mono text-xs">{freshKey}</code>
            <Button variant="ghost" size="sm" onClick={() => void copy()} aria-label="Copy key">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            Copy it into your Shortcut now — it is shown once and never again.
          </p>
        </div>
      )}

      <ol className="flex list-decimal flex-col gap-1 pl-5 text-xs text-zinc-500">
        <li>Generate a key above and paste it into your Shortcut as the bearer token.</li>
        <li>
          Shortcut POSTs JSON <code className="font-mono">{`{"text": "12.50 Coffee MyBank"}`}</code> to{" "}
          <code className="font-mono">{`${origin}/api/voice/webhook`}</code> with header{" "}
          <code className="font-mono">Authorization: Bearer &lt;key&gt;</code>. Name the account in the
          text so it lands under the right one.
        </li>
        <li>
          Open <code className="font-mono">{`${origin}/dashboard?draftToken=<draftToken>`}</code> from
          the response and tap Save to confirm.
        </li>
      </ol>
    </div>
  );
};

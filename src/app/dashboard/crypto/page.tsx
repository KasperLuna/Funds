"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CryptoDashboard } from "@/components/dashboard/CryptoDashboard";
import { TokenForm } from "@/components/TokenForm";
import { TokensProvider } from "@/lib/providers/TokensProvider";

export default function CryptoPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <TokensProvider>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Crypto</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={
                <Button size="sm">
                  <Plus className="size-4" data-icon="inline-start" />
                  Add Token
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Token</DialogTitle>
              </DialogHeader>
              <TokenForm onSuccess={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <section aria-label="Crypto portfolio">
          <CryptoDashboard />
        </section>
      </div>
    </TokensProvider>
  );
}

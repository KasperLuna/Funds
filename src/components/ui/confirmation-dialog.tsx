"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  confirmationPhrase?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  confirmationPhrase,
  onConfirm,
  loading = false,
}: ConfirmationDialogProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [isConfirming, setIsConfirming] = React.useState(false);

  const isConfirmEnabled = confirmationPhrase
    ? inputValue === confirmationPhrase
    : true;

  React.useEffect(() => {
    if (!open) {
      setInputValue("");
      setIsConfirming(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!isConfirmEnabled) return;

    setIsConfirming(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Confirmation action failed:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 text-white border-slate-700 max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            {variant === "destructive" && (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            )}
            <DialogTitle className="text-lg">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-slate-300">
            {description}
          </DialogDescription>
        </DialogHeader>

        {confirmationPhrase && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">
              Type{" "}
              <span className="font-mono font-semibold text-white">
                {confirmationPhrase}
              </span>{" "}
              to confirm:
            </p>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmationPhrase}
              className="bg-slate-800 border-slate-600 text-white"
              autoComplete="off"
            />
          </div>
        )}

        <DialogFooter className="space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming || loading}
            className="border-slate-600 text-slate-300 bg-slate-600 hover:bg-slate-700 hover:text-slate-200"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isConfirming || loading}
            className={
              variant === "destructive" ? "bg-red-600 hover:bg-red-700" : ""
            }
          >
            {isConfirming || loading ? "Please wait..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

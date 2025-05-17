import { BankSelect } from "@/components/banks/BankSelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import {
  recomputeBalanceById,
  deleteBankById,
  renameBankById,
} from "@/lib/pocketbase/queries";
import { parseAmount } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import React, { useState } from "react";

export const BankSettings = () => {
  const router = useRouter();
  const { bankData, baseCurrency } = useBanksCategsContext();
  const { control, watch } = useForm();
  const bank = watch("bank");
  const selectedBank = bankData?.banks?.find((b) => b.id === bank);

  // State for rename modal
  const [showRename, setShowRename] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [renameError, setRenameError] = useState("");

  // State for delete modal
  const [showDelete, setShowDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const handleRename = async () => {
    if (!selectedBank) return;
    if (renameInput.trim() === "") {
      setRenameError("Bank name cannot be empty.");
      return;
    }
    await renameBankById(selectedBank.id, renameInput.trim());
    setShowRename(false);
    setRenameInput("");
    setRenameError("");
    bankData?.refetch?.();
  };

  const handleDelete = async () => {
    if (!selectedBank) return;
    await deleteBankById(selectedBank.id);
    setShowDelete(false);
    setDeleteInput("");
    setDeleteError("");
    bankData?.refetch?.();
    // Optionally, reset selection or redirect
  };

  return (
    <div className="flex flex-col gap-4 pb-3">
      <div className="flex flex-col gap-1 w-full">
        <Label htmlFor="date">{"Bank: "}</Label>
        <div className="flex flex-row gap-1">
          <Controller
            name="bank"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <BankSelect value={field.value} onChange={field.onChange} />
            )}
          />
          <Button
            className="px-2"
            onClick={() => router.push("/dashboard/banks?create=Bank")}
          >
            <Plus />
          </Button>
        </div>
      </div>
      <p>Balance: {parseAmount(selectedBank?.balance, baseCurrency?.code)}</p>
      <Separator />
      <div className="flex flex-col gap-2">
        <Button
          disabled={!bank}
          variant={"outline"}
          className="bg-slate-900 border-slate-500"
          onClick={() => {
            recomputeBalanceById(bank);
            alert("Balance recomputed");
          }}
        >
          Recompute Balance
        </Button>
        <Button
          disabled={!bank}
          variant={"outline"}
          className="bg-slate-900 border-slate-500"
          onClick={() => setShowRename(true)}
        >
          Rename Bank
        </Button>
        <Button
          disabled={!bank}
          variant={"destructive"}
          onClick={() => setShowDelete(true)}
        >
          Delete Bank
        </Button>
      </div>
      {/* Rename Modal */}
      {showRename && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg flex flex-col gap-3 min-w-[320px]">
            <h2 className="text-lg font-bold text-slate-100">Rename Bank</h2>
            <p className="text-slate-300 text-sm mb-2">
              Type the new name for <b>{selectedBank?.name}</b> below:
            </p>
            <input
              className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-100"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              placeholder="New bank name"
              autoFocus
            />
            {renameError && (
              <span className="text-red-500 text-xs">{renameError}</span>
            )}
            <div className="flex gap-2 mt-2">
              <Button onClick={() => setShowRename(false)}>Cancel</Button>
              <Button
                variant="default"
                onClick={handleRename}
                disabled={
                  renameInput.trim() === "" ||
                  renameInput.trim() === selectedBank?.name
                }
              >
                Confirm Rename
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg flex flex-col gap-3 min-w-[320px]">
            <h2 className="text-lg font-bold text-slate-100">Delete Bank</h2>
            <p className="text-slate-300 text-sm mb-2">
              Type <b>DELETE {selectedBank?.name}</b> to confirm deletion.
            </p>
            <input
              className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-100"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={`DELETE ${selectedBank?.name}`}
              autoFocus
            />
            {deleteError && (
              <span className="text-red-500 text-xs">{deleteError}</span>
            )}
            <div className="flex gap-2 mt-2">
              <Button onClick={() => setShowDelete(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteInput !== `DELETE ${selectedBank?.name}`}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

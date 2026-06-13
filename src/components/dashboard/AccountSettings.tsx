import { Controller, useForm } from "react-hook-form";
import { CurrencySelector } from "./settings/CurrencySelector";
import { User } from "@/lib/types";
import { Button } from "../ui/button";
import { updateUser } from "@/lib/pocketbase/queries";
import { Input } from "../ui/input";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useUserQuery } from "@/lib/hooks/useUserQuery";
import { thumbs } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import Image from "next/image";
import { useToast } from "../ui/toast";
import { LoadingSpinner } from "../ui/loading";
import { Save, User as UserIcon, Globe, Key, Copy, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

export const AccountSettings = () => {
  const queryClient = useQueryClient();
  const { data, isLoading: userLoading } = useUserQuery();
  const { addToast } = useToast();

  const avatar = createAvatar(thumbs, {
    seed: data?.username,
  });

  const {
    control,
    handleSubmit,
    register,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<Pick<User, "username" | "currency">>({
    defaultValues: {
      username: data?.username || "",
      currency: data?.currency || {
        code: "USD",
        name: "United States Dollar",
        symbol: "$",
      },
    },
  });

  const watchedUsername = watch("username");

  useEffect(() => {
    if (data) {
      reset({
        currency: data.currency ?? {
          code: "USD",
          name: "United States Dollar",
          symbol: "$",
        },
        username: data.username ?? "",
      });
    }
  }, [data, reset]);

  const updateMutation = useMutation({
    mutationFn: async (submission: Pick<User, "username" | "currency">) => {
      const formData = new FormData();
      formData.append("username", submission.username);
      formData.append("currency", JSON.stringify(submission.currency));
      await updateUser(formData);
      await queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Account updated",
        description: "Your account settings have been saved successfully.",
      });
    },
    onError: (error) => {
      console.error("Failed to update account:", error);
      addToast({
        type: "error",
        title: "Update failed",
        description:
          "Failed to update your account settings. Please try again.",
      });
    },
  });

  const onSubmit = handleSubmit((data) => updateMutation.mutate(data));

  // Handlers moved out of JSX
  const handleCopyKey = async () => {
    try {
      const key = data?.voiceApiKey || "";
      if (!key) throw new Error("no-key");
      await navigator.clipboard.writeText(key);
      addToast({ type: "success", title: "Copied" });
    } catch {
      addToast({ type: "error", title: "Copy failed" });
    }
  };

  const handleRevokeKey = async () => {
    try {
      const formData = new FormData();
      formData.append("voiceApiKey", "");
      await updateUser(formData);
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      addToast({ type: "success", title: "Revoked" });
    } catch (e) {
      console.error(e);
      addToast({ type: "error", title: "Revoke failed" });
    }
  };

  const handleGenerateApiKey = async () => {
    try {
      const arr = new Uint8Array(24);
      crypto.getRandomValues(arr);
      const newKey = Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const formData = new FormData();
      formData.append("voiceApiKey", newKey);
      await updateUser(formData);
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      addToast({ type: "success", title: "API Key generated" });
    } catch (e) {
      console.error(e);
      addToast({ type: "error", title: "Failed to generate" });
    }
  };

  const maskedVoiceApiKey = data?.voiceApiKey
    ? `${data.voiceApiKey.slice(0, 6)}...${data.voiceApiKey.slice(-6)}`
    : null;

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-10">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-white text-base">
            <UserIcon className="w-4 h-4" />
            <span>Profile Information</span>
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Manage your account details and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={onSubmit} className="space-y-3">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-2">
              <div className="relative">
                <Image
                  src={avatar.toDataUri()}
                  alt="User Profile"
                  width={80}
                  height={80}
                  className="rounded-lg shadow-lg"
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-400">
                  Your avatar is generated based on your username
                </p>
              </div>
            </div>

            {/* Username Section */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-white flex items-center space-x-1">
                <UserIcon className="w-3 h-3" />
                <span>Username</span>
              </label>
              <Input
                {...register("username", {
                  required: "Username is required",
                  minLength: {
                    value: 2,
                    message: "Username must be at least 3 characters",
                  },
                  maxLength: {
                    value: 150,
                    message: "Username must be less than 150 characters",
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9]+$/,
                    message: "Username must only contain letters and numbers",
                  },
                })}
                className="bg-slate-700 text-white border-slate-600 focus:border-orange-500 focus:ring-orange-500"
                placeholder="Enter your username"
              />
              {errors.username && (
                <p className="text-red-400 text-xs">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Currency Section */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-white flex items-center space-x-1">
                <Globe className="w-3 h-3" />
                <span>Base Currency</span>
              </label>
              <Controller
                name="currency"
                control={control}
                rules={{ required: "Please select a currency" }}
                render={({ field: { onChange, value } }) => (
                  <CurrencySelector value={value} onChange={onChange} />
                )}
              />
              {errors.currency && (
                <p className="text-red-400 text-xs">
                  {errors.currency.message}
                </p>
              )}
              <p className="text-xs text-slate-400">
                This will be used as the default currency for all transactions
              </p>
            </div>

            {/* Save Button */}
            <Button
              type="submit"
              disabled={!isDirty || updateMutation.isPending}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-4"
            >
              {updateMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Voice API Key Card */}
      <Card className="bg-slate-800 border-slate-700 mb-10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-white text-base">
            <Key className="w-4 h-4" />
            <span>Voice API Key</span>
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Generate API key for Siri Shortcut voice capture. Keep secret.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-200">Your API Key</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleCopyKey}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRevokeKey}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-md p-3">
              <p className="text-xs text-slate-400 break-all">
                {maskedVoiceApiKey ? (
                  <span>{maskedVoiceApiKey}</span>
                ) : (
                  <span className="text-slate-500">Not set</span>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Add this header to your Shortcut:{" "}
                <code>Authorization: Bearer &lt;voiceApiKey&gt;</code>
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-500"
                onClick={handleGenerateApiKey}
              >
                Generate API Key
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

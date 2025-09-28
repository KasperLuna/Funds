import { Controller, useForm } from "react-hook-form";
import { CurrencySelector } from "./settings/CurrencySelector";
import { User } from "@/lib/types";
import { Button } from "../ui/button";
import { updateUser } from "@/lib/pocketbase/queries";
import { Input } from "../ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useUserQuery } from "@/lib/hooks/useUserQuery";
import { thumbs } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import Image from "next/image";
import { useToast } from "../ui/toast";
import { LoadingSpinner } from "../ui/loading";
import { Save, User as UserIcon, Globe, RefreshCw } from "lucide-react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegeneratingAvatar, setIsRegeneratingAvatar] = useState(false);

  const avatar = createAvatar(thumbs, {
    seed: data?.username,
  });

  const {
    control,
    handleSubmit,
    register,
    setValue,
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
      setValue(
        "currency",
        data?.currency ?? {
          code: "USD",
          name: "United States Dollar",
          symbol: "$",
        }
      );
      setValue("username", data?.username ?? "");
    }
  }, [data, setValue]);

  const onSubmit = async (submission: Pick<User, "username" | "currency">) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("username", submission.username);
      formData.append("currency", JSON.stringify(submission.currency));

      await updateUser(formData);
      await queryClient.invalidateQueries({ queryKey: ["user"] });

      addToast({
        type: "success",
        title: "Account updated",
        description: "Your account settings have been saved successfully.",
      });
    } catch (error) {
      console.error("Failed to update account:", error);
      addToast({
        type: "error",
        title: "Update failed",
        description:
          "Failed to update your account settings. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const regenerateAvatar = () => {
    setIsRegeneratingAvatar(true);
    // Simulate regeneration with a small delay for UX
    setTimeout(() => {
      setIsRegeneratingAvatar(false);
      addToast({
        type: "info",
        title: "Avatar updated",
        description: "Your avatar has been refreshed based on your username.",
      });
    }, 500);
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-2">
              <div className="relative">
                {isRegeneratingAvatar ? (
                  <div className="w-20 h-20 rounded-lg bg-slate-700 flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : (
                  <Image
                    src={avatar.toDataUri()}
                    alt="User Profile"
                    width={80}
                    height={80}
                    className="rounded-lg shadow-lg"
                  />
                )}
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-400">
                  Your avatar is generated based on your username
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={regenerateAvatar}
                  disabled={isRegeneratingAvatar}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs px-2 py-1"
                >
                  <RefreshCw
                    className={`w-3 h-3 mr-1 ${isRegeneratingAvatar ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
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
                    value: 3,
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
              disabled={!isDirty || isSubmitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-4"
            >
              {isSubmitting ? (
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
    </div>
  );
};

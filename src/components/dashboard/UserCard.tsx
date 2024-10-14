"use client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUserQuery } from "@/lib/hooks/useUserQuery";
import { ScanFace } from "lucide-react";
import { createAvatar } from "@dicebear/core";
import { thumbs } from "@dicebear/collection";
import Image from "next/image";
import { Skeleton } from "../ui/skeleton";

export const UserCard = () => {
  const { user } = useAuth();
  const { data, isLoading } = useUserQuery();
  const avatar = createAvatar(thumbs, {
    seed: data?.username,
  });

  return (
    <div className="p-2 rounded-md text-slate-100 bg-slate-900 border-2 border-slate-800 flex flex-row gap-3 items-center ">
      <Image
        src={avatar.toDataUri()}
        alt="User Profile"
        width={45}
        height={45}
        className="rounded-md"
      />
      <div className="flex gap-0 flex-col overflow-hidden text-ellipsis">
        {isLoading ? (
          <Skeleton className="h-4 w-16 bg-slate-600" />
        ) : (
          <h3 className="overflow-hidden text-ellipsis whitespace-nowrap">
            {data?.username}
          </h3>
        )}
        <small className="overflow-hidden text-ellipsis text-slate-400">
          {user?.email}
        </small>
      </div>
    </div>
  );
};

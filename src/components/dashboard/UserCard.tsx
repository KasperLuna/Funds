"use client";
import { useAuth } from "@/lib/hooks/useAuth";
import { ScanFace } from "lucide-react";

export const UserCard = () => {
  const { user } = useAuth();
  return (
    <div className="p-2 rounded-md text-slate-100 bg-slate-900 border-2 border-slate-800 flex flex-row gap-3 items-center">
      {user?.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.photoURL}
          alt="User Profile"
          width={35}
          height={35}
          className="rounded-full"
        />
      ) : (
        <ScanFace className="w-8 h-8" />
      )}
      <div className="flex gap-0 flex-col overflow-hidden text-ellipsis">
        <h3 className="overflow-hidden text-ellipsis whitespace-nowrap">
          {user?.displayName}
        </h3>
        <small className="overflow-hidden text-ellipsis text-slate-400">
          {user?.email}
        </small>
      </div>
    </div>
  );
};

import { ChevronDown } from "lucide-react";
import { PopoverTrigger } from "../ui/popover";
import { useUserQuery } from "@/lib/hooks/useUserQuery";
import { thumbs } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import Image from "next/image";

export const DropdownTrigger = () => {
  const { data } = useUserQuery();
  const avatar = createAvatar(thumbs, {
    seed: data?.username,
  });

  return (
    <PopoverTrigger className="bg-slate-800 rounded-lg hover:bg-slate-700">
      <div className="flex flex-row items-center gap-2 p-1">
        <Image
          src={avatar.toDataUri()}
          alt="User Profile"
          width={30}
          height={30}
          className="rounded-md"
        />
        <p className="text-slate-100 text-xs overflow-hidden text-ellipsis max-w-28">
          {data?.username}
        </p>
        <ChevronDown className="stroke-slate-200 w-4" />
      </div>
    </PopoverTrigger>
  );
};

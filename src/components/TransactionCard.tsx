import { Edit } from "lucide-react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

export const TransactionCard = ({
  date,
  bank,
  amount,
  description,
  tags,
}: {
  date: string;
  bank: string;
  amount: string;
  description: string;
  tags: string[];
}) => {
  return (
    <div
      id="transaction-card"
      className="flex flex-col flex-grow text-slate-200 p-2 border-2 gap-2 border-slate-700 h-fit rounded-lg"
    >
      <div className="flex flex-row w-full items-center justify-between gap-2">
        <div className="flex flex-col text-center">
          <p>{date}</p>
          <Separator orientation="horizontal" />
          <small>{bank}</small>
        </div>
        <div className="flex flex-col text-center">
          <p className="text-lg font-semibold">{amount}</p>
          <small className="text-justify">
            {description.length > 50
              ? description.slice(0, 50) + "..."
              : description}
          </small>
        </div>
        <Button className="p-1 h-6 py-0 bg-slate-900">
          <Edit className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex flex-row flex-wrap w-full bg-slate-900 rounded-md p-1 gap-2 border-2 border-slate-700">
        {tags.map((tag) => (
          <small
            key={tag}
            className="bg-slate-600 px-2 rounded-full whitespace-nowrap"
          >
            {tag}
          </small>
        ))}
      </div>
    </div>
  );
};

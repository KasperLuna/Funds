export const StatCard = ({
  bank,
  amount,
  percent,
}: {
  bank: string;
  amount: string;
  percent: string;
}) => {
  return (
    <div className="flex border-slate-600/25 border-2 flex-col text-center text-slate-200 bg-slate-900 flex-grow p-2 rounded-md max-w-[300px] min-w-[155px]">
      <div className="flex flex-row justify-between">
        {" "}
        <small>{bank}</small>
        <small>{percent}</small>
      </div>
      <p>{amount}</p>
    </div>
  );
};

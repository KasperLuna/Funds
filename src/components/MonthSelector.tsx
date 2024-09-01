import { Tabs, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { useState } from "react";
import { MonthPicker } from "./MonthPicker";

export const MonthSelector = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("latest");
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(
    new Date()
  );
  return (
    <>
      {" "}
      <div className="flex flex-row gap-2 ml-auto sm:ml-0">
        <Tabs
          role="navigation"
          value={selectedPeriod}
          onValueChange={(value) => setSelectedPeriod(value)}
          className="flex"
        >
          <TabsList className="gap-2 bg-slate-800 fill-slate-200">
            <TabsTrigger value="latest">Latest</TabsTrigger>
            <TabsTrigger value="by_month">By Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {selectedPeriod !== "latest" && (
        <div className="flex xs:w-full justify-end md:w-fit ml-auto sm:ml-0">
          <MonthPicker date={selectedMonth} setDate={setSelectedMonth} />
        </div>
      )}
    </>
  );
};

import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export const TrendsChart = ({
  options,
  series,
}: {
  options: ApexCharts.ApexOptions;
  series: {
    name: string;
    data: number[];
  }[];
}) => (
  <div className="w-full h-[300px] lg:h-[500px]">
    <Chart options={options} series={series} type="line" height={300} />
  </div>
);

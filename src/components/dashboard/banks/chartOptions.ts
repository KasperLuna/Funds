import { ApexOptions } from "apexcharts";

export const getCategoryChartOptions = ({
  sortedKeys,
  sortedValues,
  isPrivate,
  handleBarClick,
}: {
  sortedKeys: string[];
  sortedValues: number[];
  isPrivate: boolean;
  handleBarClick: (dataPointIndex: number) => void;
}): ApexOptions => ({
  chart: {
    type: "bar",
    background: "transparent",
    toolbar: { show: false },
    events: {
      dataPointSelection: (
        _event,
        _chartContext,
        { dataPointIndex }: { dataPointIndex: number }
      ) => handleBarClick(dataPointIndex),
    },
  },
  xaxis: {
    categories: sortedKeys,
    labels: {
      show: !isPrivate,
      style: {
        colors: ["#FFFFFF", "#FFFFFF"],
        fontSize: "12px",
        fontFamily: "monospace",
        fontWeight: 600,
      },
    },
  },
  yaxis: {
    labels: {
      style: {
        colors: sortedValues.map((_, index) =>
          index % 2 === 0 ? "#FFFFFF" : "#D3D3D3"
        ),
        fontSize: "12px",
        fontWeight: 600,
      },
    },
  },
  grid: {
    show: true,
    borderColor: "#1e293b",
    strokeDashArray: 0,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
    padding: { left: 0, right: 0, top: 10, bottom: 10 },
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 5,
      dataLabels: { position: "center" },
      colors: {
        ranges: [
          { from: 0, to: Number.MAX_VALUE, color: "#90EE90" },
          { from: -Number.MAX_VALUE, to: -1, color: "#EF4444" },
        ],
      },
    },
  },
  dataLabels: {
    enabled: !isPrivate,
    style: {
      colors: sortedValues.map((value: number) =>
        value > 0 ? "#FFFFFF" : "#D3D3D3"
      ),
      fontSize: "10px",
      fontWeight: 500,
      fontFamily: "monospace",
    },
    offsetX: 1000,
    formatter: (val: number) => `${val}`,
  },
  tooltip: {
    theme: "dark",
    style: {
      fontSize: "12px",
      fontFamily: "monospace",
    },
    y: { formatter: (val: number) => `${val}` },
  },
});

export const getBanksChartOptions = ({
  sortedBanks,
  sortedTotals,
  isPrivate,
  sortedBankNames,
}: {
  sortedBanks: string[];
  sortedTotals: number[];
  isPrivate: boolean;
  sortedBankNames: string[];
}): ApexOptions => ({
  chart: {
    type: "bar" as const,
    background: "transparent",
    toolbar: { show: false },
  },
  xaxis: {
    categories: sortedBankNames,
    labels: {
      show: !isPrivate,
      style: {
        colors: ["#FFFFFF", "#FFFFFF"],
        fontSize: "12px",
        fontFamily: "monospace",
        fontWeight: 600,
      },
    },
  },
  yaxis: {
    labels: {
      style: {
        colors: sortedTotals.map((_, index) =>
          index % 2 === 0 ? "#FFFFFF" : "#D3D3D3"
        ),
        fontSize: "12px",
        fontWeight: 600,
      },
    },
  },
  grid: {
    show: true,
    borderColor: "#1e293b",
    strokeDashArray: 0,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
    padding: { left: 0, right: 0, top: 10, bottom: 10 },
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 5,
      dataLabels: { position: "center" },
      colors: {
        ranges: [
          { from: 0, to: Number.MAX_VALUE, color: "#90EE90" },
          { from: -Number.MAX_VALUE, to: -1, color: "#EF4444" },
        ],
      },
    },
  },
  dataLabels: {
    enabled: !isPrivate,
    style: {
      colors: sortedTotals.map((value: number) =>
        value > 0 ? "#FFFFFF" : "#D3D3D3"
      ),
      fontSize: "10px",
      fontWeight: 500,
      fontFamily: "monospace",
    },
    offsetX: 1000,
    formatter: (val: number) => `${val}`,
  },
  tooltip: {
    theme: "dark",
    style: {
      fontSize: "12px",
      fontFamily: "monospace",
    },
    y: { formatter: (val: number) => `${val}` },
  },
});

export const getBanksCountChartOptions = ({
  sortedBanks,
  sortedCounts,
  isPrivate,
  sortedBankNames,
}: {
  sortedBanks: string[];
  sortedCounts: number[];
  isPrivate: boolean;
  sortedBankNames: string[];
}): ApexOptions => ({
  chart: {
    type: "bar" as const,
    background: "transparent",
    toolbar: { show: false },
  },
  xaxis: {
    categories: sortedBankNames,
    labels: {
      show: !isPrivate,
      style: {
        colors: ["#FFFFFF", "#FFFFFF"],
        fontSize: "12px",
        fontFamily: "monospace",
        fontWeight: 600,
      },
    },
  },
  yaxis: {
    labels: {
      style: {
        colors: sortedCounts.map((_, index) =>
          index % 2 === 0 ? "#FFFFFF" : "#D3D3D3"
        ),
        fontSize: "12px",
        fontWeight: 600,
      },
    },
  },
  grid: {
    show: true,
    borderColor: "#1e293b",
    strokeDashArray: 0,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
    padding: { left: 0, right: 0, top: 10, bottom: 10 },
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 5,
      dataLabels: { position: "center" },
      colors: {
        ranges: [{ from: 0, to: Number.MAX_VALUE, color: "#60A5FA" }],
      },
    },
  },
  dataLabels: {
    enabled: !isPrivate,
    style: {
      colors: sortedCounts.map(() => "#FFFFFF"),
      fontSize: "10px",
      fontWeight: 500,
      fontFamily: "monospace",
    },
    offsetX: 1000,
    formatter: (val: number) => `${val}`,
  },
  tooltip: {
    theme: "dark",
    style: {
      fontSize: "12px",
      fontFamily: "monospace",
    },
    y: { formatter: (val: number) => `${val}` },
  },
});

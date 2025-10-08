import { StatCard } from "./StatCard";
import { StatCardLoader } from "./StatCardLoader";
import { trimToTwoDecimals } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import autoAnimate from "@formkit/auto-animate";
import { Button } from "@/components/ui/button";
import { useBanksQuery } from "@/lib/hooks/useBanksQuery";

export const StatsSection = () => {
  const { banks, loading } = useBanksQuery();
  const totalAmount =
    banks?.reduce((acc, bank) => {
      return acc + bank.balance;
    }, 0) || 0;

  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive: determine cards per row based on window width
  const [cardsPerRow, setCardsPerRow] = useState(2);
  useEffect(() => {
    function updateCardsPerRow() {
      const width = window.innerWidth;
      if (width >= 1280)
        setCardsPerRow(5); // xl
      else if (width >= 1024)
        setCardsPerRow(4); // lg
      else if (width >= 640)
        setCardsPerRow(3); // sm & md
      else setCardsPerRow(2); // below sm
    }
    updateCardsPerRow();
    window.addEventListener("resize", updateCardsPerRow);
    return () => window.removeEventListener("resize", updateCardsPerRow);
  }, []);

  // Enable auto-animate
  useEffect(() => {
    if (containerRef.current) {
      autoAnimate(containerRef.current);
    }
  }, []);

  // Show only first 2 rows unless expanded
  const maxVisible = cardsPerRow * 2;
  const shouldCollapse = banks && banks.length > maxVisible;
  const visibleBanks =
    !expanded && shouldCollapse && banks ? banks.slice(0, maxVisible) : banks;

  return (
    <>
      <div
        id="bank-stats-section"
        ref={containerRef}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 pb-1"
      >
        {loading &&
          [...Array(5)].map((_, i) => <StatCardLoader key={`loader-${i}`} />)}
        {visibleBanks?.map((bank) => (
          <StatCard
            key={bank.id}
            {...bank}
            percentage={`${trimToTwoDecimals((bank.balance / totalAmount) * 100)}%`}
          />
        ))}
        {/* Show collapse button at end when expanded and shouldCollapse */}
        {expanded && shouldCollapse && (
          <div
            className="w-full"
            style={{ gridColumn: `1 / span ${cardsPerRow}` }}
          >
            <Button
              variant="ghost"
              className="w-full flex items-center justify-center mt-0.5 text-muted-foreground text-xs py-1 h-fit"
              onClick={() => setExpanded(false)}
            >
              <ChevronUp className="mr-1 size-3" /> Show less
            </Button>
          </div>
        )}
      </div>
      {/* Show expand button below grid when collapsed and shouldCollapse */}
      {!expanded && shouldCollapse && (
        <Button
          variant="ghost"
          className="w-full flex items-center justify-center mt-0.5 text-muted-foreground text-xs py-1 h-fit"
          onClick={() => setExpanded(true)}
        >
          <ChevronDown className="mr-1 size-3" /> Show all
        </Button>
      )}
    </>
  );
};

"use client";
import { useElementBoundaryObserver } from "@/lib/hooks/useElementBoundaryObserver";
import { ReactNode, useEffect, useState } from "react";

// Define the prop types
interface NextIntersectionObserverProps {
  children: (boundary: BoundaryState) => ReactNode; // Callback function as children
  rootmargin: string; // Margin for the IntersectionObserver
  thresholdValue: number[]; // Array of threshold values
  classes?: string; // Base class names
  topIn?: string; // Class to apply when element enters at the top
  topOut?: string; // Class to apply when element leaves at the top
  bottomIn?: string; // Class to apply when element enters at the bottom
  bottomOut?: string; // Class to apply when element leaves at the bottom
}

// Define the BoundaryState type to match the boundary values from the observer
type BoundaryState = "topIn" | "topOut" | "bottomIn" | "bottomOut";

export default function NextIntersectionObserver({
  children,
  rootmargin,
  thresholdValue,
  classes,
  topIn,
  topOut,
  bottomIn,
  bottomOut,
}: NextIntersectionObserverProps) {
  const [ref, boundary] = useElementBoundaryObserver(
    rootmargin,
    thresholdValue
  );
  const [className, setClassName] = useState(classes);

  useEffect(() => {
    // Update the className based on the boundary state.
    switch (boundary) {
      case "topIn":
        setClassName(`${classes} ${topIn}`);
        break;
      case "topOut":
        setClassName(`${classes} ${topOut}`);
        break;
      case "bottomIn":
        setClassName(`${classes} ${bottomIn}`);
        break;
      case "bottomOut":
        setClassName(`${classes} ${bottomOut}`);
        break;
      default:
        setClassName(`${classes} ${bottomOut}`);
        break;
    }
  }, [boundary, classes, topIn, topOut, bottomIn, bottomOut]);

  return (
    <div ref={ref} className={classes}>
      {children(boundary)}
      {/* Pass the boundary state to the children callback */}
    </div>
  );
}

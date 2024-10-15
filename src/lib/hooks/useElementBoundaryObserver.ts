import { useState, useEffect, useRef, MutableRefObject } from "react";

// Define the return type for the hook
type BoundaryState = "topIn" | "topOut" | "bottomIn" | "bottomOut";

// Define the hook with proper types
export function useElementBoundaryObserver(
  rootmargin: string,
  thresholdValue: number[]
): [MutableRefObject<HTMLDivElement | null>, BoundaryState] {
  // Changed to HTMLDivElement
  const ref = useRef<HTMLDivElement | null>(null); // Ref is now specific to HTMLDivElement
  const [boundary, setBoundary] = useState<BoundaryState>("topOut"); // Initial boundary state

  useEffect(() => {
    const currentRef = ref.current;
    const observerOptions: IntersectionObserverInit = {
      root: null, // Root null means it's relative to the viewport
      rootMargin: rootmargin,
      threshold: thresholdValue,
    };

    // Create a new IntersectionObserver instance
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const rect = entry.boundingClientRect; // This provides the location of the observed element

        // Update boundary state based on the element's position
        if (rect.y <= 0) {
          entry.isIntersecting ? setBoundary("topIn") : setBoundary("topOut");
        } else if (
          rect.y <=
          (window.innerHeight || document.documentElement.clientHeight)
        ) {
          setBoundary("bottomIn");
        } else if (
          rect.y >=
          (window.innerHeight || document.documentElement.clientHeight)
        ) {
          setBoundary("bottomOut");
        }
      });
    }, observerOptions);

    // Start observing the current reference
    if (currentRef) {
      observer.observe(currentRef);
    }

    // Cleanup the observer on component unmount
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [rootmargin, thresholdValue]);

  return [ref, boundary]; // Return the ref and boundary state
}

import { useState, useEffect, RefObject } from "react";

export default function useOnScreen(ref: RefObject<Element>) {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setIntersecting(entry.isIntersecting)
    );
    observer.observe(ref.current!);
    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return isIntersecting;
}

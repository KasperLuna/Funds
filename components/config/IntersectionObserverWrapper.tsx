import React, { useRef, useEffect } from "react";

export default function IntersectionObserverWrapper({
  onVisible,
  children,
}: {
  onVisible: () => void;
  children: React.ReactNode;
}): JSX.Element {
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          onVisible();
        }
      });
    });

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(elementRef.current);
      }
    };
  }, [onVisible]);

  return <div ref={elementRef}>{children}</div>;
}

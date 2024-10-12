// EmblaCarousel.tsx
import React, { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";

interface EmblaCarouselProps {
  slides: string[]; // Array of image URLs or other content
}

export const CardCarousel: React.FC<EmblaCarouselProps> = ({ slides }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    skipSnaps: true,
  });

  const handlePrevClick = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const handleNextClick = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, index) => (
            <div className="flex-shrink-0 w-1/3" key={index}>
              {slide}
            </div>
          ))}
        </div>
      </div>
      <button
        className="bg-gray-800 text-white p-2 rounded-full z-10"
        onClick={handlePrevClick}
      >
        &lt;
      </button>
      <button
        className="bg-gray-800 text-white p-2 rounded-full z-10"
        onClick={handleNextClick}
      >
        &gt;
      </button>
    </div>
  );
};

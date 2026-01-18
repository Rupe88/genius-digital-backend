'use client';

import React, { useRef } from 'react';

interface SuccessStory {
  id: number;
  name: string;
  youtubeId: string;
}

const successStories: SuccessStory[] = [
  {
    id: 1,
    name: 'Meera Rajbansi',
    youtubeId: '9Sg7MdWeJlc', // https://www.youtube.com/watch?v=9Sg7MdWeJlc
  },
  {
    id: 2,
    name: 'Pawan Rawal',
    youtubeId: 'Nq8MSEwBolY', // https://www.youtube.com/watch?v=Nq8MSEwBolY
  },
  {
    id: 3,
    name: 'Chandra Ranabhat',
    youtubeId: 'PHjZMrVhyYk', // https://www.youtube.com/watch?v=PHjZMrVhyYk
  },
];

export const SuccessStories: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const hasCarousel = successStories.length > 1;

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const cardWidthWithGap = 360; // slightly smaller card width + gap
    const current = scrollContainerRef.current.scrollLeft;
    const next =
      direction === 'left' ? current - cardWidthWithGap : current + cardWidthWithGap;

    scrollContainerRef.current.scrollTo({
      left: next,
      behavior: 'smooth',
    });
  };

  return (
    <section
      className="py-16"
      style={{ backgroundColor: 'rgba(192, 30, 46, 0.04)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Success Stories
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find all the resources and guidance you need to stay on track. Organized,
            accessible, and tailored to your journey.
          </p>
        </div>

        {/* Stories Carousel with YouTube videos */}
        <div className="relative">
          {/* Navigation arrows */}
          {hasCarousel && (
            <>
              <button
                onClick={() => scroll('left')}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black text-white text-xl shadow-lg ring-2 ring-black/10 transition hover:bg-black/90 md:h-12 md:w-12"
                aria-label="Previous success story"
              >
                &#10094;
              </button>
              <button
                onClick={() => scroll('right')}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black text-white text-xl shadow-lg ring-2 ring-black/10 transition hover:bg-black/90 md:h-12 md:w-12"
                aria-label="Next success story"
              >
                &#10095;
              </button>
            </>
          )}

          <div
            ref={scrollContainerRef}
            className={`flex gap-8 overflow-x-auto hide-scrollbar ${
              hasCarousel ? 'scroll-smooth' : 'justify-center'
            }`}
          >
            {successStories.map((story) => (
              <div
                key={story.id}
                className="flex-shrink-0 w-full md:w-[420px] bg-white shadow-lg overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-200"
              >
                {/* YouTube video */}
                <div className="relative w-full pt-[56.25%] bg-black">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${story.youtubeId}`}
                    title={story.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>

                {/* Name only */}
                <div className="px-6 py-4 text-center">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">
                    {story.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};



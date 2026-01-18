import React from 'react';

type GalleryItem = { src: string; label?: string; isMore?: boolean };

// Show exactly 6 tiles: 5 photos + 1 "See More" overlay.
const galleryImages: GalleryItem[] = [
  { src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&fit=crop&q=80' },
  { src: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&auto=format&fit=crop&q=80' },
  { src: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&auto=format&fit=crop&q=80' },
  { src: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1200&auto=format&fit=crop&q=80' },
  { src: 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=1200&auto=format&fit=crop&q=80' }, // replacing item 6 with a stable image
  { src: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&auto=format&fit=crop&q=80', isMore: true, label: 'See More' },
];

export const Gallery: React.FC = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Our Gallery</h2>
          <p className="text-lg text-gray-600">
            Moments from our events, trainings, and community gatherings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {galleryImages.map((item, index) => (
            <div
              key={`${item.src}-${index}`}
              className="relative w-full overflow-hidden shadow-md border border-gray-100"
            >
              <div className="aspect-[4/3]">
                <img
                  src={item.src}
                  alt={item.label || `Gallery item ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                />
                {item.isMore && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-lg font-semibold">
                    {item.label || 'See More'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};



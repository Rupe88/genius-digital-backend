'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

interface Event {
  id: number;
  title: string;
  date: string;
  thumbnail: string;
}

const dummyEvents: Event[] = [
  {
    id: 1,
    title: 'Professional Vastu Consultant Course',
    date: 'Monday, 12 January',
    thumbnail: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=250&fit=crop&q=80',
  },
  {
    id: 2,
    title: 'Advanced Numerology Course',
    date: 'Friday, 20 January',
    thumbnail: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=250&fit=crop&q=80',
  },
  {
    id: 3,
    title: 'Vedic Astrology Masterclass',
    date: 'Wednesday, 25 January',
    thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=250&fit=crop&q=80',
  },
  {
    id: 4,
    title: 'Medical Astrology Course',
    date: 'Saturday, 28 January',
    thumbnail: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&h=250&fit=crop&q=80',
  },
  {
    id: 5,
    title: 'Marriage Compatibility Course',
    date: 'Tuesday, 1 February',
    thumbnail: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=250&fit=crop&q=80',
  },
];

export const UpcomingEvents: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const showCarousel = dummyEvents.length > 3;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 404; // Card width (360) + gap (~24)
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const newScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth',
      });
    }
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
            Upcoming Events
          </h2>
          <p className="text-lg text-gray-600">
            Hear from those who have experienced the accuracy and guidance of Sanskar Academy
          </p>
        </div>

        {/* Events Grid/Carousel */}
        <div className="relative">
          {/* Navigation Arrows - Only show if more than 3 events */}
          {showCarousel && (
            <>
              <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-8 z-10 bg-black text-white p-3 rounded-full hover:bg-gray-800 transition-all shadow-lg"
                aria-label="Previous events"
              >
                <HiChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-8 z-10 bg-black text-white p-3 rounded-full hover:bg-gray-800 transition-all shadow-lg"
                aria-label="Next events"
              >
                <HiChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className={`flex gap-6 overflow-x-auto hide-scrollbar ${
              showCarousel ? 'scroll-smooth' : 'justify-center'
            }`}
          >
            {dummyEvents.map((event) => (
              <div
                key={event.id}
                className="flex-shrink-0 w-[400px] bg-white border border-gray-200 shadow-lg overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-200"
              >
                {/* Thumbnail */}
                <div className="relative w-full h-52">
                  <img
                    src={event.thumbnail}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Date */}
                  <div className="mb-3">
                    <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                      {event.date}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base md:text-lg font-bold tracking-wide text-gray-900 mb-3 line-clamp-2 uppercase">
                    {event.title}
                  </h3>

                  {/* Book Now Button - match register button size */}
                  <div className="flex justify-start">
                    <Link href={`/events/${event.id}`}>
                      <button className="bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors">
                        Book Now
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};


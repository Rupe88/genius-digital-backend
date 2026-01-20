'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

// Hero slide images
const heroSlides = [
  {
    image: '/hero1.png',
    alt: 'Numerology Course - Nepal\'s First ISO Certified Institute in Vastu, Numerology & Astrology'
  },
  {
    image: '/hero2.png',
    alt: 'Vastu Shastra Course - Learn from Renowned Occult Master'
  },
  {
    image: '/hero3.png',
    alt: 'Astrology Course - Transform Your Life with Ancient Wisdom'
  },
];

export const HeroCarousel: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalSlides = heroSlides.length;

  // Navigate to specific slide
  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning]);

  // Next slide
  const nextSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning, totalSlides]);

  // Previous slide
  const prevSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning, totalSlides]);

  // Auto-slide effect - 4 seconds
  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        nextSlide();
      }, 4000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, nextSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  return (
    <div
      className="hero-carousel-wrapper"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Constrained container to match Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="hero-carousel-container shadow-2xl border border-gray-100">
          {/* Slides wrapper with smooth transition */}
          <div
            ref={slideRef}
            className="hero-slides-wrapper"
            style={{
              transform: `translateX(-${currentSlide * 100}%)`,
            }}
          >
            {heroSlides.map((slide, index) => (
              <div key={index} className="hero-slide">
                <Image
                  src={slide.image}
                  alt={slide.alt}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  className="hero-slide-image"
                  quality={90}
                />
                {/* Gradient overlay for better text visibility */}
                <div className="hero-slide-overlay" />
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="hero-nav-btn hero-nav-btn-left"
            aria-label="Previous slide"
            disabled={isTransitioning}
          >
            <HiChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
          </button>
          <button
            onClick={nextSlide}
            className="hero-nav-btn hero-nav-btn-right"
            aria-label="Next slide"
            disabled={isTransitioning}
          >
            <HiChevronRight className="h-6 w-6 md:h-7 md:w-7" />
          </button>

          {/* Pagination Dots */}
          <div className="hero-pagination">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`hero-pagination-dot ${index === currentSlide ? 'hero-pagination-dot-active' : ''
                  }`}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentSlide ? 'true' : 'false'}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="hero-progress-bar">
            <div
              className="hero-progress-fill"
              style={{
                animation: isPaused ? 'none' : 'progressFill 4s linear infinite',
              }}
              key={currentSlide}
            />
          </div>
        </div>
      </div>

      {/* Scoped styles */}
      <style jsx>{`
        .hero-carousel-wrapper {
          width: 100%;
          background: transparent;
        }

        .hero-carousel-container {
          position: relative;
          width: 100%;
          height: 280px;
          overflow: hidden;
        }

        @media (min-width: 640px) {
          .hero-carousel-container {
            height: 340px;
          }
        }

        @media (min-width: 768px) {
          .hero-carousel-container {
            height: 380px;
          }
        }

        @media (min-width: 1024px) {
          .hero-carousel-container {
            height: 440px;
          }
        }

        @media (min-width: 1280px) {
          .hero-carousel-container {
            height: 500px;
          }
        }

        .hero-slides-wrapper {
          display: flex;
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform;
        }

        .hero-slide {
          position: relative;
          flex-shrink: 0;
          width: 100%;
          height: 100%;
        }

        :global(.hero-slide-image) {
          object-fit: cover;
          object-position: center;
        }

        .hero-slide-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            transparent 60%,
            rgba(0, 0, 0, 0.3) 100%
          );
          pointer-events: none;
        }

        .hero-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        @media (min-width: 768px) {
          .hero-nav-btn {
            width: 52px;
            height: 52px;
          }
        }

        .hero-nav-btn:hover:not(:disabled) {
          background: rgba(192, 30, 46, 0.9);
          border-color: rgba(192, 30, 46, 1);
          transform: translateY(-50%) scale(1.1);
        }

        .hero-nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .hero-nav-btn-left {
          left: 16px;
        }

        .hero-nav-btn-right {
          right: 16px;
        }

        @media (min-width: 768px) {
          .hero-nav-btn-left {
            left: 24px;
          }
          .hero-nav-btn-right {
            right: 24px;
          }
        }

        @media (min-width: 1024px) {
          .hero-nav-btn-left {
            left: 40px;
          }
          .hero-nav-btn-right {
            right: 40px;
          }
        }

        .hero-pagination {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 20;
          display: flex;
          gap: 10px;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          border-radius: 24px;
        }

        .hero-pagination-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .hero-pagination-dot:hover {
          background: rgba(255, 255, 255, 0.8);
        }

        .hero-pagination-dot-active {
          width: 32px;
          border-radius: 10px;
          background: linear-gradient(90deg, #c01e2e, #d4a853);
        }

        .hero-progress-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          z-index: 20;
        }

        .hero-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #c01e2e, #d4a853);
          width: 0%;
        }

        @keyframes progressFill {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

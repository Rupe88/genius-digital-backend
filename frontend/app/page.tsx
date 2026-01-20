'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HiChevronLeft, HiChevronRight, HiChevronUp } from 'react-icons/hi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HeroCarousel } from '@/components/HeroCarousel';
import { UpcomingEvents } from '@/components/UpcomingEvents';
import { SuccessStories } from '@/components/SuccessStories';
import { Gallery } from '@/components/Gallery';
import { ROUTES } from '@/lib/utils/constants';
import * as courseApi from '@/lib/api/courses';
import * as testimonialApi from '@/lib/api/testimonials';
import { Course } from '@/lib/types/course';
import { Testimonial } from '@/lib/api/testimonials';

type SimpleCourse = {
  id: string | number;
  title: string;
  thumbnail: string;
  price?: string;
  oldPrice?: string;
};

const dummyOngoingCourses: SimpleCourse[] = [
  {
    id: 'ongoing-1',
    title: 'VASTU GURU COURSE',
    thumbnail: '/hero1.png',
    price: 'Rs. 2999',
    oldPrice: 'Rs. 6000',
  },
  {
    id: 'ongoing-2',
    title: 'MEDICAL ASTROLOGY ADVANCE COURSE',
    thumbnail: '/hero2.png',
    price: 'Rs. 1999',
    oldPrice: 'Rs. 5000',
  },
  {
    id: 'ongoing-3',
    title: 'VEDIC ASTROLOGY ADVANCE COURSE',
    thumbnail: '/hero1.png',
    price: 'Rs. 3999',
    oldPrice: 'Rs. 8000',
  },
  {
    id: 'ongoing-4',
    title: 'PALMISTRY BASIC COURSE',
    thumbnail: '/hero2.png',
    price: 'Rs. 999',
    oldPrice: 'Rs. 3000',
  },
  {
    id: 'ongoing-5',
    title: 'FENG SHUI PRACTICAL COURSE',
    thumbnail: '/hero1.png',
    price: 'Rs. 1499',
    oldPrice: 'Rs. 4000',
  },
  {
    id: 'ongoing-6',
    title: 'NUMEROLOGY MASTER COURSE',
    thumbnail: '/hero2.png',
    price: 'Rs. 2499',
    oldPrice: 'Rs. 5500',
  },
];

const dummyPopularCourses: SimpleCourse[] = [
  {
    id: 'popular-1',
    title: '7 DAYS BASIC VASTU COURSE',
    thumbnail: '/hero1.png',
    price: 'Rs. 399',
    oldPrice: 'Rs. 4000',
  },
  {
    id: 'popular-2',
    title: '9 DAYS BASIC VEDIC ASTROLOGY COURSE',
    thumbnail: '/hero2.png',
    price: 'Rs. 999',
    oldPrice: 'Rs. 4000',
  },
  {
    id: 'popular-3',
    title: 'MOBILE NUMEROLOGY 4 DAYS BASIC COURSE',
    thumbnail: '/hero1.png',
    price: 'Rs. 99',
    oldPrice: 'Rs. 3000',
  },
  {
    id: 'popular-4',
    title: 'VEDIC ASTROLOGY ADVANCE COURSE',
    thumbnail: '/hero2.png',
    price: 'Rs. 3999',
    oldPrice: 'Rs. 8000',
  },
  {
    id: 'popular-5',
    title: 'MOBILE NUMEROLOGY 15 DAYS ADVANCE COURSE',
    thumbnail: '/hero1.png',
    price: 'Rs. 2999',
    oldPrice: 'Rs. 6000',
  },
  {
    id: 'popular-6',
    title: 'BUSINESS SUCCESS BLUEPRINT 7 DAYS COURSE',
    thumbnail: '/hero2.png',
    price: 'Rs. 399',
    oldPrice: 'Rs. 6000',
  },
];

export default function HomePage() {
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const testimonialsScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesData, testimonialsData] = await Promise.all([
          courseApi.filterCourses({ featured: true, limit: 6 }).catch(() => ({ data: [] })),
          testimonialApi.getTestimonials({ limit: 3, featured: true }).catch(() => ({ data: [] })),
        ]);
        setFeaturedCourses(coursesData.data || []);
        setTestimonials(testimonialsData.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const ongoingCourses: SimpleCourse[] =
    featuredCourses.length > 0
      ? featuredCourses.slice(0, 6).map((course) => ({
        id: course.id,
        title: course.title,
        thumbnail: course.thumbnail || '/hero1.png',
        price: course.isFree ? 'Free' : `Rs. ${course.price}`,
        oldPrice: course.originalPrice ? `Rs. ${course.originalPrice}` : undefined,
      }))
      : dummyOngoingCourses;

  const popularCourses: SimpleCourse[] =
    featuredCourses.length > 0
      ? featuredCourses.slice(0, 6).map((course) => ({
        id: course.id,
        title: course.title,
        thumbnail: course.thumbnail || '/hero1.png',
        price: course.isFree ? 'Free' : `Rs. ${course.price}`,
      }))
      : dummyPopularCourses;


  const hasTestimonialsCarousel = testimonials.length > 1;

  const scrollTestimonials = (direction: 'left' | 'right') => {
    if (!testimonialsScrollRef.current) return;
    const cardWidthWithGap = 404;
    const current = testimonialsScrollRef.current.scrollLeft;
    const next =
      direction === 'left' ? current - cardWidthWithGap : current + cardWidthWithGap;

    testimonialsScrollRef.current.scrollTo({
      left: next,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    if (!hasTestimonialsCarousel || !testimonials.length) return;

    const interval = setInterval(() => {
      scrollTestimonials('right');
    }, 5000);

    return () => clearInterval(interval);
  }, [hasTestimonialsCarousel, testimonials.length]);

  // Show back-to-top button after scrolling down a bit
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 240);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fallbackTestimonials: Testimonial[] = [
    {
      id: 'fallback-1',
      studentName: 'Sushil Shrestha',
      courseName: 'Architect',
      content:
        'As an architect, I’ve found each course, taught by the highly knowledgeable Acharya Raja Babu Shah, to provide deep insights and practical knowledge.',
      rating: 4,
      avatar:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
      isApproved: true,
      isFeatured: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'fallback-2',
      studentName: 'Sushil Amatya',
      courseName: 'Engineer',
      content:
        'Sanskar Academy is a training institute of knowledge of occult science. It learns people how to live life with full of joy and energy, making good results.',
      rating: 5,
      avatar:
        'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&auto=format&fit=crop&q=80',
      isApproved: true,
      isFeatured: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'fallback-3',
      studentName: 'Karuna Shrestha',
      courseName: 'Vastu Consultant',
      content:
        'Thank you Rajababu Gurudev and Sanskar Academy for giving me a platform to change my life as a Vastu Consultant.',
      rating: 4,
      avatar:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
      isApproved: true,
      isFeatured: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const testimonialsToShow =
    (testimonials && testimonials.length ? testimonials : fallbackTestimonials).slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Hero Carousel Section - Full Width */}
      <section className="relative w-full">
        <HeroCarousel />
      </section>

      {/* Upcoming Events */}
      <section className="relative">
        <UpcomingEvents />
      </section>

      {/* Ongoing Courses - grid layout like Popular Courses */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-4">
              Ongoing Courses
            </h2>
            <p className="text-lg text-[var(--muted-foreground)]">
              Continue learning with the courses you&apos;re currently enrolled in. Track your
              progress, revisit lessons, and stay on top of your studies with ease.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {ongoingCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-gray-200 shadow-lg overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-200"
              >
                <div className="relative w-full h-52">
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  {/* Rating stars */}
                  <div className="mb-2 text-yellow-400 text-lg">
                    {'★★★★★'}
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-[var(--foreground)] mb-3">
                    {course.title}
                  </h3>
                  <div className="flex items-baseline space-x-2">
                    {course.price && (
                      <span className="text-lg font-bold text-[var(--primary-700)]">
                        {course.price}
                      </span>
                    )}
                    {course.oldPrice && (
                      <span className="text-sm text-gray-500 line-through">
                        {course.oldPrice}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Courses - grid like design */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-4">
              Popular Courses
            </h2>
            <p className="text-lg text-[var(--muted-foreground)]">
              Explore our most sought-after courses, loved by students across Nepal for their
              comprehensive content and practical approach. Start your journey to success today!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {popularCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-gray-200 shadow-lg overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-200"
              >
                <div className="relative w-full h-52">
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  {/* Rating stars */}
                  <div className="mb-2 text-yellow-400 text-lg">
                    {'★★★★★'}
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-[var(--foreground)] mb-3">
                    {course.title}
                  </h3>
                  <div className="flex items-baseline space-x-2">
                    {course.price && (
                      <span className="text-lg font-bold text-[var(--primary-700)]">
                        {course.price}
                      </span>
                    )}
                    {course.oldPrice && (
                      <span className="text-sm text-gray-500 line-through">
                        {course.oldPrice}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Our Client Say - cards layout */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Client Say
            </h2>
            <p className="text-lg text-gray-600">
              Hear from those who have experienced the accuracy and guidance of Sanskar Academy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonialsToShow.map((testimonial: Testimonial) => (
              <div
                key={testimonial.id}
                className="bg-white border border-gray-200 shadow-lg px-6 py-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center mb-4">
                    {testimonial.avatar ? (
                      <div className="mr-4 h-12 w-12 overflow-hidden rounded-none">
                        <img
                          src={testimonial.avatar}
                          alt={testimonial.studentName || 'Client'}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-none bg-[var(--primary-700)] text-white text-lg font-semibold">
                        {testimonial.studentName?.[0] || 'S'}
                      </div>
                    )}
                    <div>
                      <p className="text-base font-semibold text-gray-900">
                        {testimonial.studentName || 'Student'}
                      </p>
                      <p className="text-sm font-medium text-orange-500">
                        {testimonial.courseName || 'Sanskar Academy Learner'}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-gray-700">
                    "{testimonial.content}"
                  </p>
                </div>

                <div className="mt-4 flex items-center space-x-1 text-yellow-400 text-lg">
                  {'★'.repeat(testimonial.rating || 5)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Static Success Stories Section */}
      <SuccessStories />

      {/* Gallery Section */}
      <Gallery />

      {showBackToTop && (
        <>
          <button
            onClick={scrollToTop}
            aria-label="Back to top"
            className="fixed bottom-6 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-none bg-[#c01e2e] text-white shadow-lg shadow-black/20 transition hover:bg-[#a81826] hover:-translate-y-0.5 md:bottom-8 md:right-8"
            style={{ animation: 'backToTopIn 0.35s ease-out forwards' }}
          >
            <HiChevronUp className="h-6 w-6" />
          </button>
          <style jsx global>{`
            @keyframes backToTopIn {
              from {
                opacity: 0;
                transform: translateY(12px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </>
      )}
    </div>
  );
}

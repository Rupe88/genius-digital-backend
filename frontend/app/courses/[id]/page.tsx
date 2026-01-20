
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import * as courseApi from '@/lib/api/courses';
import * as lessonApi from '@/lib/api/lessons';
import * as enrollmentApi from '@/lib/api/enrollments';
import * as paymentApi from '@/lib/api/payments';
import * as chapterApi from '@/lib/api/chapters';
import { reviewsApi } from '@/lib/api/reviews';
import { Course, Lesson, Review, Chapter } from '@/lib/types/course';
import { formatPrice, formatCurrency, getYouTubeEmbedUrl } from '@/lib/utils/helpers';
import { useAuth } from '@/lib/context/AuthContext';
import { ROUTES } from '@/lib/utils/constants';
import { showSuccess, showError } from '@/lib/utils/toast';
import { HiCheck, HiHeart, HiClock, HiUsers, HiPlay, HiDocument, HiClipboardCheck, HiChevronRight, HiVideoCamera } from 'react-icons/hi';
import {
  FaFacebook,
  FaTwitter,
  FaLinkedin,
  FaWhatsapp,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import { ShareButton } from '@/components/referrals/ShareButton';

type TabType = 'overview' | 'chapters' | 'instructors' | 'reviews';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [relatedCourses, setRelatedCourses] = useState<Course[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [demoVideoPlaying, setDemoVideoPlaying] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    try {
      setSubmittingReview(true);
      const data = await reviewsApi.create({
        courseId: course.id,
        rating: reviewRating,
        title: 'Course Review', // Added because API type requires it
        comment: reviewComment,
      } as any);

      if (data.success) {
        showSuccess('Review submitted successfully!');
        setReviewComment('');
        // Refresh course to show new review
        fetchCourse(course.id);
      }
    } catch (error) {
      showError(Object(error).message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchCourse(params.id as string);
      fetchChapters(params.id as string);
      fetchLessons(params.id as string);
    }
  }, [params.id]);

  const fetchCourse = async (id: string) => {
    try {
      setLoading(true);
      const data = await courseApi.getCourseById(id);
      setCourse(data);
      if (data.lessons) setLessons(data.lessons);
      if (data.reviews) setReviews(data.reviews);
      if (data.chapters) setChapters(data.chapters);

      // Fetch related courses from the same category
      if (data.categoryId) {
        fetchRelatedCourses(data.categoryId, id);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      showError('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async (courseId: string) => {
    try {
      const data = await chapterApi.getCourseChapters(courseId);
      setChapters(data || []);
      // Auto-expand first chapter
      if (data && data.length > 0) {
        setExpandedChapters(new Set([data[0].id]));
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchRelatedCourses = async (categoryId: string, currentId: string) => {
    try {
      const data = await courseApi.getAllCourses({ categoryId, limit: 5 });
      setRelatedCourses(data.data.filter(c => c.id !== currentId).slice(0, 4));
    } catch (error) {
      console.error('Error fetching related courses:', error);
    }
  };

  const fetchReviews = async (id: string) => {
    try {
      const response = await reviewsApi.getByCourse(id);
      // Correctly extract reviews array from response.data
      if (response.success && response.data) {
        setReviews(response.data as any);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    }
  };

  const fetchLessons = async (courseId: string) => {
    try {
      const data = await lessonApi.getCourseLessons(courseId);
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setLessons([]);
    }
  };

  const submitEsewaForm = (paymentDetails: any) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentDetails.paymentUrl;

    const formData = paymentDetails.formData;
    for (const key in formData) {
      if (Object.prototype.hasOwnProperty.call(formData, key)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = formData[key];
        form.appendChild(input);
      }
    }

    document.body.appendChild(form);
    form.submit();
  };

  /* --------------------------------------------------------------------------------
   * REFERRAL TRACKING LOGIC
   * -------------------------------------------------------------------------------- */
  const searchParams = useSearchParams();
  const [referralClickId, setReferralClickId] = useState<string | null>(null);

  useEffect(() => {
    const handleReferral = async () => {
      const refCode = searchParams.get('ref');
      if (refCode) {
        try {
          // Track the click
          const response = await import('@/lib/api/referrals').then(m => m.trackReferralClick(refCode));
          if (response && response.clickId) {
            console.log('Referral tracked:', response.clickId);
            setReferralClickId(response.clickId);
            // Optionally persist to sessionStorage if needed for strict persistence across reloads
            // sessionStorage.setItem('referral_click_id', response.clickId);
          }
        } catch (error) {
          console.error('Error tracking referral:', error);
        }
      }
    };

    handleReferral();
  }, [searchParams]);


  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push(`${ROUTES.LOGIN}?redirect=/courses/${params.id}`);
      return;
    }

    if (!course) return;

    // If already enrolled
    if (course.isEnrolled) {
      router.push(`/courses/${course.id}/learn`);
      return;
    }

    try {
      setEnrolling(true);

      if (course.isFree || course.price === 0) {
        await enrollmentApi.enrollInCourse(course.id);
        showSuccess('Successfully enrolled in course!');
        router.push(`/courses/${course.id}/learn`);
      } else {
        // Paid course - Initiate eSewa payment
        const paymentResponse = await paymentApi.createPayment({
          courseId: course.id,
          amount: course.price,
          paymentMethod: 'ESEWA',
          referralClickId: referralClickId || undefined, // Pass referral click ID if exists
          successUrl: `${window.location.origin}/payment/success`,
          failureUrl: `${window.location.origin}/payment/failure`,
        });

        if (paymentResponse.success && paymentResponse.paymentDetails) {
          showSuccess('Redirecting to eSewa...');
          submitEsewaForm(paymentResponse.paymentDetails);
        } else {
          throw new Error('Failed to initiate payment');
        }
      }
    } catch (error) {
      showError(Object(error).message || 'An error occurred' || 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const handleSaveCourse = () => {
    setSaved(!saved);
    // TODO: Implement save to wishlist API
    if (!saved) {
      showSuccess('Course saved to your list');
    } else {
      showSuccess('Course removed from your list');
    }
  };

  const toggleChapter = (title: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedChapters(newExpanded);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
    }
    return minutes > 0 ? `${minutes} min` : 'N/A';
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return <HiPlay className="w-5 h-5" />;
      case 'PDF':
        return <HiDocument className="w-5 h-5" />;
      case 'QUIZ':
      case 'ASSIGNMENT':
        return <HiClipboardCheck className="w-5 h-5" />;
      default:
        return <HiDocument className="w-5 h-5" />;
    }
  };

  // Safe lesson grouping
  const groupedLessons = (lessons || []).reduce((acc, lesson) => {
    if (!lesson || !lesson.title) return acc;
    const match = lesson.title.match(/^(Day\s*\d+|Pre-Assignment|DAY-\d+)/i);
    const chapterTitle = match ? match[1].toUpperCase() : 'Other';

    if (!acc[chapterTitle]) {
      acc[chapterTitle] = [];
    }
    acc[chapterTitle].push(lesson);
    return acc;
  }, {} as Record<string, Lesson[]>);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const courseTitle = course?.title || '';

  const nestedCurriculum = chapters.length > 0
    ? chapters.map(chapter => ({
      ...chapter,
      lessons: (lessons || []).filter(l => l.chapterId === chapter.id)
    }))
    : Object.entries(groupedLessons).map(([title, chLessons]) => ({
      id: title,
      title,
      lessons: chLessons
    } as any));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-[var(--primary-700)] border-t-transparent rounded-none animate-spin"></div>
          <p className="text-gray-900 font-black text-xl tracking-tight">Preparing your journey...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-black text-gray-900">Course not found</h2>
          <Link href="/courses">
            <Button variant="primary">Browse all courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate total video duration with safety checks
  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const totalVideoDuration = safeLessons
    .filter(l => l && l.lessonType === 'VIDEO' && l.videoDuration)
    .reduce((sum, l) => sum + (l.videoDuration || 0), 0);

  const videoLessons = safeLessons.filter(l => l && l.lessonType === 'VIDEO').length;
  const totalLessons = safeLessons.length;

  // Calculate total hours and minutes for display
  const totalHours = Math.floor(totalVideoDuration / 3600);
  const totalMinutes = Math.floor((totalVideoDuration % 3600) / 60);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header / Breadcrumbs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center text-sm font-medium">
            <Link href="/" className="text-gray-500 hover:text-[var(--primary-700)] transition-colors">Home</Link>
            <span className="mx-2 text-gray-400">/</span>
            <Link href="/courses" className="text-gray-500 hover:text-[var(--primary-700)] transition-colors">Courses</Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900 truncate">{course.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* LEFT COLUMN - Scrollable Content */}
          <div className="flex-1 w-full lg:w-2/3 space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
                {course.title}
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed max-w-3xl">
                {course.shortDescription}
              </p>
            </div>

            {/* Main Course Media */}
            <div className={`relative aspect-video shadow-2xl bg-black group ${!demoVideoPlaying ? 'cursor-pointer' : ''}`}
              onClick={() => !demoVideoPlaying && setDemoVideoPlaying(true)}>
              {demoVideoPlaying ? (
                <div className="w-full h-full">
                  {course.videoUrl && getYouTubeEmbedUrl(course.videoUrl) ? (
                    <iframe
                      src={`${getYouTubeEmbedUrl(course.videoUrl)}?autoplay=1`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : course.videoUrl ? (
                    <video
                      src={course.videoUrl}
                      controls
                      autoPlay
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                      <HiVideoCamera className="w-16 h-16 opacity-20" />
                      <p className="font-bold">Preview video not available</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {course.thumbnail && (
                    <Image
                      src={course.thumbnail}
                      alt={course.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      priority
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <button className="flex items-center gap-3 px-8 py-4 bg-[var(--primary-700)] hover:bg-[var(--primary-800)] text-white font-bold text-lg shadow-xl shadow-primary-500/30 transform transition-all group-hover:scale-110 active:scale-95">
                      <HiPlay className="w-8 h-8" />
                      Play Demo Video
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-none shadow-sm border border-gray-200 sticky top-0 z-10">
              <div className="flex overflow-x-auto no-scrollbar">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'chapters', label: 'Chapters' },
                  { id: 'instructors', label: 'Instructors' },
                  { id: 'reviews', label: 'Reviews' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex-1 min-w-[100px] py-4 text-sm font-bold border-b-2 transition-all duration-300 ${activeTab === tab.id
                      ? 'text-[var(--primary-700)] border-[var(--primary-700)] bg-blue-50/50'
                      : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Panels */}
            <div className="bg-white rounded-none shadow-sm border border-gray-200 p-6 md:p-8 min-h-[400px]">
              {activeTab === 'overview' && (
                <div className="space-y-10 animate-fadeIn">
                  {/* Learning Outcomes */}
                  {course.learningOutcomes && course.learningOutcomes.length > 0 && (
                    <section>
                      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="w-2 h-8 bg-[var(--primary-700)] rounded-none mr-2"></span>
                        What you&apos;ll learn
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {course.learningOutcomes.map((outcome, index) => (
                          <div key={index} className="flex items-start gap-4 p-4 rounded-none bg-gray-50 border border-gray-100 group hover:border-blue-200 hover:bg-white transition-all">
                            <div className="flex-shrink-0 w-6 h-6 rounded-none bg-green-100 flex items-center justify-center text-green-600 mt-0.5">
                              <HiCheck className="w-4 h-4" />
                            </div>
                            <span className="text-gray-700 text-sm font-medium leading-relaxed">{outcome}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Skills */}
                  {course.skills && course.skills.length > 0 && (
                    <section>
                      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="w-2 h-8 bg-[var(--primary-700)] rounded-none mr-2"></span>
                        Skills you&apos;ll gain
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {course.skills.map((skill, index) => (
                          <span key={index} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-none text-sm font-bold border border-gray-200 hover:bg-[var(--primary-700)] hover:text-white hover:border-[var(--primary-700)] transition-all cursor-default shadow-sm">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Description */}
                  {course.description && (
                    <section>
                      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="w-2 h-8 bg-[var(--primary-700)] rounded-none mr-2"></span>
                        Course description
                      </h2>
                      <div className="prose max-w-none text-gray-700 leading-relaxed ql-editor px-0"
                        dangerouslySetInnerHTML={{ __html: course.description }} />
                    </section>
                  )}
                </div>
              )}

              {activeTab === 'chapters' && (
                <div className="space-y-4 animate-fadeIn">
                  {nestedCurriculum.map((chapter: any, index: number) => (
                    <div key={chapter.id} className="border border-gray-200 rounded-none overflow-hidden shadow-sm hover:border-[var(--primary-700)] transition-colors">
                      <button
                        onClick={() => toggleChapter(chapter.id)}
                        className={`w-full flex items-center justify-between p-5 text-left transition-colors ${expandedChapters.has(chapter.id) ? 'bg-blue-50/50' : 'bg-white hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-none bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs uppercase tracking-wider">
                            CH {index + 1}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">{chapter.title}</h3>
                            <div className="flex items-center gap-3 mt-1 text-sm font-medium text-gray-500">
                              <span className="flex items-center gap-1"><HiPlay className="w-4 h-4" /> {chapter.lessons?.length || 0} Lessons</span>
                              {chapter.lessons?.some((l: any) => l.videoDuration) && (
                                <span className="flex items-center gap-1">
                                  <HiClock className="w-4 h-4" />
                                  {formatDuration(chapter.lessons.reduce((acc: number, l: any) => acc + (l.videoDuration || 0), 0))}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {expandedChapters.has(chapter.id) ? <FaChevronUp className="w-4 h-4 text-gray-400" /> : <FaChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>

                      {expandedChapters.has(chapter.id) && (
                        <div className="border-t border-gray-200 bg-white">
                          <div className="divide-y divide-gray-100">
                            {chapter.lessons && chapter.lessons.length > 0 ? (
                              chapter.lessons.map((lesson: any) => (
                                <div key={lesson.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                                  <div className="flex items-center gap-4 flex-1">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-none bg-blue-50 text-[var(--primary-700)] flex items-center justify-center group-hover:scale-110 transition-transform">
                                      {getLessonIcon(lesson.lessonType)}
                                    </div>
                                    <div className="space-y-0.5">
                                      <h4 className="font-semibold text-gray-900 group-hover:text-[var(--primary-700)] transition-colors">
                                        {lesson.title}
                                      </h4>
                                      {lesson.description && (
                                        <p className="text-sm text-gray-500 line-clamp-1">{lesson.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {lesson.videoDuration && (
                                      <span className="text-xs font-bold text-gray-400">{formatDuration(lesson.videoDuration)}</span>
                                    )}
                                    {lesson.isPreview && (
                                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-none text-[10px] font-extrabold uppercase tracking-wide">
                                        Preview
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-8 text-center text-gray-500 font-medium italic">
                                No lessons available in this chapter.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'instructors' && course.instructor && (
                <div className="animate-fadeIn">
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="relative w-40 h-40 rounded-none overflow-hidden shadow-xl flex-shrink-0 ring-4 ring-white">
                      {course.instructor.image ? (
                        <Image
                          src={course.instructor.image}
                          alt={course.instructor.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[var(--primary-700)] flex items-center justify-center text-white text-5xl font-black">
                          {course.instructor.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-3xl font-black text-gray-900">
                          {course.instructor.name}
                        </h3>
                        {course.instructor.designation && (
                          <p className="text-xl font-bold text-[var(--primary-700)]">
                            {course.instructor.designation}
                          </p>
                        )}
                      </div>
                      <div className="prose max-w-none text-gray-700 leading-relaxed">
                        {course.instructor.bio}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-8 animate-fadeIn">
                  {course.isEnrolled && (
                    <div className="p-6 bg-gray-50 rounded-none border border-gray-100 shadow-inner">
                      <h4 className="text-xl font-black text-gray-900 mb-6">Course review</h4>
                      <form onSubmit={handleSubmitReview} className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Your Rating</label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewRating(star)}
                                className={`text-4xl transform transition-all active:scale-90 ${star <= reviewRating ? 'text-yellow-400 scale-110' : 'text-gray-300 grayscale opacity-40 hover:scale-105'
                                  }`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Your thoughts</label>
                          <textarea
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            required
                            className="w-full px-5 py-4 rounded-none border border-gray-200 bg-white text-gray-900 focus:ring-4 focus:ring-blue-100 focus:border-[var(--primary-700)] transition-all outline-none min-h-[120px] shadow-sm"
                            placeholder="Tell us what you loved about this course..."
                          />
                        </div>
                        <Button type="submit" isLoading={submittingReview} variant="primary" className="h-12 px-10 rounded-none shadow-lg">
                          Post Review
                        </Button>
                      </form>
                    </div>
                  )}

                  <div className="space-y-5">
                    {reviews.length > 0 ? (
                      reviews.map((review) => (
                        <div key={review.id} className="p-6 bg-white rounded-none border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-5">
                            <div className="w-14 h-14 rounded-none bg-[var(--primary-700)] shadow-lg overflow-hidden flex-shrink-0 ring-4 ring-white">
                              {review.user?.profileImage ? (
                                <Image src={review.user.profileImage} alt={review.user.fullName || 'User'} fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white font-black text-xl">
                                  {(review.user?.fullName || 'U')[0]}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-black text-gray-900 text-lg">{review.user?.fullName || 'Anonymous'}</h4>
                                <span className="text-xs font-bold text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className={`text-xl ${i < (review.rating || 0) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                                ))}
                              </div>
                              <p className="text-gray-700 leading-relaxed font-medium">{review.comment}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-20 bg-gray-50 rounded-none border border-dashed border-gray-300">
                        <p className="text-gray-500 font-bold text-lg">No reviews yet. Be the first!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - Sticky Enrollment Pad */}
          <div className="w-full lg:w-1/3 lg:sticky lg:top-8">
            <div className="bg-white rounded-none shadow-2xl border border-gray-100 overflow-hidden transform transition-all hover:translate-y-[-4px]">
              {/* Card Thumbnail */}
              <div className="relative aspect-[16/10] overflow-hidden">
                {course.thumbnail && (
                  <Image src={course.thumbnail} alt={course.title} fill className="object-cover" />
                )}
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-none text-xs font-black text-gray-900 border border-white/20 shadow-lg uppercase tracking-widest">
                    {course.level || 'Expert'}
                  </span>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Price Display */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-3">
                    {course.isFree ? (
                      <span className="text-4xl font-black text-[var(--primary-700)]">FREE</span>
                    ) : (
                      <>
                        <span className="text-4xl font-black text-gray-900">Rs. {course.price.toLocaleString()}</span>
                        {course.originalPrice && course.originalPrice > course.price && (
                          <span className="text-xl text-gray-400 line-through font-bold decoration-2">
                            Rs. {course.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {course.originalPrice && course.originalPrice > course.price && (
                    <p className="text-green-600 text-sm font-black uppercase tracking-wider">
                      Save {Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100)}% Today
                    </p>
                  )}
                </div>

                {/* Main Actions */}
                <div className="space-y-4">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full h-14 rounded-none text-xl font-black tracking-tight shadow-xl shadow-primary-700/20 active:scale-95 transition-transform"
                    onClick={handleEnroll}
                    isLoading={enrolling}
                  >
                    {course.isEnrolled ? 'Go to Learning' : course.isFree ? 'Enroll for Free' : 'Enroll Now'}
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={saved ? 'secondary' : 'outline'}
                      size="lg"
                      className="h-12 rounded-none font-bold"
                      onClick={handleSaveCourse}
                    >
                      <HiHeart className={`w-5 h-5 mr-2 ${saved ? 'fill-red-500 text-red-500' : ''}`} />
                      {saved ? 'Saved' : 'Wishlist'}
                    </Button>
                    <ShareButton
                      courseId={course.id}
                      course={{ id: course.id, title: course.title, thumbnail: course.thumbnail }}
                      variant="outline"
                      size="lg"
                      className="h-12 rounded-none font-bold"
                    />
                  </div>
                </div>

                {/* Course Facts */}
                <div className="space-y-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Course Overview</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-none bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-[var(--primary-700)] transition-colors">
                        <HiUsers className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Enrolled</p>
                        <p className="font-black text-gray-900">{course.totalEnrollments || 0} Students</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-none bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-green-50 group-hover:text-green-600 transition-colors">
                        <HiPlay className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Videos</p>
                        <p className="font-black text-gray-900">{videoLessons} Lessons</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-none bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                        <HiDocument className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resources</p>
                        <p className="font-black text-gray-900">{totalLessons} Lectures</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-none bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                        <HiClock className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Access</p>
                        <p className="font-black text-gray-900">Lifetime Validity</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Badge */}
                <div className="pt-6 border-t border-gray-100 flex items-center justify-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="w-6 h-6 rounded-none border-2 border-white bg-gray-200"></div>
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Joined by 500+ pupils</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RELATED COURSES SECTION */}
        {relatedCourses.length > 0 && (
          <div className="mt-24 space-y-12">
            <div className="flex items-end justify-between border-b-4 border-gray-100 pb-6">
              <div className="space-y-2">
                <span className="inline-block px-3 py-1 bg-blue-100 text-[var(--primary-700)] rounded-none text-[10px] font-black uppercase tracking-[0.2em]">Next Step</span>
                <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Similar Learning Journeys</h2>
              </div>
              <Link href="/courses" className="text-sm font-black text-[var(--primary-700)] hover:translate-x-1 transition-transform flex items-center gap-2">
                Explore All <HiChevronRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedCourses.map((rc) => (
                <Card key={rc.id} hover className="overflow-hidden">
                  <Link href={`/courses/${rc.slug || rc.id}`} className="block h-full">
                    {rc.thumbnail && (
                      <div className="relative h-48 w-full">
                        <Image
                          src={rc.thumbnail}
                          alt={rc.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4 flex flex-col h-[calc(100%-12rem)]">
                      <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                        {rc.title}
                      </h3>
                      <p className="text-sm text-[var(--muted-foreground)] mb-4 line-clamp-2 flex-grow">
                        {rc.shortDescription || rc.description}
                      </p>
                      <div className="flex items-center justify-between mt-auto mb-3">
                        <span className="text-lg font-bold text-[var(--primary-700)]">
                          {rc.isFree ? 'Free' : formatCurrency(rc.price)}
                        </span>
                        <Button variant="primary" size="sm">View Details</Button>
                      </div>

                      {user && (
                        <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
                          <ShareButton
                            courseId={rc.id}
                            course={{
                              id: rc.id,
                              title: rc.title,
                              thumbnail: rc.thumbnail
                            }}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          />
                        </div>
                      )}
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}


'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import * as courseApi from '@/lib/api/courses';
import * as lessonApi from '@/lib/api/lessons';
import * as enrollmentApi from '@/lib/api/enrollments';
import { Course, Lesson, Review } from '@/lib/types/course';
import { formatPrice, formatCurrency } from '@/lib/utils/helpers';
import { useAuth } from '@/lib/context/AuthContext';
import { ROUTES } from '@/lib/utils/constants';
import { showSuccess, showError } from '@/lib/utils/toast';
import { HiCheck, HiHeart, HiClock, HiUsers, HiPlay, HiDocument, HiClipboardCheck } from 'react-icons/hi';
import { 
  FaFacebook, 
  FaTwitter, 
  FaLinkedin, 
  FaWhatsapp,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';

type TabType = 'overview' | 'chapters' | 'instructors' | 'reviews';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [demoVideoPlaying, setDemoVideoPlaying] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchCourse(params.id as string);
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
    } catch (error) {
      console.error('Error fetching course:', error);
      showError('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async (courseId: string) => {
    try {
      const data = await lessonApi.getCourseLessons(courseId);
      setLessons(data);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    }
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push(`${ROUTES.LOGIN}?redirect=/courses/${params.id}`);
      return;
    }

    if (!course) return;

    try {
      setEnrolling(true);
      await enrollmentApi.enrollInCourse(course.id);
      showSuccess('Successfully enrolled in course!');
      router.push(ROUTES.DASHBOARD);
    } catch (error: any) {
      showError(error.message || 'Enrollment failed');
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

  // Group lessons by chapter/day
  const groupedLessons = lessons.reduce((acc, lesson) => {
    // Extract chapter/day from title (e.g., "Day 1 - Basic Vastu" or "Pre-Assignment - 1")
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

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(courseTitle);
    
    const shareLinks: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    };

    if (shareLinks[platform]) {
      window.open(shareLinks[platform], '_blank', 'width=600,height=400');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--muted)]">
        <div className="text-[var(--foreground)]">Loading course...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--muted)]">
        <div className="text-[var(--foreground)]">Course not found</div>
      </div>
    );
  }

  // Calculate total video duration
  const totalVideoDuration = lessons
    .filter(l => l.lessonType === 'VIDEO' && l.videoDuration)
    .reduce((sum, l) => sum + (l.videoDuration || 0), 0);

  const videoLessons = lessons.filter(l => l.lessonType === 'VIDEO').length;
  const totalLessons = lessons.length;
  
  // Calculate total hours and minutes for display
  const totalHours = Math.floor(totalVideoDuration / 3600);
  const totalMinutes = Math.floor((totalVideoDuration % 3600) / 60);

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      {/* Header with breadcrumbs */}
      <div className="bg-white border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-sm text-[var(--muted-foreground)]">
            <Link href="/" className="hover:text-[var(--primary-700)]">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/courses" className="hover:text-[var(--primary-700)]">Courses</Link>
            <span className="mx-2">/</span>
            <span className="text-[var(--foreground)]">Course Details</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Title */}
            <h1 className="text-4xl font-bold text-[var(--foreground)]">
              {course.title}
            </h1>

            {/* Demo Video Button */}
            {course.thumbnail && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black cursor-pointer group"
                   onClick={() => setDemoVideoPlaying(!demoVideoPlaying)}>
                <Image
                  src={course.thumbnail}
                  alt={course.title}
                  fill
                  className="object-cover group-hover:opacity-90 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  {!demoVideoPlaying && (
                    <div className="bg-[var(--primary-700)] hover:bg-[var(--primary-800)] text-white px-8 py-4 rounded-lg flex items-center gap-3 text-lg font-semibold transition-colors">
                      <HiPlay className="w-6 h-6" />
                      Play Demo Video
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-[var(--border)]">
              <nav className="flex space-x-8">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'chapters', label: 'Chapters' },
                  { id: 'instructors', label: 'Instructors' },
                  { id: 'reviews', label: 'Reviews' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-[var(--primary-700)] text-[var(--primary-700)]'
                        : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* What you'll learn */}
                  {course.learningOutcomes && course.learningOutcomes.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold text-[var(--primary-700)] mb-4">
                        What you'll learn
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {course.learningOutcomes.map((outcome, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <HiCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-[var(--foreground)]">{outcome}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills you'll gain */}
                  {course.skills && course.skills.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">
                        Skills you'll gain
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {course.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-[var(--primary-100)] text-[var(--primary-700)] rounded-full text-sm font-medium hover:bg-[var(--primary-200)] transition-colors cursor-pointer"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Course Description */}
                  {course.description && (
                    <div>
                      <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">
                        About this course
                      </h2>
                      <div 
                        className="prose max-w-none text-[var(--foreground)]"
                        dangerouslySetInnerHTML={{ __html: course.description }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Chapters Tab */}
              {activeTab === 'chapters' && (
                <div className="space-y-4">
                  {Object.entries(groupedLessons).map(([chapterTitle, chapterLessons]) => (
                    <Card key={chapterTitle} padding="md" className="border border-[var(--border)]">
                      <button
                        onClick={() => toggleChapter(chapterTitle)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <div>
                          <h3 className="font-semibold text-lg text-[var(--foreground)]">
                            {chapterTitle}
                          </h3>
                          <p className="text-sm text-[var(--muted-foreground)] mt-1">
                            {chapterLessons.length} {chapterLessons.length === 1 ? 'lecture' : 'lectures'}
                            {chapterLessons.some(l => l.lessonType === 'PDF') && ' • PDF Notes'}
                          </p>
                        </div>
                        {expandedChapters.has(chapterTitle) ? (
                          <FaChevronUp className="text-[var(--muted-foreground)]" />
                        ) : (
                          <FaChevronDown className="text-[var(--muted-foreground)]" />
                        )}
                      </button>
                      
                      {expandedChapters.has(chapterTitle) && (
                        <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
                          {chapterLessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between p-3 hover:bg-[var(--muted)] rounded-lg transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="text-[var(--primary-700)]">
                                  {getLessonIcon(lesson.lessonType)}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-[var(--foreground)]">
                                    {lesson.title}
                                  </h4>
                                  {lesson.description && (
                                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                                      {lesson.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-[var(--muted-foreground)] ml-4">
                                {lesson.videoDuration && formatDuration(lesson.videoDuration)}
                                {lesson.isPreview && (
                                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                    Preview
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              {/* Instructors Tab */}
              {activeTab === 'instructors' && course.instructor && (
                <div>
                  <Card padding="lg">
                    <div className="flex items-start gap-6">
                      {course.instructor.image ? (
                        <div className="relative w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
                          <Image
                            src={course.instructor.image}
                            alt={course.instructor.name}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-[var(--primary-700)] flex items-center justify-center text-white font-semibold text-2xl flex-shrink-0">
                          {course.instructor.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                          {course.instructor.name}
                        </h3>
                        {course.instructor.designation && (
                          <p className="text-lg text-[var(--primary-700)] font-medium mb-3">
                            {course.instructor.designation}
                          </p>
                        )}
                        {course.instructor.bio && (
                          <p className="text-[var(--foreground)] leading-relaxed whitespace-pre-line">
                            {course.instructor.bio}
                          </p>
                        )}
                        {course.instructor.specialization && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-[var(--muted-foreground)] mb-2">
                              Specialization:
                            </p>
                            <p className="text-[var(--foreground)]">{course.instructor.specialization}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <div>
                  {reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <Card key={review.id} padding="lg">
                          <div className="flex items-start gap-4">
                            {review.user?.profileImage ? (
                              <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                                <Image
                                  src={review.user.profileImage}
                                  alt={review.user.fullName || 'User'}
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-[var(--primary-700)] flex items-center justify-center text-white font-semibold flex-shrink-0">
                                {(review.user?.fullName || review.userId || 'U')[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-[var(--foreground)]">
                                  {review.user?.fullName || 'Anonymous User'}
                                </h4>
                                <div className="flex ml-2">
                                  {[...Array(5)].map((_, i) => (
                                    <span
                                      key={i}
                                      className={`text-lg ${
                                        i < (review.rating || 0)
                                          ? 'text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                                <span className="text-sm text-[var(--muted-foreground)] ml-auto">
                                  {new Date(review.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              {review.comment && (
                                <p className="text-[var(--foreground)] mt-2">{review.comment}</p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card padding="lg">
                      <div className="text-center py-8">
                        <p className="text-[var(--muted-foreground)]">No reviews yet. Be the first to review!</p>
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              {/* Course Thumbnail */}
              {course.thumbnail && (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Pricing */}
              <Card padding="lg" className="border-2 border-[var(--border)]">
                <div className="mb-6">
                  {course.isFree ? (
                    <div className="text-3xl font-bold text-[var(--primary-700)]">Free</div>
                  ) : (
                    <div>
                      {course.originalPrice && course.originalPrice > course.price && (
                        <div className="text-lg text-[var(--muted-foreground)] line-through mb-1">
                          Rs. {course.originalPrice.toLocaleString()}
                        </div>
                      )}
                      <div className="text-3xl font-bold text-[var(--primary-700)]">
                        Rs. {course.price.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Enroll Button */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mb-4"
                  onClick={handleEnroll}
                  isLoading={enrolling}
                >
                  {course.isFree ? 'Enroll for Free' : 'Enroll Now'}
                </Button>

                {/* Save Course Button */}
                <Button
                  variant={saved ? 'secondary' : 'outline'}
                  size="lg"
                  className="w-full mb-6"
                  onClick={handleSaveCourse}
                >
                  <HiHeart className={`w-5 h-5 mr-2 ${saved ? 'fill-red-500 text-red-500' : ''}`} />
                  {saved ? 'Saved' : 'Save This Course'}
                </Button>

                {/* Share Course */}
                <div className="mb-6">
                  <p className="text-sm font-medium text-[var(--foreground)] mb-3">
                    Share Course :
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleShare('facebook')}
                      className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                    >
                      <FaFacebook />
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="w-10 h-10 rounded-full bg-blue-400 text-white flex items-center justify-center hover:bg-blue-500 transition-colors"
                    >
                      <FaTwitter />
                    </button>
                    <button
                      onClick={() => handleShare('linkedin')}
                      className="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center hover:bg-blue-800 transition-colors"
                    >
                      <FaLinkedin />
                    </button>
                    <button
                      onClick={() => handleShare('whatsapp')}
                      className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
                    >
                      <FaWhatsapp />
                    </button>
                  </div>
                </div>

                {/* Course Overview Stats */}
                <div className="border-t border-[var(--border)] pt-6">
                  <h3 className="font-semibold text-[var(--foreground)] mb-4">Overview</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <HiUsers className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">Enrolled Students</p>
                        <p className="font-semibold text-[var(--foreground)]">
                          {course.totalEnrollments || 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <HiPlay className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">Recorded Videos</p>
                        <p className="font-semibold text-[var(--foreground)]">
                          {videoLessons}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <HiDocument className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">Lectures</p>
                        <p className="font-semibold text-[var(--foreground)]">
                          {totalLessons}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <HiClock className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">Video Duration</p>
                        <p className="font-semibold text-[var(--foreground)]">
                          {totalHours > 0 ? `${totalHours} hr` : ''} {totalMinutes > 0 ? `${totalMinutes} min` : ''}
                          {totalVideoDuration === 0 && 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

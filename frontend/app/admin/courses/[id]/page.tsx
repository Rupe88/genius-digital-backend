
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Course } from '@/lib/types/course';
import * as courseApi from '@/lib/api/courses';
import { formatPrice, formatDate, formatDuration } from '@/lib/utils/helpers';
import { showSuccess, showError } from '@/lib/utils/toast';
import { HiPencil, HiTrash, HiArrowLeft, HiUser, HiFolder, HiTag, HiClock, HiGlobeAlt, HiStar, HiUsers } from 'react-icons/hi';

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const data = await courseApi.getCourseById(courseId);
      setCourse(data);
    } catch (error) {
      console.error('Error fetching course:', error);
      showError(Object(error).message || 'An error occurred' || 'Failed to load course');
      router.push('/admin/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!course) return;
    
    if (!confirm(`Are you sure you want to delete "${course.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await courseApi.deleteCourse(courseId);
      showSuccess('Course deleted successfully');
      router.push('/admin/courses');
    } catch (error) {
      showError(Object(error).message || 'An error occurred' || 'Failed to delete course');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
      PUBLISHED: 'success',
      DRAFT: 'warning',
      ARCHIVED: 'default',
      ONGOING: 'info',
    };
    return (
      <Badge variant={variants[status] || 'default'} size="md">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div>Loading...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div>Course not found</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/courses">
          <Button variant="ghost" size="sm" className="mb-4">
            <HiArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">{course.title}</h1>
            <p className="text-[var(--muted-foreground)] mt-2">Course Details</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/courses/${course.id}/edit`}>
              <Button variant="primary">
                <HiPencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button variant="danger" onClick={handleDelete}>
              <HiTrash className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thumbnail */}
          {course.thumbnail && (
            <Card padding="none">
              <div className="relative w-full h-64 lg:h-96">
                <Image
                  src={course.thumbnail}
                  alt={course.title}
                  fill
                  className="object-cover rounded-none"
                  sizes="(max-width: 768px) 100vw, 66vw"
                />
              </div>
            </Card>
          )}

          {/* Description */}
          <Card padding="lg">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Description</h2>
            {course.shortDescription && (
              <p className="text-[var(--muted-foreground)] mb-4">{course.shortDescription}</p>
            )}
            {course.description ? (
              <div className="prose max-w-none text-[var(--foreground)] whitespace-pre-wrap">
                {course.description}
              </div>
            ) : (
              <p className="text-[var(--muted-foreground)] italic">No description provided</p>
            )}
          </Card>

          {/* Tags */}
          {course.tags && (
            <Card padding="lg">
              <h2 className="text-xl font-bold mb-4 text-[var(--foreground)] flex items-center">
                <HiTag className="h-5 w-5 mr-2" />
                Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {course.tags.split(',').map((tag, index) => (
                  <Badge key={index} variant="default" size="sm">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Info */}
          <Card padding="lg">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Course Information</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-[var(--muted-foreground)] mb-1">Status</div>
                <div>{getStatusBadge(course.status)}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-[var(--muted-foreground)] mb-1 flex items-center">
                  <HiUser className="h-4 w-4 mr-1" />
                  Instructor
                </div>
                <div className="text-[var(--foreground)]">
                  {course.instructor?.name || 'N/A'}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-[var(--muted-foreground)] mb-1 flex items-center">
                  <HiFolder className="h-4 w-4 mr-1" />
                  Category
                </div>
                <div className="text-[var(--foreground)]">
                  {course.category?.name || 'Uncategorized'}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-[var(--muted-foreground)] mb-1">Price</div>
                <div className="text-2xl font-bold text-[var(--foreground)]">
                  {formatPrice(course.price, course.isFree)}
                </div>
              </div>

              {course.level && (
                <div>
                  <div className="text-sm font-medium text-[var(--muted-foreground)] mb-1">Level</div>
                  <div className="text-[var(--foreground)]">{course.level}</div>
                </div>
              )}

              {course.duration && (
                <div>
                  <div className="text-sm font-medium text-[var(--muted-foreground)] mb-1 flex items-center">
                    <HiClock className="h-4 w-4 mr-1" />
                    Duration
                  </div>
                  <div className="text-[var(--foreground)]">{formatDuration(course.duration)}</div>
                </div>
              )}

              {course.language && (
                <div>
                  <div className="text-sm font-medium text-[var(--muted-foreground)] mb-1 flex items-center">
                    <HiGlobeAlt className="h-4 w-4 mr-1" />
                    Language
                  </div>
                  <div className="text-[var(--foreground)]">{course.language.toUpperCase()}</div>
                </div>
              )}

              {course.rating !== undefined && (
                <div>
                  <div className="text-sm font-medium text-[var(--muted-foreground)] mb-1 flex items-center">
                    <HiStar className="h-4 w-4 mr-1" />
                    Rating
                  </div>
                  <div className="text-[var(--foreground)]">
                    {(course.rating || 0).toFixed(1)} ({course.totalRatings || 0} ratings)
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm font-medium text-[var(--muted-foreground)] mb-1 flex items-center">
                  <HiUsers className="h-4 w-4 mr-1" />
                  Enrollments
                </div>
                <div className="text-[var(--foreground)]">{course.totalEnrollments || 0}</div>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--muted-foreground)]">Featured</span>
                    <Badge variant={course.featured ? 'success' : 'default'} size="sm">
                      {course.featured ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--muted-foreground)]">Free</span>
                    <Badge variant={course.isFree ? 'success' : 'default'} size="sm">
                      {course.isFree ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--muted-foreground)]">Ongoing</span>
                    <Badge variant={course.isOngoing ? 'info' : 'default'} size="sm">
                      {course.isOngoing ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>

              {course.startDate && (
                <div>
                  <div className="text-sm font-medium text-[var(--muted-foreground)] mb-1">Start Date</div>
                  <div className="text-[var(--foreground)]">{formatDate(course.startDate)}</div>
                </div>
              )}

              {course.endDate && (
                <div>
                  <div className="text-sm font-medium text-[var(--muted-foreground)] mb-1">End Date</div>
                  <div className="text-[var(--foreground)]">{formatDate(course.endDate)}</div>
                </div>
              )}

              <div className="pt-4 border-t border-[var(--border)]">
                <div className="text-sm text-[var(--muted-foreground)]">
                  <div>Created: {formatDate(course.createdAt)}</div>
                  <div className="mt-1">Updated: {formatDate(course.updatedAt)}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


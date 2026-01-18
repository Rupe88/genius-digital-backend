'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShareButton } from '@/components/referrals/ShareButton';
import * as courseApi from '@/lib/api/courses';
import { Course } from '@/lib/types/course';
import { PaginatedResponse } from '@/lib/types/api';
import { formatCurrency } from '@/lib/utils/helpers';
import { useAuth } from '@/lib/context/AuthContext';

export default function CoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });

  useEffect(() => {
    fetchCourses();
  }, [pagination.page, search]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data: PaginatedResponse<Course> = await courseApi.getAllCourses({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
      });
      setCourses(data.data || []);
      setPagination({
        page: data.pagination?.page || pagination.page,
        limit: data.pagination?.limit || pagination.limit,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 0,
      });
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPagination({ ...pagination, page: 1 });
  };

  return (
    <div className="min-h-screen bg-[var(--muted)] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-4">All Courses</h1>
          <Input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={handleSearch}
            className="max-w-md"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">Loading courses...</div>
        ) : courses.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {courses.map((course) => (
                <Card key={course.id} hover className="overflow-hidden">
                  <Link href={`/courses/${course.slug || course.id}`}>
                    {course.thumbnail && (
                      <div className="relative h-48 w-full">
                        <Image
                          src={course.thumbnail}
                          alt={course.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                        {course.title}
                      </h3>
                      <p className="text-sm text-[var(--muted-foreground)] mb-4 line-clamp-2">
                        {course.shortDescription || course.description}
                      </p>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-[var(--primary-700)]">
                          {course.isFree ? 'Free' : formatCurrency(course.price)}
                        </span>
                        <Link href={`/courses/${course.slug || course.id}`}>
                          <Button variant="primary" size="sm">View Details</Button>
                        </Link>
                      </div>

                      {user && (
                        <div className="flex gap-2">
                          <ShareButton
                            courseId={course.id}
                            course={{
                              id: course.id,
                              title: course.title,
                              thumbnail: course.thumbnail
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

            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            No courses found
          </div>
        )}
      </div>
    </div>
  );
}


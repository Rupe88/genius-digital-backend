'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import * as enrollmentApi from '@/lib/api/enrollments';
import { Enrollment } from '@/lib/types/course';

export default function MyCoursesPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const data = await enrollmentApi.getEnrollments();
      setEnrollments(data.data);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-8">My Courses</h1>

      {loading ? (
        <div>Loading...</div>
      ) : enrollments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enrollment) => (
            <Card key={enrollment.id} hover className="overflow-hidden">
              {enrollment.course?.thumbnail && (
                <div className="relative h-48 w-full">
                  <Image
                    src={enrollment.course.thumbnail}
                    alt={enrollment.course.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                  {enrollment.course?.title}
                </h3>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--muted-foreground)]">Progress</span>
                    <span className="font-medium">{enrollment.progress}%</span>
                  </div>
                  <div className="w-full bg-[var(--muted)] rounded-full h-2">
                    <div
                      className="bg-[var(--primary-700)] h-2 rounded-full"
                      style={{ width: `${enrollment.progress}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm px-2 py-1 rounded ${
                    enrollment.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    enrollment.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {enrollment.status}
                  </span>
                  <Link href={`/courses/${enrollment.courseId}`}>
                    <Button variant="primary" size="sm">
                      {enrollment.status === 'COMPLETED' ? 'Review' : 'Continue'}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center">
          <p className="text-[var(--muted-foreground)] mb-4">You haven't enrolled in any courses yet.</p>
          <Link href="/courses">
            <Button variant="primary">Browse Courses</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}


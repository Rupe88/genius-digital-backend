
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import * as courseApi from '@/lib/api/courses';
import * as categoryApi from '@/lib/api/categories';
import * as instructorApi from '@/lib/api/instructors';
import { Course } from '@/lib/types/course';
import { Category } from '@/lib/types/course';
import { Instructor } from '@/lib/api/instructors';
import { PaginatedResponse } from '@/lib/types/api';
import { formatPrice, formatDate } from '@/lib/utils/helpers';
import { showSuccess, showError } from '@/lib/utils/toast';
import { HiPencil, HiTrash, HiEye } from 'react-icons/hi';

export default function AdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [instructorFilter, setInstructorFilter] = useState<string>('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

  useEffect(() => {
    fetchCategories();
    fetchInstructors();
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [pagination.page, search, statusFilter, categoryFilter, instructorFilter]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (instructorFilter) params.instructorId = instructorFilter;

      const response: PaginatedResponse<Course> = await courseApi.getAllCourses(params);
      setCourses(response.data || []);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error('Error fetching courses:', error);
      showError(Object(error).message || 'An error occurred' || 'Failed to load courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await categoryApi.getAllCategories();
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchInstructors = async () => {
    try {
      const response = await instructorApi.getAllInstructors();
      setInstructors(response.data || []);
    } catch (error) {
      console.error('Error fetching instructors:', error);
    }
  };

  const handleDelete = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await courseApi.deleteCourse(courseId);
      showSuccess('Course deleted successfully');
      fetchCourses();
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
      <Badge variant={variants[status] || 'default'} size="sm">
        {status}
      </Badge>
    );
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Course Management</h1>
          <p className="text-[var(--muted-foreground)] mt-2">Manage all courses</p>
        </div>
        <Link href="/admin/courses/new">
          <Button variant="primary">Create Course</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card padding="lg" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
          />
          <Select
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'PUBLISHED', label: 'Published' },
              { value: 'ONGOING', label: 'Ongoing' },
              { value: 'ARCHIVED', label: 'Archived' },
            ]}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
          />
          <Select
            options={[
              { value: '', label: 'All Categories' },
              ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
            ]}
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
          />
          <Select
            options={[
              { value: '', label: 'All Instructors' },
              ...instructors.map((inst) => ({ value: inst.id, label: inst.name })),
            ]}
            value={instructorFilter}
            onChange={(e) => {
              setInstructorFilter(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
          />
        </div>
      </Card>

      {/* Courses Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">Thumbnail</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">Instructor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">Enrollments</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center">Loading...</td>
                </tr>
              ) : courses && courses.length > 0 ? (
                courses.map((course) => (
                  <tr key={course.id} className="hover:bg-[var(--muted)]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {course.thumbnail ? (
                        <div className="relative w-16 h-16 rounded-none overflow-hidden">
                          <Image
                            src={course.thumbnail}
                            alt={course.title}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-none flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No Image</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--foreground)]">{course.title}</div>
                      <div className="text-sm text-[var(--muted-foreground)]">{course.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {course.instructor?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {course.category?.name || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(course.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatPrice(course.price, course.isFree)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {course.totalEnrollments || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted-foreground)]">
                      {formatDate(course.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/courses/${course.id}`}>
                          <Button variant="ghost" size="sm" title="View" className="text-[var(--primary-600)] hover:text-[var(--primary-700)]">
                            <HiEye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/courses/${course.id}/edit`}>
                          <Button variant="ghost" size="sm" title="Edit" className="text-[var(--primary-600)] hover:text-[var(--primary-700)]">
                            <HiPencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete"
                          onClick={() => handleDelete(course.id, course.title)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <HiTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-[var(--muted-foreground)]">
                    No courses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-[var(--border)] flex justify-between items-center">
            <div className="text-sm text-[var(--muted-foreground)]">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} courses
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

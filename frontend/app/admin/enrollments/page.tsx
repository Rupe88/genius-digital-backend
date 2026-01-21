
'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import * as enrollmentApi from '@/lib/api/enrollments';
import { Enrollment } from '@/lib/types/course';
import { formatDate } from '@/lib/utils/helpers';
import { showSuccess, showError } from '@/lib/utils/toast';
import { HiDownload, HiSearch, HiFilter, HiTrash } from 'react-icons/hi';

type EnrollmentStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  useEffect(() => {
    fetchEnrollments();
  }, [pagination.page, status]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      // Safely cast the status string to EnrollmentStatus or undefined
      const data = await enrollmentApi.getAllEnrollments({
        page: pagination.page,
        limit: pagination.limit,
        status: (status === '' ? undefined : status) as EnrollmentStatus | undefined,
        // search is handled by a separate button or debounced
      });
      setEnrollments(data.data);
      setPagination(data.pagination);
    } catch (error) {
      showError(Object(error).message || 'An error occurred' || 'Failed to fetch enrollments');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEnrollment = async (id: string) => {
    if (!confirm('Are you sure you want to remove this enrollment?')) return;
    try {
      await enrollmentApi.deleteEnrollment(id);
      showSuccess('Enrollment removed successfully');
      fetchEnrollments();
    } catch (error) {
      showError(Object(error).message || 'An error occurred' || 'Failed to remove enrollment');
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'info' | 'danger' | 'default' => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PENDING': return 'warning';
      case 'COMPLETED': return 'info';
      case 'CANCELLED': return 'danger';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Enrollment Management</h1>
        <p className="text-[var(--muted-foreground)] mt-2">View and manage student course enrollments</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 max-w-sm">
          <Input
            label="Search Students or Courses"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <Select
            label="Filter Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </div>
        <Button variant="outline" onClick={fetchEnrollments} className="h-[42px]">
          <HiFilter className="w-4 h-4 mr-2" />
          Apply Filters
        </Button>
        <Button variant="secondary" className="h-[42px]">
          <HiDownload className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-[var(--muted)]/50 border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)]">Student</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)]">Course</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)]">Enrolled Date</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)]">Status</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)]">Price Paid</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-4 bg-[var(--muted)] rounded-none w-full"></div>
                    </td>
                  </tr>
                ))
              ) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--muted-foreground)]">
                    No enrollments found matching your criteria.
                  </td>
                </tr>
              ) : (
                enrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--foreground)]">{enrollment.user?.fullName || 'Unknown Student'}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{enrollment.user?.email || 'No Email'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--foreground)]">{enrollment.course?.title || 'Unknown Course'}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">ID: #{enrollment.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4 text-[var(--muted-foreground)]">
                      {enrollment.enrolledAt ? formatDate(enrollment.enrolledAt) : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusColor(enrollment.status)}>
                        {enrollment.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      Rs. {(enrollment.pricePaid || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 p-2"
                        onClick={() => handleDeleteEnrollment(enrollment.id)}
                      >
                        <HiTrash className="w-5 h-5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-xs text-[var(--muted-foreground)]">
              Showing {enrollments.length} of {pagination.total} records
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
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


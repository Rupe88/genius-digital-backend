
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import * as instructorApi from '@/lib/api/instructors';
import { Instructor } from '@/lib/api/instructors';
import { formatDate } from '@/lib/utils/helpers';
import { showSuccess, showError } from '@/lib/utils/toast';
import { HiPencil, HiTrash, HiEye, HiPlus } from 'react-icons/hi';

export default function AdminInstructorsPage() {
  const router = useRouter();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchInstructors();
  }, [search]);

  const fetchInstructors = async () => {
    try {
      setLoading(true);
      const response = await instructorApi.getAllInstructors({
        search: search || undefined,
      });

      // Ensure numeric fields are properly parsed
      const processedInstructors = (response.data || []).map(instructor => ({
        ...instructor,
        commissionRate: instructor.commissionRate ? Number(instructor.commissionRate) : undefined,
        totalEarnings: instructor.totalEarnings ? Number(instructor.totalEarnings) : 0,
        paidEarnings: instructor.paidEarnings ? Number(instructor.paidEarnings) : 0,
        pendingEarnings: instructor.pendingEarnings ? Number(instructor.pendingEarnings) : 0,
        order: Number(instructor.order) || 0,
      }));

      setInstructors(processedInstructors);
    } catch (error) {
      console.error('Error fetching instructors:', error);
      showError(Object(error).message || 'An error occurred' || 'Failed to load instructors');
      setInstructors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (instructorId: string, instructorName: string) => {
    if (!confirm(`Are you sure you want to delete "${instructorName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await instructorApi.deleteInstructor(instructorId);
      showSuccess('Instructor deleted successfully');
      fetchInstructors();
    } catch (error) {
      showError(Object(error).message || 'An error occurred' || 'Failed to delete instructor');
    }
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Instructor Management</h1>
          <p className="text-[var(--muted-foreground)] mt-2">Manage all instructors</p>
        </div>
        <Link href="/admin/instructors/new">
          <Button variant="primary">
            <HiPlus className="h-4 w-4 mr-2" />
            Create Instructor
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card padding="lg" className="mb-6">
        <Input
          type="text"
          placeholder="Search instructors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </Card>

      {/* Instructors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">Loading...</div>
        ) : instructors.length > 0 ? (
          instructors.map((instructor) => (
            <Card key={instructor.id} padding="lg" className="hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center text-center mb-4">
                {instructor.image ? (
                  <div className="relative w-24 h-24 rounded-none overflow-hidden mb-4">
                    <Image
                      src={instructor.image}
                      alt={instructor.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-none bg-[var(--primary-700)] flex items-center justify-center text-white font-semibold text-2xl mb-4">
                    {instructor.name[0]?.toUpperCase()}
                  </div>
                )}
                <h3 className="text-xl font-bold text-[var(--foreground)] mb-1">{instructor.name}</h3>
                {instructor.designation && (
                  <p className="text-sm text-[var(--muted-foreground)] mb-2">{instructor.designation}</p>
                )}
                {instructor.featured && (
                  <Badge variant="success" size="sm">Featured</Badge>
                )}
              </div>

              {instructor.specialization && (
                <div className="mb-4">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    <strong>Specialization:</strong> {instructor.specialization}
                  </p>
                </div>
              )}

              {instructor.bio && (
                <p className="text-sm text-[var(--muted-foreground)] mb-4 line-clamp-2">{instructor.bio}</p>
              )}

              <div className="border-t border-[var(--border)] pt-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-[var(--muted-foreground)]">Commission Rate:</span>
                  <span className="text-sm font-semibold">{instructor.commissionRate || 30}%</span>
                </div>
                {(instructor.totalEarnings !== undefined && instructor.totalEarnings !== null) && (
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-[var(--muted-foreground)]">Total Earnings:</span>
                    <span className="text-sm font-semibold">₹{Number(instructor.totalEarnings || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted-foreground)]">Created:</span>
                  <span className="text-sm">{formatDate(instructor.createdAt)}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--border)]">
                <Link href={`/admin/instructors/${instructor.id}`} className="flex-1">
                  <Button variant="ghost" size="sm" className="w-full">
                    <HiEye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </Link>
                <Link href={`/admin/instructors/${instructor.id}/edit`} className="flex-1">
                  <Button variant="ghost" size="sm" className="w-full">
                    <HiPencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(instructor.id, instructor.name)}
                  className="text-red-600 hover:text-red-700 flex-1"
                >
                  <HiTrash className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-[var(--muted-foreground)]">
            No instructors found
          </div>
        )}
      </div>
    </div>
  );
}

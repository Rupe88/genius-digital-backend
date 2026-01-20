
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Instructor } from '@/lib/api/instructors';
import * as instructorApi from '@/lib/api/instructors';
import { formatDate } from '@/lib/utils/helpers';
import { showSuccess, showError } from '@/lib/utils/toast';
import { HiPencil, HiTrash, HiArrowLeft } from 'react-icons/hi';

export default function InstructorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const instructorId = params.id as string;

  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstructor();
  }, [instructorId]);

  const fetchInstructor = async () => {
    try {
      setLoading(true);
      const data = await instructorApi.getInstructorById(instructorId);

      // Ensure numeric fields are properly parsed
      const processedData = {
        ...data,
        commissionRate: data.commissionRate ? Number(data.commissionRate) : undefined,
        totalEarnings: data.totalEarnings ? Number(data.totalEarnings) : 0,
        paidEarnings: data.paidEarnings ? Number(data.paidEarnings) : 0,
        pendingEarnings: data.pendingEarnings ? Number(data.pendingEarnings) : 0,
        order: Number(data.order) || 0,
      };

      setInstructor(processedData);
    } catch (error) {
      console.error('Error fetching instructor:', error);
      showError(Object(error).message || 'An error occurred' || 'Failed to load instructor');
      router.push('/admin/instructors');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!instructor) return;
    
    if (!confirm(`Are you sure you want to delete "${instructor.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await instructorApi.deleteInstructor(instructorId);
      showSuccess('Instructor deleted successfully');
      router.push('/admin/instructors');
    } catch (error) {
      showError(Object(error).message || 'An error occurred' || 'Failed to delete instructor');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div>Loading...</div>
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div>Instructor not found</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/instructors">
          <Button variant="ghost" size="sm" className="mb-4">
            <HiArrowLeft className="h-4 w-4 mr-2" />
            Back to Instructors
          </Button>
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">{instructor.name}</h1>
            <p className="text-[var(--muted-foreground)] mt-2">Instructor Details</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/instructors/${instructor.id}/edit`}>
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
          {/* Profile */}
          <Card padding="lg">
            <div className="flex items-start gap-6">
              {instructor.image ? (
                <div className="relative w-32 h-32 rounded-none overflow-hidden flex-shrink-0">
                  <Image
                    src={instructor.image}
                    alt={instructor.name}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-none bg-[var(--primary-700)] flex items-center justify-center text-white font-semibold text-4xl flex-shrink-0">
                  {instructor.name[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-[var(--foreground)]">{instructor.name}</h2>
                  {instructor.featured && (
                    <Badge variant="success" size="sm">Featured</Badge>
                  )}
                </div>
                {instructor.designation && (
                  <p className="text-lg text-[var(--muted-foreground)] mb-2">{instructor.designation}</p>
                )}
                {instructor.specialization && (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    <strong>Specialization:</strong> {instructor.specialization}
                  </p>
                )}
              </div>
            </div>

            {instructor.bio && (
              <div className="mt-6 pt-6 border-t border-[var(--border)]">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Biography</h3>
                <p className="text-[var(--foreground)] whitespace-pre-wrap">{instructor.bio}</p>
              </div>
            )}
          </Card>

          {/* Contact Info */}
          {(instructor.email || instructor.phone) && (
            <Card padding="lg">
              <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Contact Information</h2>
              <div className="space-y-2">
                {instructor.email && (
                  <div>
                    <span className="text-sm font-medium text-[var(--muted-foreground)]">Email: </span>
                    <span className="text-[var(--foreground)]">{instructor.email}</span>
                  </div>
                )}
                {instructor.phone && (
                  <div>
                    <span className="text-sm font-medium text-[var(--muted-foreground)]">Phone: </span>
                    <span className="text-[var(--foreground)]">{instructor.phone}</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Info */}
          <Card padding="lg">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Financial Information</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-[var(--muted-foreground)] mb-1">Commission Rate</div>
                <div className="text-2xl font-bold text-[var(--foreground)]">
                  {instructor.commissionRate || 30}%
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)] space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--muted-foreground)]">Total Earnings</span>
                  <span className="text-sm font-semibold">₹{(instructor.totalEarnings || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--muted-foreground)]">Paid Earnings</span>
                  <span className="text-sm font-semibold text-green-600">
                    ₹{(instructor.paidEarnings || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--muted-foreground)]">Pending Earnings</span>
                  <span className="text-sm font-semibold text-orange-600">
                    ₹{(instructor.pendingEarnings || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Bank Details */}
          {(instructor.bankName || instructor.accountNumber) && (
            <Card padding="lg">
              <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Bank Details</h2>
              <div className="space-y-3">
                {instructor.bankName && (
                  <div>
                    <div className="text-sm font-medium text-[var(--muted-foreground)]">Bank Name</div>
                    <div className="text-[var(--foreground)]">{instructor.bankName}</div>
                  </div>
                )}
                {instructor.accountNumber && (
                  <div>
                    <div className="text-sm font-medium text-[var(--muted-foreground)]">Account Number</div>
                    <div className="text-[var(--foreground)] font-mono">{instructor.accountNumber}</div>
                  </div>
                )}
                {instructor.ifscCode && (
                  <div>
                    <div className="text-sm font-medium text-[var(--muted-foreground)]">IFSC Code</div>
                    <div className="text-[var(--foreground)] font-mono">{instructor.ifscCode}</div>
                  </div>
                )}
                {instructor.panNumber && (
                  <div>
                    <div className="text-sm font-medium text-[var(--muted-foreground)]">PAN Number</div>
                    <div className="text-[var(--foreground)] font-mono">{instructor.panNumber}</div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Metadata */}
          <Card padding="lg">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Metadata</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-[var(--muted-foreground)]">Slug: </span>
                <span className="text-[var(--foreground)] font-mono">{instructor.slug}</span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">Display Order: </span>
                <span className="text-[var(--foreground)]">{instructor.order}</span>
              </div>
              <div className="pt-3 border-t border-[var(--border)]">
                <div className="text-[var(--muted-foreground)]">
                  <div>Created: {formatDate(instructor.createdAt)}</div>
                  <div className="mt-1">Updated: {formatDate(instructor.updatedAt)}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


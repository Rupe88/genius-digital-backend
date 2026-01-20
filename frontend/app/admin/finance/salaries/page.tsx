
'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import * as adminApi from '@/lib/api/admin';
import { InstructorEarning } from '@/lib/api/admin';

export default function SalaryManagementPage() {
  const [earnings, setEarnings] = useState<InstructorEarning[]>([]);
  const [salarySummary, setSalarySummary] = useState<adminApi.SalarySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'PENDING',
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [selectedEarnings, setSelectedEarnings] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchEarnings();
    fetchSalarySummary();
  }, [filters]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getInstructorEarnings(filters);
      setEarnings(response.data || []);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error('Error fetching earnings:', error);
      // Show user-friendly Object(error).message || 'An error occurred'
      if (Object(error).message || 'An error occurred'?.includes('Too many')) {
        alert('Too many requests. Please wait a moment and try again.');
      } else {
        alert(`Failed to load earnings: ${Object(error).message || 'An error occurred' || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSalarySummary = async () => {
    try {
      const data = await adminApi.getSalarySummary();
      setSalarySummary(data);
    } catch (error) {
      console.error('Error fetching salary summary:', error);
    }
  };

  const handleMarkPaid = async () => {
    if (selectedEarnings.length === 0) {
      alert('Please select earnings to mark as paid');
      return;
    }

    try {
      await adminApi.markInstructorEarningsPaid({
        earningIds: selectedEarnings,
        paidAt: new Date().toISOString(),
        paymentMethod: 'BANK_TRANSFER',
      });
      setSelectedEarnings([]);
      setShowPaymentModal(false);
      fetchEarnings();
      fetchSalarySummary();
      alert('Earnings marked as paid successfully');
    } catch (error) {
      console.error('Error marking earnings as paid:', error);
      alert('Failed to mark earnings as paid');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedEarnings((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedEarnings.length === earnings.length) {
      setSelectedEarnings([]);
    } else {
      setSelectedEarnings(earnings.map((e) => e.id));
    }
  };

  const totalSelectedAmount = earnings
    .filter((e) => selectedEarnings.includes(e.id))
    .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Salary Management</h1>
          <p className="text-[var(--muted-foreground)] mt-2">Instructor commission and salary tracking</p>
        </div>
        {selectedEarnings.length > 0 && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-none hover:bg-green-700"
          >
            Mark {selectedEarnings.length} as Paid
          </button>
        )}
      </div>

      {/* Salary Summary */}
      {salarySummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card padding="lg">
            <p className="text-sm text-[var(--muted-foreground)]">Total Salaries</p>
            <p className="text-2xl font-bold text-[var(--foreground)] mt-1">
              Rs. {(salarySummary.totalSalaries || 0).toLocaleString()}
            </p>
          </Card>
          <Card padding="lg">
            <p className="text-sm text-[var(--muted-foreground)]">Paid Salaries</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              Rs. {(salarySummary.paidSalaries || 0).toLocaleString()}
            </p>
          </Card>
          <Card padding="lg">
            <p className="text-sm text-[var(--muted-foreground)]">Pending Salaries</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              Rs. {(salarySummary.pendingSalaries || 0).toLocaleString()}
            </p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card padding="lg" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border rounded-none"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Earnings Table */}
      <Card padding="lg">
        {selectedEarnings.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 rounded-none flex justify-between items-center">
            <span className="font-semibold">
              {selectedEarnings.length} selected • Total: Rs. {totalSelectedAmount.toLocaleString()}
            </span>
            <button
              onClick={selectAll}
              className="text-blue-600 hover:underline text-sm"
            >
              {selectedEarnings.length === earnings.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-center py-8">Loading earnings...</p>
        ) : earnings.length === 0 ? (
          <p className="text-center py-8 text-[var(--muted-foreground)]">No earnings found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedEarnings.length === earnings.length && earnings.length > 0}
                      onChange={selectAll}
                      className="rounded-none"
                    />
                  </th>
                  <th className="text-left py-3 px-4">Instructor</th>
                  <th className="text-left py-3 px-4">Course</th>
                  <th className="text-left py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Commission Rate</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((earning: any) => (
                  <tr key={earning.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedEarnings.includes(earning.id)}
                        onChange={() => toggleSelection(earning.id)}
                        className="rounded-none"
                      />
                    </td>
                    <td className="py-3 px-4">{earning.instructor?.name || 'N/A'}</td>
                    <td className="py-3 px-4">{earning.course?.title || 'N/A'}</td>
                    <td className="py-3 px-4 font-semibold">
                      Rs. {parseFloat(earning.amount.toString()).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">{earning.commissionRate}%</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-none text-xs ${earning.status === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : earning.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {earning.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">{new Date(earning.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              disabled={filters.page === 1}
              className="px-4 py-2 border rounded-none disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={filters.page === pagination.pages}
              className="px-4 py-2 border rounded-none disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </Card>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card padding="lg" className="w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Mark Earnings as Paid</h2>
            <p className="mb-4 text-[var(--muted-foreground)]">
              You are about to mark {selectedEarnings.length} earnings as paid. Total amount: Rs.{' '}
              {totalSelectedAmount.toLocaleString()}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleMarkPaid}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-none hover:bg-green-700"
              >
                Confirm Payment
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-none hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}


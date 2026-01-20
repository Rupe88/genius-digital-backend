'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import * as adminApi from '@/lib/api/admin';
import { Expense } from '@/lib/api/admin';

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, [filters]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getExpenses(filters);
      setExpenses(response.data || []);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await adminApi.approveExpense(id);
      fetchExpenses();
    } catch (error) {
      console.error('Error approving expense:', error);
      alert('Failed to approve expense');
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await adminApi.rejectExpense(id, reason);
      fetchExpenses();
    } catch (error) {
      console.error('Error rejecting expense:', error);
      alert('Failed to reject expense');
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await adminApi.markExpenseAsPaid(id, {
        paymentDate: new Date().toISOString(),
      });
      fetchExpenses();
    } catch (error) {
      console.error('Error marking expense as paid:', error);
      alert('Failed to mark expense as paid');
    }
  };

  const expenseCategories = [
    'MARKETING',
    'SALARY',
    'INFRASTRUCTURE',
    'SOFTWARE',
    'HARDWARE',
    'OFFICE_RENT',
    'UTILITIES',
    'INSURANCE',
    'PROFESSIONAL_SERVICES',
    'TRAVEL',
    'TRAINING',
    'OTHER',
  ];

  const expenseStatuses = ['PENDING', 'APPROVED', 'PAID', 'REJECTED'];

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Expense Management</h1>
          <p className="text-[var(--muted-foreground)] mt-2">Track and manage all business expenses</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-none hover:bg-blue-700"
        >
          {showAddForm ? 'Cancel' : 'Add Expense'}
        </button>
      </div>

      {/* Filters */}
      <Card padding="lg" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border rounded-none"
            >
              <option value="">All Categories</option>
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border rounded-none"
            >
              <option value="">All Statuses</option>
              {expenseStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Expenses Table */}
      <Card padding="lg">
        {loading ? (
          <p className="text-center py-8">Loading expenses...</p>
        ) : expenses.length === 0 ? (
          <p className="text-center py-8 text-[var(--muted-foreground)]">No expenses found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Title</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-left py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{expense.title}</td>
                    <td className="py-3 px-4">{expense.category.replace('_', ' ')}</td>
                    <td className="py-3 px-4">Rs. {parseFloat(expense.amount.toString()).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-none text-xs ${
                          expense.status === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : expense.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800'
                            : expense.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {expense.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">{new Date(expense.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {expense.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(expense.id)}
                              className="text-blue-600 hover:underline text-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Rejection reason:');
                                if (reason) handleReject(expense.id, reason);
                              }}
                              className="text-red-600 hover:underline text-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {expense.status === 'APPROVED' && (
                          <button
                            onClick={() => handleMarkPaid(expense.id)}
                            className="text-green-600 hover:underline text-sm"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
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
    </div>
  );
}

